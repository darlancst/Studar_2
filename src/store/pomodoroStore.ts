'use client';

import { create } from 'zustand';
import { isSameDay } from 'date-fns';
import { useSettingsStore } from './settingsStore';
import { createClient } from '@/lib/supabase/client';
import { useDatesStore } from './datesStore';

const supabase = createClient();

type PomodoroState = 'focus' | 'shortBreak' | 'longBreak' | 'idle';

interface PomodoroStore {
  currentTopicId: string | null;
  currentState: PomodoroState;
  timeRemaining: number;
  isRunning: boolean;
  completedPomodoros: number;
  elapsedSeconds: number;
  lastPomodoroDate: string | null;
  worker: Worker | null;
  audio: HTMLAudioElement | null;
  notificationPermission: 'default' | 'granted' | 'denied';
  initWorker: () => void;
  startTimer: (topicId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: (resetCycles: boolean) => void;
  skipToNext: () => void;
  saveProgress: () => Promise<void>;
  playSound: () => void;
  requestNotificationPermission: () => void;
}

const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  currentTopicId: null,
  currentState: 'idle',
  timeRemaining: 25 * 60,
  isRunning: false,
  completedPomodoros: 0,
  elapsedSeconds: 0,
  lastPomodoroDate: null,
  worker: null,
  audio: null,
  notificationPermission: 'default',

  initWorker: () => {
    if (get().worker) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      set({ notificationPermission: Notification.permission });
    }

    const worker = new Worker('/pomodoro.worker.js');
    set({ worker });

    const audio = new Audio('/alarm.mp3');
    set({ audio });

    worker.onmessage = (e) => {
      const { timeRemaining: newTimeRemaining, isRunning: newIsRunning } = e.data;

      if (typeof newTimeRemaining === 'number') {
        const previousTime = get().timeRemaining;
        set({ timeRemaining: newTimeRemaining, isRunning: newIsRunning });

        if (Math.floor(previousTime / 60) > Math.floor(newTimeRemaining / 60)) {
          get().saveProgress();
        }

        if (newTimeRemaining === 0) {
          get().playSound();
          
          const { currentState, notificationPermission } = get();
          if (notificationPermission === 'granted') {
            const body = currentState === 'focus' 
              ? 'Hora de uma pausa!' 
              : 'Pausa finalizada. Hora de focar!';
            new Notification('Pomodoro Finalizado', {
              body,
              icon: '/icons/icon-192x192.png'
            });
          }

          setTimeout(() => {
            get().skipToNext();
          }, 1000);
        }
      }
    };
  },
  
  startTimer: (topicId) => {
    const { pomodoro } = useSettingsStore.getState().settings;
    set({
      currentTopicId: topicId,
      currentState: 'focus',
      timeRemaining: pomodoro.focusDuration * 60,
      isRunning: true,
      elapsedSeconds: 0,
      lastPomodoroDate: new Date().toISOString(),
    });
    get().worker?.postMessage({
      action: 'start',
      timeRemaining: pomodoro.focusDuration * 60,
    });
  },

  pauseTimer: () => {
    get().worker?.postMessage({ action: 'pause' });
    set({ isRunning: false });
    get().saveProgress();
  },

  resumeTimer: () => {
    get().worker?.postMessage({ action: 'resume' });
    set({ isRunning: true });
  },

  resetTimer: (resetCycles = true) => {
    get().worker?.postMessage({ action: 'pause' });

    const { pomodoro } = useSettingsStore.getState().settings;
    const newState: Partial<PomodoroStore> = {
      isRunning: false,
      currentState: 'idle',
      timeRemaining: pomodoro.focusDuration * 60,
      elapsedSeconds: 0,
    };
    if (resetCycles) {
      newState.completedPomodoros = 0;
    }
    set(newState);
    get().saveProgress();
  },
  
  skipToNext: () => {
    get().saveProgress();
    get().worker?.postMessage({ action: 'pause' });

    const { currentState, completedPomodoros } = get();
    const { focusDuration, shortBreakDuration, longBreakDuration, longBreakInterval } = useSettingsStore.getState().settings.pomodoro;
    let nextState: PomodoroState;
    let newTimeRemaining: number;
    let newCompletedPomodoros = completedPomodoros;

    if (currentState === 'focus') {
      newCompletedPomodoros++;
      if (newCompletedPomodoros % longBreakInterval === 0) {
        nextState = 'longBreak';
        newTimeRemaining = longBreakDuration * 60;
      } else {
        nextState = 'shortBreak';
        newTimeRemaining = shortBreakDuration * 60;
      }
    } else {
      nextState = 'focus';
      newTimeRemaining = focusDuration * 60;
    }

    set({
      currentState: nextState,
      timeRemaining: newTimeRemaining,
      isRunning: true,
      completedPomodoros: newCompletedPomodoros,
      elapsedSeconds: 0,
      lastPomodoroDate: new Date().toISOString(),
    });

    get().worker?.postMessage({ action: 'start', timeRemaining: newTimeRemaining });
  },

  saveProgress: async () => {
    const { currentTopicId, elapsedSeconds, lastPomodoroDate } = get();

    if (!currentTopicId || elapsedSeconds === 0) {
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const sessionData = {
      topic_id: currentTopicId,
      user_id: user.id,
      duration: elapsedSeconds,
      date: lastPomodoroDate,
    };

    const { error } = await supabase.from('pomodoro_sessions').insert(sessionData);

    if (error) {
      console.error('Error saving pomodoro session:', error);
    } else {
      set({ elapsedSeconds: 0 }); 
      if (lastPomodoroDate) {
        useDatesStore.getState().addDate(new Date(lastPomodoroDate));
      }
    }
  },

  playSound: () => {
    const audio = get().audio;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => console.error("Error playing sound:", e));
    }
  },

  requestNotificationPermission: async () => {
    if (!('Notification' in window)) {
      console.log("Este navegador não suporta notificações de desktop");
      return;
    }

    const permission = await Notification.requestPermission();
    set({ notificationPermission: permission });
  },
}));

export { usePomodoroStore }; 