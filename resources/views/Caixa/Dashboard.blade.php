@extends('layouts.app')

@section('content')
<div class="py-12">
    <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow-sm sm:rounded-lg">
            <div class="p-6 text-gray-900 dark:text-gray-100">
                <h1 class="text-3xl font-bold mb-6">Dashboard da Caixa</h1>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Card: Registar Pagamentos -->
                    <div class="bg-green-50 dark:bg-green-900 p-6 rounded-lg border-l-4 border-green-500">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-green-600 dark:text-green-300 font-semibold">Pagamentos</p>
                                <p class="text-2xl font-bold text-green-900 dark:text-green-100">Registar</p>
                            </div>
                            <a href="{{ route('pagamentos.index') }}" class="text-green-600 hover:text-green-900">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </a>
                        </div>
                    </div>

                    <!-- Card: Recibos -->
                    <div class="bg-blue-50 dark:bg-blue-900 p-6 rounded-lg border-l-4 border-blue-500">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-blue-600 dark:text-blue-300 font-semibold">Recibos</p>
                                <p class="text-2xl font-bold text-blue-900 dark:text-blue-100">Consultar</p>
                            </div>
                            <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                        </div>
                    </div>
                </div>

                <div class="mt-8">
                    <h2 class="text-xl font-semibold mb-4">Acções Rápidas</h2>
                    <div class="space-y-2">
                        <a href="{{ route('pagamentos.create') }}" class="block p-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition">
                            ➕ Novo pagamento
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
