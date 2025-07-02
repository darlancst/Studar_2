import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Hook para verificar se o modo escuro está ativado
 * @returns Booleano indicando se o modo escuro está ativado
 */
export function useDarkMode() {
  const darkMode = useSettingsStore((state) => state.settings.darkMode);
  const [isDark, setIsDark] = useState(darkMode);
  
  // Atualiza o estado quando darkMode mudar
  useEffect(() => {
    setIsDark(darkMode);
  }, [darkMode]);
  
  return isDark;
} 