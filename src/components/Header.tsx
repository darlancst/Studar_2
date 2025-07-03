'use client';

import { useState, useEffect } from 'react';
import { Cog6ToothIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/store/settingsStore';

interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [animateButton, setAnimateButton] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Adiciona um brilho sutil ao botão "Visão Geral" na primeira renderização
    const hasSeenAnimation = localStorage.getItem('hasSeenVisionAnimation');
    if (!hasSeenAnimation) {
      setAnimateButton(true);
      localStorage.setItem('hasSeenVisionAnimation', 'true');

      // Remove o brilho após alguns segundos
      const timer = setTimeout(() => {
        setAnimateButton(false);
      }, 4000); // O brilho dura 4 segundos

      return () => clearTimeout(timer); // Limpeza do timer
    }
  }, []);

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Studar
              </h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {/* Nenhum link aqui agora */}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:gap-2">
            <button
              type="button"
              onClick={() => setShowFeaturesModal(true)}
              className={`p-2 rounded-full text-yellow-500 hover:text-yellow-400 focus:outline-none transition-all duration-300 ${animateButton ? 'ring-2 ring-offset-2 ring-yellow-500 dark:ring-offset-gray-900' : ''}`}
              title="Visão Geral: Descubra as funcionalidades do Studar!"
            >
              <SparklesIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            
            <button
              type="button"
              onClick={onSettingsClick}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              title="Configurações"
            >
              <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="-mr-2 flex items-center gap-1 sm:hidden">
             <button
              type="button"
              onClick={() => setShowFeaturesModal(true)}
              className={`p-2 rounded-full text-yellow-500 hover:text-yellow-400 focus:outline-none transition-all duration-300 ${animateButton ? 'ring-2 ring-offset-2 ring-yellow-500 dark:ring-offset-gray-900' : ''}`}
              title="Visão Geral: Descubra as funcionalidades do Studar!"
            >
              <SparklesIcon className="h-6 w-6" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onSettingsClick}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              title="Configurações"
            >
              <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Funcionalidades */}
      {showFeaturesModal && (
        <div className="fixed inset-0 z-40 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-semibold dark:text-white flex items-center">
                <SparklesIcon className="h-5 w-5 text-yellow-500 mr-2" />
                Bem-vindo ao Studar!
              </h3>
              <button 
                onClick={() => setShowFeaturesModal(false)}
                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                O Studar é sua ferramenta completa para organizar e otimizar seus estudos. Explore as principais funcionalidades:
              </p>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold dark:text-white">🗓️ Calendário</h4>
                  <p className="text-sm">Visualize seus tópicos de estudo e revisões agendadas. Adicione novos tópicos diretamente no dia desejado.</p>
                </div>
                <div>
                  <h4 className="font-semibold dark:text-white">🍅 Pomodoro</h4>
                  <p className="text-sm">Utilize a técnica Pomodoro para sessões de estudo focadas. Associe cada sessão a um tópico específico.</p>
                </div>
                <div>
                  <h4 className="font-semibold dark:text-white">📊 Estatísticas</h4>
                  <p className="text-sm">Acompanhe seu progresso com gráficos detalhados (tempo por matéria, revisões) e um heatmap de atividades anual.</p>
                </div>
              </div>

              <div className="pt-3 border-t dark:border-gray-700">
                <h4 className="font-semibold dark:text-white mb-2">🎨 Altamente Personalizável!</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Gerencie suas <strong>Matérias</strong> e escolha <strong>cores</strong> únicas para cada uma.</li>
                  <li>Defina <strong>Tópicos</strong> dentro de cada matéria para organizar o conteúdo.</li>
                  <li>Ajuste os tempos do <strong>Pomodoro</strong> (foco, pausas curta e longa).</li>
                  <li>Configure os intervalos de <strong>Revisão Espaçada</strong>.</li>
                  <li>Estabeleça sua <strong>Meta Semanal</strong> de estudos.</li>
                  <li>Escolha entre os temas <strong>Claro e Escuro</strong>.</li>
                  <li>Personalize os níveis de cor do <strong>Heatmap</strong> de atividades.</li>
                </ul>
              </div>
              
              <p className="text-sm pt-2">
                Explore as <strong>Configurações</strong> (⚙️) para ajustar tudo ao seu gosto e bons estudos!
              </p>
            </div>
            
            <div className="p-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 z-10 flex justify-end">
            <button
                onClick={() => setShowFeaturesModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
            >
                Entendi!
            </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
} 