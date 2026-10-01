<?php

namespace App\Http\Controllers;

use App\Support\Novidades;
use Illuminate\Http\Request;

class NovidadeController extends Controller
{
    /** O utilizador viu (ou dispensou) a novidade: não volta a aparecer. */
    public function vista(Request $request)
    {
        Novidades::marcarVista($request->user());

        return back();
    }
}
