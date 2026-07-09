# Blog drafts

Drop draft posts here (.docx, .md, or .txt) and ask Claude to publish them.

Claude will:
1. Convert the draft to markdown with frontmatter (title, description, pubDate)
2. Place it in src/content/blog/ with an SEO-friendly filename (becomes the URL)
3. Extract and optimize any images into public/images/blog/
4. Verify the build, then commit for Sean to review and push

Notes:
- The filename becomes the URL slug: my-post.md -> /blog/my-post/
- A one-line description is used for SEO + the blog index card; Claude drafts
  one if the doc doesn't include it
- Nothing goes live until Sean pushes
- This folder is gitignored — drafts stay out of the public repo
