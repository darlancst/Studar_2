import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { PomodoroSession, PomodoroState } from '@/types';
import { useDatesStore } from './datesStore';
import { createClient } from '@/lib/supabase/client';
import { useSettingsStore } from './settingsStore';

const supabase = createClient();

interface PomodoroStore {
  // Estado atual
  currentState: PomodoroState;
  isRunning: boolean;
  currentTopicId: string | null;
  timeRemaining: number; // em segundos
  completedPomodoros: number;
  elapsedSeconds: number; // segundos decorridos na sessão atual
  
  // Sessões (do Pomodoro, não do estudo geral)
  sessions: PomodoroSession[];
  
  // Ações
  fetchPomodoroData: () => Promise<void>;
  startTimer: (topicId: string) => void;
  pauseTimer: () => void;
  resetTimer: (saveProgress: boolean) => void;
  skipToNext: () => void;
  incrementElapsedTime: (seconds: number) => void;
  interruptFocusSession: (topicId: string, elapsedSeconds: number) => void;
  _advanceState: () => void;
  
  // Sessões Pomodoro
  addSession: (topicId: string, duration: number) => Promise<void>;
  getSessionsByTopicId: (topicId: string) => PomodoroSession[];
  getTotalStudyTimeByTopicId: (topicId: string) => number; // Tempo total histórico apenas das sessões pomodoro
  getCurrentSessionTime: () => number; // Retorna o tempo da sessão atual em minutos
}

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  // Estado inicial
  currentState: 'idle',
  isRunning: false,
  currentTopicId: null,
  timeRemaining: useSettingsStore.getState().settings.pomodoro.focusDuration * 60,
  completedPomodoros: 0,
  elapsedSeconds: 0,
  
  sessions: [],

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
    const { settings } = useSettingsStore.getState();
    set({
      isRunning: true,
      currentTopicId: topicId,
      currentState: 'focus',
      timeRemaining: settings.pomodoro.focusDuration * 60,
      elapsedSeconds: 0,
    });
  },
  
  pauseTimer: () => {
    set({ isRunning: false });
  },
  
  resetTimer: (saveProgress = false) => {
    const { currentState, currentTopicId, elapsedSeconds } = get();
    if (saveProgress && currentState === 'focus' && currentTopicId && elapsedSeconds > 0) {
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      if (elapsedMinutes > 0) {
        get().addSession(currentTopicId, elapsedMinutes);
      }
    }
    const { settings } = useSettingsStore.getState();
    set({
      isRunning: false,
      currentState: 'idle',
      currentTopicId: null,
      timeRemaining: settings.pomodoro.focusDuration * 60,
      elapsedSeconds: 0,
    });
  },
  
  skipToNext: () => {
    const { currentState, currentTopicId, elapsedSeconds } = get();
    const { settings } = useSettingsStore.getState();

    if (currentState === 'focus' && currentTopicId) {
      // Salva o tempo decorrido ou a sessão completa
      const durationToSave = elapsedSeconds > 0 ? Math.floor(elapsedSeconds / 60) : settings.pomodoro.focusDuration;
      if (durationToSave > 0) {
        get().addSession(currentTopicId, durationToSave);
      }
    }
    get()._advanceState(); // Avança para o próximo estado (pausa, etc.)
  },

  _advanceState: () => {
    const { currentState, completedPomodoros } = get();
    const { settings } = useSettingsStore.getState();
    let nextState: PomodoroState;
    let nextTimeRemaining: number;

    if (currentState === 'focus') {
      const newCompleted = completedPomodoros + 1;
      set({ completedPomodoros: newCompleted });

      if (newCompleted % settings.pomodoro.longBreakInterval === 0) {
        nextState = 'longBreak';
        nextTimeRemaining = settings.pomodoro.longBreakDuration * 60;
      } else {
        nextState = 'shortBreak';
        nextTimeRemaining = settings.pomodoro.shortBreakDuration * 60;
      }
    } else { // Se estava em pausa curta ou longa
      nextState = 'focus';
      nextTimeRemaining = settings.pomodoro.focusDuration * 60;
    }
    
    set({
      currentState: nextState,
      timeRemaining: nextTimeRemaining,
      elapsedSeconds: 0,
      isRunning: true, // Continua rodando no próximo estado
    });
  },
  
  incrementElapsedTime: (seconds) => {
    // This is purely client-side state
    set((state) => ({ elapsedSeconds: state.elapsedSeconds + seconds }));
  },
  
  interruptFocusSession: (topicId, elapsedSeconds) => {
    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    if (elapsedMinutes > 0) {
      get().addSession(topicId, elapsedMinutes);
    }
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
  
  getCurrentSessionTime: () => {
    const { elapsedSeconds, currentState, currentTopicId, isRunning } = get();
    if (currentState !== 'focus' || !currentTopicId || !isRunning) return 0;
    return Math.floor(elapsedSeconds / 60);
  },
})); 