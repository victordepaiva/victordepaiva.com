---
layout: single
title: "Test Draft Post"
categories: [test]
tags: [draft, test]
permalink: /test-draft/
draft: true
---

This is a test draft post to verify that the `_drafts/` directory is working properly.

## What this post tests:

- **Draft functionality** - This post should only appear when running `bundle exec jekyll serve --drafts`
- **No date required** - Draft posts don't need the YYYY-MM-DD prefix
- **Preview capability** - You can see how posts look before publishing

## How to use drafts:

1. **Create drafts** in the `_drafts/` directory
2. **Preview them** with `bundle exec jekyll serve --drafts`
3. **When ready to publish**, move the file to `_posts/` with a proper date

This post will be deleted once we confirm the draft system is working correctly. 