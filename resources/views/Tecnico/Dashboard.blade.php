@extends('layouts.app')

@section('content')
<div class="py-12">
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div class="p-6 text-gray-900 dark:text-gray-100">
                <h1 class="text-3xl font-bold mb-6">Dashboard do Técnico</h1>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Card: Registar Leituras -->
                    <div class="bg-purple-50 dark:bg-purple-900 p-6 rounded-lg border-l-4 border-purple-500">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-purple-600 dark:text-purple-300 font-semibold">Leituras</p>
                                <p class="text-2xl font-bold text-purple-900 dark:text-purple-100">Registar</p>
                            </div>
                            <a href="{{ route('leituras.index') }}" class="text-purple-600 hover:text-purple-900">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </a>
                        </div>
                    </div>

                    <!-- Card: Histórico -->
                    <div class="bg-indigo-50 dark:bg-indigo-900 p-6 rounded-lg border-l-4 border-indigo-500">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-indigo-600 dark:text-indigo-300 font-semibold">Histórico</p>
                                <p class="text-2xl font-bold text-indigo-900 dark:text-indigo-100">Ver</p>
                            </div>
                            <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="mt-8">
                    <h2 class="text-xl font-semibold mb-4">Acções Rápidas</h2>
                    <div class="space-y-2">
                        <a href="{{ route('leituras.create') }}" class="block p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition">
                            ➕ Registar nova leitura
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
