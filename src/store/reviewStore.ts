import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { Review } from '@/types';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

interface ReviewState {
  reviews: Review[];
  fetchReviews: () => Promise<void>;
  addReview: (topicId: string, scheduledDate: Date) => Promise<void>;
  toggleReviewCompletion: (id: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  deleteReviewsByTopicId: (topicId: string) => Promise<void>;
  getReviewsByDate: (date: Date) => Review[];
  getPendingReviewsByDate: (date: Date) => Review[];
  resetReviews: () => void;
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  reviews: [],
  fetchReviews: async () => {
    const { data, error } = await supabase.from('reviews').select('*');
    if (error) {
      console.error('Error fetching reviews:', error);
      return;
    }
    const mappedReviews: Review[] = (data || []).map(review => ({
      id: review.id,
      topicId: review.topic_id,
      scheduledDate: new Date(review.scheduled_date),
      completed: review.completed,
      date: new Date(review.date),
    }));
    set({ reviews: mappedReviews });
  },
  addReview: async (topicId, scheduledDate) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('User not logged in');
      return;
    }

    const newReview = {
      topic_id: topicId,
      scheduled_date: scheduledDate,
      completed: false,
      date: scheduledDate,
      user_id: user.id,
    };

    const { data, error } = await supabase.from('reviews').insert(newReview).select().single();
    if (error) {
      console.error('Error adding review:', error);
      return;
    }

    const newReviewMapped: Review = {
      id: data.id,
      topicId: data.topic_id,
      scheduledDate: new Date(data.scheduled_date),
      completed: data.completed,
      date: new Date(data.date),
    };

    set((state) => ({
      reviews: [...state.reviews, newReviewMapped],
    }));
  },
  toggleReviewCompletion: async (id) => {
    const review = get().reviews.find((r) => r.id === id);
    if (!review) return;

    const isNowCompleted = !review.completed;
    const updatedData = {
      completed: isNowCompleted,
      date: isNowCompleted ? new Date() : review.scheduledDate,
    };

    const { error } = await supabase.from('reviews').update(updatedData).eq('id', id);
    if (error) {
      console.error('Error updating review:', error);
      return;
    }

    set((state) => ({
      reviews: state.reviews.map((r) =>
        r.id === id ? { ...r, ...updatedData } : r
      ),
    }));
  },
  deleteReview: async (id) => {
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) {
      console.error('Error deleting review:', error);
      return;
    }
    set((state) => ({
      reviews: state.reviews.filter((review) => review.id !== id),
    }));
  },
  deleteReviewsByTopicId: async (topicId) => {
    const { error } = await supabase.from('reviews').delete().eq('topic_id', topicId);
    if (error) {
      console.error('Error deleting reviews by topicId:', error);
      return;
    }
    set((state) => ({
      reviews: state.reviews.filter((review) => review.topicId !== topicId),
    }));
  },
  getReviewsByDate: (date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return get().reviews.filter((review) => {
      const reviewDate = new Date(review.scheduledDate);
      return reviewDate >= startOfDay && reviewDate <= endOfDay;
    });
  },
  getPendingReviewsByDate: (date) => {
    return get().getReviewsByDate(date).filter((review) => !review.completed);
  },
  resetReviews: () => {
    set({ reviews: [] });
  },
})); 