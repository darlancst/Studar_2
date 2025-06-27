import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Subject, Topic } from '@/types';
import { useTopicStore } from './topicStore';

interface SubjectState {
  subjects: Subject[];
  addSubject: (name: string, color: string) => void;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  getSubjectById: (id: string) => Subject | undefined;
  getSubjectsWithTopics: () => Subject[];
  resetSubjects: () => void;
}

export const useSubjectStore = create<SubjectState>()(
  persist(
    (set, get) => ({
      subjects: [],
      addSubject: (name, color) => {
        const newSubject: Subject = {
          id: uuidv4(),
          name,
          color,
          createdAt: new Date(),
          topics: [],
        };
        set((state) => ({
          subjects: [...state.subjects, newSubject],
        }));
        return newSubject;
      },
      updateSubject: (id, data) => {
        set((state) => ({
          subjects: state.subjects.map((subject) =>
            subject.id === id ? { ...subject, ...data } : subject
          ),
        }));
      },
      deleteSubject: (id) => {
        set((state) => ({
          subjects: state.subjects.filter((subject) => subject.id !== id),
        }));
      },
      getSubjectById: (id) => {
        return get().subjects.find((subject) => subject.id === id);
      },
      getSubjectsWithTopics: () => {
        const topicStore = useTopicStore.getState();
        const allTopics = topicStore.topics;
        
        return get().subjects.map(subject => {
          const subjectTopics = allTopics.filter(topic => topic.subjectId === subject.id);
          return {
            ...subject,
            topics: subjectTopics
          };
        });
      },
      resetSubjects: () => {
        set({ subjects: [] });
      },
    }),
    {
      name: 'subject-storage',
    }
  )
); 