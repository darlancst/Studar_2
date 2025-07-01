import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Subject } from '@/types';
import { useTopicStore } from './topicStore';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface SubjectState {
  subjects: Subject[];
  fetchSubjects: () => Promise<void>;
  addSubject: (name: string, color: string) => Promise<void>;
  updateSubject: (id: string, data: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  getSubjectById: (id: string) => Subject | undefined;
  getSubjectsWithTopics: () => Subject[];
  resetSubjects: () => void;
}

export const useSubjectStore = create<SubjectState>((set, get) => ({
  subjects: [],
  fetchSubjects: async () => {
    const { data: subjects, error } = await supabase.from('subjects').select('*');
    if (error) {
      console.error('Error fetching subjects:', error);
      return;
    }
    set({ subjects: subjects || [] });
  },
  addSubject: async (name, color) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not logged in');
      return;
    }

    const newSubject: Omit<Subject, 'id' | 'createdAt' | 'topics'> & { user_id: string } = {
      name,
      color,
      user_id: user.id,
    };

    const { data, error } = await supabase.from('subjects').insert(newSubject).select().single();
    if (error) {
      console.error('Error adding subject:', error);
      return;
    }
    
    set((state) => ({
      subjects: [...state.subjects, { ...data, topics: [] }],
    }));
  },
  updateSubject: async (id, data) => {
    const { error } = await supabase.from('subjects').update(data).eq('id', id);
    if (error) {
      console.error('Error updating subject:', error);
      return;
    }
    set((state) => ({
      subjects: state.subjects.map((subject) =>
        subject.id === id ? { ...subject, ...data } : subject
      ),
    }));
  },
  deleteSubject: async (id) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      console.error('Error deleting subject:', error);
      return;
    }
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
})); 