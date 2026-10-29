# Mindcase redesign

A responsive, bright white, buildless marketing site for Mindcase. Open `dist/index.html` through a static HTTP server; no dependency installation or build step is required.

## Source

- `dist/index.html` — page structure, original inline SVG illustrations, accessible dialogs, and reusable vector symbols.
- `dist/styles.css` — base layouts, Space Mono for diagrams and compact labels, and reduced-motion styles.
- `dist/refinements.css` — Selecta headings and Suisse Intl body text as used by Reworkd, a black-and-white foundation with soft platform-card and numeric accents, glossy black buttons, refined spacing, and mobile layouts.
- `dist/crisp.css` — bright white surfaces, sharper contrast, stronger color accents, and three distinct animated SVG workflow scenes.
- `dist/app.js` — source-switching playground, extraction animation, JSON/table views, clipboard controls, API filters and detail dialogs, connection tabs, pricing calculator, mobile navigation, keyboard support, and scroll reveals.
- `dist/assets/` — the original Mindcase logo and Space Mono font files, Selecta and Suisse Intl webfonts from the supplied Reworkd reference, source platform icons, and customer marks.

## Product behavior

The playground uses clearly identified illustrative records and does not call a paid API. Account creation, login, the full API library, endpoint detail pages, and documentation link to Mindcase's existing services. Meeting links follow the owner's saved CTA preference.

The API examples and MCP configuration are based on Mindcase's published `skills.md`. Supply an API key in your own application or supported MCP client to make actual data requests. No credentials or paid API access are embedded in this site.

Pricing estimates use the published per-record prices reviewed on 28 October 2026. Update the catalog and calculator together when product prices change.

## Motion

The hero uses original SVG orbit paths. The three workflow tabs switch complete vector scenes: source selection, request processing, and structured records flowing into an AI agent. Each scene has its own SVG composition, animation, accessible tab panel, and off-screen/reduced-motion handling. Pricing and the final CTA include additional SVG illustrations. CSS and the Web Animations API coordinate panel entries, staged extraction feedback, sliding tab indicators, paired accordion transitions, dialogs, pointer highlights, price feedback, and scroll reveals. All arrow icons are SVG paths. SVG animation pauses off screen; reduced-motion preferences disable nonessential movement. This is a single-page site, so no page-replacement router is needed.

The visual reference was reworkd.ai, adapted to Mindcase's logo, typography, product, and content. Dialog and toast motion use adapted native patterns informed by Transitions.dev's public recipes.

## Validation

Checked JavaScript syntax, local asset references, duplicate HTML IDs, desktop layout, and embedded 390px/320px mobile viewports. Verified source tabs, keyboard tab switching, JSON parsing, output tables, API search including empty results, API dialogs, MCP URL copying, Escape/focus restoration, mobile navigation and anchor positioning, and pricing arithmetic.

Publication is configured in `.openai/hosting.json`.
