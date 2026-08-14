# My Gospel Buddy — site source

This is the RMarkdown source for [mygospelbuddy.com](https://www.mygospelbuddy.com),
built with `rmarkdown::render()` / knitting in RStudio and deployed via GitHub Pages.

## Structure

```
index.Rmd                Homepage
blog/                     Blog posts (index.Rmd + one .Rmd per post)
bingo/                    General Conference Bingo generator (main site feature)
search/                   Reference Search + Conference Text Search tools
info/                     "About the Gospel Buddy" extension page
a-type-and-a-shadow/      "About A Type and a Shadow" extension page
help/                     Contact info
docs/                     Extension privacy policy pages ONLY (kept at this
                          URL on purpose — see note below)
_includes/                Shared header/nav/footer HTML partials, included
                          by every page (see "How pages are put together")
_drafts/                  Work-in-progress pages, not linked from the site
assets/
  css/                    Site-wide custom stylesheets
  js/                     Site-wide custom scripts
  img/                    All site images/icons
  vendor/                 Third-party libraries (bootstrap, jquery, etc.)
scripts/
  knit-all-files.R        Re-knits every .Rmd in the project
sitemap.xml, robots.txt, CNAME, .nojekyll   Root-level site config
```

## How pages are put together

Every page's YAML front matter includes the same three shared partials, referenced
by their **live URL** on mygospelbuddy.com:

```yaml
output:
  html_document:
    includes:
      in_header:   "https://www.mygospelbuddy.com/_includes/head-shared.html"
      before_body: "https://www.mygospelbuddy.com/_includes/nav.html"
      after_body:  "https://www.mygospelbuddy.com/_includes/footer.html"
```

Because these are absolute URLs, they resolve identically no matter how many
folders deep a page lives — no `../` counting, and no "file not found" errors
when knitting. All asset references (images, css, js) and internal links
throughout the site use full `https://www.mygospelbuddy.com/...` URLs for the
same reason.

**Edit the nav, fonts, css/js links, or footer in exactly one of those three
files and every page picks it up.** This replaces the old setup where the
same ~100-line header was copy-pasted into 4 separate files
(`header.html`, `header2.html`, `header-type-and-shadow.html`,
`header-bingo.html`) that had drifted out of sync with each other — the most
likely cause of the top bar looking different from page to page.

### ⚠️ Important: push before you knit

Since the includes are fetched over the network at knit time, **knitting pulls
whatever version of `_includes/` is currently live on the site — not your local
copy.** That means:

1. Edit `_includes/*.html` (or any asset) locally.
2. **Commit and push first.** Wait for GitHub Pages to finish deploying.
3. *Then* knit. Now the knit picks up your new header/nav/footer.

If you knit before pushing, your pages will silently be built against the *old*
deployed partials and your changes won't appear. If you ever see stale-looking
output, that's almost always the cause — push, wait, re-knit.

The `.nojekyll` file at the repo root is what allows GitHub Pages to serve the
underscore-prefixed `_includes/` folder at all. **Do not delete it** — without
it, Jekyll strips `_`-prefixed directories and every include URL will 404.

## Editing Open Graph / Twitter tags per page

Each page's own `header-includes:` block in its YAML front matter holds its
unique link-preview tags, right in the same file you already edit:

```yaml
header-includes:
  - '<meta property="og:title" content="Your Page Title">'
  - '<meta property="og:description" content="One sentence about this page.">'
  - '<meta property="og:image" content="https://www.mygospelbuddy.com/assets/img/some-image.png">'
  - '<meta property="og:url" content="https://www.mygospelbuddy.com/path/">'
```

Change these on any page without touching the shared header files, and
without affecting the look of any other page.

## The page banner (the icon under the nav bar)

The big circular icon (or the small badge, on the couple of pages that use
that instead) is no longer baked into a hidden header file — it's plain HTML
at the top of each page's own body, right after the YAML:

```html
<div class="gb-page-banner">
  <img src="https://www.mygospelbuddy.com/assets/img/gospel-buddy-icon.png" alt="Logo">
</div>
```

or, for the compact badge style used by `blog/using-conference-text-search.Rmd`:

```html
<div class="gb-badge-wrap">
  <div class="gb-badge">
    <a href="https://www.mygospelbuddy.com/"><img src="https://www.mygospelbuddy.com/assets/img/gospel-buddy-icon.png" alt="Logo"></a>
  </div>
</div>
```

Swap the image, or delete the block entirely, on a page-by-page basis.

## Re-knitting everything

```r
# from the project root, with Site.Rproj open
source("scripts/knit-all-files.R")
```

This replaces the old script, which pointed at a Windows desktop path for a
different, unrelated project and would not have run.

## Why `docs/` still exists

`docs/gospel-buddy-privacy-policy.html` and
`docs/a-type-and-a-shadow-privacy-policy.html` are very likely registered as
the Privacy Policy URLs in the Chrome Web Store / Edge Add-ons listings for
these extensions. Moving them to a cleaner location would 404 those listings
until manually updated there, so they were deliberately left at their
current URLs. Everything else that used to live in `docs/` (images,
header/footer includes, the sitemap, the knit script) has moved to its new
home above.

## Known open items (not fixed as part of this reorg)

- **`blog/general-conference-bingo.html`** is now a redirect stub pointing
  to `/bingo/` (the page moved there and is a main site feature, not a blog
  post). Search engines / old shares will land on the new page.
- **`bingo/index.Rmd`** fetches its word list from
  `kameronyork.com/datasets/conference-bingo-allowed-words-with-difficulty.json`.
  Left as-is intentionally.
- **`blog/quote-collecting.Rmd`** links to `mygospelbuddy.com/projects/conference/`
  and `mygospelbuddy.com/datasets` — this site doesn't have `/projects/` or
  `/datasets/` sections, so as written these links 404. Left as-is rather
  than guessing at a fix.
- **`blog/quotes.Rmd`** and **`blog/prophet-names-over-time.Rmd`** aren't
  linked from `blog/index.Rmd` (weren't before this reorg either).
  `prophet-names-over-time.Rmd` also still has its debug `console.log`
  calls, suggesting it's mid-development.
- **All `.html` files in this repo are stale build output** until you
  re-knit — none of the fixes above (header consistency, OG tags, asset
  paths, nav) will show up live until you run knit-all-files.R (or knit
  each page individually) and push the results.
