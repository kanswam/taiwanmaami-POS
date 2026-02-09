import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('SEO Optimizations', () => {
  const indexHtmlPath = path.join(__dirname, '..', 'client', 'index.html');
  const sitemapPath = path.join(__dirname, '..', 'client', 'public', 'sitemap.xml');
  const robotsPath = path.join(__dirname, '..', 'client', 'public', 'robots.txt');
  const seoComponentPath = path.join(__dirname, '..', 'client', 'src', 'components', 'SEO.tsx');
  
  let indexHtml: string;
  let sitemap: string;
  
  beforeAll(() => {
    indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
    sitemap = fs.readFileSync(sitemapPath, 'utf-8');
  });

  describe('index.html structured data', () => {
    it('should contain Restaurant JSON-LD for T Nagar location', () => {
      expect(indexHtml).toContain('"@type": "Restaurant"');
      expect(indexHtml).toContain('Moutan by Taiwan Maami - T Nagar');
      expect(indexHtml).toContain('New No. 29, Burkit Road');
    });

    it('should contain Restaurant JSON-LD for Velachery location', () => {
      expect(indexHtml).toContain('Taiwan Maami - Velachery');
      expect(indexHtml).toContain('Palladium Mall, Velachery');
      expect(indexHtml).toContain('"postalCode": "600042"');
    });

    it('should contain Menu structured data with categories', () => {
      expect(indexHtml).toContain('"@type": "Menu"');
      expect(indexHtml).toContain('"@type": "MenuSection"');
      expect(indexHtml).toContain('Iced Beverages');
      expect(indexHtml).toContain('Hot Beverages');
      expect(indexHtml).toContain('"name": "Food"');
      expect(indexHtml).toContain('Asian Sweet Bites');
    });

    it('should contain FAQPage structured data', () => {
      expect(indexHtml).toContain('"@type": "FAQPage"');
      expect(indexHtml).toContain('What is Taiwan Maami?');
      expect(indexHtml).toContain('Where is Taiwan Maami located in Chennai?');
      expect(indexHtml).toContain('Does Taiwan Maami offer home delivery?');
    });

    it('should contain BreadcrumbList structured data', () => {
      expect(indexHtml).toContain('"@type": "BreadcrumbList"');
      expect(indexHtml).toContain('"@type": "ListItem"');
      expect(indexHtml).toContain('"name": "Menu"');
      expect(indexHtml).toContain('"name": "About Us"');
    });

    it('should contain WebSite with SearchAction structured data', () => {
      expect(indexHtml).toContain('"@type": "WebSite"');
      expect(indexHtml).toContain('"@type": "SearchAction"');
    });

    it('should have hasMenu on T Nagar restaurant', () => {
      expect(indexHtml).toContain('"hasMenu"');
    });

    it('should have Mochi in servesCuisine', () => {
      expect(indexHtml).toContain('"Mochi"');
    });

    it('should contain essential meta tags', () => {
      expect(indexHtml).toContain('og:title');
      expect(indexHtml).toContain('og:description');
      expect(indexHtml).toContain('og:image');
      expect(indexHtml).toContain('twitter:card');
      expect(indexHtml).toContain('geo.region');
      expect(indexHtml).toContain('geo.placename');
    });
  });

  describe('sitemap.xml', () => {
    it('should exist and be valid XML', () => {
      expect(sitemap).toContain('<?xml version="1.0"');
      expect(sitemap).toContain('<urlset');
    });

    it('should include homepage', () => {
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/</loc>');
    });

    it('should include menu page', () => {
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/menu</loc>');
    });

    it('should include menu category pages', () => {
      expect(sitemap).toContain('menu?category=food');
      expect(sitemap).toContain('menu?category=bubble-tea');
      expect(sitemap).toContain('menu?category=coffee');
      expect(sitemap).toContain('menu?category=mochis');
    });

    it('should include events page', () => {
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/events</loc>');
    });

    it('should include blog page', () => {
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/blog</loc>');
    });

    it('should include about page', () => {
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/about</loc>');
    });

    it('should include franchise page', () => {
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/franchise</loc>');
    });

    it('should include legal pages', () => {
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/terms</loc>');
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/privacy</loc>');
      expect(sitemap).toContain('<loc>https://www.taiwanmaami.com/refund</loc>');
    });
  });

  describe('robots.txt', () => {
    it('should exist', () => {
      expect(fs.existsSync(robotsPath)).toBe(true);
    });

    it('should reference sitemap', () => {
      const robots = fs.readFileSync(robotsPath, 'utf-8');
      expect(robots.toLowerCase()).toContain('sitemap');
    });
  });

  describe('SEO component', () => {
    it('should exist', () => {
      expect(fs.existsSync(seoComponentPath)).toBe(true);
    });

    it('should use react-helmet-async', () => {
      const seoContent = fs.readFileSync(seoComponentPath, 'utf-8');
      expect(seoContent).toContain('react-helmet-async');
      expect(seoContent).toContain('Helmet');
    });

    it('should support title, description, keywords, and canonical', () => {
      const seoContent = fs.readFileSync(seoComponentPath, 'utf-8');
      expect(seoContent).toContain('title');
      expect(seoContent).toContain('description');
      expect(seoContent).toContain('keywords');
      expect(seoContent).toContain('canonicalPath');
    });

    it('should include Open Graph and Twitter Card meta tags', () => {
      const seoContent = fs.readFileSync(seoComponentPath, 'utf-8');
      expect(seoContent).toContain('og:title');
      expect(seoContent).toContain('og:description');
      expect(seoContent).toContain('twitter:card');
    });
  });

  describe('Per-page SEO integration', () => {
    const pagesToCheck = [
      { file: 'Home.tsx', shouldContain: ['SEO', 'bubble tea Chennai'] },
      { file: 'Menu.tsx', shouldContain: ['SEO', 'canonicalPath="/menu"'] },
      { file: 'About.tsx', shouldContain: ['SEO', 'canonicalPath="/about"'] },
      { file: 'Events.tsx', shouldContain: ['SEO', 'canonicalPath="/events"'] },
      { file: 'Blog.tsx', shouldContain: ['SEO', 'canonicalPath="/blog"'] },
      { file: 'FAQ.tsx', shouldContain: ['SEO', 'canonicalPath="/faq"'] },
      { file: 'Franchise.tsx', shouldContain: ['SEO', 'canonicalPath="/franchise"'] },
      { file: 'Testimonials.tsx', shouldContain: ['SEO', 'canonicalPath="/testimonials"'] },
    ];

    pagesToCheck.forEach(({ file, shouldContain }) => {
      it(`${file} should have SEO component with proper meta`, () => {
        const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', file);
        const content = fs.readFileSync(filePath, 'utf-8');
        shouldContain.forEach(text => {
          expect(content).toContain(text);
        });
      });
    });
  });

  describe('HelmetProvider in main.tsx', () => {
    it('should wrap App with HelmetProvider', () => {
      const mainPath = path.join(__dirname, '..', 'client', 'src', 'main.tsx');
      const mainContent = fs.readFileSync(mainPath, 'utf-8');
      expect(mainContent).toContain('HelmetProvider');
      expect(mainContent).toContain('react-helmet-async');
    });
  });
});
