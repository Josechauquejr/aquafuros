<?php

namespace App\Http\Controllers\Dev;

use App\Http\Controllers\Controller;
use App\Support\SaudeSistema;
use Inertia\Inertia;

/** Estado de saúde da aplicação (só leitura). */
class SaudeController extends Controller
{
    public function index()
    {
        return Inertia::render('Dev/Saude', SaudeSistema::verificar());
    }
}
