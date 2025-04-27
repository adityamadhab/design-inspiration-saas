import type { Inspiration } from '@prisma/client';

export interface CreateInspirationDto {
  urls: string[];
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PageInfo {
  title: string;
  metaDescription: string;
  fonts: string[];
  technologies: string[];
  desktopScreenshotUrl: string;
  mobileScreenshotUrl: string;
  colorScheme?: string[];
  categories?: string[];
  niche?: string;
}

export interface ExtractLinksDto {
  url: string;
}

export interface ExtractLinksResponse {
  success: boolean;
  links: string[];
}

export type InspirationResponse = Omit<Inspiration, '_id'> & { id: string }; 