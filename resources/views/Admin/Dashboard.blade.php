@extends('layouts.app')

@section('content')
<div class="py-12">
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div class="p-6 text-gray-900 dark:text-gray-100">
                <h1 class="text-3xl font-bold mb-6">Dashboard do Administrador</h1>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <!-- Card: Gestão de Utilizadores -->
                    <div class="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg border-l-4 border-blue-500">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-blue-600 dark:text-blue-300 font-semibold">Utilizadores</p>
                                <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">Gerir</p>
                            </div>
                            <a href="{{ route('users.index') }}" class="text-blue-600 hover:text-blue-900">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-2a6 6 0 0112 0v2zm0 0h6v-2a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                </svg>
                            </a>
                        </div>
                    </div>

                    <!-- Card: Tarifas -->
                    <div class="bg-green-50 dark:bg-green-900 p-6 rounded-lg border-l-4 border-green-500">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-green-600 dark:text-green-300 font-semibold">Tarifas</p>
                                <p class="text-2xl font-bold text-green-900 dark:text-green-100">Configurar</p>
                            </div>
                            <a href="{{ route('tarifas.index') }}" class="text-green-600 hover:text-green-900">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </a>
                        </div>
                    </div>

                    <!-- Card: Auditoria -->
                    <div class="bg-purple-50 dark:bg-purple-900 p-6 rounded-lg border-l-4 border-purple-500">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-purple-600 dark:text-purple-300 font-semibold">Auditoria</p>
                                <p class="text-2xl font-bold text-purple-900 dark:text-purple-100">Ver Logs</p>
                            </div>
                            <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                        </div>
                    </div>

                    <!-- Card: Relatórios -->
                    <div class="bg-red-50 dark:bg-red-900 p-6 rounded-lg border-l-4 border-red-500">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-red-600 dark:text-red-300 font-semibold">Relatórios</p>
                                <p class="text-2xl font-bold text-red-900 dark:text-red-100">Exportar</p>
                            </div>
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="mt-8">
                    <h2 class="text-xl font-semibold mb-4">Acções Rápidas</h2>
                    <div class="space-y-2">
                        <a href="{{ route('users.create') }}" class="block p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition">
                            ➕ Criar novo utilizador
                        </a>
                        <a href="{{ route('tarifas.create') }}" class="block p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition">
                            ➕ Criar nova tarifa
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
