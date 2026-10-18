# IJTEK Power Solutions: Website

A responsive marketing website for **IJTEK Power Solutions**, which provides solar and inverter solutions for homes, schools, offices and communities in Nigeria and across Sub-Saharan Africa.

The front end uses HTML5, CSS3 and vanilla JavaScript. GSAP (self-hosted) adds animation. A small Node.js server with no dependencies serves the site and handles the Free Power Audit form securely.

---

## Before launch checklist

The site doesn't invent any business details. These items need IJTEK's verified information before going live:

| # | Item | Where |
|---|------|-------|
| 1 | **Contact details**: phone, WhatsApp, email, confirmed service areas, opening hours. The office address is already set | `js/config.js` → `contact` |
| 2 | **Social media links**: paste full profile URLs (Facebook, Instagram, LinkedIn, X). They then appear in the footer | `js/config.js` → `social` |
| 2b | **Testimonials**: real customer feedback only, shared with permission. The section stays hidden until at least one entry is added | `js/config.js` → `testimonials` |
| 2c | **Product range**: confirm the five product categories (batteries, panels, inverters & charge controllers, mounting structures, cables & protection devices) match what IJTEK actually supplies | `products.html`, `#products` in `index.html` |
| 3 | **Enquiry delivery**: until this is configured, the form refuses submissions and says so | `.env`, see [Enquiry form](#enquiry-form) |
| 4 | **Live domain** in canonical URLs, Open Graph tags, JSON-LD, `robots.txt` and `sitemap.xml` (currently `https://www.example.com`) | `npm run set-domain -- https://www.your-domain.com` |
| 5 | **Privacy Policy review**: a sensible draft based on how the site works. IJTEK should review it, ideally with legal advice, and confirm the named providers (e.g. Resend, hosting) | `privacy.html` |
| 6 | **Logo**: a temporary typographic wordmark is used (inline SVG mark + "IJTEK / Power Solutions") | `.brand` markup in `index.html`, `privacy.html`, `404.html`; `favicon.svg` |
| 7 | **Project portfolio**: the "Applications" section (`#work`) shows the kinds of properties IJTEK serves, using licensed stock photography. It doesn't present them as IJTEK projects. When verified projects are available, swap in real photos and rename it "Our Work" | `index.html` → `#work` |
| 8 | **Structured data**: `LocalBusiness` (name + verified Ikorodu address) and `FAQPage` schema are included. Add `telephone`/`email`/`sameAs` (social URLs) to the LocalBusiness block once confirmed. If you edit an FAQ, update the matching JSON-LD text too | `index.html` `<head>` |
| 9 | **Terms of Service**: not included, because none has been prepared. Add a page and footer link only once one has been properly written | `footer` |

Contact rows, footer contact links and WhatsApp/call/email fallbacks in form error messages **appear automatically** once values are added to `js/config.js`. Empty values are simply not shown.

---

## Running locally

Requires **Node.js 18.17+** (no `npm install` needed, since there are no dependencies).

```bash
cp .env.example .env      # optional: configure enquiry delivery
npm start                 # http://127.0.0.1:8080
npm run dev               # same, restarts on server file changes
npm test                  # server + validation tests (node:test)
```

To try the form locally without email, set this in `.env`:

```
ENQUIRY_STORE_FILE=data/enquiries.jsonl
```

Submissions are then appended to that file (`data/` is git-ignored). **Use this for development only**, because it stores personal data on disk.

---

## Enquiry form

`POST /api/enquiry` (in `server.js`) does the following:

1. Accepts only same-origin `application/json` requests up to 16 KB.
2. **Rate-limits** each IP (default 5 requests / 15 minutes; set `TRUST_PROXY=true` behind a proxy).
3. Filters spam using a hidden **honeypot** field and a **minimum fill time**. Spam gets a silent 200 and is never delivered.
4. **Re-validates every field** (`server/validate.js`), strips control characters, and HTML-escapes values in emails.
5. Delivers through each configured channel (`server/deliver.js`):

| Channel | Variables | Notes |
|---|---|---|
| Email via [Resend](https://resend.com) | `RESEND_API_KEY`, `ENQUIRY_TO_EMAIL`, `ENQUIRY_FROM_EMAIL` | FROM must be on a domain verified in Resend. Customer email is set as Reply-To. |
| Webhook (CRM, Zapier, Make, Apps Script…) | `ENQUIRY_WEBHOOK_URL`, optional `ENQUIRY_WEBHOOK_SECRET` (sent as Bearer token) | HTTPS required. |
| Local file | `ENQUIRY_STORE_FILE` | Development only. |

**Honest status reporting.** The browser shows the success message **only** after the server confirms that at least one channel accepted the enquiry. If no channel is configured, the server answers `503` and the visitor is told their details were **not** sent. Verified phone, WhatsApp and email links are offered once they're configured. Server logs never include personal data, only a reference ID and outcome.

Check the configuration: `GET /api/health` → `{"enquiryDelivery":"configured" | "not-configured"}`.

### Using a hosted form service instead (static hosting)

If you deploy only the static files (no Node server), set `form.endpoint` in `js/config.js` to a service that accepts JSON POSTs and returns 2xx on success, e.g. a Formspree form URL. Server-side validation, rate limiting and spam filtering then depend on that service. The field names sent are `name, phone, email, propertyType, service, message, website (honeypot), elapsedMs`.

---

## Deployment

**Recommended: any Node host** (Render, Railway, Fly.io, a VPS, etc.)

```
Start command:  node server.js
Environment:    NODE_ENV=production  HOST=0.0.0.0  PORT=<provided>  + delivery variables
```

Serve over **HTTPS**. In production the server adds HSTS and `upgrade-insecure-requests`. It also sends a strict Content-Security-Policy, which hashes the one inline script automatically, plus `nosniff`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`. HTML/CSS/JS are served with ETags (revalidated on each visit), images are cached for 30 days, and text assets are gzip-compressed.

**Static hosts** (Netlify, Vercel, Cloudflare Pages, etc.) also work: publish the repository root and configure the form endpoint as described above. Only these paths need publishing: `index.html, products.html, privacy.html, 404.html, favicon.svg, robots.txt, sitemap.xml, css/, js/, assets/`.

---

## Project structure

```
index.html            Landing page (all main sections)
products.html         Products page: solar batteries and solar materials
privacy.html          Privacy Policy (review before launch)
404.html              Not-found page
css/style.css         Design tokens, layout, components (mobile-first, breakpoints per component)
css/animations.css    Hero entrance, scroll reveals, menu motion, reduced-motion rules
js/config.js          ← Verified business details + form endpoint
js/navigation.js      Sticky header (dark/light surface), scroll-spy, accessible mobile menu
js/main.js            Contact details + directions link, testimonials, service/product pre-selection, scroll reveals
js/hero-slider.js     Hero slideshow (crossfade + slow zoom)
js/animations.js      GSAP hero timeline, process timeline progress, parallax
js/contact-form.js    Form validation, submission states
js/vendor/            GSAP 3.12.5 + ScrollTrigger (self-hosted)
assets/images/        Optimised WebP images (640–2200px) + og-image.jpg
(icons)               Lucide icons (ISC licence), inlined as an SVG sprite at the top of each page
server.js             Static server + /api/enquiry
server/validate.js    Server-side validation
server/deliver.js     Email / webhook / file delivery
tests/server.test.js  Automated tests
scripts/set-domain.mjs  Replaces the placeholder domain
```

### Editing notes

- **Colours, type and spacing** are CSS custom properties at the top of `css/style.css`. Gold is reserved for highlights and calls to action; teal appears only in the process timeline.
- **Fonts**: Manrope (headings), Inter (body) and Space Grotesk (labels), loaded from Google Fonts as variable fonts with `display=swap`.
- **Service pre-selection**: any link with `data-service="<option value>"` that points to `#audit` pre-selects that service in the form. From other pages, use `index.html?service=<value>&product=<slug>#audit`: the product slug (`batteries`, `panels`, `inverters`, `mounting`, `protection`) also pre-fills the message.
- **Hero slideshow**: three images crossfade every 7 seconds with a slow zoom. There are no on-screen controls (by request). It pauses when the tab is hidden or the hero is off screen, and stays on the first image for visitors who prefer reduced motion. Note that accessibility guidelines (WCAG 2.2.2) recommend a pause control for auto-moving content. Slides 2 and 3 load after the page so the first image stays fast. To change an image, edit the `<figure class="hero__slide">` entries.
- **Preloader**: a navy screen where the IJTEK mark draws itself (ring, horizon, rising sun, wordmark, loading bar), shown on every page load. It lifts once the page has loaded (minimum ~1.6s, maximum 6s), and the hero entrance and slideshow start as it lifts. Visitors who prefer reduced motion see the finished mark without the drawing animation. It never blocks the page if JavaScript fails.
- **Shared header/footer**: `products.html`, `privacy.html` and `404.html` repeat the header and footer from `index.html`. If you change navigation or footer links, update all four pages.
- **Motion** is progressive enhancement. Content is visible without JavaScript, and if GSAP fails to load a CSS fallback entrance runs. A safety timer always reveals the hero within 2.6 s. `prefers-reduced-motion` disables the entrance animation, reveals and parallax.

### Replacing the illustrative portfolio

Each `.gallery__item` in `#work` is one tile. For a verified project, swap the image (provide 640/1200/1800px WebP versions) and replace the caption with the project type, facility category, service provided and a one-line challenge/solution. Once every tile shows real work, rename the section to "Our Work".

---

## Testing performed

- `npm test`: 14 automated tests covering validation, spam filtering, path-traversal protection, security headers, the 404 page, the `503 not configured` response, delivery, and rate limiting.
- Headless Chrome QA of the rendered site:
  - mobile menu: open, focus trap, Escape, close on link
  - form: required-field errors, focus management, service pre-selection, real successful submission, honest 503/500 failure states
  - reduced motion
  - site still working with GSAP blocked
  - no horizontal overflow at 360, 390, 768, 1024, 1280 and 1920px
  - hero slideshow: autoplay, reduced motion
  - product enquiry links pre-filling the form across pages
  - no console errors on the home, products, privacy and 404 pages

Recommended before launch: a Lighthouse run against the deployed HTTPS site, a real end-to-end submission through the production delivery channel, and a check on a real low-end Android phone.

---

## Image credits

All photographs are from [Unsplash](https://unsplash.com) under the free [Unsplash License](https://unsplash.com/license). They are used as illustrative imagery and do not depict IJTEK projects.

| File | Unsplash image |
|---|---|
| hero-solar-rooftop-dusk | photo-1698752821927-776ac6cb0e91 |
| story-home-dusk | photo-1748063578185-3d68121b11ff |
| detail-panel-install | photo-1668097613572-40b7c11c8727 |
| service-installation | photo-1660330589257-813305a4a383 |
| service-inverter-system | photo-1780445392417-68b9dccc45f2 |
| service-diagnostics | photo-1758101755915-462eddc23f57 |
| service-consultation | photo-1653566031535-bcf33e1c2893 |
| work-home | photo-1696393800648-662c06289a5e |
| work-commercial | photo-1786913508115-51748da1339b |
| work-school | photo-1473649085228-583485e6e4d7 |
| work-community | photo-1684853693031-ab9e3f8c9d5e |
| contact-architecture | photo-1785190095920-302ea67de2e0 |
| hero-home-solar | photo-1787672358117-53ccda22e8dc |
| hero-technician | photo-1719848576338-9516ba7ccd8b |
| product-batteries | photo-1742899273038-67ff67477663 |
| product-panels | photo-1694327671725-e2a81cda3436 |
| product-mounting | photo-1491677533189-49af044391ed |
| product-protection | photo-1544724569-5f546fd6f2b5 |

Each image can be viewed at `https://images.unsplash.com/<id>`. IJTEK's own photography of real installations will build more trust than stock imagery; replace these as soon as authorised photos are available.
#   i j t e k p o w e r  
 