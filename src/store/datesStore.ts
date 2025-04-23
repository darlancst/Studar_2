import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

interface DatesState {
  studyDates: string[]; // Array de datas ISO string
  addDate: (date?: Date) => void;
  hasStudiedOnDate: (date: Date) => boolean;
  getDates: () => string[];
  resetDates: () => void;
}

export const useDatesStore = create<DatesState>()(
  persist(
    (set, get) => ({
      studyDates: [],
      
      // Adiciona a data atual (ou uma data específica) ao registro
      addDate: (date = new Date()) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        set((state) => {
          // Verifica se a data já existe no array
          if (state.studyDates.includes(dateStr)) {
            return state;
          }
          
          return {
            studyDates: [...state.studyDates, dateStr],
          };
        });
      },
      
      // Verifica se houve estudo em uma data específica
      hasStudiedOnDate: (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return get().studyDates.includes(dateStr);
      },
      
      // Retorna todas as datas de estudo
      getDates: () => {
        return get().studyDates;
      },
      
      // Limpa todas as datas de estudo
      resetDates: () => {
        set({ studyDates: [] });
      },
    }),
    {
      name: 'study-dates-storage',
    }
  )
); 