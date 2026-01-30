import { db } from './server/db.js';
import { sql } from 'drizzle-orm';

async function createBlogTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blog_articles (
        id int AUTO_INCREMENT NOT NULL,
        title varchar(255) NOT NULL,
        slug varchar(255) NOT NULL UNIQUE,
        excerpt text,
        content text NOT NULL,
        metaTitle varchar(100),
        metaDescription varchar(160),
        keywords text,
        imageUrl text,
        authorName varchar(100) DEFAULT 'Taiwan Maami',
        status enum('draft', 'pending_review', 'published', 'archived') NOT NULL DEFAULT 'draft',
        publishedAt timestamp,
        viewCount int NOT NULL DEFAULT 0,
        createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT blog_articles_id PRIMARY KEY(id)
      )
    `);
    console.log('Blog articles table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}
createBlogTable();
