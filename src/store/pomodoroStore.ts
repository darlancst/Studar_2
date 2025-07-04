import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { PomodoroSession, PomodoroState } from '@/types';
import { useDatesStore } from './datesStore';
import { createClient } from '@/lib/supabase/client';
import { useSettingsStore } from './settingsStore';
import { isSameDay } from 'date-fns';

const supabase = createClient();

interface PomodoroStore {
  // Estado atual
  currentState: PomodoroState;
  isRunning: boolean;
  currentTopicId: string | null;
  timeRemaining: number; // em segundos
  completedPomodoros: number;
  lastPomodoroDate: string | null;
  
  // Referência ao Worker
  worker: Worker | null;
  
  // Sessões (do Pomodoro, não do estudo geral)
  sessions: PomodoroSession[];
  
  // Ações
  fetchPomodoroData: () => Promise<void>;
  initializeWorker: () => void;
  terminateWorker: () => void;
  startTimer: (topicId: string) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipToNext: () => void;
  updateWorkerSettings: () => void;
  
  // Ações internas
  _advanceState: (previousState: PomodoroState) => void;
  
  // Sessões Pomodoro
  addSession: (topicId: string, duration: number) => Promise<void>;
  getSessionsByTopicId: (topicId: string) => PomodoroSession[];
  getTotalStudyTimeByTopicId: (topicId: string) => number;
}

const playNotificationSound = () => {
  const audio = new Audio('https://www.orangefreesounds.com/wp-content/uploads/2020/04/Alert-notification.mp3');
  audio.play().catch(error => {
    // A reprodução automática pode falhar se o usuário não tiver interagido com a página
    console.log("Falha ao tocar o som de notificação:", error);
  });
};

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  // Estado inicial
  currentState: 'idle',
  isRunning: false,
  currentTopicId: null,
  timeRemaining: useSettingsStore.getState().settings.pomodoro.focusDuration * 60,
  completedPomodoros: 0,
  lastPomodoroDate: null,
  worker: null,
  
  sessions: [],

  initializeWorker: () => {
    // Evita criar múltiplos workers
    if (get().worker) return;

    const worker = new Worker('/pomodoro-worker.js');

    worker.onmessage = (e) => {
      const { type, timeRemaining, finalState } = e.data;

      switch (type) {
        case 'TICK':
          set({ timeRemaining });
          break;
        case 'MINUTE_COMPLETED':
          const { currentTopicId } = get();
          if (currentTopicId) {
            get().addSession(currentTopicId, 1);
          }
          break;
        case 'CYCLE_ENDED':
          get()._advanceState(finalState);
          break;
      }
    };

    set({ worker });
    // Envia as configurações iniciais para o worker
    get().updateWorkerSettings();
  },

  terminateWorker: () => {
    const { worker } = get();
    if (worker) {
      worker.terminate();
      set({ worker: null, isRunning: false });
    }
  },

  fetchPomodoroData: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('pomodoro_sessions')
      .select('*')
      .eq('user_id', user.id);

    if (sessionsError) {
      console.error('Error fetching pomodoro sessions:', sessionsError);
    } else {
      const mappedSessions: PomodoroSession[] = (sessions || []).map(s => ({
        id: s.id,
        topicId: s.topic_id, // Mapeamento
        duration: s.duration,
        date: s.date,
      }));
      set({ sessions: mappedSessions });
    }
  },
  
  startTimer: (topicId) => {
    const { worker, timeRemaining, isRunning, currentState } = get();
    if (!worker) return;
    
    // Se já estiver rodando, não faz nada
    if (isRunning) return;

    // Se estiver pausado, retoma.
    if (currentState !== 'idle') {
        worker.postMessage({ command: 'RESUME' });
    } else { // Se estiver 'idle', inicia um novo ciclo de foco.
        worker.postMessage({ command: 'START' });
        set({ currentState: 'focus' });
    }
    
    set({ isRunning: true, currentTopicId: topicId });
  },
  
  pauseTimer: () => {
    const { worker } = get();
    if (worker) {
      worker.postMessage({ command: 'PAUSE' });
      set({ isRunning: false });
    }
  },
  
  resetTimer: () => {
    const { worker } = get();
    const { settings } = useSettingsStore.getState();
    if (worker) {
      worker.postMessage({ command: 'RESET', newSettings: settings.pomodoro });
    }
    set({
      isRunning: false,
      currentState: 'idle',
      currentTopicId: null,
      timeRemaining: settings.pomodoro.focusDuration * 60,
    });
  },
  
  skipToNext: () => {
    const { worker } = get();
    if (worker) {
      worker.postMessage({ command: 'SKIP' });
      set({ isRunning: false }); // Para a UI imediatamente
    }
  },

  updateWorkerSettings: () => {
    const { worker } = get();
    const { settings } = useSettingsStore.getState();
    if (worker) {
      worker.postMessage({ command: 'UPDATE_SETTINGS', newSettings: settings.pomodoro });
    }
  },

  _advanceState: (previousState) => {
    const { completedPomodoros, lastPomodoroDate, worker } = get();
    const { settings } = useSettingsStore.getState();
    let nextState: PomodoroState;
    let nextTimeRemaining: number;

    // Apenas incrementa o pomodoro se o ciclo anterior foi de foco
    if (previousState === 'focus') {
      const today = new Date();
      const lastDate = lastPomodoroDate ? new Date(lastPomodoroDate) : null;
      const isToday = lastDate && isSameDay(today, lastDate);
      const newCompleted = isToday ? completedPomodoros + 1 : 1;

      set({ 
        completedPomodoros: newCompleted, 
        lastPomodoroDate: today.toISOString()
      });

      if (newCompleted % settings.pomodoro.longBreakInterval === 0) {
        nextState = 'longBreak';
        nextTimeRemaining = settings.pomodoro.longBreakDuration * 60;
      } else {
        nextState = 'shortBreak';
        nextTimeRemaining = settings.pomodoro.shortBreakDuration * 60;
      }
    } else { // Se estava em pausa, volta para o foco
      nextState = 'focus';
      nextTimeRemaining = settings.pomodoro.focusDuration * 60;
    }
    
    playNotificationSound();
    
    if (worker) {
        worker.postMessage({ command: 'SET_STATE', state: nextState, time: nextTimeRemaining });
    }

    set({
      currentState: nextState,
      timeRemaining: nextTimeRemaining,
      isRunning: true,
    });
  },
  
  addSession: async (topicId, duration) => {
    if (duration <= 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const newSession = {
      topic_id: topicId, // snake_case para o banco
      duration, 
      date: new Date().toISOString(),
      user_id: user.id,
    };

    const { data, error } = await supabase.from('pomodoro_sessions').insert(newSession).select().single();
    if (error) {
      console.error('Error adding pomodoro session:', error);
      return;
    }
    
    const mappedSession: PomodoroSession = {
      id: data.id,
      topicId: data.topic_id, // camelCase para o app
      duration: data.duration,
      date: data.date,
    };

    set((state) => ({
      sessions: [...state.sessions, mappedSession],
    }));
    
    useDatesStore.getState().addDate(new Date(mappedSession.date));
  },
  
  getSessionsByTopicId: (topicId) => {
    return get().sessions.filter((session) => session.topicId === topicId);
  },
  
  getTotalStudyTimeByTopicId: (topicId) => {
    const sessions = get().getSessionsByTopicId(topicId);
    return sessions.reduce((total, session) => total + session.duration, 0);
  },
})); 