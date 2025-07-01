"""import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Topic } from '@/types';
import { useReviewStore } from './reviewStore';
import { useSettingsStore } from './settingsStore';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface TopicState {
  topics: Topic[];
  fetchTopics: () => Promise<void>;
  addTopic: (title: string, subjectId: string, description?: string, customDate?: Date) => Promise<Topic | undefined>;
  updateTopic: (id: string, data: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  getTopicsBySubjectId: (subjectId: string) => Topic[];
  getTopicById: (id: string) => Topic | undefined;
  resetTopics: () => void;
}

export const useTopicStore = create<TopicState>((set, get) => ({
  topics: [],
  fetchTopics: async () => {
    const { data: topics, error } = await supabase.from('topics').select('*');
    if (error) {
      console.error('Error fetching topics:', error);
      return;
    }
    set({ topics: topics || [] });
  },
  addTopic: async (title, subjectId, description, customDate) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not logged in');
      return;
    }

    const newTopic: Omit<Topic, 'id' | 'createdAt'> & { user_id: string } = {
      title,
      subjectId,
      description,
      user_id: user.id,
      ...(customDate && { createdAt: customDate.toISOString() }),
    };

    const { data, error } = await supabase.from('topics').insert(newTopic).select().single();
    if (error) {
      console.error('Error adding topic:', error);
      return;
    }

    set((state) => ({
      topics: [...state.topics, data],
    }));

    // Cria revisões usando os intervalos personalizados do usuário
    const reviewStore = useReviewStore.getState();
    const settingsStore = useSettingsStore.getState();
    // Usa a data personalizada se fornecida, ou a data atual
    const today = customDate || new Date();

    // Usa os intervalos definidos pelo usuário (ou os padrão)
    settingsStore.reviewIntervals.forEach(days => {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + days);
      reviewStore.addReview(data.id, scheduledDate);
    });

    return data;
  },
  updateTopic: async (id, data) => {
    const { error } = await supabase.from('topics').update(data).eq('id', id);
    if (error) {
      console.error('Error updating topic:', error);
      return;
    }
    set((state) => ({
      topics: state.topics.map((topic) =>
        topic.id === id ? { ...topic, ...data } : topic
      ),
    }));
  },
  deleteTopic: async (id) => {
    const { error } = await supabase.from('topics').delete().eq('id', id);
    if (error) {
      console.error('Error deleting topic:', error);
      return;
    }
    set((state) => ({
      topics: state.topics.filter((topic) => topic.id !== id),
    }));

    // Remove revisões associadas
    const reviewStore = useReviewStore.getState();
    reviewStore.deleteReviewsByTopicId(id);
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
}));"" 