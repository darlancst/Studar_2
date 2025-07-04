'use client';

import { useEffect, useState } from 'react';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useSubjectsStore, Topic, Subject } from '@/store/subjectsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { formatTime } from '@/utils/formatTime';
import { 
  PlayIcon, 
  PauseIcon, 
  ArrowPathIcon, 
  ForwardIcon, 
  Cog6ToothIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/solid';
import SettingsModal from './SettingsModal';

export default function Pomodoro() {
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Desestruturando TUDO que precisamos da pomodoroStore
  const {
    currentState,
    isRunning,
    timeRemaining,
    currentTopicId,
    completedPomodoros,
    initializeWorker,
    terminateWorker,
    startTimer,
    pauseTimer,
    resetTimer,
    skipToNext,
    updateWorkerSettings,
  } = usePomodoroStore();

  // Desestruturando corretamente das outras stores
  const { subjects, topics, fetchSubjects, fetchTopics } = useSubjectsStore();
  const { settings } = useSettingsStore();

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const topicId = e.target.value;
    if (isRunning) {
      resetTimer();
    }
    usePomodoroStore.setState({ 
      currentTopicId: topicId, 
      isRunning: false, 
      currentState: 'idle',
      timeRemaining: settings.pomodoro.focusDuration * 60
    });
  };
  
  // Efeito para gerenciar o ciclo de vida do worker
  useEffect(() => {
    initializeWorker();
    return () => {
      terminateWorker();
    };
  }, [initializeWorker, terminateWorker]);

  // Efeito para buscar dados iniciais da UI
  useEffect(() => {
    fetchSubjects();
    fetchTopics();
  }, [fetchSubjects, fetchTopics]);
  
  // Efeito para manter o worker e a UI sincronizados com as configurações
  useEffect(() => {
    updateWorkerSettings();
    if (!isRunning && currentState === 'idle') {
      usePomodoroStore.setState({ timeRemaining: settings.pomodoro.focusDuration * 60 });
    }
  }, [settings.pomodoro, updateWorkerSettings, isRunning, currentState]);
  
  const handlePlayPause = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      if (currentTopicId) {
        startTimer(currentTopicId);
      }
    }
  };

  const currentTopic = topics.find((t: Topic) => t.id === currentTopicId);
  const currentSubject = subjects.find((s: Subject) => s.id === currentTopic?.subject_id);

  const playPauseColor = isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold dark:text-white">Pomodoro</h2>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 max-w-md lg:max-w-lg mx-auto">
        <div className="w-full flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <select 
              value={currentTopicId || ''} 
              onChange={handleTopicChange}
              className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione um tópico...</option>
              {subjects.map((subject: Subject) => (
                <optgroup key={subject.id} label={subject.name} style={{ backgroundColor: subject.color, color: '#fff' }}>
                  {topics.filter((topic: Topic) => topic.subject_id === subject.id).map((topic: Topic) => (
                    <option key={topic.id} value={topic.id}>{topic.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            <Cog6ToothIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div 
            className="relative w-60 h-60 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full flex items-center justify-center text-center p-2"
            style={{ 
              backgroundColor: currentSubject?.color || '#374151'
            }}
          >
          <div>
            <p className="text-white font-semibold text-lg capitalize">{currentState === 'focus' ? 'Foco' : currentState === 'shortBreak' ? 'Pausa Curta' : currentState === 'longBreak' ? 'Pausa Longa' : 'Pronto?'}</p>
            <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tighter">{formatTime(timeRemaining)}</h1>
            <p className='text-sm text-white mt-2'>{completedPomodoros} pomodoros</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={() => resetTimer()}
            disabled={!currentTopicId}
            className="p-3 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Resetar"
          >
            <ArrowPathIcon className="h-8 w-8" />
          </button>
          
          <button
            onClick={handlePlayPause}
            disabled={!currentTopicId}
            className={`p-4 rounded-full text-white ${playPauseColor} disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 focus:ring-primary-500`}
            aria-label={isRunning ? "Pausar" : "Iniciar"}
          >
            {isRunning ? <PauseIcon className="h-10 w-10" /> : <PlayIcon className="h-10 w-10" />}
          </button>

          <button
            onClick={skipToNext}
            disabled={!currentTopicId || !isRunning}
            className="p-3 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Pular"
          >
            <ForwardIcon className="h-8 w-8" />
          </button>
        </div>
      </div>

      {showSettings && (
        <SettingsModal 
          onClose={() => {
            setShowSettings(false);
            setShowSaveConfirmation(true);
            setTimeout(() => setShowSaveConfirmation(false), 3000);
          }}
        />
      )}
      {showSaveConfirmation && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50">
           <CheckCircleIcon className="h-5 w-5" />
          <span>Configurações salvas!</span>
        </div>
      )}
    </div>
  );
} 