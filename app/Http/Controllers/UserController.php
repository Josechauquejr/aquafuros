<?php

namespace App\Http\Controllers;

use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Listar todos os usuários.
     */
    public function index()
    {
        return Inertia::render('Users/Index');
    }
}
