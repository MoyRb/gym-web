# SEO Launch Checklist

Manual steps to complete after deploying CORTE SEO+TRUST.

## 1. Google Search Console

- [ ] Go to https://search.google.com/search-console/
- [ ] Add property: `https://alphatrainer.net`
- [ ] Verify domain ownership (DNS TXT record via Vercel or registrar)
- [ ] Submit sitemap: `https://alphatrainer.net/sitemap.xml`
- [ ] Use URL Inspection to check:
  - `https://alphatrainer.net/` — confirm indexable, canonical correct
  - `https://alphatrainer.net/pricing` — confirm indexable
  - `https://alphatrainer.net/privacidad` — confirm indexable
  - `https://alphatrainer.net/terminos` — confirm indexable
  - `https://alphatrainer.net/seguridad` — confirm indexable
- [ ] Check that `/dashboard/*` and `/login` are NOT indexed

## 2. Core Web Vitals

- [ ] Run PageSpeed Insights on `https://alphatrainer.net/`
- [ ] Target: LCP < 2.5s, CLS < 0.1, FID < 100ms
- [ ] Check mobile score (Google now indexes mobile-first)

## 3. Rich Results Test

- [ ] Test JSON-LD at `https://alphatrainer.net/` using:
  https://search.google.com/test/rich-results
- [ ] Verify Organization, WebSite, SoftwareApplication entities

## 4. Social Preview Validation

- [ ] WhatsApp / iMessage: share `https://alphatrainer.net` to verify OG preview
- [ ] Twitter card validator: https://cards-dev.twitter.com/validator
- [ ] Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
- [ ] LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/

## 5. OG Image (TODO)

- Current: using logo wordmark PNG (not ideal aspect ratio)
- **Create a proper 1200×630px OG image** with:
  - Dark background (#0A0A0B)
  - Logo + tagline
  - Brand red accent (#CF2020)
- Place at `/public/og-image.jpg` and update layout.tsx `ogImage` reference

## 6. CSP (Content Security Policy)

- Add `Content-Security-Policy-Report-Only` header in next.config.ts
- Collect violation reports for 1-2 weeks
- Convert to enforced CSP once coverage is confirmed

## 7. Indexing Check (post-launch)

- Wait 1-2 weeks after launch
- In Search Console, check:
  - Coverage report (indexed vs not indexed)
  - Sitemap processing status
  - Manual actions (should be none)

## 8. Structured Data Validation

Run at https://validator.schema.org/ with URL `https://alphatrainer.net`

Expected entities:
- Organization
- WebSite
- SoftwareApplication

## Notes

- `robots.txt` is auto-generated from `src/app/robots.ts`
- `sitemap.xml` is auto-generated from `src/app/sitemap.ts`
- `metadataBase` in root layout ensures all relative OG URLs resolve correctly
