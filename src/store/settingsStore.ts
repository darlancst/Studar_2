import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { useSubjectStore } from './subjectStore';
import { useTopicStore } from './topicStore';
import { useReviewStore } from './reviewStore';
import { usePomodoroStore } from './pomodoroStore';
import { useSessionStore } from './sessionStore';

const supabase = createClient();

export interface HeatmapThresholds {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
}

const DEFAULT_HEATMAP_THRESHOLDS: HeatmapThresholds = {
  level1: 30, level2: 60, level3: 120, level4: 180, level5: 240,
};

const DEFAULT_SETTINGS = {
  darkMode: false,
  weeklyGoal: 600,
  reviewIntervals: [1, 7, 30],
  heatmapThresholds: DEFAULT_HEATMAP_THRESHOLDS,
};

interface SettingsState {
  // All settings are now in a single object
  settings: typeof DEFAULT_SETTINGS;
  
  // Async actions
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<typeof DEFAULT_SETTINGS>) => Promise<void>;
  
  // Specific actions that call updateSettings
  toggleDarkMode: () => void;
  setWeeklyGoal: (minutes: number) => void;
  setReviewIntervals: (intervals: number[]) => void;
  
  // Destructive actions
  resetAllData: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  fetchSettings: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      console.error('Error fetching settings, using defaults.', error);
      // If no settings exist, create them
      await get().updateSettings(DEFAULT_SETTINGS);
    } else {
      set({ settings: { ...DEFAULT_SETTINGS, ...data.settings } });
    }
  },

  updateSettings: async (newSettings) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const currentSettings = get().settings;
    const updatedSettings = { ...currentSettings, ...newSettings };

    set({ settings: updatedSettings });

    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, settings: updatedSettings });

    if (error) {
      console.error('Error saving settings:', error);
      // Optionally revert state on error
      set({ settings: currentSettings });
    }
  },

  toggleDarkMode: () => {
    const currentDarkMode = get().settings.darkMode;
    get().updateSettings({ darkMode: !currentDarkMode });
  },

  setWeeklyGoal: (minutes: number) => {
    get().updateSettings({ weeklyGoal: minutes });
  },

  setReviewIntervals: (intervals: number[]) => {
    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    get().updateSettings({ reviewIntervals: sortedIntervals });
  },

  resetAllData: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not found for reset');
      return;
    }

    console.log(`Resetting all data for user: ${user.id}`);

    // List of tables to clear
    const tables = ['reviews', 'pomodoro_sessions', 'study_sessions', 'topics', 'subjects'];

    for (const table of tables) {
      const { error } = await supabase.from(table).delete().eq('user_id', user.id);
      if (error) {
        console.error(`Error clearing table ${table}:`, error.message);
        // Stop if one fails
        return;
      }
    }

    // Reset local state in all stores
    useSubjectStore.getState().resetSubjects();
    useTopicStore.getState().resetTopics();
    useReviewStore.getState().resetReviews();
    // usePomodoroStore has no simple reset, reset manually
    usePomodoroStore.setState({ sessions: [], completedPomodoros: 0 });
    // useSessionStore has no reset, reset manually
    useSessionStore.setState({ sessions: [] });

    // Reset settings to default in DB and local state
    await get().updateSettings(DEFAULT_SETTINGS);

    console.log('All user data has been reset.');
  },
}));