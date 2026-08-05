# Hilmall Cloud

Technical content about AI infrastructure, bug bounty, blockchain, Linux VPS, and modern DevOps.

Built with [Astro](https://astro.build), styled with [Tailwind CSS](https://tailwindcss.com), deployed on [Cloudflare Pages](https://pages.cloudflare.com).

## Features

- ⚡ **Blazing Fast** — Static site generation with Astro
- 🎨 **Modern Design** — Dark theme, responsive layout, Tailwind CSS
- 📝 **Content-Rich** — 10+ in-depth technical articles (1000+ words each)
- 🔍 **SEO Optimized** — Sitemap, OpenGraph, Twitter Cards, Schema.org
- 📱 **Fully Responsive** — Mobile-first design
- 🔒 **Security Focused** — Security headers, best practices

## Content Topics

- Blockchain Nodes (Solana, Ethereum)
- Linux VPS Administration
- Docker & Containerization
- AI Agents & LLM Integration
- Bug Bounty Hunting
- Rust Systems Programming
- Golang Microservices
- Cloudflare CDN & Security
- Web Application Security
- Infrastructure as Code

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/hilmall/hilmall-site.git
cd hilmall-site

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:4321`

### Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy

Or use the included GitHub Actions workflow (requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets).

### Manual Deployment

```bash
npm run build
# Upload dist/ to your hosting provider
```

## Project Structure

```
├── src/
│   ├── content/
│   │   ├── blog/           # Blog articles (Markdown)
│   │   └── resources/      # Resource pages
│   ├── components/         # Reusable components
│   ├── layouts/            # Page layouts
│   ├── pages/              # Route pages
│   └── styles/             # Global styles
├── public/                 # Static assets
├── .github/workflows/      # CI/CD
└── astro.config.mjs        # Astro configuration
```

## Adding Content

### New Blog Post

Create a new file in `src/content/blog/`:

```markdown
---
title: "Your Post Title"
description: "Post description for SEO"
pubDate: 2025-01-15
author: "Hilmall Cloud"
tags:
  - "Tag1"
  - "Tag2"
---

Your content here...
```

## Configuration

Edit `astro.config.mjs`:

```javascript
export default defineConfig({
  site: 'https://hilmall.cloud',
  integrations: [sitemap()],
  // ...
});
```

## SEO Features

- ✅ Sitemap (auto-generated)
- ✅ robots.txt
- ✅ OpenGraph meta tags
- ✅ Twitter Cards
- ✅ Schema.org structured data
- ✅ Canonical URLs
- ✅ Meta descriptions
- ✅ RSS feed

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- Hosted on [Evolution Host](https://evolution-host.com)
- CDN by [Cloudflare](https://cloudflare.com)
- Built with [Astro](https://astro.build)
