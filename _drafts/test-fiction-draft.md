---
layout: single
title: "Test Fiction Post"
categories: [conto]
tags: [fiction, test]
published_year: 2025
draft: true
---

This is a test fiction post to verify that the publishing workflow works properly.

## What this post tests:

- **Publishing workflow** - This post should appear when running normal `bundle exec jekyll serve`
- **Category listing** - Should appear on the Fiction page under "Short stories"
- **Sitemap inclusion** - Should be included in the sitemap.xml
- **Proper dating** - Uses today's date (2025-07-30)

## How publishing works:

1. **Create drafts** in the `_drafts/` directory
2. **Preview them** with `bundle exec jekyll serve --drafts`
3. **When ready to publish**, move the file to `_posts/` with a proper date
4. **Published posts** appear on the live site and in sitemap

This post will be deleted once we confirm the publishing system is working correctly. 