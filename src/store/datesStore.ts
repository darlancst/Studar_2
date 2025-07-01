import { create } from 'zustand';
import { format } from 'date-fns';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface DatesState {
  studyDates: string[]; // Array of date strings in 'yyyy-MM-dd' format
  fetchStudyDates: () => Promise<void>;
  addDate: (date?: Date) => Promise<void>;
  hasStudiedOnDate: (date: Date) => boolean;
  getDates: () => string[];
  resetDates: () => Promise<void>;
}

export const useDatesStore = create<DatesState>((set, get) => ({
  studyDates: [],

  fetchStudyDates: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('study_dates')
      .select('date')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching study dates:', error);
    } else {
      const dates = data.map(d => d.date);
      set({ studyDates: dates || [] });
    }
  },

  addDate: async (date = new Date()) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (get().studyDates.includes(dateStr)) {
      return; // Date already exists
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('study_dates').insert({ user_id: user.id, date: dateStr });

    if (error) {
      console.error('Error adding study date:', error);
    } else {
      set((state) => ({ studyDates: [...state.studyDates, dateStr] }));
    }
  },

  hasStudiedOnDate: (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return get().studyDates.includes(dateStr);
  },

  getDates: () => {
    return get().studyDates;
  },

  resetDates: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('study_dates').delete().eq('user_id', user.id);
    if (error) {
      console.error('Error resetting dates:', error);
    } else {
      set({ studyDates: [] });
    }
  },
}));