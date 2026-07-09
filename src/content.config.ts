import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Markdown-based blog (Astro 5 content layer). Swap the loader later for a
// CMS without touching templates that consume `getCollection('blog')`.
const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Lighthouse Digital Media'),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
