import { Annotation, User } from '../types';

// Mock current user
export const CURRENT_USER: User = {
  id: 'user-1',
  name: 'Creative Director',
  avatar: 'https://picsum.photos/seed/user1/50/50'
};

const STORAGE_KEY = 'streamline_annotations_v2';

export const getAnnotations = (videoId: string): Annotation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Annotation[];
    // Filter by videoId and sort by start time
    return all
      .filter(a => a.videoId === videoId)
      .sort((a, b) => a.startTime - b.startTime);
  } catch (e) {
    console.error("Failed to load annotations", e);
    return [];
  }
};

export const saveAnnotation = (annotation: Annotation): Annotation => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) as Annotation[] : [];
    all.push(annotation);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return annotation;
  } catch (e) {
    console.error("Failed to save annotation", e);
    throw e;
  }
};

export const clearAnnotations = (videoId: string): void => {
   const raw = localStorage.getItem(STORAGE_KEY);
   if(!raw) return;
   const all = JSON.parse(raw) as Annotation[];
   const remaining = all.filter(a => a.videoId !== videoId);
   localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}
