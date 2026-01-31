-- Migration number: 0001 	 2026-01-31T05:16:10.170Z

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  published_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_published ON posts(published_at);

-- Seed data
INSERT INTO posts (id, slug, title, excerpt, content, published_at) VALUES
  ('1', 'hello-world', 'Hello World', 'Welcome to my blog built with Cloudwerk.',
   '# Hello World

Welcome to my blog! This is my first post built with **Cloudwerk**, a full-stack framework for Cloudflare Workers.

## What is Cloudwerk?

Cloudwerk provides file-based routing that compiles to Hono, with integrated support for:

- D1 databases
- KV storage
- R2 object storage
- Authentication
- Queues

## Getting Started

To create a new Cloudwerk app:

```bash
pnpm create @cloudwerk/app my-app
```

Stay tuned for more posts!',
   '2025-01-15'),

  ('2', 'getting-started', 'Getting Started with Cloudwerk', 'Learn how to build your first Cloudwerk application.',
   '# Getting Started with Cloudwerk

In this post, we will walk through building your first Cloudwerk application.

## Prerequisites

- Node.js 20+
- pnpm (recommended)
- A Cloudflare account

## Create Your App

```bash
pnpm create @cloudwerk/app my-blog --renderer hono-jsx
cd my-blog
pnpm install
```

## Project Structure

```
my-blog/
├── app/
│   ├── layout.tsx    # Root layout
│   ├── page.tsx      # Home page
│   └── route.ts      # API route
├── cloudwerk.config.ts
├── wrangler.toml
└── package.json
```

## Run Development Server

```bash
pnpm dev
```

Visit `http://localhost:3000` to see your app!

## Next Steps

- Add more pages in the `app/` directory
- Configure D1 database bindings
- Deploy to Cloudflare Workers',
   '2025-01-20');
