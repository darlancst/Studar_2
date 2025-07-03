'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  TooltipItem
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { useSubjectStore } from '@/store/subjectStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useReviewStore } from '@/store/reviewStore';
import { useDatesStore } from '@/store/datesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { format, subDays, startOfToday, endOfToday, isSameDay, parseISO, startOfDay, startOfWeek, endOfWeek, subYears, addDays, formatISO, endOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Subject, Review, PomodoroSession, Topic } from '@/types';
import { useDarkMode } from '@/hooks/useDarkMode';

// Registrando os componentes necessários
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

type StatsPeriod = 'today' | 'week' | 'month' | 'annual' | 'custom';

// Tipos para os detalhes das atividades
type DailyActivity = PomodoroSession | Review;

export default function Stats() {
  const [period, setPeriod] = useState<StatsPeriod>('today');
  const [customStartDate, setCustomStartDate] = useState<Date>(startOfToday());
  const [customEndDate, setCustomEndDate] = useState<Date>(endOfToday());
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const isDarkMode = useDarkMode();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  const heatmapScrollRef = useRef<HTMLDivElement>(null);
  
  // Estado para controlar a tooltip
  const [tooltip, setTooltip] = useState({ 
    show: false, 
    text: '', 
    x: 0, 
    y: 0 
  });
  
  // Estado para detalhes da célula clicada
  const [selectedDateDetails, setSelectedDateDetails] = useState<Date | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<DailyActivity[]>([]);
  
  // Tamanhos para o heatmap (definidos no escopo do componente)
  const heatmapCellSize = 11; // Tamanho do quadrado em pixels
  const heatmapCellGap = 2; // Espaçamento entre células
  
  // Acesso direto aos limiares de tempo do heatmap
  const { settings } = useSettingsStore(state => ({ settings: state.settings }));
  const { heatmapThresholds, weeklyGoal } = settings;
  
  const { getSubjectsWithTopics } = useSubjectStore();
  const { 
    sessions: pomodoroSessions, 
    isRunning, 
    currentTopicId, 
    elapsedSeconds 
  } = usePomodoroStore();
  const { reviews } = useReviewStore();
  const { getDates } = useDatesStore();
  
  const subjects = getSubjectsWithTopics();
  const studyDates = getDates();
  const totalDatesStudied = studyDates.length;
  
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768); // Defina o breakpoint que considerar mobile, ex: 768px
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);
  
  // Efeito para rolar o heatmap para a direita em mobile
  useEffect(() => {
    if (isMobileView && heatmapScrollRef.current) {
      const container = heatmapScrollRef.current;
      console.log('[HeatmapScroll] Attempting to scroll. isMobileView:', isMobileView);

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (heatmapScrollRef.current) { // Re-verificar ref em caso de unmount
            const currentContainer = heatmapScrollRef.current;
            const targetScrollLeft = currentContainer.scrollWidth - currentContainer.clientWidth;
            
            console.log('[HeatmapScroll] Calculated values:', {
              scrollWidth: currentContainer.scrollWidth,
              clientWidth: currentContainer.clientWidth,
              currentScrollLeft: currentContainer.scrollLeft,
              targetScrollLeft: targetScrollLeft,
            });

            if (targetScrollLeft > 0) {
              // Só rola se houver algo para rolar e se não já estiver na posição correta
              // Adicionar uma pequena tolerância para evitar loops de rolagem se houver pequenas imprecisões de float
              if (Math.abs(currentContainer.scrollLeft - targetScrollLeft) > 1) {
                 currentContainer.scrollLeft = targetScrollLeft;
                 console.log('[HeatmapScroll] Scrolled to:', currentContainer.scrollLeft);
              } else {
                console.log('[HeatmapScroll] Already at target scroll position or close enough.');
              }
            } else {
              console.log('[HeatmapScroll] No scroll needed or not scrollable (scrollWidth <= clientWidth).');
            }
          } else {
            console.log('[HeatmapScroll] Ref became null before scroll execution.');
          }
        }, 100); // Delay aumentado para 100ms para maior segurança no cálculo do layout.
      });
    }
    // Opcional: Resetar scroll para a esquerda se não for mais mobile view e se houver scroll.
    // else if (!isMobileView && heatmapScrollRef.current && heatmapScrollRef.current.scrollLeft > 0) {
    //   heatmapScrollRef.current.scrollLeft = 0;
    //   console.log('[HeatmapScroll] Reset scroll to left for desktop view.');
    // }
  }, [isMobileView, pomodoroSessions]); 
  
  // Calcula as datas do período selecionado
  const calculateDateRange = (): { startDate: Date; endDate: Date } => {
    const today = startOfToday(); 
    const endOfCurrentDay = endOfToday();
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'today':
        startDate = today;
        endDate = endOfCurrentDay;
        break;
      case 'week':
        startDate = startOfDay(subDays(today, 6));
        endDate = endOfCurrentDay;
        break;
      case 'month':
        startDate = startOfDay(subDays(today, 29));
        endDate = endOfCurrentDay;
        break;
      case 'annual':
        startDate = startOfDay(subYears(today, 1));
        endDate = endOfCurrentDay;
        break;
      case 'custom':
        startDate = startOfDay(customStartDate);
        endDate = endOfDay(customEndDate);
        break;
      default:
        startDate = today;
        endDate = endOfCurrentDay;
        break;
    }
    return { startDate, endDate };
  };
  
  // Formata o tempo de estudo
  const formatStudyTime = (minutes: number): string => {
    if (minutes < 1) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${minutes} min`;
    } else {
      return `${hours}h${remainingMinutes > 0 ? `:${remainingMinutes.toString().padStart(2, '0')}` : ''}`;
    }
  };
  
  // Filtra as sessões Pomodoro pelo período
  const getFilteredPomodoroSessions = (): PomodoroSession[] => {
    const { startDate, endDate } = calculateDateRange();
    return pomodoroSessions.filter((session: PomodoroSession) => {
      const sessionDate = parseISO(session.date); // Converte ISO string para Date
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  };
  
  // Filtra as revisões pelo período
  const getFilteredReviews = (): Review[] => {
    const { startDate, endDate } = calculateDateRange();
    return reviews.filter((review: Review) => {
      const dateToCheck = review.completed && review.date ? new Date(review.date) : new Date(review.scheduledDate);
      return dateToCheck >= startDate && dateToCheck <= endDate;
    });
  };

  // Encontra o Subject ID a partir do Topic ID
  const findSubjectIdForTopic = (topicId: string): string | null => {
    for (const subject of subjects) {
      if (subject.topics.some((t: Topic) => t.id === topicId)) {
        return subject.id;
      }
    }
    return null;
  };
  
  // Obtém os dados de sessão por assunto, incluindo sessão Pomodoro ativa
  const getSessionsBySubject = (): Map<string, { time: number; color: string }> => {
    const { startDate, endDate } = calculateDateRange();

    const filteredSavedSessions = pomodoroSessions.filter((session: PomodoroSession) => {
      try {
        const sessionDate = parseISO(session.date);
        return sessionDate >= startDate && sessionDate <= endDate;
      } catch (e) {
        console.error("Error parsing session date:", e);
        return false;
      }
    });

    const subjectMap = new Map<string, { time: number; color: string }>();

    subjects.forEach(subject => {
      subjectMap.set(subject.id, { time: 0, color: subject.color });
    });

    filteredSavedSessions.forEach((session: PomodoroSession) => {
      const subjectId = findSubjectIdForTopic(session.topicId);
      if (subjectId) {
        const subjectData = subjectMap.get(subjectId);
        if (subjectData) {
          subjectMap.set(subjectId, { 
            time: subjectData.time + session.duration,
            color: subjectData.color 
          });
        }
      }
    });

    // Adiciona o tempo da sessão ativa (pausada ou não)
    if (isRunning && currentTopicId && isSameDay(new Date(), endOfToday())) {
      const subjectId = findSubjectIdForTopic(currentTopicId);
      if (subjectId) {
        const subjectData = subjectMap.get(subjectId);
        if (subjectData) {
          subjectMap.set(subjectId, { 
            time: subjectData.time + Math.floor(elapsedSeconds / 60),
            color: subjectData.color
          });
        }
      }
    }

    return subjectMap;
  };
  
  // Calcula o tempo total de estudo - SIMPLIFICADO
  const calculateTotalStudyTime = (): number => {
    // Pega o mapa de tempo por assunto já filtrado pelo período
    const subjectMap = getSessionsBySubject();
    let totalTimeFromSaved = 0;
    subjectMap.forEach(value => {
      totalTimeFromSaved += value.time;
    });

    // Retorna apenas o tempo total das sessões salvas
    return totalTimeFromSaved;
  };
  
  // Calcula o tempo médio por sessão Pomodoro
  const calculateAverageSessionTime = (): number => {
    const filteredSessions = getFilteredPomodoroSessions();
    if (filteredSessions.length === 0) return 0;
    const totalTime = filteredSessions.reduce((acc: number, session) => acc + session.duration, 0);
    return Math.round(totalTime / filteredSessions.length);
  };
  
  // Conta as revisões completadas no período
  const countCompletedReviews = (): number => {
    return getFilteredReviews().filter(r => r.completed).length;
  };

  // Calcula o tempo total de estudo na semana atual - SIMPLIFICADO
  const calculateWeeklyStudyTime = (): number => {
    const today = startOfToday();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 });
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 });

    const weeklySessions = pomodoroSessions.filter(session => {
      const sessionDate = parseISO(session.date);
      return sessionDate >= startOfCurrentWeek && sessionDate <= endOfCurrentWeek;
    });
    return weeklySessions.reduce((acc, session) => acc + session.duration, 0);
  };
  
  // Prepara os dados para o heatmap
  const getHeatMapData = (): HeatmapData => {
    const endDate = endOfToday();
    const startDate = subYears(endDate, 1);
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    const dateDurationMap = new Map<string, number>();
    pomodoroSessions.forEach(session => {
      const dateKey = format(parseISO(session.date), 'yyyy-MM-dd');
      dateDurationMap.set(dateKey, (dateDurationMap.get(dateKey) || 0) + session.duration);
    });

    const heatmapData: ({ date: string; minutes: number; tooltip: string; isToday: boolean } | null)[][] = [];
    const monthLabels: { text: string; xPos: number }[] = [];
    const weeks: Map<number, ({ date: string; minutes: number; tooltip: string; isToday: boolean } | null)[]> = new Map();
    
    let currentDay = startDate;
    let lastMonth = -1;

    while(currentDay <= endDate) {
      const weekIndex = Math.floor((currentDay.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
      if(!weeks.has(weekIndex)) {
        weeks.set(weekIndex, new Array(7).fill(null));
      }

      const dayOfWeek = currentDay.getDay();
      const dateKey = format(currentDay, 'yyyy-MM-dd');
      const minutes = dateDurationMap.get(dateKey) || 0;
      
      weeks.get(weekIndex)![dayOfWeek] = {
        date: dateKey,
        minutes: minutes,
        tooltip: `${format(currentDay, "dd 'de' MMMM, yyyy", { locale: pt })}: ${minutes > 0 ? formatStudyTime(minutes) : 'Sem estudo'}`,
        isToday: isSameDay(currentDay, startOfToday())
      };

      if (currentDay.getMonth() !== lastMonth) {
        lastMonth = currentDay.getMonth();
        monthLabels.push({ text: format(currentDay, 'MMM', { locale: pt }), xPos: weekIndex * (heatmapCellSize + heatmapCellGap) });
      }

      currentDay = addDays(currentDay, 1);
    }
    
    weeks.forEach(week => heatmapData.push(week));
    
    const heatmapWidth = weeks.size * (heatmapCellSize + heatmapCellGap);
    const heatmapHeight = 7 * (heatmapCellSize + heatmapCellGap);

    return { heatmapData, monthLabels, dayLabels, heatmapWidth, heatmapHeight };
  };
  
  // Função para buscar atividades de uma data específica
  const getActivitiesForDate = (date: Date): DailyActivity[] => {
    const activities: DailyActivity[] = [];
    
    // Buscar Sessões Pomodoro
    const daySessions = pomodoroSessions.filter(session => 
      isSameDay(parseISO(session.date), date)
    );
    activities.push(...daySessions);
    
    // Buscar Revisões (concluídas ou agendadas para o dia)
    const dayReviews = reviews.filter(review => {
      const reviewDate = review.completed && review.date ? new Date(review.date) : new Date(review.scheduledDate);
      return isSameDay(reviewDate, date);
    });
    activities.push(...dayReviews);
    
    // Ordenar por data/hora (opcional, mas útil)
    activities.sort((a, b) => {
        const dateA = (a as PomodoroSession).date || (a as Review).date || (a as Review).scheduledDate;
        const dateB = (b as PomodoroSession).date || (b as Review).date || (b as Review).scheduledDate;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    return activities;
  };
  
  // Handler para clique na célula
  const handleCellClick = (date: Date | null) => {
    if (date) {
      setSelectedDateDetails(date);
      setSelectedActivities(getActivitiesForDate(date));
    } else {
      setSelectedDateDetails(null);
      setSelectedActivities([]);
    }
  };
  
  const handleCellHover = (e: React.MouseEvent, text: string) => {
    setTooltip({
      show: true,
      text: text,
      x: e.clientX,
      y: e.clientY
    });
  };

  const { heatmapData, monthLabels, dayLabels, heatmapWidth, heatmapHeight } = getHeatMapData();

  const getColor = (count: number) => {
    if (!count || count === 0) return isDarkMode ? '#2d3748' : '#f3f4f6';
    const colorLevels = isDarkMode 
      ? ['#4f46e530', '#4f46e545', '#6366f160', '#7c3aed75', '#9333ea85', '#a855f790'] 
      : ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'];
    if (count < heatmapThresholds.level1) return colorLevels[0];
    if (count < heatmapThresholds.level2) return colorLevels[1];
    if (count < heatmapThresholds.level3) return colorLevels[2];
    if (count < heatmapThresholds.level4) return colorLevels[3];
    if (count < heatmapThresholds.level5) return colorLevels[4];
    return colorLevels[5];
  };

  // --- Renderização --- 
  const totalStudyTime = calculateTotalStudyTime();
  const weeklyStudyTime = calculateWeeklyStudyTime();
  const remainingTimeToGoal = Math.max(0, weeklyGoal - weeklyStudyTime);
  const isGoalCompleted = remainingTimeToGoal <= 0;
  const today = new Date();
  const weekEndDate = endOfWeek(today, { weekStartsOn: 0 });
  const formattedWeekEndDate = format(weekEndDate, "dd 'de' MMMM", { locale: pt });
  const averageSessionTime = calculateAverageSessionTime();
  const completedReviewsCount = countCompletedReviews();
  
  // Efeito para mostrar o confete quando a meta for atingida
  useEffect(() => {
    if (isGoalCompleted && period === 'week') {
      setShowConfetti(true);
      
      // Remove o confete após 3 segundos
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isGoalCompleted, period]);
  
  // Formata o tempo restante para atingir a meta
  const formatRemainingTime = (): string => {
    if (isGoalCompleted) return "Meta atingida!";
    return formatStudyTime(remainingTimeToGoal);
  };

  // Calcula a porcentagem de progresso
  const weeklyGoalMinutes = weeklyGoal * 60;
  const weeklyProgress = weeklyGoalMinutes > 0 ? Math.min(Math.round((weeklyStudyTime / weeklyGoalMinutes) * 100), 100) : 0;
  const isGoalCompleted = weeklyProgress >= 100;
  
  const pieChartData = getPieChartData();
  const barChartData = getBarChartData();
  const lineChartData = getLineChartData();
  
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
      title: { display: true, text: 'Distribuição do tempo por disciplina' },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<"pie">) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              // Usa a função formatStudyTime para exibir "Xh:Ymin" ou "Z min"
              label += formatStudyTime(context.parsed); 
            }
            return label;
          }
        }
      }
    },
  };
  
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Coloca as labels no eixo Y para melhor leitura
    scales: {
       x: { // Eixo X agora representa a contagem
          beginAtZero: true,
          title: { display: true, text: 'Quantidade' }
       }
       // Não precisa mais do eixo Y explícito para as labels
    },
    plugins: {
      legend: { display: false }, // Legenda não é tão necessária com labels diretas
      title: { display: true, text: 'Revisões Completadas vs. Pendentes' }, // Título está correto
    },
  };
  
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutos' } } },
    plugins: {
      legend: { position: 'bottom' as const },
      title: { 
        display: true, 
        text: (() => {
          switch (period) {
            case 'today': return 'Progresso de Hoje';
            case 'week': return 'Progresso Semanal';
            case 'month': return 'Progresso Mensal';
            case 'annual': return 'Progresso Anual';
            case 'custom': return 'Progresso Personalizado';
            default: return 'Progresso';
          }
        })()
      },
    },
  };

  // Prepara os dados para os gráficos com cores adaptadas ao tema
  const getChartOptions = (options: any) => {
    const newOptions = JSON.parse(JSON.stringify(options)); // Cópia profunda para evitar mutação

    const color = isDarkMode ? 'white' : undefined;
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : undefined;

    // Atualiza escalas de forma segura
    if (newOptions.scales) {
      if (newOptions.scales.y) {
        newOptions.scales.y.ticks = { ...newOptions.scales.y.ticks, color };
        newOptions.scales.y.grid = { ...newOptions.scales.y.grid, color: gridColor };
        if (newOptions.scales.y.title) {
          newOptions.scales.y.title.color = color;
        }
      }
      if (newOptions.scales.x) {
        newOptions.scales.x.ticks = { ...newOptions.scales.x.ticks, color };
        newOptions.scales.x.grid = { ...newOptions.scales.x.grid, color: gridColor };
        if (newOptions.scales.x.title) {
          newOptions.scales.x.title.color = color;
        }
      }
    }

    // Atualiza plugins de forma segura
    if (newOptions.plugins) {
      if (newOptions.plugins.legend) {
        newOptions.plugins.legend.labels = { ...newOptions.plugins.legend.labels, color };
      }
      if (newOptions.plugins.title) {
        newOptions.plugins.title.color = color;
      }
    }

    return newOptions;
  };

  // Função para resetar todas as estatísticas
  const handleResetAllStats = () => {
    usePomodoroStore.getState().reset();
    setShowResetConfirm(false);
  };

  type HeatmapData = {
    heatmapData: ({ date: string; minutes: number; tooltip: string; isToday: boolean } | null)[][];
    monthLabels: { text: string; xPos: number }[];
    dayLabels: string[];
    heatmapWidth: number;
    heatmapHeight: number;
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-8 relative">
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, index) => (
              <div 
                key={index}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: [
                    '#1a73e8', '#ea4335', '#34a853', '#fbbc04', 
                    '#ff6d01', '#9c27b0', '#673ab7', '#2196f3'
                  ][Math.floor(Math.random() * 8)],
                  width: `${5 + Math.random() * 7}px`,
                  height: `${5 + Math.random() * 7}px`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3 sm:gap-0">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold dark:text-white">Estatísticas de Estudo</h2>
        </div>
        {/* Seletor de período */}
        <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          {(['today', 'week', 'month', 'annual', 'custom'] as StatsPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex-shrink-0 ${
                period === p
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
              }`}
            >
              { {today: 'Hoje', week: 'Semana', month: 'Mês', annual: 'Anual', custom: 'Personalizado'}[p] }
            </button>
          ))}
        </div>
      </div>
      
      {/* Inputs de Data Personalizada (aparem condicionalmente) */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-6">
          <div className="w-full sm:w-auto">
            <label htmlFor="customStartDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data de Início:
            </label>
            <input
              type="date"
              id="customStartDate"
              value={format(customStartDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  setCustomStartDate(startOfDay(parseISO(dateValue)));
                }
              }}
              className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              max={format(customEndDate, 'yyyy-MM-dd')} 
            />
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="customEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data de Fim:
            </label>
            <input
              type="date"
              id="customEndDate"
              value={format(customEndDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  setCustomEndDate(endOfDay(parseISO(dateValue)));
                }
              }}
              className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              min={format(customStartDate, 'yyyy-MM-dd')} 
            />
          </div>
        </div>
      )}
      
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col justify-between h-full col-span-1">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Tempo Total</span>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{formatStudyTime(totalStudyTime)}</p>
          </div>
          <div className="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col justify-between h-full col-span-1">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Revisões Feitas</span>
              <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{completedReviewsCount}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col justify-between h-full col-span-1">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Dias Estudados</span>
              <div className="bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{totalDatesStudied}</p>
          </div>
          <div className="stat-card bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col justify-between h-full col-span-1">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Média / Sessão</span>
              <div className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{formatStudyTime(averageSessionTime)}</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        <div className="lg:col-span-3 grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-200">Distribuição do Tempo por Matéria</h3>
            <div className="h-64 sm:h-80 flex items-center justify-center">
              <Pie data={pieChartData} options={getChartOptions(pieOptions)} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-200">Revisões Completadas vs. Pendentes</h3>
            <div className="h-64 sm:h-80">
              <Bar data={barChartData} options={getChartOptions(barOptions)} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-200">Progresso Diário (Últimos 7 dias)</h3>
            <div className="h-64 sm:h-80">
              <Line data={lineChartData} options={getChartOptions(lineOptions)} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Mapa de Atividades (Último Ano)</h3>
            <div 
              ref={heatmapScrollRef}
              className="heatmap-container overflow-x-auto overflow-y-hidden"
              onMouseLeave={() => setTooltip({ show: false, text: '', x: 0, y: 0 })}
            >
              <svg width={heatmapWidth} height={heatmapHeight} className="max-w-full">
                <g transform={`translate(${heatmapCellSize * 2}, 20)`}>
                  {heatmapData.map((week: ({ date: string; minutes: number; tooltip: string; isToday: boolean } | null)[], weekIndex: number) => (
                    <g key={weekIndex} transform={`translate(${weekIndex * (heatmapCellSize + heatmapCellGap)}, 0)`}>
                      {week.map((day: { date: string; minutes: number; tooltip: string; isToday: boolean } | null, dayIndex: number) => {
                        if (!day) return null;
                        return (
                          <rect
                            key={day.date}
                            x={0}
                            y={dayIndex * (heatmapCellSize + heatmapCellGap)}
                            width={heatmapCellSize}
                            height={heatmapCellSize}
                            rx="2"
                            ry="2"
                            fill={getColor(day.minutes)}
                            className={`cursor-pointer transition-opacity ${selectedDateDetails && isSameDay(parseISO(day.date), selectedDateDetails) ? 'opacity-100 ring-2 ring-offset-1 ring-primary-500 dark:ring-primary-400' : 'opacity-80 hover:opacity-100'}`}
                            onMouseEnter={(e) => handleCellHover(e, day.tooltip)}
                            onClick={() => handleCellClick(parseISO(day.date))}
                          />
                        );
                      })}
                    </g>
                  ))}
                  {/* Renderiza os meses */}
                  {monthLabels.map(({ text, xPos }: { text: string, xPos: number }, index: number) => (
                    <text
                      key={index}
                      x={xPos}
                      y={-8}
                      className="text-xs fill-current text-gray-500 dark:text-gray-400"
                    >
                      {text}
                    </text>
                  ))}
                  {/* Renderiza os dias da semana */}
                  {dayLabels.map((label: string, index: number) => (
                    <text
                      key={label}
                      x={-15}
                      y={(index * (heatmapCellSize + heatmapCellGap)) + heatmapCellSize - 2}
                      className="text-xs fill-current text-gray-500 dark:text-gray-400"
                    >
                      {label}
                    </text>
                  ))}
                </g>
              </svg>
            </div>
            {tooltip.show && (
              <div
                className="absolute bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none"
                style={{ top: tooltip.y, left: tooltip.x, transform: 'translate(-50%, -110%)' }}
              >
                {tooltip.text}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedDateDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => handleCellClick(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">
              Atividades de {format(selectedDateDetails, "dd 'de' MMMM, yyyy", { locale: pt })}
            </h3>
            {selectedActivities.length > 0 ? (
              <ul className="space-y-2">
                {selectedActivities.map((activity, index) => {
                  // Verifica se é PomodoroSession ou Review para mostrar detalhes diferentes
                  const isPomodoro = 'duration' in activity;
                  const topicId = (activity as PomodoroSession).topicId || (activity as Review).topicId;
                  const subjectId = findSubjectIdForTopic(topicId);
                  const subject = subjects.find(s => s.id === subjectId);
                  const topic = subject?.topics.find(t => t.id === topicId);

                  return (
                    <li key={index} className="text-sm p-2 rounded bg-white dark:bg-gray-600 shadow-sm overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <span className={`font-semibold mr-2 ${isPomodoro ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {isPomodoro ? '[Foco]' : (activity as Review).completed ? '[Revisão Concluída]' : '[Revisão Agendada]'}
                      </span>
                        <span className="mt-1 sm:mt-0 dark:text-gray-300 break-words">
                        {subject?.name || 'Matéria não encontrada'} - {topic?.title || 'Tópico não encontrado'}
                        {isPomodoro && ` (${formatStudyTime((activity as PomodoroSession).duration)})`}
                      </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Nenhuma atividade registrada neste dia.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Reiniciar Estatísticas</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Esta ação vai reiniciar todas as estatísticas de estudo. Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetAllStats}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .confetti-container {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #ffd300;
          animation: confetti-fall 3s linear forwards;
        }
        
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(1000px) rotate(720deg);
            opacity: 0;
          }
        }
        
        /* Estilo para o calendário personalizado - NOVO ESTILO GITHUB */
        .github-style-heatmap {
          display: flex;
          flex-direction: column;
          width: 100%;
          margin-top: 10px;
          gap: 8px;
          ${isDarkMode ? 'filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));' : ''}
        }
        
        .centered-heatmap {
          margin: 0 auto;
          width: 100%;
          /* Removendo max-width fixo para melhor responsividade */
        }

        .heatmap-content-wrapper {
          position: relative;
          padding-bottom: 10px;
          padding-right: 5px;
          min-width: min-content;
        }

        /* Mostra indicador de rolagem em dispositivos móveis */
        @media (max-width: 768px) {
          .heatmap-content-wrapper::after {
            content: '';
            position: absolute;
            right: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 50px;
            background: linear-gradient(to right, transparent, ${isDarkMode ? 'rgba(31, 41, 55, 0.5)' : 'rgba(243, 244, 246, 0.5)'});
            pointer-events: none;
            opacity: 0.8;
            border-radius: 0 4px 4px 0;
          }
        }

        .month-labels {
          position: relative;
          height: 20px;
          margin-left: 30px;
          margin-bottom: 4px;
          min-width: min-content;
        }

        .month-label {
          position: absolute;
          font-size: 10px;
          color: ${isDarkMode ? '#a1a1aa' : '#6b7280'};
          top: 0;
          white-space: nowrap;
          font-weight: ${isDarkMode ? '500' : 'normal'};
        }

        .days-and-grid-container {
          display: flex;
          align-items: flex-start;
          min-width: min-content;
        }

        .weekday-labels {
          position: sticky;
          left: 0;
          z-index: 10; 
          background-color: ${isDarkMode ? '#374151' : '#f9fafb'};
          display: flex;
          flex-direction: column;
          min-width: 30px;
          width: 30px;
          gap: ${heatmapCellGap}px;
          padding-top: 0;
          justify-content: space-between;
          height: calc(7 * ${heatmapCellSize}px + 6 * ${heatmapCellGap}px);
          padding-right: 5px;
        }

        .weekday-label {
          height: ${heatmapCellSize}px;
          font-size: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${isDarkMode ? '#a1a1aa' : '#6b7280'};
          white-space: nowrap;
          font-weight: ${isDarkMode ? '500' : 'normal'};
        }

        .weekday-label.empty {
          visibility: hidden;
        }

        .days-grid {
          display: grid;
          margin-left: 5px;
          grid-auto-flow: column;
          min-width: min-content;
        }

        .day-cell {
          width: ${heatmapCellSize}px;
          height: ${heatmapCellSize}px;
          border-radius: 2px;
          transition: all 0.2s ease;
          position: relative;
          ${isDarkMode ? 'backdrop-filter: blur(8px);' : ''}
          cursor: pointer;
        }

        .day-cell.outside-range {
          visibility: hidden;
        }

        .day-cell:hover {
          transform: scale(1.3);
          z-index: 5;
          box-shadow: 0 0 8px ${isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)'};
          ${isDarkMode ? 'filter: brightness(1.2);' : ''}
        }
        
        .day-cell.today {
          border: 1px solid ${isDarkMode ? '#a855f7' : '#3b82f6'};
          ${isDarkMode ? 'box-shadow: 0 0 5px rgba(168, 85, 247, 0.5);' : ''}
          animation: pulse 2s infinite;
          position: relative;
        }
        
        .today-number {
          position: absolute;
          font-size: 8px;
          font-weight: bold;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: ${isDarkMode ? '#ffffff' : '#000000'};
          opacity: 0.7;
          text-shadow: ${isDarkMode ? '0 0 2px rgba(0,0,0,0.8)' : '0 0 2px rgba(255,255,255,0.8)'};
          pointer-events: none;
          user-select: none;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 ${isDarkMode ? 'rgba(168, 85, 247, 0.4)' : 'rgba(59, 130, 246, 0.4)'};
          }
          70% {
            box-shadow: 0 0 0 4px ${isDarkMode ? 'rgba(168, 85, 247, 0)' : 'rgba(59, 130, 246, 0)'};
          }
          100% {
            box-shadow: 0 0 0 0 ${isDarkMode ? 'rgba(168, 85, 247, 0)' : 'rgba(59, 130, 246, 0)'};
          }
        }
        
        /* Adicionar um estilo para tooltip global que será adicionado ao body */
        #global-tooltip {
          display: none; /* Escondemos o antigo */
        }

        /* Ajusta o tamanho das células em telas pequenas */
        @media (max-width: 480px) {
          .color-scale-legend {
            flex-wrap: wrap;
            justify-content: center;
            gap: 4px;
          }
          
          .legend-item {
            margin: 0 2px;
          }
          
          .level-label {
            font-size: 8px;
          }
        }
        
        .color-scale-legend {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 10px;
          max-width: 100%;
          padding: 0 10px;
          ${isDarkMode ? 'background: rgba(31, 41, 55, 0.4); border-radius: 8px; padding: 8px 10px;' : ''}
          overflow-x: auto; /* Permite rolagem horizontal se necessário */
          -webkit-overflow-scrolling: touch;
        }

        .legend-text {
          font-size: 10px;
          font-weight: 500;
          color: ${isDarkMode ? '#a1a1aa' : '#6b7280'};
          margin-right: 4px;
        }
        
        .legend-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          cursor: help;
        }

        .color-box {
          width: 11px;
          height: 11px;
          border-radius: 2px;
          ${isDarkMode ? 'box-shadow: 0 0 2px rgba(255, 255, 255, 0.1);' : ''}
        }

        .level-label {
          font-size: 9px;
          color: ${isDarkMode ? '#a1a1aa' : '#6b7280'};
          white-space: nowrap;
        }

        .heatmap-content-wrapper::-webkit-scrollbar {
          height: 8px;
        }
        
        .heatmap-content-wrapper::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#1f2937' : '#f3f4f6'};
          border-radius: 4px;
        }
        
        .heatmap-content-wrapper::-webkit-scrollbar-thumb {
          background-color: ${isDarkMode ? '#4b5563' : '#cbd5e1'};
          border-radius: 4px;
        }
        
        .heatmap-content-wrapper::-webkit-scrollbar-thumb:hover {
          background-color: ${isDarkMode ? '#6b7280' : '#94a3b8'};
        }

        /* Adiciona um cursor pointer para células com atividade */
        .day-cell.has-activity {
          cursor: pointer;
        }

        .mobile-heatmap-rtl {
          direction: rtl;
        }

        .mobile-heatmap-rtl > div {
          direction: ltr; /* Garante que o conteúdo dos filhos não seja invertido */
        }
        
        /* Especificidade para os rótulos de mês e dia dentro do RTL */
        .mobile-heatmap-rtl .month-labels,
        .mobile-heatmap-rtl .weekday-labels,
        .mobile-heatmap-rtl .days-grid {
          direction: ltr;
        }

        /* Se as células individuais do grid também precisarem de direção LTR explicitamente */
        .mobile-heatmap-rtl .days-grid > div {
            direction: ltr;
        }
      `}</style>
    </div>
  );
} 