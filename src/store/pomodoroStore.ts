import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { PomodoroSession, PomodoroSettings, PomodoroState } from '@/types';
import { useDatesStore } from './datesStore';
import { createClient } from '@/lib/supabase/client';

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
  
  // Configurações
  settings: PomodoroSettings;
  
  // Ações
  fetchPomodoroData: () => Promise<void>;
  startTimer: (topicId: string) => void;
  pauseTimer: () => void;
  resetTimer: (saveProgress: boolean) => void;
  skipToNext: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => Promise<void>;
  incrementElapsedTime: (seconds: number) => void;
  interruptFocusSession: (topicId: string, elapsedSeconds: number) => void;
  _advanceState: () => void;
  
  // Sessões Pomodoro
  addSession: (topicId: string, duration: number) => Promise<void>;
  getSessionsByTopicId: (topicId: string) => PomodoroSession[];
  getTotalStudyTimeByTopicId: (topicId: string) => number; // Tempo total histórico apenas das sessões pomodoro
  getCurrentSessionTime: () => number; // Retorna o tempo da sessão atual em minutos
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25, // 25 minutos
  shortBreakDuration: 5, // 5 minutos
  longBreakDuration: 15, // 15 minutos
  longBreakInterval: 4, // A cada 4 pomodoros
};

export const usePomodoroStore = create<PomodoroStore>((set, get) => ({
  // Estado inicial
  currentState: 'idle',
  isRunning: false,
  currentTopicId: null,
  timeRemaining: DEFAULT_SETTINGS.focusDuration * 60, // em segundos
  completedPomodoros: 0,
  elapsedSeconds: 0,
  
  sessions: [],
  settings: DEFAULT_SETTINGS,

  fetchPomodoroData: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch settings
    const { data: userSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('settings') // Seleciona o objeto de configurações inteiro
      .eq('user_id', user.id)
      .single();

    if (settingsError || !userSettings) {
      console.error('Error fetching settings or no settings found', settingsError);
    } else if (userSettings.settings && userSettings.settings.pomodoro) { // Verifica se pomodoro settings existem
      set({ settings: { ...DEFAULT_SETTINGS, ...userSettings.settings.pomodoro } });
    }

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
    set({
      isRunning: true,
      currentTopicId: topicId,
      currentState: 'focus',
      timeRemaining: get().settings.focusDuration * 60,
      elapsedSeconds: 0,
    });
  },
  
  pauseTimer: () => {
    if (get().currentState === 'focus' && get().currentTopicId && get().elapsedSeconds > 0) {
      const elapsedMinutes = Math.floor(get().elapsedSeconds / 60);
      if (elapsedMinutes > 0) {
        get().addSession(get().currentTopicId!, elapsedMinutes);
      }
      set({ elapsedSeconds: 0 }); 
    }
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
    set({
      isRunning: false,
      currentState: 'idle',
      currentTopicId: null,
      timeRemaining: get().settings.focusDuration * 60,
      elapsedSeconds: 0,
    });
  },
  
  skipToNext: () => {
    const { currentState, currentTopicId, settings, elapsedSeconds } = get();

    if (currentState === 'focus' && currentTopicId) {
      // Salva o tempo decorrido ou a sessão completa
      const durationToSave = elapsedSeconds > 0 ? Math.floor(elapsedSeconds / 60) : settings.focusDuration;
      if (durationToSave > 0) {
        get().addSession(currentTopicId, durationToSave);
      }
    }
    get()._advanceState(); // Avança para o próximo estado (pausa, etc.)
  },

  _advanceState: () => {
    const { currentState, completedPomodoros, settings } = get();
    let nextState: PomodoroState;
    let nextTimeRemaining: number;

    if (currentState === 'focus') {
      const newCompleted = completedPomodoros + 1;
      set({ completedPomodoros: newCompleted });

      if (newCompleted % settings.longBreakInterval === 0) {
        nextState = 'longBreak';
        nextTimeRemaining = settings.longBreakDuration * 60;
      } else {
        nextState = 'shortBreak';
        nextTimeRemaining = settings.shortBreakDuration * 60;
      }
    } else { // Se estava em pausa curta ou longa
      nextState = 'focus';
      nextTimeRemaining = settings.focusDuration * 60;
    }
    
    set({
      currentState: nextState,
      timeRemaining: nextTimeRemaining,
      elapsedSeconds: 0,
      isRunning: true, // Continua rodando no próximo estado
    });
  },
  
  updateSettings: async (newSettings) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentSettings = get().settings;
    const updatedPomodoroSettings = { ...currentSettings, ...newSettings };
    set({ settings: updatedPomodoroSettings });

    // Pega as configurações gerais existentes para não sobrescrevê-las
    const { data: existingSettingsData } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    const existingSettings = existingSettingsData?.settings || {};

    const updatedGeneralSettings = {
      ...existingSettings,
      pomodoro: updatedPomodoroSettings, // Aninha as configs do pomodoro
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, settings: updatedGeneralSettings });

    if (error) {
      console.error('Error updating settings:', error);
      // Optionally revert state
    }
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