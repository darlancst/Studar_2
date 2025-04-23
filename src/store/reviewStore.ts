import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Review } from '@/types';

interface ReviewState {
  reviews: Review[];
  addReview: (topicId: string, scheduledDate: Date) => void;
  markAsCompleted: (id: string) => void;
  deleteReview: (id: string) => void;
  deleteReviewsByTopicId: (topicId: string) => void;
  getReviewsByDate: (date: Date) => Review[];
  getPendingReviewsByDate: (date: Date) => Review[];
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      reviews: [],
      addReview: (topicId, scheduledDate) => {
        const newReview: Review = {
          id: uuidv4(),
          topicId,
          scheduledDate,
          completed: false,
        };
        set((state) => ({
          reviews: [...state.reviews, newReview],
        }));
      },
      markAsCompleted: (id) => {
        set((state) => ({
          reviews: state.reviews.map((review) =>
            review.id === id ? { ...review, completed: true } : review
          ),
        }));
      },
      deleteReview: (id) => {
        set((state) => ({
          reviews: state.reviews.filter((review) => review.id !== id),
        }));
      },
      deleteReviewsByTopicId: (topicId) => {
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
    }),
    {
      name: 'review-storage',
    }
  )
); 