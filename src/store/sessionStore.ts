import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Interface para a sessão de estudo
export interface StudySession {
  id: string;
  topicId: string;
  subjectId: string;
  duration: number; // em minutos
  date: string; // data ISO string
}

interface SessionState {
  sessions: StudySession[];
  fetchSessions: () => Promise<void>;
  addSession: (topicId: string, subjectId: string, duration: number) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, data: Partial<StudySession>) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  
  fetchSessions: async () => {
    const { data: sessions, error } = await supabase.from('study_sessions').select('*');
    if (error) {
      console.error('Error fetching study sessions:', error);
      return;
    }
    set({ sessions: sessions || [] });
  },
  
  addSession: async (topicId, subjectId, duration) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newSession: Omit<StudySession, 'id'> & { user_id: string } = {
      topicId,
      subjectId,
      duration,
      date: new Date().toISOString(),
      user_id: user.id,
    };

    const { data, error } = await supabase.from('study_sessions').insert(newSession).select().single();
    if (error) {
      console.error('Error adding study session:', error);
      return;
    }
    
    set((state) => ({
      sessions: [...state.sessions, data],
    }));
  },
  
  removeSession: async (sessionId) => {
    const { error } = await supabase.from('study_sessions').delete().eq('id', sessionId);
    if (error) {
      console.error('Error deleting study session:', error);
      return;
    }
    set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== sessionId),
    }));
  },
  
  updateSession: async (sessionId, data) => {
    const { error } = await supabase.from('study_sessions').update(data).eq('id', sessionId);
    if (error) {
      console.error('Error updating study session:', error);
      return;
    }
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId ? { ...session, ...data } : session
      ),
    }));
  },
}));