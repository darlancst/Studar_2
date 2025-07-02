'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { usePomodoroStore } from '../store/pomodoroStore';
import { useTopicStore, type Topic } from '../store/topicStore';
import { useSubjectStore } from '../store/subjectStore';
import { FaForward, FaRedo } from 'react-icons/fa';
import { isSameDay } from 'date-fns';

export default function Pomodoro() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { topics, fetchTopics } = useTopicStore(
    useCallback(state => ({
      topics: state.topics,
      fetchTopics: state.fetchTopics,
    }), [])
  );
  
  const subjects = useSubjectStore(state => state.subjects);
  
  const {
    currentTopicId,
    currentState,
    timeRemaining,
    isRunning,
    completedPomodoros,
    settings,
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
      timeRemaining: settings.focusDuration * 60,
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Pomodoro</h2>
      
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
        {currentState === 'focus' && displaySessionMinutes > 0 && (
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