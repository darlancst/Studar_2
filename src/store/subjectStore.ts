import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Subject, Topic } from '@/types';
import { supabase, getCurrentUser, handleSupabaseError } from '@/lib/supabase/utils';

interface SubjectState {
  subjects: Subject[];
  loading: boolean;
  error: string | null;
  
  // Ações
  addSubject: (name: string, color: string) => Promise<Subject | null>;
  updateSubject: (id: string, data: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  getSubjectById: (id: string) => Subject | undefined;
  getSubjectsWithTopics: () => Subject[];
  resetSubjects: () => void;
  
  // Carregamento inicial
  loadSubjects: () => Promise<void>;
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  loading: false,
  error: null,

  loadSubjects: async () => {
    set({ loading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        handleSupabaseError(error, 'carregar matérias');
      }

      set({ 
        subjects: data || [], 
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      });
    }
  },

  addSubject: async (name, color) => {
    set({ loading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ loading: false });
        return null;
      }

      const newSubject: Subject = {
        id: uuidv4(),
        name,
        color,
        createdAt: new Date(),
        topics: [],
      };

      const { error } = await supabase
        .from('subjects')
        .insert({
          id: newSubject.id,
          user_id: user.id,
          name: newSubject.name,
          color: newSubject.color,
          created_at: newSubject.createdAt.toISOString(),
        });

      if (error) {
        handleSupabaseError(error, 'adicionar matéria');
      }

      set((state) => ({
        subjects: [...state.subjects, newSubject],
        loading: false
      }));

      return newSubject;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      });
      return null;
    }
  },

  updateSubject: async (id, data) => {
    set({ loading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.color !== undefined) updateData.color = data.color;

      const { error } = await supabase
        .from('subjects')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        handleSupabaseError(error, 'atualizar matéria');
      }

      set((state) => ({
        subjects: state.subjects.map((subject) =>
          subject.id === id ? { ...subject, ...data } : subject
        ),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      });
    }
  },

  deleteSubject: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        handleSupabaseError(error, 'deletar matéria');
      }

      set((state) => ({
        subjects: state.subjects.filter((subject) => subject.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      });
    }
  },

  getSubjectById: (id) => {
    return get().subjects.find((subject) => subject.id === id);
  },

  getSubjectsWithTopics: () => {
    const { useTopicStore } = require('./topicStore');
    const topicStore = useTopicStore.getState();
    const allTopics = topicStore.topics;
    
    return get().subjects.map(subject => {
      const subjectTopics = allTopics.filter((topic: Topic) => topic.subjectId === subject.id);
      return {
        ...subject,
        topics: subjectTopics
      };
    });
  },

  resetSubjects: () => {
    set({ subjects: [] });
  },
})); 