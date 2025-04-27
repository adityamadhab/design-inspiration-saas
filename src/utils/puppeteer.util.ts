import puppeteer from 'puppeteer';
import { config } from '../config';
import { PageInfo } from '../types/inspiration.types';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import r2 from '../config/r2';

export async function extractInternalLinks(url: string): Promise<string[]> {
  const browser = await puppeteer.launch({
    ...config.puppeteer,
    args: [...config.puppeteer.args]
  });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle0' });

    const links = await page.evaluate((baseUrl) => {
      const anchors = document.querySelectorAll('a');
      const internalLinks = new Set<string>();
      
      anchors.forEach((anchor) => {
        const href = anchor.href;
        if (href && href.startsWith(baseUrl)) {
          internalLinks.add(href);
        }
      });
      
      return Array.from(internalLinks);
    }, url);

    return links;
  } finally {
    await browser.close();
  }
}

export async function extractPageInfo(url: string): Promise<PageInfo> {
  const browser = await puppeteer.launch({
    ...config.puppeteer,
    args: [...config.puppeteer.args]
  });
  const page = await browser.newPage();
  
  try {
    // Set a longer timeout and wait for network idle
    await page.setDefaultNavigationTimeout(30000);
    await page.goto(url, { 
      waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
      timeout: 30000 
    });

    // Wait for the body to be rendered
    await page.waitForSelector('body', { timeout: 5000 });

    // Scroll through the page to trigger lazy loading
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve(true);
          }
        }, 100);
      });
    });

    // Take desktop screenshot and upload to R2
    await page.setViewport(config.screenshots.desktop);
    const desktopScreenshot = await page.screenshot({ fullPage: true });
    const desktopKey = `screenshots/${Date.now()}-desktop.png`;
    await r2.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: desktopKey,
      Body: desktopScreenshot,
      ContentType: 'image/png'
    }));
    const desktopUrl = `${process.env.CLOUDFLARE_PUBLIC_URL}${desktopKey}`;

    // Take mobile screenshot and upload to R2
    await page.setViewport(config.screenshots.mobile);
    const mobileScreenshot = await page.screenshot({ fullPage: true });
    const mobileKey = `screenshots/${Date.now()}-mobile.png`;
    await r2.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_BUCKET_NAME,
      Key: mobileKey,
      Body: mobileScreenshot,
      ContentType: 'image/png'
    }));
    const mobileUrl = `${process.env.CLOUDFLARE_PUBLIC_URL}${mobileKey}`;

    // Extract page information with enhanced detection
    const pageInfo = await page.evaluate(() => {
      const title = document.title;
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      
      // Helper function to extract colors from computed styles
      const extractColors = (): string[] => {
        const colors = new Set<string>();
        const elements = document.querySelectorAll('*');
        const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        const rgbColorRegex = /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/;
        const rgbaColorRegex = /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/;
        const namedColors: Record<string, string> = {
          blue: '#0000ff',
          red: '#ff0000',
          green: '#00ff00',
          // Add more named colors as needed
        };

        // Convert RGB to Hex
        const rgbToHex = (r: number, g: number, b: number): string => {
          const toHex = (n: number) => {
            const hex = n.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          };
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        };

        // Extract color from RGB/RGBA format
        const extractRGBValues = (color: string): string | null => {
          const match = color.match(/\d+/g);
          if (match && match.length >= 3) {
            const [r, g, b] = match.map(Number);
            return rgbToHex(r, g, b);
          }
          return null;
        };

        // Process each element with more properties
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const properties = [
            'color',
            'background-color',
            'border-color',
            'border-top-color',
            'border-right-color',
            'border-bottom-color',
            'border-left-color',
            'box-shadow',
            'text-shadow',
            'outline-color',
            'fill',
            'stroke'
          ];

          properties.forEach(prop => {
            let color = style.getPropertyValue(prop).trim().toLowerCase();
            
            // Handle different color formats
            if (hexColorRegex.test(color)) {
              colors.add(color);
            } else if (rgbColorRegex.test(color) || rgbaColorRegex.test(color)) {
              const hexColor = extractRGBValues(color);
              if (hexColor) colors.add(hexColor);
            } else if (namedColors[color]) {
              colors.add(namedColors[color]);
            }
          });

          // Check for background-image gradient colors
          const bgImage = style.backgroundImage;
          if (bgImage && bgImage.includes('gradient')) {
            const gradientColors = bgImage.match(/#[a-f0-9]{3,6}|rgb\([^)]+\)/gi) || [];
            gradientColors.forEach(color => {
              if (hexColorRegex.test(color)) {
                colors.add(color);
              } else if (rgbColorRegex.test(color) || rgbaColorRegex.test(color)) {
                const hexColor = extractRGBValues(color);
                if (hexColor) colors.add(hexColor);
              }
            });
          }
        });

        // Get colors from CSS variables
        const rootStyle = window.getComputedStyle(document.documentElement);
        const cssVars = Array.from(rootStyle).filter(prop => prop.startsWith('--'));
        cssVars.forEach(prop => {
          const color = rootStyle.getPropertyValue(prop).trim().toLowerCase();
          if (hexColorRegex.test(color)) {
            colors.add(color);
          } else if (rgbColorRegex.test(color) || rgbaColorRegex.test(color)) {
            const hexColor = extractRGBValues(color);
            if (hexColor) colors.add(hexColor);
          }
        });

        // Filter out common default colors and ensure minimum brightness difference
        const defaultColors = new Set(['#000000', '#ffffff', '#000', '#fff', 'transparent', 'rgba(0,0,0,0)']);
        const filteredColors = Array.from(colors).filter(color => !defaultColors.has(color));

        // Sort colors by frequency and ensure minimum contrast
        const colorFrequency = new Map<string, number>();
        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const properties = ['color', 'background-color', 'border-color'];
          
          properties.forEach(prop => {
            const color = style.getPropertyValue(prop).trim().toLowerCase();
            if (hexColorRegex.test(color)) {
              colorFrequency.set(color, (colorFrequency.get(color) || 0) + 1);
            } else if (rgbColorRegex.test(color) || rgbaColorRegex.test(color)) {
              const hexColor = extractRGBValues(color);
              if (hexColor) {
                colorFrequency.set(hexColor, (colorFrequency.get(hexColor) || 0) + 1);
              }
            }
          });
        });

        // Return top colors with frequency weight
        return filteredColors
          .sort((a, b) => (colorFrequency.get(b) || 0) - (colorFrequency.get(a) || 0))
          .slice(0, 10);
      };

      // Get fonts using computed styles with enhanced detection
      const elements = document.querySelectorAll('*');
      const fontSet = new Set<string>();
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const fontFamily = style.fontFamily;
        if (fontFamily) {
          const fonts = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
          fonts.forEach(font => {
            if (font && !font.toLowerCase().includes('serif') && !font.toLowerCase().includes('sans')) {
              fontSet.add(font);
            }
          });
        }
      });

      // Helper function to check script sources with enhanced detection
      const hasScript = (pattern: string): boolean => {
        // Check script src attributes
        const scripts = document.getElementsByTagName('script');
        const hasScriptSrc = Array.from(scripts).some(script => 
          (script.src && script.src.toLowerCase().includes(pattern.toLowerCase())) ||
          (script.textContent && script.textContent.toLowerCase().includes(pattern.toLowerCase()))
        );

        // Check for script content
        const scriptContent = Array.from(scripts)
          .map(script => script.textContent || '')
          .join(' ')
          .toLowerCase();

        return hasScriptSrc || scriptContent.includes(pattern.toLowerCase());
      };

      // Helper function to check stylesheet sources with enhanced detection
      const hasStylesheet = (pattern: string): boolean => {
        // Check link href attributes
        const links = document.getElementsByTagName('link');
        const hasLinkHref = Array.from(links).some(link => 
          link.rel === 'stylesheet' && 
          link.href && 
          link.href.toLowerCase().includes(pattern.toLowerCase())
        );

        // Check style tags
        const styles = document.getElementsByTagName('style');
        const styleContent = Array.from(styles)
          .map(style => style.textContent || '')
          .join(' ')
          .toLowerCase();

        return hasLinkHref || styleContent.includes(pattern.toLowerCase());
      };

      // Get keywords from meta tags
      const getMetaKeywords = (): string[] => {
        const keywordsTag = document.querySelector('meta[name="keywords"]');
        return keywordsTag ? keywordsTag.getAttribute('content')?.split(',').map(k => k.trim()) || [] : [];
      };

      // Detect niche based on content and keywords
      const detectNiche = (): string => {
        const keywords = getMetaKeywords();
        const pageText = document.body.textContent?.toLowerCase() || '';
        
        // Define niche patterns
        const nichePatterns = {
          'e-commerce': ['shop', 'store', 'cart', 'checkout', 'product'],
          'blog': ['blog', 'post', 'article', 'author'],
          'portfolio': ['portfolio', 'work', 'projects', 'gallery'],
          // Add more niches as needed
        };

        // Check each niche pattern
        for (const [niche, patterns] of Object.entries(nichePatterns)) {
          if (patterns.some(pattern => 
            keywords.includes(pattern) || pageText.includes(pattern)
          )) {
            return niche;
          }
        }

        return 'general';
      };

      // Category Detection
      const detectCategories = (): string[] => {
        const categoryPatterns = {
          'AI Tools': ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'neural', 'automation'],
          'Analytics': ['analytics', 'metrics', 'dashboard', 'tracking', 'statistics', 'data'],
          'Authentication': ['auth', 'login', 'signup', 'authentication', 'security', 'user management'],
          'Business Tools': ['business', 'management', 'workflow', 'productivity', 'organization'],
          'Communication': ['chat', 'messaging', 'communication', 'collaboration', 'team'],
          'Content Management': ['cms', 'content', 'management', 'publishing', 'blog'],
          'Customer Service': ['support', 'help desk', 'customer service', 'chat bot', 'ticketing'],
          'Database': ['database', 'storage', 'data management', 'cloud storage'],
          'Design Tools': ['design', 'ui', 'ux', 'prototype', 'wireframe', 'mockup'],
          'Developer Tools': ['api', 'sdk', 'development', 'code', 'programming', 'developer'],
          'E-commerce Tools': ['shop', 'store', 'cart', 'payment', 'inventory', 'e-commerce'],
          'Email Tools': ['email', 'newsletter', 'marketing', 'campaign', 'mailing'],
          'Finance Tools': ['payment', 'billing', 'invoice', 'accounting', 'financial'],
          'Forms': ['form', 'survey', 'questionnaire', 'input', 'data collection'],
          'Human Resources': ['hr', 'recruitment', 'hiring', 'employee', 'talent'],
          'Marketing Tools': ['marketing', 'seo', 'advertising', 'promotion', 'campaign'],
          'Mobile Development': ['mobile', 'app', 'ios', 'android', 'react native'],
          'Monitoring': ['monitoring', 'logging', 'tracking', 'performance', 'analytics'],
          'No-Code Tools': ['no-code', 'low-code', 'visual builder', 'drag and drop'],
          'Project Management': ['project', 'task', 'management', 'collaboration', 'planning'],
          'Sales Tools': ['sales', 'crm', 'lead', 'pipeline', 'customer'],
          'Social Media': ['social', 'media', 'sharing', 'community', 'network'],
          'Testing Tools': ['testing', 'qa', 'quality', 'test automation', 'debugging'],
          'Video': ['video', 'streaming', 'recording', 'editing', 'player'],
          'Web Hosting': ['hosting', 'server', 'cloud', 'deployment', 'domain']
        };

        const categories: string[] = [];
        const pageText = document.body.innerText.toLowerCase();
        const metaKeywords = getMetaKeywords();
        const title = document.title.toLowerCase();
        const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.toLowerCase() || '';

        for (const [category, keywords] of Object.entries(categoryPatterns)) {
          let matches = 0;
          
          // Check in meta keywords
          matches += keywords.filter(k => metaKeywords.includes(k.toLowerCase())).length * 2;
          
          // Check in title and description
          matches += keywords.filter(k => title.includes(k.toLowerCase())).length * 3;
          matches += keywords.filter(k => description.includes(k.toLowerCase())).length * 2;
          
          // Check in page content
          matches += keywords.filter(k => pageText.includes(k.toLowerCase())).length;

          // If we have enough matches, include this category
          if (matches >= 3) {
            categories.push(category);
          }
        }

        // Limit to top 5 most relevant categories
        return categories.slice(0, 5);
      };

      // Get technologies with enhanced detection
      const technologies: string[] = [];
      
      // Framework Detection - Enhanced
      if (
        document.querySelector('[ng-app], [ng-controller], [ng-model], [ng-repeat], [ng-view], [ng-if], [ng-show], [ng-hide]') ||
        hasScript('angular') ||
        window.hasOwnProperty('angular')
      ) technologies.push('Angular');

      if (
        document.querySelector('[data-reactroot], [data-reactid], [class*="react-"], [class*="_react"]') ||
        hasScript('react') ||
        (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ ||
        document.querySelector('#root') // Common React root element
      ) technologies.push('React');

      if (
        document.querySelector('[data-v-], [v-cloak], [v-show], [v-if], [v-model], [v-for]') ||
        hasScript('vue') ||
        (window as any).__VUE__ ||
        document.querySelector('#app') // Common Vue root element
      ) technologies.push('Vue.js');

      // UI Framework Detection - Enhanced
      if (
        document.querySelector('.MuiBox-root, .MuiButton-root, [class*="makeStyles-"], [class*="MuiTypography-"], [class*="MuiContainer-"]') ||
        hasScript('material-ui') ||
        hasScript('@mui/material')
      ) technologies.push('Material-UI');

      if (
        document.querySelector('.ant-btn, .ant-input, .ant-, [class*="ant-"]') ||
        hasStylesheet('antd')
      ) technologies.push('Ant Design');

      if (
        document.querySelector('.chakra-') ||
        hasScript('chakra') ||
        hasScript('@chakra-ui')
      ) technologies.push('Chakra UI');

      if (
        document.querySelector('[class*="tailwind-"], [class*="tw-"]') ||
        hasStylesheet('tailwind') ||
        Array.from(document.styleSheets).some(sheet => {
          try {
            return Array.from(sheet.cssRules).some(rule => 
              rule.cssText.includes('@tailwind') || 
              rule.cssText.includes('--tw-')
            );
          } catch {
            return false;
          }
        })
      ) technologies.push('Tailwind CSS');

      // State Management - Enhanced
      if (
        (window as any).Redux ||
        hasScript('redux') ||
        hasScript('react-redux') ||
        window.hasOwnProperty('__REDUX_DEVTOOLS_EXTENSION__')
      ) technologies.push('Redux');

      // Modern Framework Detection - Enhanced
      if (
        document.querySelector('#__next, [class*="next-"]') ||
        (document as any).__NEXT_DATA__ ||
        hasScript('next') ||
        hasScript('/_next/')
      ) technologies.push('Next.js');

      if (
        document.querySelector('#__nuxt, #__layout, [class*="nuxt-"]') ||
        hasScript('nuxt') ||
        hasScript('/_nuxt/')
      ) technologies.push('Nuxt.js');

      // Build Tools Detection
      if (
        hasScript('webpack') ||
        typeof (window as any).webpackJsonp !== 'undefined' ||
        typeof (window as any).webpackChunk !== 'undefined'
      ) technologies.push('Webpack');

      if (
        hasScript('vite') ||
        document.querySelector('script[type="module"][src*="@vite"], script[type="module"][src*="@fs"]')
      ) technologies.push('Vite');

      // Analytics and Marketing - Enhanced
      if (
        (window as any).ga ||
        (window as any).gtag ||
        (window as any).gaData ||
        (window as any).google_tag_manager ||
        hasScript('google-analytics') ||
        hasScript('analytics') ||
        hasScript('ga.js') ||
        hasScript('gtag')
      ) technologies.push('Google Analytics');

      // Additional Framework Detection
      if (document.querySelector('script[type="module"]')) technologies.push('ES Modules');
      if (hasScript('typescript')) technologies.push('TypeScript');
      if (hasScript('babel')) technologies.push('Babel');
      if (hasScript('lodash') || (window as any)._) technologies.push('Lodash');
      if (hasScript('jquery') || (window as any).jQuery) technologies.push('jQuery');
      if (hasScript('axios')) technologies.push('Axios');
      if (hasScript('graphql')) technologies.push('GraphQL');
      if (hasScript('apollo')) technologies.push('Apollo');
      if (document.querySelector('link[rel="manifest"]')) technologies.push('PWA');

      // Testing Libraries - Enhanced
      if (hasScript('jest') || window.hasOwnProperty('jest')) technologies.push('Jest');
      if (hasScript('cypress') || window.hasOwnProperty('Cypress')) technologies.push('Cypress');
      if (hasScript('playwright')) technologies.push('Playwright');
      if (hasScript('mocha')) technologies.push('Mocha');
      if (hasScript('chai')) technologies.push('Chai');

      // Animation Libraries - Enhanced
      if (
        (window as any).GSAP ||
        hasScript('gsap') ||
        hasScript('TweenMax') ||
        hasScript('TimelineMax')
      ) technologies.push('GSAP');

      // Remove duplicates and filter out empty/undefined values
      const uniqueTechnologies = Array.from(new Set(technologies.filter(Boolean)));

      // Sort technologies by category for better organization
      const sortedTechnologies = uniqueTechnologies.sort((a, b) => a.localeCompare(b));

      // Extract all data
      const colorScheme = extractColors();
      const niche = detectNiche();
      const categories = detectCategories();

      // Ensure we have at least some categories if niche is detected
      if (categories.length === 0 && niche !== 'general') {
        categories.push(niche);
      }

      return {
        title,
        metaDescription,
        fonts: Array.from(fontSet),
        technologies: sortedTechnologies,
        niche,
        categories,
        colorScheme: colorScheme.length > 0 ? colorScheme : ['#4A90E2', '#50E3C2', '#F5A623'],
      };
    });

    return {
      ...pageInfo,
      desktopScreenshotUrl: desktopUrl,
      mobileScreenshotUrl: mobileUrl,
    };
  } finally {
    await browser.close();
  }
} 