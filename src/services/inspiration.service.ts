import { PrismaClient, type Inspiration } from '@prisma/client';
import { extractPageInfo } from '../utils/puppeteer.util';
import { generateSlug } from '../utils/slug.util';
import { PaginatedResponse } from '../types/inspiration.types';

const prisma = new PrismaClient();

export class InspirationService {
  async createMany(urls: string[]): Promise<Inspiration[]> {
    const inspirations = await Promise.all(
      urls.map(async (url) => {
        const pageInfo = await extractPageInfo(url);
        const slug = generateSlug(pageInfo.title);

        return prisma.inspiration.create({
          data: {
            title: pageInfo.title,
            description: pageInfo.metaDescription.slice(0, 300),
            websiteLink: url,
            desktopScreenshotUrl: pageInfo.desktopScreenshotUrl,
            mobileScreenshotUrl: pageInfo.mobileScreenshotUrl,
            colorScheme: pageInfo.colorScheme,
            fonts: pageInfo.fonts,
            technologyStack: pageInfo.technologies,
            categories: pageInfo.categories,
            niche: pageInfo.niche || 'Unknown',
            slug,
            metaTitle: pageInfo.title,
            metaDescription: pageInfo.metaDescription,
            pageViews: 0,
          },
        });
      })
    );

    return inspirations;
  }

  async findMany(page: number, limit: number): Promise<PaginatedResponse<Inspiration>> {
    const skip = (page - 1) * limit;
    const [inspirations, total] = await Promise.all([
      prisma.inspiration.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inspiration.count(),
    ]);

    return {
      data: inspirations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string): Promise<Inspiration | null> {
    // First check if inspiration exists
    const inspiration = await prisma.inspiration.findUnique({
      where: { slug }
    });

    if (!inspiration) {
      return null;
    }

    // If inspiration exists, increment page views and return updated inspiration
    return prisma.inspiration.update({
      where: { slug },
      data: { pageViews: { increment: 1 } },
    });
  }
} 