import { defineCollection, z } from 'astro:content';

// Markdown-based blog. Structure is CMS-ready: swap the loader later without
// touching templates that consume `getCollection('blog')`.
const blog = defineCollection({
  type: 'content',
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
