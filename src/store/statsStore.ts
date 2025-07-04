import { create } from 'zustand';
import { useTopicStore } from './topicStore';
import { usePomodoroStore } from './pomodoroStore';
import { useReviewStore } from './reviewStore';
import { useSubjectStore } from './subjectStore';
import { StudyStats } from '@/types';

interface StatsState {
  getStats: (startDate?: Date, endDate?: Date) => StudyStats;
  getStudyTimeBySubject: (startDate?: Date, endDate?: Date) => Record<string, number>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  getStats: (startDate, endDate) => {
    const topicStore = useTopicStore.getState();
    const pomodoroStore = usePomodoroStore.getState();
    const reviewStore = useReviewStore.getState();
    
    // Filtra tópicos por data de criação, se especificado
    const topics = topicStore.topics.filter(topic => {
      if (!startDate && !endDate) return true;
      
      const createdAt = new Date(topic.createdAt);
      return (!startDate || createdAt >= startDate) && 
             (!endDate || createdAt <= endDate);
    });
    
    // Filtra sessões por data, se especificado
    const sessions = pomodoroStore.sessions.filter(session => {
      if (!startDate && !endDate) return true;
      
      const sessionDate = new Date(session.date);
      return (!startDate || sessionDate >= startDate) && 
             (!endDate || sessionDate <= endDate);
    });
    
    // Filtra revisões concluídas por data, se especificado
    const reviews = reviewStore.reviews.filter(review => {
      if (!review.completed) return false;
      if (!startDate && !endDate) return true;
      
      const reviewDate = new Date(review.scheduledDate);
      return (!startDate || reviewDate >= startDate) && 
             (!endDate || reviewDate <= endDate);
    });
    
    // Calcula o tempo total de estudo
    const totalStudyTime = sessions.reduce((total, session) => total + session.duration, 0);
    
    // Agrupa o tempo de estudo por matéria
    const studyTimeBySubject = get().getStudyTimeBySubject(startDate, endDate);
    
    return {
      totalTopics: topics.length,
      totalStudyTime,
      completedReviews: reviews.length,
      studyTimeBySubject,
    };
  },
  
  getStudyTimeBySubject: (startDate, endDate) => {
    const topicStore = useTopicStore.getState();
    const pomodoroStore = usePomodoroStore.getState();
    const subjectStore = useSubjectStore.getState();
    
    // Inicializa o objeto com todas as matérias
    const studyTimeBySubject: Record<string, number> = {};
    subjectStore.subjects.forEach(subject => {
      studyTimeBySubject[subject.id] = 0;
    });
    
    // Filtra sessões por data, se especificado
    const sessions = pomodoroStore.sessions.filter(session => {
      if (!startDate && !endDate) return true;
      
      const sessionDate = new Date(session.date);
      return (!startDate || sessionDate >= startDate) && 
             (!endDate || sessionDate <= endDate);
    });
    
    // Para cada sessão, incrementa o tempo da matéria correspondente
    sessions.forEach(session => {
      const topic = topicStore.getTopicById(session.topicId);
      if (topic) {
        const subjectId = topic.subjectId;
        if (studyTimeBySubject[subjectId] !== undefined) {
          studyTimeBySubject[subjectId] += session.duration;
        }
      }
    });
    
    return studyTimeBySubject;
  },
})); 