import { create } from 'zustand';
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
    const { data, error } = await supabase.from('topics').select('*');
    if (error) {
      console.error('Error fetching topics:', error);
      return;
    }
    // Mapeia de snake_case (banco) para camelCase (app)
    const mappedTopics: Topic[] = (data || []).map(topic => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      subjectId: topic.subject_id,
      createdAt: new Date(topic.created_at),
    }));
    set({ topics: mappedTopics });
  },
  addTopic: async (title, subjectId, description, customDate) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not logged in');
      return;
    }

    const newTopic = {
      title,
      subject_id: subjectId,
      description,
      user_id: user.id,
      ...(customDate && { created_at: customDate.toISOString() }),
    };

    const { data, error } = await supabase.from('topics').insert(newTopic).select().single();
    if (error) {
      console.error('Error adding topic:', error);
      return;
    }

    // Mapeia o resultado do banco para o tipo camelCase do app antes de salvar no estado
    const newTopicMapped: Topic = {
      id: data.id,
      title: data.title,
      description: data.description,
      subjectId: data.subject_id,
      createdAt: new Date(data.created_at),
    };

    set((state) => ({
      topics: [...state.topics, newTopicMapped],
    }));

    // Cria revisões usando os intervalos personalizados do usuário
    const reviewStore = useReviewStore.getState();
    const settingsStore = useSettingsStore.getState();
    // Usa a data personalizada se fornecida, ou a data atual
    const today = customDate || new Date();

    // Usa os intervalos definidos pelo usuário (ou os padrão)
    settingsStore.settings.reviewIntervals.forEach((days: number) => {
      const scheduledDate = new Date(today);
      scheduledDate.setDate(today.getDate() + days);
      reviewStore.addReview(data.id, scheduledDate);
    });

    return newTopicMapped;
  },
  updateTopic: async (id, data) => {
    // Para update, precisamos mapear os dados do app (camelCase) para o banco (snake_case)
    const dataToUpdate: any = {};
    if (data.subjectId) dataToUpdate.subject_id = data.subjectId;
    if (data.createdAt) dataToUpdate.created_at = data.createdAt;
    if (data.title) dataToUpdate.title = data.title;
    if (data.description) dataToUpdate.description = data.description;

    const { error } = await supabase.from('topics').update(dataToUpdate).eq('id', id);
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
})); 