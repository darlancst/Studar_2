import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Topic } from '@/types';
import { supabase, getCurrentUser, handleSupabaseError } from '@/lib/supabase/utils';
import { useReviewStore } from './reviewStore';
import { useSettingsStore } from './settingsStore';

interface TopicState {
  topics: Topic[];
  loading: boolean;
  error: string | null;
  
  // Ações
  addTopic: (title: string, subjectId: string, description?: string, customDate?: Date) => Promise<Topic | null>;
  updateTopic: (id: string, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  getTopicsBySubjectId: (subjectId: string) => Topic[];
  getTopicById: (id: string) => Topic | undefined;
  resetTopics: () => void;
  
  // Carregamento inicial
  loadTopics: () => Promise<void>;
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: [],
  loading: false,
  error: null,

  loadTopics: async () => {
    set({ loading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        handleSupabaseError(error, 'carregar tópicos');
      }

      set({ 
        topics: data || [], 
        loading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      });
    }
  },

  addTopic: async (title, subjectId, description, customDate) => {
    set({ loading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ loading: false });
        return null;
      }

      const newTopic: Topic = {
        id: uuidv4(),
        title,
        subjectId,
        description,
        createdAt: customDate || new Date(),
      };

      const { error } = await supabase
        .from('topics')
        .insert({
          id: newTopic.id,
          user_id: user.id,
          subject_id: newTopic.subjectId,
          title: newTopic.title,
          description: newTopic.description,
          created_at: newTopic.createdAt.toISOString(),
        });

      if (error) {
        handleSupabaseError(error, 'adicionar tópico');
      }

      set((state) => ({
        topics: [...state.topics, newTopic],
        loading: false
      }));

      // Cria revisões usando os intervalos personalizados do usuário
      const reviewStore = useReviewStore.getState();
      const settingsStore = useSettingsStore.getState();
      const today = customDate || new Date();
      
      settingsStore.reviewIntervals.forEach(days => {
        const scheduledDate = new Date(today);
        scheduledDate.setDate(today.getDate() + days);
        reviewStore.addReview(newTopic.id, scheduledDate);
      });

      return newTopic;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      });
      return null;
    }
  },

  updateTopic: async (id, data) => {
    set({ loading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.subjectId !== undefined) updateData.subject_id = data.subjectId;

      const { error } = await supabase
        .from('topics')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        handleSupabaseError(error, 'atualizar tópico');
      }

      set((state) => ({
        topics: state.topics.map((topic) =>
          topic.id === id ? { ...topic, ...data } : topic
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

  deleteTopic: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const user = await getCurrentUser();
      if (!user) {
        set({ loading: false });
        return;
      }

      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        handleSupabaseError(error, 'deletar tópico');
      }

      set((state) => ({
        topics: state.topics.filter((topic) => topic.id !== id),
        loading: false
      }));

      // Remove revisões associadas
      const reviewStore = useReviewStore.getState();
      reviewStore.deleteReviewsByTopicId(id);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      });
    }
  },

  getTopicsBySubjectId: (subjectId) => {
    return get().topics.filter((topic) => topic.subjectId === subjectId);
  },

  getTopicById: (id) => {
    return get().topics.find((topic) => topic.id === id);
  },

  resetTopics: () => {
    set({ topics: [] });
  },
})); 