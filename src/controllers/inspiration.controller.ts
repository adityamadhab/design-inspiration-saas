import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { InspirationService } from '../services/inspiration.service';
import { extractInternalLinks } from '../utils/puppeteer.util';
import { CreateInspirationDto, PaginationQuery } from '../types/inspiration.types';
import logger from '../logger/log';

const inspirationService = new InspirationService();

// Validation schemas
const createInspirationSchema = z.object({
  urls: z.array(z.string().url()),
});

const extractLinksSchema = z.object({
  url: z.string().url(),
});

const paginationSchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
});

export class InspirationController {
  async extractLinks(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info(`Extracting links from URL: ${req.body.url}`);
      const { url } = extractLinksSchema.parse(req.body);
      const links = await extractInternalLinks(url);

      logger.debug(`Successfully extracted ${links.length} links`);
      res.json({
        success: true,
        links,
      });
    } catch (error) {
      logger.error(`Error extracting links: ${error.message}`);
      next(error);
    }
  }

  async create(req: Request<{}, {}, CreateInspirationDto>, res: Response, next: NextFunction) {
    try {
      logger.info(`Creating inspirations from ${req.body.urls.length} URLs`);
      const { urls } = createInspirationSchema.parse(req.body);
      const inspirations = await inspirationService.createMany(urls);

      logger.debug(`Successfully created ${inspirations.length} inspirations`);
      res.status(201).json({
        success: true,
        data: inspirations,
      });
    } catch (error) {
      logger.error(`Error creating inspirations: ${error.message}`);
      next(error);
    }
  }

  async findAll(req: Request<{}, {}, {}, PaginationQuery>, res: Response, next: NextFunction) {
    try {
      logger.info(`Fetching inspirations - page: ${req.query.page}, limit: ${req.query.limit}`);
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await inspirationService.findMany(page, limit);

      logger.debug(`Successfully retrieved inspirations`);
      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      logger.error(`Error fetching inspirations: ${error.message}`);
      next(error);
    }
  }

  async findOne(req: Request<{ slug: string }>, res: Response, next: NextFunction) {
    try {
      logger.info(`Fetching inspiration with slug: ${req.params.slug}`);
      const inspiration = await inspirationService.findBySlug(req.params.slug);

      if (!inspiration) {
        logger.warn(`Inspiration not found with slug: ${req.params.slug}`);
        return res.status(404).json({
          success: false,
          error: 'Inspiration not found',
        });
      }

      logger.debug(`Successfully retrieved inspiration: ${req.params.slug}`);
      return res.json({
        success: true,
        data: inspiration,
      });
    } catch (error) {
      logger.error(`Error fetching inspiration: ${error.message}`);
      return next(error);
    }
  }
} 