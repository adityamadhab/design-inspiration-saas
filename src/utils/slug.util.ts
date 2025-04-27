import { customAlphabet } from 'nanoid';

// Create a custom nanoid with a specific alphabet for URL-safe strings
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

export function generateSlug(title: string): string {
  // Get first 4-5 meaningful words (excluding common words)
  const commonWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
  const words = title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => !commonWords.has(word))
    .slice(0, 4)
    .join(' ');

  // Sanitize the shortened title
  const sanitizedTitle = words
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .slice(0, 30); // Limit the title length to 30 chars

  // Get current timestamp
  const timestamp = Date.now().toString(36);

  // Generate a random string
  const uniqueId = nanoid();

  // Combine all parts to create a unique slug
  return `${sanitizedTitle}-${timestamp}-${uniqueId}`;
} 