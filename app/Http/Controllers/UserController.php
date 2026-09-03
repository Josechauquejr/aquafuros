<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    private const PAPEIS = ['administrador', 'gestor', 'caixa', 'tecnico', 'desenvolvedor'];

    /**
     * Listar utilizadores paginados, com pesquisa e filtros de papel/estado
     * aplicados no servidor.
     */
    public function index(Request $request)
    {
        $search = $request->query('search');
        $papel = $request->query('papel');
        $estado = $request->query('estado');

        $query = User::with('roles')->orderBy('name');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($papel && $papel !== 'todos') {
            $query->whereHas('roles', fn ($q) => $q->where('name', $papel));
        }

        if ($estado === 'activo') {
            $query->where('is_active', true);
        } elseif ($estado === 'inactivo') {
            $query->where('is_active', false);
        }

        return Inertia::render('Users/Index', [
            'usuarios' => $query->paginate(15)->withQueryString(),
            'papeis' => self::PAPEIS,
            'filtros' => [
                'search' => $search ?? '',
                'papel' => $papel ?? 'todos',
                'estado' => $estado ?? 'todos',
            ],
        ]);
    }

    /**
     * Criar um utilizador — gera uma senha temporária aleatória em vez de
     * pedir para a escrever, evitando senhas fracas. A senha só fica
     * disponível uma vez, na flash da resposta.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'telefone' => 'nullable|string|max:20',
            'papel' => ['required', Rule::in(self::PAPEIS)],
            'is_active' => 'boolean',
        ]);

        $senha = Str::password(12);

        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'telefone' => $data['telefone'] ?? null,
            'is_active' => $data['is_active'] ?? true,
            'password' => Hash::make($senha),
            'email_verified_at' => now(),
        ]);

        $user->syncRoles([$data['papel']]);

        return redirect()->route('dev.users.index')
            ->with('status', "Utilizador {$user->name} criado com sucesso.")
            ->with('novaSenha', ['utilizador' => $user->name, 'username' => $user->username, 'senha' => $senha]);
    }

    /**
     * Actualizar os dados de um utilizador (nunca a senha, aqui — ver
     * resetPassword()).
     */
    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'username' => ['required', 'string', 'max:255', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'telefone' => 'nullable|string|max:20',
            'papel' => ['required', Rule::in(self::PAPEIS)],
            'is_active' => 'boolean',
        ]);

        $user->update([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'telefone' => $data['telefone'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        $user->syncRoles([$data['papel']]);

        return redirect()->route('dev.users.index')->with('status', "Utilizador {$user->name} actualizado com sucesso.");
    }

    /**
     * Repor a senha de um utilizador — gera uma nova senha temporária
     * aleatória, mostrada uma única vez ao administrador/developer.
     */
    public function resetPassword(User $user)
    {
        $senha = Str::password(12);

        $user->update(['password' => Hash::make($senha)]);

        return redirect()->route('dev.users.index')
            ->with('status', "Senha de {$user->name} reposta com sucesso.")
            ->with('novaSenha', ['utilizador' => $user->name, 'username' => $user->username, 'senha' => $senha]);
    }

    /**
     * Eliminar um utilizador. Nunca a própria conta — e se o utilizador
     * tiver registos ligados por restrição de integridade (ex.: leituras
     * que registou), a base de dados recusa o apagamento e devolvemos uma
     * mensagem legível em vez do erro de SQL em bruto.
     */
    public function destroy(User $user)
    {
        if ($user->id === Auth::id()) {
            return redirect()->route('dev.users.index')
                ->with('error', 'Não podes eliminar a tua própria conta.');
        }

        try {
            $user->delete();
        } catch (QueryException) {
            return redirect()->route('dev.users.index')
                ->with('error', "Não é possível eliminar {$user->name}: existem registos no sistema associados a este utilizador (ex.: leituras registadas). Desactiva a conta em vez de a eliminar.");
        }

        return redirect()->route('dev.users.index')->with('status', "Utilizador {$user->name} eliminado com sucesso.");
    }
}
