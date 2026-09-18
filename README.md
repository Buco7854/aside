# Aside

A writing-first [Ghost](https://ghost.org) theme: editorial typography, warm paper in light and
dark, and the em dash as a house motif. Built for sites where the writing is the product.

![The Aside homepage](assets/screenshot-desktop.jpg)

## Features

- **Light and dark** from one palette, written with `light-dark()` — no separate dark stylesheet to
  maintain. Follows the operating system until a visitor picks a side.
- **Self-hosted type**: Fraunces and Inter ship with the theme, so there are no third-party font
  requests. Ghost's own font settings (Design → Typography) override them when set.
- **Follows your brand colour** from Ghost Admin → Design → Brand, with a terracotta default.
- **Built for Koenig**: wide and full-width cards break out of the reading measure; card assets are
  served by Ghost.
- **Members-aware** — subscribe prompts, Portal links and the account menu appear only when
  memberships are switched on.
- **Translatable**: all interface strings go through `{{t}}` and live in `locales/en.json`.
- **Ships with CI**: gscan on every pull request, and a one-push deploy to your Ghost site.

## Templates

| File             | Route                                                       |
| ---------------- | ----------------------------------------------------------- |
| `index.hbs`      | Home and paged archives — statement, lead story, post grid  |
| `post.hbs`       | Article — byline, feature image, content, read next, comments|
| `page.hbs`       | Static pages                                                 |
| `tag.hbs`        | Tag archive, dated list                                      |
| `author.hbs`     | Author archive with bio and links                            |
| `error-404.hbs`  | Not found                                                    |
| `error.hbs`      | Other errors                                                 |
| `custom-tags.hbs`| Optional page template listing every tag ("Tags" in the editor)|

## Tags

Ghost generates a tag archive for every tag, and the theme renders it with
`tag.hbs`: a dated list of every post carrying that tag, at `/tag/:slug/`.

For an index of *all* tags there are two pieces:

- **`partials/tag-cloud.hbs`** — a reusable component listing public tags with
  post counts, most used first. Drop it anywhere and pass a limit:

  ```hbs
  {{> "tag-cloud" limit="all"}}
  {{> "tag-cloud" limit="12"}}
  ```

- **`custom-tags.hbs`** — a page template built on that partial. In Ghost it
  appears as **Tags** in the editor's template picker, so:

  1. Create a page (call it Topics, Tags, Index — whatever suits).
  2. In the editor sidebar, open the settings panel and set **Template → Tags**.
  3. Publish, then add it to your navigation under Settings → Navigation.

  Whatever you write in the page body renders above the list, so the page can
  introduce itself.

The homepage also shows the twelve most used tags under the feed. Turn that off
with the **Show topics** setting.

## Featured posts

"Featured" is a flag Ghost puts on every post and page — the star in the post
list, or **Feature this post** in the editor's settings panel. Ghost itself does
nothing with it; themes decide what it means.

Here it does two things:

- Any featured post carries a small **Featured** badge in the feed and archives.
- Set **Lead story → Featured post** and the newest featured post is pinned to
  the top of the homepage in the large, image-led slot, and skipped further down
  so it is not shown twice. With no featured post, the newest post leads instead.

Pages have the same flag, but nothing lists pages by date, so it has no effect
there — a featured page is only meaningful if you query it yourself, e.g.
`{{#get "pages" filter="featured:true"}}`.

## Content warnings and the age gate

Two separate things, both opt-in, and both **courtesy notices rather than access
control** — the post is in the page either way, so anyone determined can read the
HTML. For genuine gating, make the post members-only in Ghost.

**Per-post content note.** Add the internal tag `#sensitive` to a post (internal
tags start with `#` and stay hidden from readers — they are what Ghost provides
for theme logic like this). The post then carries a short note above the title:

> **CONTENT NOTE**
> *The images in this post may be difficult to look at.*
> Show the images →

What the note holds back depends on the **Sensitive content** setting:

| Setting       | Effect                                                            |
| ------------- | ----------------------------------------------------------------- |
| `Images only` | The writing reads normally; every image is veiled until asked for  |
| `Whole post`  | The body is held back too — hidden rather than blurred             |
| `Off`         | The tag does nothing                                               |

The title, byline and public tags always stay readable, so nobody has to guess
what they are opening, and cards in feeds are labelled *Sensitive* with a veiled
image. Reword the note under **Sensitive content note** in theme settings.

**Site-wide age gate.** Turn on **Age gate** and every first-time visitor is
asked to confirm their age before they see anything, in your own words. While it
is on, the theme also emits `<meta name="rating" content="adult">` for crawlers
and parental filters.

The two answers are **kept apart**, in `localStorage` under `aside-age-ok` and
`aside-sensitive-ok`: confirming your age is not the same as asking to see
graphic pictures, so a reader who passes the gate still gets the content note.

## Theme settings

Editable in Ghost Admin → Design → Site-wide, no code needed:

| Setting             | Options                          | Default        |
| ------------------- | -------------------------------- | -------------- |
| Homepage header     | Statement / Compact / Hidden     | Statement      |
| Lead story          | Newest post / Featured post / Off | Newest post   |
| Show topics         | on / off                         | on             |
| Sensitive content   | Images only / Whole post / Off    | Images only    |
| Age gate            | on / off                         | off            |
| Title font          | Elegant serif / Modern sans-serif| Elegant serif  |
| Show reading time   | on / off                         | on             |
| Footer note         | free text                        | empty          |

## Development

```bash
npm install
npm run dev     # rebuild CSS and JS on change
npm run build   # one-off build into assets/built/
npm test        # build, then validate with gscan
npm run zip     # package aside.zip for manual upload
```

The theme is plain Handlebars and CSS. Sources live in `assets/css/` and `assets/js/`; PostCSS and
esbuild compile them into `assets/built/`, which is committed so the theme works when uploaded as a
zip without a build step.

To work on it against a real Ghost site, symlink or copy this directory into your site's
`content/themes/` folder, then activate **Aside** in Ghost Admin → Design.

```text
assets/
├── css/        source styles (vars, base, layout, components, post)
├── js/         theme.js — the light/dark switch, and nothing else
├── fonts/      self-hosted Fraunces and Inter, with their licences
└── built/      compiled output, committed
partials/       header, footer, cards, meta, pagination, icons
locales/        interface strings
```

## Deploying from GitHub

`.github/workflows/deploy-theme.yml` builds the theme, runs gscan, and pushes it to your site with
[TryGhost/action-deploy-theme](https://github.com/TryGhost/action-deploy-theme) on every push to
`main`.

1. In Ghost Admin → Integrations, add a custom integration and copy its **Admin API URL** and
   **Admin API key**.
2. In the GitHub repository → Settings → Secrets and variables → Actions, add them as
   `GHOST_ADMIN_API_URL` and `GHOST_ADMIN_API_KEY`.
3. Push to `main`. The workflow zips the theme (excluding sources and CI files) and activates the
   new version.

`.github/workflows/test.yml` runs gscan on pull requests and fails if `assets/built/` is out of date
with the sources.

## Notes

- **Comments** are an iframe rendered by Ghost, which reads its colour scheme once when it boots.
  The theme keeps it in step: `post.hbs` hands the visitor's saved choice to the embed on page load,
  and `theme.js` repaints the iframe canvas and flips the embed's own class when the theme is
  switched mid-page. Without that, a dark page shows a white panel where the comments are.
- **Reading time** comes from Ghost's `{{reading_time}}` helper and can be hidden in theme settings.
- **Search** is Ghost's own (Sodo Search); the header button carries `data-ghost-search`.

## Credits

Structure follows the conventions of [Casper](https://github.com/TryGhost/Casper), Ghost's default
theme (MIT). Typefaces: [Fraunces](https://fonts.google.com/specimen/Fraunces) and
[Inter](https://fonts.google.com/specimen/Inter), both under the SIL Open Font License, bundled in
`assets/fonts/`.

## License

MIT — see [LICENSE](LICENSE).
