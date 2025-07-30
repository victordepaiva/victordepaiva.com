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
- `_pages/now.html` - Current status page
- `_pages/archive.html` - Post archive
- `_pages/categories.html` - Category listing

### Assets
- `assets/css/` - Compiled CSS and custom stylesheets
- `assets/js/` - JavaScript files and libraries
- `assets/fonts/` - Custom fonts (OpenDyslexic)
- `assets/images/posts/` - Images used in blog posts
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

### Sitemap
- Custom sitemap.xml is generated at `/sitemap.xml`
- Includes all published posts and pages
- Excludes draft posts and system pages
- Available at `https://victordepaiva.com/sitemap.xml`

## Theme Customization

This site is based on the [Minimal Mistakes](https://github.com/mmistakes/minimal-mistakes) Jekyll theme with customizations:
- Dark skin theme
- Custom footer with social links
- OpenDyslexic font accessibility option
- Custom CSS for additional styling
- Custom JavaScript for enhanced functionality

## Content Management

### Adding Posts
1. Create new Markdown file in `_posts/`
2. Use YYYY-MM-DD-title.md naming convention
3. Include front matter with title, date, categories, tags
4. Write content in Markdown format

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
   - `icons/` for social media and UI icons
   - `branding/` for header/footer images
2. Reference using relative paths in posts
3. Use descriptive alt text for accessibility

## License

This project uses the MIT License. See LICENSE file for details.
