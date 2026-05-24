export interface Post {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  youtubeId?: string;
  imageUrls?: string[]; // Multiple retro visual reference links
  author: string;
  date: string;
  readTime: number; // in minutes
  isFeatured: boolean;
  isDraft: boolean;
}

export type CategoryType = 'Foreign Policy' | 'Domestic Politics' | 'Economy' | 'Opinion' | 'Society & Tech';

export interface CmsStats {
  totalPosts: number;
  publishedCount: number;
  draftsCount: number;
  totalReadingTime: number;
}
