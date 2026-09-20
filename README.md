# Victor de Paiva - Personal Website

A Jekyll-based personal website built with the Minimal Mistakes theme. This repository contains the source code for [victordepaiva.com](https://victordepaiva.com).

## Project Structure

### Core Jekyll Files
- `_config.yml` - Site configuration and settings
- `_posts/` - Blog posts in Markdown format (YYYY-MM-DD-title.md)
- `_drafts/` - Draft posts (not published, preview with --drafts flag)
- `_pages/` - Content pages in HTML format
- `_layouts/` - HTML templates for different page types
- `_includes/` - Reusable HTML components and snippets
- `_sass/` - SCSS stylesheets and theme customization
- `_data/` - YAML data files for site content

### Content Pages
- `index.html` - Homepage (root directory)
- `_pages/about.html` - About page
- `_pages/fiction.html` - Fiction writing section
- `_pages/nonfiction.html` - Non-fiction writing section
- `_pages/games.html` - Games section
- `_pages/other-work.html` - Other work section
- `_pages/links.html` - External profiles and contact section
- `_pages/now.html` - Current status page
- `_pages/archive.html` - Post archive
- `_pages/categories.html` - Category listing

### Assets
- `assets/css/` - Compiled CSS and custom stylesheets
- `assets/js/` - JavaScript files and libraries
- `assets/fonts/` - Custom fonts (OpenDyslexic)
- `assets/images/posts/` - Images used in blog posts
- `assets/images/games/` - Vertical capsule art for the Games page grid
- `assets/images/icons/` - Social media and UI icons
- `assets/images/branding/` - Footer and header branding images

### Build Configuration
- `Gemfile` - Ruby dependencies for Jekyll
- `Gemfile.lock` - Locked dependency versions
- `.gitignore` - Git ignore patterns
- `.ruby-version` - Ruby version specification

### Browser Assets
- `favicon.ico` - Site favicon
- `favicon-*.png` - Various favicon sizes
- `apple-touch-icon.png` - iOS home screen icon
- `android-chrome-*.png` - Android home screen icons
- `mstile-150x150.png` - Windows tile icon
- `safari-pinned-tab.svg` - Safari pinned tab icon
- `browserconfig.xml` - Windows tile configuration
- `site.webmanifest` - Progressive Web App manifest

## Development Setup

### Prerequisites
- Ruby 3.4 or higher
- Bundler gem

### Installation
1. Clone the repository
2. Install dependencies: `bundle install`
3. Start development server: `bundle exec jekyll serve`
4. Access site at `http://localhost:4000`

### Build Process
- Jekyll processes Markdown files in `_posts/` into HTML
- SCSS files in `_sass/` are compiled to CSS
- Liquid templates in `_layouts/` and `_includes/` are processed
- Static assets are copied to `_site/` directory
- Site is generated in `_site/` directory
- Custom sitemap.xml is generated (excludes drafts)

### File Organization
- **Posts**: Stored in `_posts/` with YYYY-MM-DD-title.md naming
- **Drafts**: Work-in-progress posts in `_drafts/` (no date required)
- **Pages**: HTML files in `_pages/` directory (except homepage in root)
- **Images**: Organized by type in `assets/images/` (posts, icons, branding)
- **Styles**: Custom CSS in `assets/css/custom.css`
- **Scripts**: Custom JavaScript in `assets/js/custom.js`

## Deployment

This site is deployed via Netlify. The build process:
1. Installs Ruby dependencies via Bundler
2. Runs `bundle exec jekyll build`
3. Serves the generated `_site/` directory

### Dependency Lockfile

This is an application repository, so `Gemfile.lock` must be tracked and committed. Do not add it back to `.gitignore`. Netlify builds from a fresh checkout; without the lockfile it can resolve a different Jekyll/GitHub Pages dependency set than the one tested locally.

When changing Ruby gems:
1. Edit `Gemfile`
2. Run `bundle install`
3. Commit both `Gemfile` and `Gemfile.lock`
4. Verify with `bundle exec jekyll build`

The project uses Ruby 3.4.x. Some libraries that older Jekyll/GitHub Pages dependencies still `require` were removed from Ruby's default standard-library load path in Ruby 3.4, so they must be explicit bundled gems. Keep compatibility gems such as `csv` and `bigdecimal` in `Gemfile` unless the Jekyll dependency stack is upgraded and Netlify builds prove they are no longer needed.

### Sitemap
- Custom sitemap.xml is generated at `/sitemap.xml`
- Includes all published posts and pages
- Excludes draft posts and system pages
- Available at `https://victordepaiva.com/sitemap.xml`

## Theme Customization

This site is based on the [Minimal Mistakes](https://github.com/mmistakes/minimal-mistakes) Jekyll theme with customizations:
- Dark skin theme
- Desktop left sidebar navigation with social links, feed link, copyright, and font picker
- Mobile top navigation with always-visible about/now/links and a work dropdown
- Responsive games capsule grid on `/games/`
- Game posts use `_layouts/game.html` for structured, collapsible game sections without post metadata, social share buttons, or previous/next post navigation
- Game and writing post pages use a wider content inset on large desktop viewports (`1280px` and up)
- Other work section backed by the same `_posts/` workflow as games and writing
- Native links page at `/links/`, with contact handled as a section on that page
- OpenDyslexic font accessibility option
- Custom CSS for additional styling
- Custom JavaScript for enhanced functionality

## Content Management

### i18n

The site supports localized URLs under `/en/` and `/br/`, plus resolver URLs under `/-/` and the legacy unprefixed paths. Use separate source files per locale instead of storing multiple languages in one Markdown file.

Localized source files should end with the locale code before the extension:
- English: `2023-02-03-ernesto-en.md`
- Brazilian: `2023-02-03-ernesto-br.md`

The filename suffix is for source organization only. Public URLs are controlled by front matter:

```yaml
lang: br
translation_key: ernesto
i18n_path: /fiction/ernesto/
permalink: /br/fiction/ernesto/
```

Use the same `translation_key` for every localized version of the same page or post. Keep `i18n_path` as the locale-free canonical path and keep slugs stable across locales, for example `/en/about/` and `/br/about/`.

Choose `translation_key` values that identify the content item, not generic UI concepts or `_data/i18n.json` keys. For example, the native links page uses `translation_key: linkspage` with `i18n_path: /links/`; using a generic key such as `links` can cause the language switcher to resolve back to the current locale instead of the translated page.

UI strings live in `_data/i18n.json`. Add navigation labels, layout labels, section headings, buttons, and other interface copy there. Do not put page or post body translations in `_data/i18n.json`; create localized Markdown/HTML files instead.

The language controls in the masthead and footer use `page | i18n_url_for_locale: locale.code` to generate the matching localized URL. If that filter returns the current URL for a page that has `i18n_path`, the templates fall back to `/<locale>/<i18n_path>`. When adding a localized page, verify the generated HTML for both locale links, for example that `/en/example/` points `br` to `/br/example/` and `/br/example/` points `en` to `/en/example/`.

Fallback behavior:
- If the requested locale exists for a `translation_key`, the site renders that version at that locale URL.
- If the requested locale is missing, the site still generates the requested locale URL as a noindex shell page and renders the best available content inside it.
- If only one content version exists, the shell page renders that version.
- If the requested content locale is missing and English exists, the shell page renders English.
- Otherwise, the shell page renders the first available version for that `translation_key`.

This means browsing locale and content language are separate. For example, `/en/fiction/505/` remains an English UI page with English navigation, but it can display the Brazilian body if that is the only available content. The page shows a short notice explaining the content language and canonicalizes to the real content-language URL.

Resolver URLs such as `/about/` and `/-/about/` are still noindex redirect pages for browser/manual locale discovery. Missing localized content URLs such as `/en/fiction/505/` are noindex shell pages, not redirects, so users do not get pushed into another locale namespace while browsing.

For `collection: textos`, preserve the original creative text language with:

```yaml
original_language: brazilian
```

This value is displayed independently of the current UI locale. Current `textos` posts are Brazilian originals and use `-br.md` filenames. If a future translation is added, for example `2023-02-03-ernesto-en.md`, give it the same `translation_key` so English users automatically see the English body at `/en/fiction/ernesto/` instead of the fallback shell.

### Adding Posts
1. Create new Markdown file in `_posts/`
2. Use YYYY-MM-DD-title.md naming convention
3. Include front matter with title, date, categories, tags
4. Write content in Markdown format

### Adding Other Work Posts
1. Create a new Markdown file in `_posts/`
2. Use `layout: posts`
3. Set `collection: other-work`
4. Set `categories: other-work`
5. Set a permalink under `/other-work/`, for example `permalink: /other-work/example-project/`
6. Add `published: true`, `published_year`, and `date` as with other posts

Other work posts automatically appear on `_pages/other-work.html`.

### Adding Game Posts
1. Place the vertical capsule image in `assets/images/games/`
2. Create or update the game post in `_posts/` using `layout: game`
3. Add `games_capsule_image: /assets/images/games/your-image.png` to the game post front matter
4. Use structured front matter for game details: `tagline`, `release_date`, `work_start_year`, `work_end_year`, `status`, `genre`, `platform`, `my_roles`, `word_count`, `banner_image`, `overview`, `about_project`, `technical_work`, `trailer_url`, `screenshots`, `play_embeds`, `store_links`, `store_embeds`, `additional_links`, and `awards`
5. Only include front matter fields that have real content; omit empty fields
6. The game layout renders `work_start_year`/`work_end_year`, `release_date`, `status`, `genre`, `platform`, `my_roles`, and `word_count` in the compact summary block. That block is always shown in lowercase
7. Keep Brazilian summary copy accented (`lançado`, `inglês`, `produção`) and write ordinals as `1º`. English dates may keep `1st`
8. The `my_roles` field should be a YAML list and renders with a diamond separator in the summary block
9. Store editorial copy as Markdown-capable YAML block scalars in `overview`, `about_project`, and `technical_work`. Keep the Markdown body empty after the closing front matter delimiter
10. The rendered section order is Overview, Try it, Media, About the project, Technical work, Awards, and Links. Each rendered section is expanded by default and can be collapsed from a control immediately to the left of the heading. Game section headings do not get permalink/copy-anchor buttons
11. Overview always renders and is prose only. `banner_image` stays above Overview and is not part of the carousel. Media is omitted when both `trailer_url` and `screenshots` are empty. The game layout builds the Media carousel itself, in this order regardless of front-matter list order: YouTube from `trailer_url`, then GIFs from `screenshots`, then looping videos (`.webm` / `.mp4`) from `screenshots`, then remaining still images from `screenshots`. Looping videos play muted, autoplay, and loop with no playback controls. Do not put store badges, playable embeds, capsule art, or editorial Markdown images from About / Technical work into `screenshots`. The carousel is swipe-snapped on mobile and uses desktop chevrons plus a centered position indicator when there is more than one item
12. `play_embeds` is for playable experiences such as Spawnd and controls whether Try it appears
13. `awards` is a YAML list and supports Markdown links. Awards is omitted when the list is absent and renders as a responsive two-column list when present
14. Links is omitted when no link fields exist. The Links section and all game-page media (images, GIFs, embeds) are centered. `store_embeds` render first in a shared column matching the Steam widget width (`646px`, shrinking on smaller screens) and may include image badges as well as iframes. `store_links` and `additional_links` (`label` and `url` pairs) follow when present
15. About the project and Technical work always render. If either field is absent, the layout uses the localized WIP placeholder from `_data/i18n.json`; empty Media, Try it, Awards, and Links sections are not rendered
16. Use `_posts/2020-09-01-Cartomante-en.md` and `_posts/2020-09-01-Cartomante-br.md` as reference formats for localized game front matter, including award links and mixed store embeds

All localized game posts use the structured section fields. Keep corresponding English and Brazilian posts aligned by `translation_key`, but localize their editorial fields independently.

Game pages keep the custom "Read also" block, but do not render the standard post metadata footer, social share buttons, or previous/next post navigation.

### Game Capsules
1. Use `categories: current-projects` or `categories: past-projects` so the post appears in the right `/games/` section
2. Set `work_start_year` and `work_end_year` to show the period worked on the project in capsule metadata
3. Leave `work_end_year` blank for ongoing work; the site renders the localized `ongoing` label
4. If `work_start_year` and `work_end_year` are the same, the capsule renders a single year

The entire capsule card links to the game post. If `games_capsule_image` is missing, the grid renders an image placeholder.

### Navigation and Footer
- Desktop uses a fixed left sidebar from `_includes/masthead.html`, styled in `assets/css/custom.css`
- Desktop and mobile top links include about, now, and links before the work/content links
- The desktop sidebar includes the font picker, Bluesky icon, feed icon, and copyright
- The mobile footer keeps the font picker, social/feed links, and centered copyright
- Font switching is handled in `assets/js/custom.js` through `data-font-choice` controls

### Working with Drafts
1. Create draft files in `_drafts/` directory (no date required)
2. Add `draft: true` to front matter to exclude from sitemap
3. Preview drafts with `bundle exec jekyll serve --drafts`
4. When ready to publish, move file to `_posts/` with proper date
5. Drafts appear on site only when using `--drafts` flag

### Adding Pages
1. Create HTML file in `_pages/` directory
2. Include front matter with layout and permalink specification
3. Use existing layouts or create custom ones
4. Homepage (`index.html`) must remain in root directory

### Adding Images
1. Place images in appropriate `assets/images/` subdirectory:
   - `posts/` for blog post images
   - `games/` for Games page capsule art
   - `icons/` for social media and UI icons
   - `branding/` for header/footer images
2. Reference using relative paths in posts
3. Use descriptive alt text for accessibility

## License

This project uses the MIT License. See LICENSE file for details.
