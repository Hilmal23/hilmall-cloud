import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const blog = await getCollection('blog', ({ data }) => !data.draft);
  
  return rss({
    title: 'Hilmall Cloud',
    description: 'Technical insights on AI infrastructure, bug bounty, blockchain, Linux VPS, and modern DevOps.',
    site: context.site ?? 'https://hilmall.cloud',
    items: blog.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: `<language>en-us</language>`,
  });
}
