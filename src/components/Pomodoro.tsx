'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { usePomodoroStore } from '../store/pomodoroStore';
import { useTopicStore } from '../store/topicStore';
import { useSubjectStore } from '../store/subjectStore';
import { useSettingsStore } from '../store/settingsStore';
import { FaPlay, FaPause, FaForward, FaRedo, FaCog } from 'react-icons/fa';
import { isSameDay } from 'date-fns';

export default function Pomodoro() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const { topics, fetchTopics } = useTopicStore(
    useCallback(state => ({
      topics: state.topics,
      fetchTopics: state.fetchTopics,
    }), [])
  );
  
  const subjects = useSubjectStore(state => state.subjects);
  
  const { settings, setPomodoroSettings } = useSettingsStore();
  const [pomodoroForm, setPomodoroForm] = useState({ ...settings.pomodoro });

  const {
    currentTopicId,
    currentState,
    timeRemaining,
    isRunning,
    completedPomodoros,
    elapsedSeconds,
    lastPomodoroDate,
  } = usePomodoroStore();

  const {
    startTimer,
    pauseTimer,
    resetTimer,
    skipToNext,
  } = usePomodoroStore.getState();

  useEffect(() => {
    // Adicionado para resetar a contagem de pomodoros a cada novo dia
    if (completedPomodoros > 0 && lastPomodoroDate) {
      if (!isSameDay(new Date(lastPomodoroDate), new Date())) {
        usePomodoroStore.setState({ completedPomodoros: 0, lastPomodoroDate: null });
      }
    }
    fetchTopics();
  }, [fetchTopics]);
  
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      usePomodoroStore.getState().tick();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  useEffect(() => {
    setPomodoroForm({ ...settings.pomodoro });
  }, [settings.pomodoro]);

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTopicId = e.target.value || null;
    
    usePomodoroStore.setState({ 
      currentTopicId: newTopicId,
      currentState: 'idle',
      isRunning: false,
      timeRemaining: pomodoroForm.focusDuration * 60,
      elapsedSeconds: 0,
    });
  };

  const todaysTopics = topics.filter(topic => isSameDay(new Date(topic.createdAt), new Date()));
  const displayMinutes = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
  const displaySeconds = (timeRemaining % 60).toString().padStart(2, '0');

  const handlePlayPause = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      if (currentState === 'idle') {
        if (currentTopicId) {
          startTimer(currentTopicId);
        }
      } else {
        usePomodoroStore.setState({ isRunning: true });
      }
    }
  };

  const handlePomodoroChange = (field: keyof typeof pomodoroForm, value: string) => {
    if (value === '') {
      setPomodoroForm(prev => ({ ...prev, [field]: '' }));
      return;
    }
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue > 0) {
      setPomodoroForm(prev => ({ ...prev, [field]: numericValue }));
    }
  };

  const handleBlur = (field: keyof typeof pomodoroForm) => {
    if (String(pomodoroForm[field]) === '') {
      setPomodoroForm(prev => ({ ...prev, [field]: 1 }));
    }
  };

  const handleUpdatePomodoro = () => {
    setPomodoroSettings(pomodoroForm);

    // Atualiza o tempo restante no estado global se o timer não estiver rodando
    const { isRunning, currentState } = usePomodoroStore.getState();
    if (!isRunning) {
      let newTimeRemaining: number | null = null;

      if (currentState === 'focus' || currentState === 'idle') {
        newTimeRemaining = pomodoroForm.focusDuration * 60;
      } else if (currentState === 'shortBreak') {
        newTimeRemaining = pomodoroForm.shortBreakDuration * 60;
      } else if (currentState === 'longBreak') {
        newTimeRemaining = pomodoroForm.longBreakDuration * 60;
      }

      if (newTimeRemaining !== null) {
        usePomodoroStore.setState({ timeRemaining: newTimeRemaining });
      }
    }

    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2000);
  };

  const getTotalTime = () => {
    switch (currentState) {
      case 'focus':
        return settings.pomodoro.focusDuration * 60;
      case 'shortBreak':
        return settings.pomodoro.shortBreakDuration * 60;
      case 'longBreak':
        return settings.pomodoro.longBreakDuration * 60;
      default:
        return settings.pomodoro.focusDuration * 60;
    }
  };

  const totalTime = getTotalTime();
  const progress = totalTime > 0 ? (totalTime - timeRemaining) / totalTime : 0;
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference * (1 - progress);

  const stateText = {
    focus: 'Foco',
    shortBreak: 'Pausa Curta',
    longBreak: 'Pausa Longa',
    idle: 'Pronto?',
  }[currentState];

  const currentTopic = topics.find(t => t.id === currentTopicId);
  const currentSubject = currentTopic ? subjects.find(s => s.id === currentTopic.subjectId) : null;
  const subjectColor = currentSubject?.color || '#a855f7';

  const playPauseColor = isRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600';

  return (
    <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 max-w-md lg:max-w-lg mx-auto">
      <div className="w-full flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subjectColor }}></div>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {currentTopic ? `${currentSubject?.name} - ${currentTopic.title}` : 'Nenhum tópico selecionado'}
            </span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
          aria-label="Configurações do Pomodoro"
        >
          <FaCog size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="w-full mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4 transition-all duration-300">
          <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Ajustar Tempos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="focusDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Foco (min)</label>
            <input type="number" id="focusDuration" value={pomodoroForm.focusDuration} onChange={(e) => handlePomodoroChange('focusDuration', e.target.value)} onBlur={() => handleBlur('focusDuration')} className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm p-2"/>
          </div>
          <div>
            <label htmlFor="shortBreakDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pausa Curta (min)</label>
            <input type="number" id="shortBreakDuration" value={pomodoroForm.shortBreakDuration} onChange={(e) => handlePomodoroChange('shortBreakDuration', e.target.value)} onBlur={() => handleBlur('shortBreakDuration')} className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm p-2"/>
          </div>
          <div>
            <label htmlFor="longBreakDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pausa Longa (min)</label>
            <input type="number" id="longBreakDuration" value={pomodoroForm.longBreakDuration} onChange={(e) => handlePomodoroChange('longBreakDuration', e.target.value)} onBlur={() => handleBlur('longBreakDuration')} className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm p-2"/>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleUpdatePomodoro} className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
              Salvar
            </button>
            {showSaveConfirmation && <span className="text-sm text-green-600 dark:text-green-400 animate-pulse">Salvo!</span>}
          </div>
        </div>
      )}

    <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 flex items-center justify-center my-6">
        <svg className="absolute w-full h-full transform -rotate-90">
            <circle
                cx="50%"
                cy="50%"
                r="110"
                strokeWidth="12"
                className="text-gray-200 dark:text-gray-600"
                fill="transparent"
                stroke="currentColor"
            />
            <circle
                cx="50%"
                cy="50%"
                r="110"
                strokeWidth="12"
                className="transition-all duration-300 ease-linear"
                fill="transparent"
                stroke="currentColor"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ color: subjectColor }}
            />
        </svg>
        <div className="relative text-center">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-800 dark:text-gray-100 tabular-nums">
                {displayMinutes}:{displaySeconds}
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-2">{stateText}</p>
        </div>
    </div>
    
      <div className="w-full mb-6">
        <label htmlFor="topic-select" className="sr-only">Tópico Atual</label>
        <select
          id="topic-select"
          value={currentTopicId || ''}
          onChange={handleTopicChange}
          className="w-full p-3 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500 transition-all"
          disabled={isRunning && currentState === 'focus'}
        >
          <option value="">Selecione um tópico para começar</option>
          {todaysTopics.map((topic) => {
            const subject = subjects.find((s) => s.id === topic.subjectId);
            return (
              <option key={topic.id} value={topic.id} className="font-medium">
                {subject?.name} - {topic.title}
              </option>
            );
          })}
        </select>
      </div>

      <div className="flex items-center justify-center space-x-4 w-full">
        <button 
          onClick={() => resetTimer(true)} 
          className="p-4 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          title="Resetar"
          aria-label="Resetar timer"
          disabled={!currentTopicId}
        >
          <FaRedo size={20}/>
        </button>
        <button
          onClick={handlePlayPause}
          className={`w-20 h-20 rounded-full text-white flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform ${playPauseColor}`}
          disabled={!currentTopicId}
          aria-label={isRunning ? 'Pausar timer' : 'Iniciar timer'}
        >
          {isRunning ? <FaPause size={28} /> : <FaPlay size={28} />}
        </button>
        <button 
          onClick={() => skipToNext()} 
          className="p-4 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
          title="Pular"
          aria-label="Pular para o próximo estado"
          disabled={!currentTopicId}
        >
          <FaForward size={20}/>
        </button>
      </div>
      
      <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Pomodoros concluídos: <span className="font-bold">{completedPomodoros}</span></p>
      </div>
    </div>
  );
} 