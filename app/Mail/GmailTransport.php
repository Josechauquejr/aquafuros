<?php

namespace App\Mail;

use App\Support\GmailOAuth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Envelope;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

/** Envia pelo Gmail (API, com OAuth2): a mensagem MIME completa, anexos incluídos, vai em base64url. */
class GmailTransport extends AbstractTransport
{
    protected function doSend(SentMessage $message): void
    {
        $raw = rtrim(strtr(base64_encode($message->toString()), '+/', '-_'), '=');

        $enviar = fn () => Http::withToken(GmailOAuth::accessToken())
            ->timeout(60)
            ->post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', ['raw' => $raw]);

        $r = $enviar();

        // Token expirado a meio: renova uma vez e tenta de novo.
        if ($r->status() === 401) {
            Cache::forget('gmail_access_token');
            $r = $enviar();
        }

        if (! $r->successful()) {
            throw new \RuntimeException('Gmail: '.($r->json('error.message') ?? 'HTTP '.$r->status()));
        }
    }

    public function __toString(): string
    {
        return 'gmail';
    }
}
