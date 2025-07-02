'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { usePomodoroStore } from '../store/pomodoroStore';
import { useTopicStore, type Topic } from '../store/topicStore';
import { useSubjectStore } from '../store/subjectStore';
import { useSettingsStore } from '../store/settingsStore';
import { FaForward, FaRedo, FaCog } from 'react-icons/fa';
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
  } = usePomodoroStore();

  const {
    startTimer,
    pauseTimer,
    resetTimer,
    skipToNext,
    interruptFocusSession,
  } = usePomodoroStore.getState();

  useEffect(() => {
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
      usePomodoroStore.setState(state => {
        if (state.timeRemaining <= 0) {
          skipToNext();
          return {};
        }
        return { 
          timeRemaining: state.timeRemaining - 1,
          elapsedSeconds: state.elapsedSeconds + 1 
        };
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, skipToNext]);

  useEffect(() => {
    setPomodoroForm({ ...settings.pomodoro });
  }, [settings.pomodoro]);

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTopicId = e.target.value || null;
    const { currentTopicId: previousTopicId, elapsedSeconds } = usePomodoroStore.getState();

    if (previousTopicId && previousTopicId !== newTopicId && elapsedSeconds > 0) {
      interruptFocusSession(previousTopicId, elapsedSeconds);
    }
    
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
  const displaySessionMinutes = Math.floor(elapsedSeconds / 60);

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

  const getButtonLabel = () => {
    if (isRunning) return 'Pausar';
    if (currentState !== 'idle' || elapsedSeconds > 0) return 'Retomar';
    return 'Iniciar';
  };

  const handlePomodoroChange = (field: keyof typeof pomodoroForm, value: string) => {
    const numericValue = parseInt(value, 10);
    if (!isNaN(numericValue) && numericValue > 0) {
      setPomodoroForm(prev => ({ ...prev, [field]: numericValue }));
    }
  };

  const handleUpdatePomodoro = () => {
    setPomodoroSettings(pomodoroForm);
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 relative">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Pomodoro</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          aria-label="Configurações do Pomodoro"
        >
          <FaCog />
        </button>
      </div>

      {showSettings && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
          <h3 className="font-medium text-gray-800 dark:text-gray-200">Ajustar Tempos</h3>
          <div>
            <label htmlFor="focusDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Foco (min)</label>
            <input type="number" id="focusDuration" value={pomodoroForm.focusDuration} onChange={(e) => handlePomodoroChange('focusDuration', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm p-2"/>
          </div>
          <div>
            <label htmlFor="shortBreakDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pausa Curta (min)</label>
            <input type="number" id="shortBreakDuration" value={pomodoroForm.shortBreakDuration} onChange={(e) => handlePomodoroChange('shortBreakDuration', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm p-2"/>
          </div>
          <div>
            <label htmlFor="longBreakDuration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pausa Longa (min)</label>
            <input type="number" id="longBreakDuration" value={pomodoroForm.longBreakDuration} onChange={(e) => handlePomodoroChange('longBreakDuration', e.target.value)} className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md shadow-sm p-2"/>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={handleUpdatePomodoro} className="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2 rounded-md text-sm font-medium">
              Salvar
            </button>
            {showSaveConfirmation && <span className="text-sm text-green-600 dark:text-green-400">Salvo!</span>}
          </div>
        </div>
      )}

      <div className="topic-selector mb-4">
        <label htmlFor="topic-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Tópico Atual
        </label>
        <select
          id="topic-select"
          value={currentTopicId || ''}
          onChange={handleTopicChange}
          className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          disabled={isRunning && currentState === 'focus'}
        >
          <option value="">Selecione um tópico</option>
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

      <div className="timer-display">
        <div className="time">{displayMinutes}:{displaySeconds}</div>
        <div className="state">
          {currentState === 'focus' ? 'Foco' : currentState === 'shortBreak' ? 'Pausa Curta' : currentState === 'longBreak' ? 'Pausa Longa' : 'Pronto?'}
        </div>
      </div>

      <div className="session-info">
        <p>Pomodoros Concluídos: {completedPomodoros}</p>
        {displaySessionMinutes > 0 && (
          <p>Minutos de Foco na Sessão: {displaySessionMinutes}</p>
        )}
      </div>

      <div className="timer-controls">
        <button
          onClick={handlePlayPause}
          className={`timer-button bg-primary-600 text-white hover:bg-primary-700 ${
            !currentTopicId ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={!currentTopicId}
        >
          {getButtonLabel()}
        </button>
        
        <button onClick={() => skipToNext()} className="control-button" title="Pular para o próximo estado">
          <FaForward />
        </button>
        <button onClick={() => resetTimer(true)} className="control-button" title="Resetar o timer e salvar progresso">
          <FaRedo />
        </button>
      </div>
    </div>
  );
} 