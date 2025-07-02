'use client';

import { useState, useEffect, useRef } from 'react';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useTopicStore } from '@/store/topicStore';
import { useSubjectStore } from '@/store/subjectStore';
import { PomodoroSettings } from '@/types';
import { isSameDay } from 'date-fns';

export default function Pomodoro() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Seletores do Zustand para otimizar re-renderizações
  const currentState = usePomodoroStore(state => state.currentState);
  const isRunning = usePomodoroStore(state => state.isRunning);
  const timeRemaining = usePomodoroStore(state => state.timeRemaining);
  const currentTopicId = usePomodoroStore(state => state.currentTopicId);
  const completedPomodoros = usePomodoroStore(state => state.completedPomodoros);
  const settings = usePomodoroStore(state => state.settings);
  
  // Ações do store
  const { 
    startTimer,
    pauseTimer,
    resetTimer,
    skipToNext,
    updateSettings,
    incrementElapsedTime,
    interruptFocusSession
  } = usePomodoroStore.getState();
  
  const { topics } = useTopicStore();
  const { subjects } = useSubjectStore();
  
  // Filtrar tópicos para mostrar apenas os de hoje
  const today = new Date();
  const todaysTopics = topics.filter(topic => {
    try {
      const topicDate = new Date(topic.createdAt);
      return isSameDay(topicDate, today);
    } catch (e) {
      console.error("Erro ao parsear data do tópico:", topic.createdAt, e);
      return false;
    }
  });
  
  // Formatação do tempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // useEffect simplificado para controlar o timer
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        incrementElapsedTime(1);
        usePomodoroStore.setState({ timeRemaining: timeRemaining - 1 });
      }, 1000);
    } else if (isRunning && timeRemaining <= 0) {
      skipToNext(); // Avança para o próximo estado automaticamente
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining, incrementElapsedTime, skipToNext]);
  
  const handleReset = () => {
    const elapsedSeconds = usePomodoroStore.getState().elapsedSeconds;
    if (currentState === 'focus' && elapsedSeconds > 0) {
      if (window.confirm('Deseja salvar o progresso antes de reiniciar?')) {
        resetTimer(true); // Salva o progresso
      } else {
        resetTimer(false); // Não salva
      }
    } else {
      resetTimer(false); // Apenas reinicia sem salvar se não estiver em foco
    }
  };

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTopicId = e.target.value || null;
    const { currentTopicId: previousTopicId, elapsedSeconds } = usePomodoroStore.getState();

    if (previousTopicId && elapsedSeconds > 0) {
      interruptFocusSession(previousTopicId, elapsedSeconds);
    }
    
    usePomodoroStore.setState({ 
      currentTopicId: newTopicId,
      currentState: 'idle',
      isRunning: false,
      timeRemaining: settings.focusDuration * 60,
      elapsedSeconds: 0,
    });
  };

  // Título com base no estado atual
  const getStateTitle = (): string => {
    switch (currentState) {
      case 'focus':
        return 'Foco';
      case 'shortBreak':
        return 'Pausa Curta';
      case 'longBreak':
        return 'Pausa Longa';
      default:
        return 'Pomodoro';
    }
  };

  // Calcula os minutos diretamente do estado elapsedSeconds
  const displaySessionMinutes = Math.floor(usePomodoroStore.getState().elapsedSeconds / 60);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between mb-6">
        <h2 className="text-2xl font-bold dark:text-white">Timer Pomodoro</h2>
        {/* O botão de configurações é removido daqui para ser unificado no Header */}
      </div>
      
      {/* Seleção de tópico */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tópico de Estudo
        </label>
        <select
          value={currentTopicId || ''}
          onChange={handleTopicChange}
          className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          disabled={isRunning && currentState === 'focus'}
        >
          <option value="">Selecione um tópico</option>
          {/* Mapear sobre os tópicos de hoje */}
          {todaysTopics.map((topic) => {
            const subject = subjects.find((s) => s.id === topic.subjectId);
            return (
              <option key={topic.id} value={topic.id}>
                {subject?.name} - {topic.title}
              </option>
            );
          })}
        </select>
      </div>
      
      {/* Exibição do Timer */}
      <div className="timer-display dark:text-white">
        {formatTime(timeRemaining)}
      </div>
      
      <div className="text-center mb-4">
        <p className="text-lg font-medium dark:text-white">{getStateTitle()}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pomodoros completados: {completedPomodoros}
        </p>
        
        {/* Mostra o tempo contabilizado na sessão atual usando displaySessionMinutes */}
        {currentState === 'focus' && currentTopicId && isRunning && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
            Tempo atual: {displaySessionMinutes} min contabilizados
          </p>
        )}
      </div>
      
      {/* Controles */}
      <div className="timer-controls">
        <button
          onClick={() => {
            if (isRunning) {
              pauseTimer();
            } else {
              startTimer(currentTopicId!);
            }
          }}
          className={`timer-button bg-primary-600 text-white hover:bg-primary-700 ${
            !currentTopicId ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={!currentTopicId}
        >
          {isRunning ? 'Pausar' : 'Iniciar'}
        </button>
        
        <button
          onClick={handleReset}
          className="timer-button bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Reiniciar
        </button>
        
        <button
          onClick={skipToNext}
          className="timer-button bg-gray-200 text-gray-700 hover:bg-gray-300"
        >
          Pular
        </button>
      </div>
      
      {/* As configurações foram movidas para o SettingsModal global */}
    </div>
  );
} 