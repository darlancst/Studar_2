import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Topic } from '@/types';
import { useReviewStore } from './reviewStore';
import { useSettingsStore } from './settingsStore';

interface TopicState {
  topics: Topic[];
  addTopic: (title: string, subjectId: string, description?: string, customDate?: Date) => Topic;
  updateTopic: (id: string, data: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  getTopicsBySubjectId: (subjectId: string) => Topic[];
  getTopicById: (id: string) => Topic | undefined;
}

export const useTopicStore = create<TopicState>()(
  persist(
    (set, get) => ({
      topics: [],
      addTopic: (title, subjectId, description, customDate) => {
        const newTopic: Topic = {
          id: uuidv4(),
          title,
          subjectId,
          description,
          createdAt: customDate || new Date(),
        };
        set((state) => ({
          topics: [...state.topics, newTopic],
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
          reviewStore.addReview(newTopic.id, scheduledDate);
        });
        
        return newTopic;
      },
      updateTopic: (id, data) => {
        set((state) => ({
          topics: state.topics.map((topic) =>
            topic.id === id ? { ...topic, ...data } : topic
          ),
        }));
      },
      deleteTopic: (id) => {
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
    }),
    {
      name: 'topic-storage',
    }
  )
); 