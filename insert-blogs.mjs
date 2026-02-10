import { blogPosts } from './blog-posts.mjs';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

async function main() {
  // Parse the DATABASE_URL
  const url = new URL(DATABASE_URL);
  const connection = await mysql.createConnection({
    host: url.hostname,
    port: parseInt(url.port) || 3306,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: true },
  });

  console.log('Connected to database');

  for (const post of blogPosts) {
    const now = new Date();
    try {
      await connection.execute(
        `INSERT INTO blog_articles (title, slug, excerpt, content, metaTitle, metaDescription, keywords, authorName, status, publishedAt, viewCount, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, 0, ?, ?)`,
        [
          post.title,
          post.slug,
          post.excerpt,
          post.content,
          post.metaTitle,
          post.metaDescription,
          post.keywords,
          post.authorName,
          now,
          now,
          now,
        ]
      );
      console.log(`✅ Inserted: ${post.title}`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        // Update existing
        await connection.execute(
          `UPDATE blog_articles SET title=?, excerpt=?, content=?, metaTitle=?, metaDescription=?, keywords=?, authorName=?, status='published', publishedAt=?, updatedAt=? WHERE slug=?`,
          [
            post.title,
            post.excerpt,
            post.content,
            post.metaTitle,
            post.metaDescription,
            post.keywords,
            post.authorName,
            now,
            now,
            post.slug,
          ]
        );
        console.log(`🔄 Updated: ${post.title}`);
      } else {
        console.error(`❌ Error inserting ${post.title}:`, err.message);
      }
    }
  }

  await connection.end();
  console.log('\nDone! All blog posts inserted.');
}

main().catch(console.error);
