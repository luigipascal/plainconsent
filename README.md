# PlainConsent

**Free, open-source cookie consent for normal websites.**

**Website:** [luigipascal.github.io/plainconsent](https://luigipascal.github.io/plainconsent/docs/) (GitHub Pages)  
**Repository:** [github.com/luigipascal/plainconsent](https://github.com/luigipascal/plainconsent)

No monthly fees. No cookie scanner theater. No enterprise compliance suite — just a clear banner, script blocking until opt-in, and Google Consent Mode v2 defaults.

Built for indie hackers, solo founders, and static marketing sites that only need to gate Google Analytics (and a few scripts you configure yourself).

> **Support the project:** if PlainConsent saves you money vs Cookiebot, [support us on Ko-fi](https://ko-fi.com/bertaone)  
> PlainConsent is **MIT-licensed — free forever**. Donations help keep it maintained.

Every banner shows: **Powered by PlainConsent — free forever for small sites · built for indie sites, not enterprise.**

## What it does

- Shows a bottom banner on first visit
- **Blocks Google Analytics** until the visitor clicks “Accept analytics”
- Sets **Google Consent Mode v2** defaults to `denied` before consent
- Stores the choice in `localStorage` (configurable key)
- Provides a **Cookie settings** link to reopen the banner
- Links to the GitHub project and optional **Ko-fi** support line

## What it does *not* do

- Auto-scan your site for cookies
- IAB TCF / Google Gold CMP certification
- Geotargeting or multi-language packs
- Legal guarantees (it's a tool — you remain responsible for your privacy policy)

## Quick start

### CDN (recommended)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/luigipascal/plainconsent@main/dist/plainconsent.css" />
<script>
  window.plainConsentConfig = {
    privacyUrl: "/privacy.html",
    googleAnalyticsId: "G-XXXXXXXXXX",
    projectUrl: "https://github.com/luigipascal/plainconsent",
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/luigipascal/plainconsent@main/dist/plainconsent.js" defer></script>
```

### Download

- [plainconsent.js](dist/plainconsent.js)
- [plainconsent.css](dist/plainconsent.css)
- [Marketing / demo page](docs/index.html)

### Footer link

```html
<a href="#" data-plainconsent-settings>Cookie settings</a>
```

(`data-cookie-settings` also works.)

## Configuration

```html
<script>
  window.plainConsentConfig = {
    privacyUrl: "/privacy.html",
    storageKey: "my-site-consent",
    googleAnalyticsId: "G-XXXXXXXXXX",
    googleAnalyticsIds: ["G-AAA", "G-BBB"],
    googleAnalyticsOptions: { anonymize_ip: true },
    projectUrl: "https://github.com/luigipascal/plainconsent",
    consentMode: true,
    credit: {
      show: true,
      coffeeUrl: "https://ko-fi.com/bertaone",
    },
  };
</script>
```

| Option | Default | Description |
|--------|---------|-------------|
| `privacyUrl` | `/privacy.html` | Link in banner text |
| `storageKey` | `plainconsent` | localStorage key |
| `googleAnalyticsId` | `""` | Single GA4 ID |
| `googleAnalyticsIds` | `[]` | Multiple GA4 IDs |
| `projectUrl` | GitHub repo | Linked from “Powered by PlainConsent” |
| `credit.show` | `true` | Show support line |
| `credit.coffeeUrl` | Ko-fi | Donation URL |

## JavaScript API

```js
PlainConsent.open();
PlainConsent.getConsent();
PlainConsent.version;
```

## Bulk migration

Replace inline `gtag` blocks across a site:

```bash
node scripts/integrate.mjs /path/to/your/site
```

## Legal note

PlainConsent helps implement common consent UX (opt-in before analytics, equal reject, easy withdrawal). It is **not legal advice**. See [ICO cookie guidance](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/) (UK).

## License

MIT — Copyright © 2026 Rondanini Publishing Ltd. See [LICENSE](LICENSE).

## Support

- [Ko-fi](https://ko-fi.com/bertaone)
- [GitHub Issues](https://github.com/luigipascal/plainconsent/issues)
