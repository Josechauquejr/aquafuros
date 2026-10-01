<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Ligação do Gmail por OAuth2 (sem palavra-passe): o administrador autoriza
 * uma vez, o sistema guarda o "refresh token" cifrado e pede um "access token"
 * novo sempre que precisa de enviar. O client id/secret vêm do .env — nunca
 * ficam no código nem na base de dados.
 */
class GmailOAuth
{
    private const FICHEIRO = 'gmail_oauth.json';

    public const SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';

    public static function configurado(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    public static function urlRedirecionamento(): string
    {
        return config('services.google.redirect') ?: url('/admin/email/google/callback');
    }

    public static function urlAutorizacao(string $estado): string
    {
        return 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => self::urlRedirecionamento(),
            'response_type' => 'code',
            'scope' => self::SCOPES,
            'access_type' => 'offline',   // para receber o refresh token
            'prompt' => 'consent',        // e recebê-lo sempre, mesmo se já autorizou antes
            'state' => $estado,
        ]);
    }

    /** Troca o código devolvido pela Google por tokens e guarda o refresh token. Devolve o email da conta. */
    public static function ligar(string $codigo): string
    {
        $r = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'code' => $codigo,
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'redirect_uri' => self::urlRedirecionamento(),
            'grant_type' => 'authorization_code',
        ]);

        if (! $r->successful() || ! $r->json('refresh_token')) {
            throw new \RuntimeException('A Google não devolveu a autorização ('.($r->json('error_description') ?? $r->json('error') ?? 'sem refresh token').').');
        }

        $email = Http::withToken($r->json('access_token'))->get('https://www.googleapis.com/oauth2/v2/userinfo')->json('email');

        Storage::disk('local')->put(self::FICHEIRO, Crypt::encryptString(json_encode([
            'refresh_token' => $r->json('refresh_token'),
            'email' => $email,
            'ligado_em' => now()->toIso8601String(),
        ])));
        Cache::forget('gmail_access_token');

        return (string) $email;
    }

    /** @return array{refresh_token: string, email: ?string, ligado_em: ?string}|null */
    public static function ligacao(): ?array
    {
        if (! Storage::disk('local')->exists(self::FICHEIRO)) {
            return null;
        }

        try {
            return json_decode(Crypt::decryptString(Storage::disk('local')->get(self::FICHEIRO)), true);
        } catch (\Throwable) {
            return null;
        }
    }

    public static function desligar(): void
    {
        Storage::disk('local')->delete(self::FICHEIRO);
        Cache::forget('gmail_access_token');
    }

    /** Access token válido (guardado ~50 minutos; renova-se com o refresh token). */
    public static function accessToken(): string
    {
        $ligacao = self::ligacao();
        if (! $ligacao) {
            throw new \RuntimeException('O Gmail ainda não está ligado — ligue-o em Email (administração).');
        }

        return Cache::remember('gmail_access_token', now()->addMinutes(50), function () use ($ligacao) {
            $r = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => $ligacao['refresh_token'],
                'grant_type' => 'refresh_token',
            ]);

            if (! $r->successful()) {
                throw new \RuntimeException('A Google recusou renovar o acesso: '.($r->json('error_description') ?? $r->json('error') ?? $r->status()).'. Volte a ligar o Gmail.');
            }

            return $r->json('access_token');
        });
    }
}
