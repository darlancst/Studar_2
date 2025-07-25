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
  elapsedSeconds: number; // segundos decorridos na sessão atual
  
  // Sessões (do Pomodoro, não do estudo geral)
  sessions: PomodoroSession[];
  
  // Ações
  fetchPomodoroData: () => Promise<void>;
  startTimer: (topicId: string) => void;
  pauseTimer: () => void;
  resetTimer: (saveProgress: boolean) => void;
  skipToNext: () => void;
  tick: () => void;
  _advanceState: () => void;
  
  // Sessões Pomodoro
  addSession: (topicId: string, duration: number) => Promise<void>;
  getSessionsByTopicId: (topicId: string) => PomodoroSession[];
  getTotalStudyTimeByTopicId: (topicId: string) => number; // Tempo total histórico apenas das sessões pomodoro
  getCurrentSessionTime: () => number; // Retorna o tempo da sessão atual em minutos
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
    // A lógica de salvar foi movida para a função tick().
    // Esta função agora apenas reseta o estado do timer.
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
    // A lógica de salvar foi movida para a função tick().
    // Quando uma sessão de foco termina (pulada ou finalizada), apenas avançamos o estado.
    // Os minutos completos já foram salvos pelo tick.
    get()._advanceState(); // Avança para o próximo estado (pausa, etc.)
  },

  _advanceState: () => {
    const { currentState, completedPomodoros, lastPomodoroDate } = get();
    const { settings } = useSettingsStore.getState();
    const update: Partial<PomodoroStore> = {};
    let nextState: PomodoroState;
    let nextTimeRemaining: number;

    if (currentState === 'focus') {
      const today = new Date();
      const lastDate = lastPomodoroDate ? new Date(lastPomodoroDate) : null;
      
      const isToday = lastDate && isSameDay(today, lastDate);
      
      const newCompleted = isToday ? completedPomodoros + 1 : 1;
      update.completedPomodoros = newCompleted;
      update.lastPomodoroDate = today.toISOString();

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
    
    playNotificationSound(); // Toca o som ao avançar o estado
    
    update.currentState = nextState;
    update.timeRemaining = nextTimeRemaining;
    update.elapsedSeconds = 0;
    update.isRunning = true;
    
    set(update);
  },
  
  tick: () => {
    const { timeRemaining, currentState, currentTopicId, isRunning, elapsedSeconds } = get();

    if (!isRunning) {
      return;
    }

    // Finaliza a sessão se o tempo acabar
    if (timeRemaining <= 1) {
      // Antes de avançar, verifica se o último segundo completa um minuto que precisa ser salvo.
      const newElapsedSecondsOnFinish = elapsedSeconds + 1;
      if (currentState === 'focus' && currentTopicId && newElapsedSecondsOnFinish > 0 && newElapsedSecondsOnFinish % 60 === 0) {
        get().addSession(currentTopicId, 1);
      }
      get().skipToNext();
      return;
    }

    const newElapsedSeconds = elapsedSeconds + 1;

    // Salva um bloco de 1 minuto toda vez que um minuto de foco se passa.
    if (currentState === 'focus' && currentTopicId && newElapsedSeconds > 0 && newElapsedSeconds % 60 === 0) {
      get().addSession(currentTopicId, 1);
    }
    
    set({
      timeRemaining: timeRemaining - 1,
      elapsedSeconds: newElapsedSeconds,
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
  
  getCurrentSessionTime: () => {
    const { elapsedSeconds, currentState, currentTopicId, isRunning } = get();
    if (currentState !== 'focus' || !currentTopicId || !isRunning) return 0;
    return Math.floor(elapsedSeconds / 60);
  },
})); 