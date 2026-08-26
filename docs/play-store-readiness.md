# Google Play Store Readiness

Status tracking for future Android/TWA publishing.

## Required Assets

| Item | Status | Notes |
|------|--------|-------|
| Privacy Policy URL | DONE | `https://alphatrainer.net/privacidad` |
| Account Deletion URL | DONE | `https://alphatrainer.net/eliminar-cuenta` |
| In-app Account Deletion | DONE | Perfil → Zona de peligro |
| Support URL | DONE | `https://alphatrainer.net/soporte` |
| Support Email | DONE | `hola@alphatrainer.net` |
| App icon (512×512 PNG) | DONE | `/public/icons/alpha-trainer/icon-512.png` |
| Maskable icon | DONE | `/public/icons/alpha-trainer/icon-maskable-512.png` |
| PWA Manifest | DONE | `/src/app/manifest.ts` |

## Store Listing Assets (TODO)

| Item | Status | Notes |
|------|--------|-------|
| Feature graphic (1024×500px) | TODO | Required for Play Store listing |
| Screenshots (phone, min 2) | TODO | Min 1080×1920 or 1080×2340 |
| Short description (80 chars) | TODO | Write for store listing |
| Full description (4000 chars) | TODO | Write for store listing |
| App category | TODO | Health & Fitness |
| Content rating | TODO | Complete IARC questionnaire |
| Target SDK / API level | N/A | TWA uses web content |

## TWA / Digital Asset Links

| Item | Status | Notes |
|------|--------|-------|
| `/.well-known/assetlinks.json` | TODO | Required for TWA verified link |
| SHA-256 fingerprint from Play Console | TODO | Generated after app creation |
| Package name decided | TODO | e.g. `net.alphatrainer.app` |

## Data Safety Questionnaire

Must answer for Play Store Data Safety section:

- **Data collected:** Email, name, fitness profile (age, sex, weight, height), workout data
- **Data shared:** Fitness parameters (not PII) shared with Groq for AI generation
- **Data encrypted in transit:** Yes (HTTPS/TLS)
- **User can request deletion:** Yes — in-app and via email
- **Data collected for tracking:** No third-party ad tracking
- **Sensitive data:** Health & Fitness data (workout, body measurements)

## Billing / Payments

| Item | Status | Notes |
|------|--------|-------|
| Google Play Billing | NOT IMPLEMENTED | Pro plan is future / web-only for now |
| Stripe web checkout | NOT IMPLEMENTED | Future |

> If the Pro plan is offered via the web only (not through the Play Store), no in-app billing integration is required. Web-only purchases bypass Google's billing requirement.

## Closed Testing

- [ ] Set up internal testing track in Play Console
- [ ] Add tester accounts
- [ ] Install TWA APK and verify login / deletion flow
- [ ] Verify `assetlinks.json` works (no browser address bar in TWA)

## References

- TWA docs: https://developer.chrome.com/docs/android/trusted-web-activity/
- Bubblewrap CLI: https://github.com/GoogleChromeLabs/bubblewrap
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Account Deletion policy: https://support.google.com/googleplay/android-developer/answer/13327111
