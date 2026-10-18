# IJTEK Power Solutions: Website

A responsive marketing website for **IJTEK Power Solutions**, which provides solar and inverter solutions, solar batteries and solar materials for homes, schools, offices and communities in Nigeria and across Sub-Saharan Africa.

It's a **static site**: plain HTML5, CSS3 and vanilla JavaScript, with GSAP (self-hosted) for animation. There is no server or database. All requests, quotes and enquiries go to IJTEK on **WhatsApp**.

---

## Before launch checklist

The site doesn't invent any business details. These items need IJTEK's verified information:

| # | Item | Where |
|---|------|-------|
| 1 | **WhatsApp number (required)**: the audit form and every quote/enquiry button send to this number. Until it's set, the form shows an error and the quote buttons fall back to the form | `js/config.js` → `contact.whatsapp` |
| 2 | **Other contact details**: phone, email, confirmed service areas, opening hours. The office address is already set | `js/config.js` → `contact` |
| 3 | **Social media links**: full profile URLs (Facebook, Instagram, LinkedIn, X). They then appear in the footer | `js/config.js` → `social` |
| 4 | **Testimonials**: real customer feedback only, shared with permission. The section stays hidden until at least one entry is added | `js/config.js` → `testimonials` |
| 5 | **Product range**: confirm the five categories (batteries, panels, inverters & charge controllers, mounting structures, cables & protection devices) match what IJTEK supplies | `products.html`, `#products` in `index.html` |
| 6 | **Live domain** in canonical URLs, Open Graph tags, JSON-LD, `robots.txt` and `sitemap.xml` (currently `https://www.example.com`) | `node scripts/set-domain.mjs https://www.your-domain.com` |
| 7 | **Privacy Policy review**: a draft based on how the site works (WhatsApp, Google Fonts). IJTEK should review it, ideally with legal advice | `privacy.html` |
| 8 | **Logo**: a temporary typographic wordmark is used | `.brand` markup in all four pages; `favicon.svg` |
| 9 | **Project photos**: the "Applications" section uses licensed stock photography and doesn't present it as IJTEK projects. Swap in real project photos when available (and rename it "Our Work") | `index.html` → `#work` |
| 10 | **Structured data**: `LocalBusiness` (name + Ikorodu address) and `FAQPage` schema are included. Add `telephone`/`sameAs` (social URLs) once confirmed. If you edit an FAQ, update the matching JSON-LD text too | `index.html` `<head>` |

Contact rows, footer links and the "Get directions" map link appear automatically once values are in `js/config.js`. Empty values are simply not shown.

---

## How requests work (WhatsApp)

- **Free Power Audit form** (`#audit`): checks the fields in the browser (name, phone, optional email, property type, service, optional details). It then opens WhatsApp (app on phones, WhatsApp Web on computers) with a message containing those details. The customer taps **Send**. The page then shows a confirmation with an "Open WhatsApp again" button in case WhatsApp didn't open.
- **Quote and enquiry buttons** ("Request a Product Quote", each "Enquire about …" product button, "Send an Enquiry", "Report a System Problem"): any link with a `data-whatsapp="<message>"` attribute opens WhatsApp with that message. To add another, give a link `data-whatsapp="Hello IJTEK Power Solutions, …"`.
- **Service pre-selection**: links with `data-service="<option value>"` pointing to `#audit` pre-select the service in the form. From other pages use `index.html?service=<value>&product=<slug>#audit`.

The website doesn't store or transmit form data itself; it only hands the message to WhatsApp.

---

## Running locally

Open `index.html` directly in a browser, or serve the folder with any static server, for example:

```bash
npx serve .            # or: python -m http.server 8080
```

---

## Deployment

Upload the folder to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, cPanel hosting, etc.). The files to publish are:

```
index.html  products.html  privacy.html  404.html  favicon.svg  robots.txt  sitemap.xml
css/  js/  assets/
```

Recommended on the host:
- **HTTPS** (all the hosts above provide it free).
- Use `404.html` as the not-found page (most hosts detect it automatically).
- If the host supports custom headers, add `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and `X-Frame-Options: DENY`, and long cache lifetimes for `assets/images/`.

---

## Project structure

```
index.html            Home page (all main sections + audit form)
products.html         Products page: solar batteries and solar materials
privacy.html          Privacy Policy (review before launch)
404.html              Not-found page
css/style.css         Design tokens, layout, components (mobile-first)
css/animations.css    Hero entrance, preloader, scroll reveals, menu motion, reduced-motion rules
js/config.js          ← Business details (WhatsApp number, contacts, socials, testimonials)
js/navigation.js      Sticky header (dark/light surface), scroll-spy, accessible mobile menu
js/main.js            Preloader, contact details, WhatsApp links, testimonials, form pre-selection, scroll reveals
js/hero-slider.js     Hero slideshow (curtain wipe + slow zoom)
js/animations.js      GSAP hero entrance, pointer parallax, process timeline, story parallax
js/contact-form.js    Audit form validation → WhatsApp message
js/vendor/            GSAP 3.12.5 + ScrollTrigger (self-hosted)
assets/images/        Optimised WebP images (640–2200px) + og-image.jpg
scripts/set-domain.mjs  Replaces the placeholder domain (run with Node.js)
```

Icons are Lucide (ISC licence), inlined as an SVG sprite at the top of each page, so they also work when a page is opened straight from the folder.

### Editing notes

- **Colours, type and spacing** are CSS custom properties at the top of `css/style.css`.
- **Fonts**: Manrope (headings), Inter (body) and Space Grotesk (labels), from Google Fonts with `display=swap`.
- **Shared header/footer**: `products.html`, `privacy.html` and `404.html` repeat the header and footer from `index.html`. If you change navigation or footer links, update all four pages. The inline icon sprite at the top of each page must also stay in sync.
- **Preloader**: the IJTEK mark draws itself on every page load. It lifts once the page has loaded (minimum ~1.6s, maximum 6s), and the hero entrance and slideshow start as it lifts. Reduced-motion visitors see the finished mark without the drawing animation.
- **Hero slideshow**: three images change every 7 seconds with a curtain-wipe transition and slow zoom. It pauses when the tab is hidden or the hero is off screen, and stays on the first image for visitors who prefer reduced motion. There are no on-screen controls (by request); accessibility guidelines (WCAG 2.2.2) recommend a pause control for auto-moving content. Edit the `<figure class="hero__slide">` entries to change images.
- **Motion** is progressive enhancement. Content stays usable without JavaScript, and if GSAP fails to load a CSS fallback entrance runs.

---

## Image credits

All photographs are from [Unsplash](https://unsplash.com) under the free [Unsplash License](https://unsplash.com/license). They are illustrative and do not depict IJTEK projects.

| File | Unsplash image |
|---|---|
| hero-solar-rooftop-dusk | photo-1698752821927-776ac6cb0e91 |
| hero-home-solar | photo-1787672358117-53ccda22e8dc |
| hero-technician | photo-1719848576338-9516ba7ccd8b |
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
| product-batteries | photo-1742899273038-67ff67477663 |
| product-panels | photo-1694327671725-e2a81cda3436 |
| product-mounting | photo-1491677533189-49af044391ed |
| product-protection | photo-1544724569-5f546fd6f2b5 |

Each image can be viewed at `https://images.unsplash.com/<id>`. Replace these with IJTEK's own photography of real installations as soon as possible.
