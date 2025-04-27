import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL as string,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key', // Should be in .env
    expiresIn: '30d',
  },
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  },
  screenshots: {
    path: 'src/public/screenshots',
    desktop: {
      width: 1920,
      height: 1080,
    },
    mobile: {
      width: 375,
      height: 812,
    },
  },
} as const; 