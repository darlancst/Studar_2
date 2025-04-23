import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

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
  addSession: (topicId: string, subjectId: string, duration: number) => void;
  removeSession: (sessionId: string) => void;
  updateSession: (sessionId: string, data: Partial<StudySession>) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      sessions: [],
      
      addSession: (topicId, subjectId, duration) => {
        const newSession: StudySession = {
          id: uuidv4(),
          topicId,
          subjectId,
          duration,
          date: new Date().toISOString(),
        };
        
        set((state) => ({
          sessions: [...state.sessions, newSession],
        }));
      },
      
      removeSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((session) => session.id !== sessionId),
        }));
      },
      
      updateSession: (sessionId, data) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, ...data } : session
          ),
        }));
      },
    }),
    {
      name: 'study-sessions-storage',
    }
  )
); 