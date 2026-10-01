<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Models\DevAuditoria;
use Illuminate\Http\Request;
use Inertia\Inertia;

/** Auditoria do painel: o que o Desenvolvedor fez, quando e de onde (só leitura, imutável). */
class AuditoriaController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));

        $query = DevAuditoria::with('user:id,name')->orderByDesc('id');

        if ($search !== '') {
            $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], mb_strtolower($search)).'%';
            $query->where(fn ($q) => $q->whereRaw('lower(acao) like ?', [$like])->orWhereRaw('lower(alvo) like ?', [$like]));
        }

        return Inertia::render('Dev/Auditoria', [
            'registos' => $query->paginate(25)->withQueryString(),
            'filtros' => ['search' => $search],
        ]);
    }
}
