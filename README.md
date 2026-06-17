# PlainConsent

**Free, open-source cookie consent for normal websites.**

No monthly fees. No cookie scanner theater. No enterprise compliance suite — just a clear banner, script blocking until opt-in, and Google Consent Mode v2 defaults.

Built for indie hackers, solo founders, and static marketing sites that only need to gate Google Analytics (and a few scripts you configure yourself).

> **Support the project:** if PlainConsent saves you money vs Cookiebot, [buy us a coffee](https://buymeacoffee.com/luigipascal) ☕  
> PlainConsent is MIT-licensed — free forever. Coffee helps keep it maintained.

## What it does

- Shows a bottom banner on first visit
- **Blocks Google Analytics** until the visitor clicks “Accept analytics”
- Sets **Google Consent Mode v2** defaults to `denied` before consent
- Stores the choice in `localStorage` (configurable key)
- Provides a **Cookie settings** link to reopen the banner
- Shows a small **“buy us a coffee”** credit (disable in config if you prefer)

## What it does *not* do

- Auto-scan your site for cookies
- IAB TCF / Google Gold CMP certification
- Geotargeting or multi-language packs
- Legal guarantees (it's a tool — you remain responsible for your privacy policy)

## Quick start

### 1. Copy the files

Download [`dist/plainconsent.js`](dist/plainconsent.js) and [`dist/plainconsent.css`](dist/plainconsent.css) into your site, or load from jsDelivr after publishing:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/luigipascal/plainconsent@main/dist/plainconsent.css" />
<script>
  window.plainConsentConfig = {
    privacyUrl: "/privacy.html",
    googleAnalyticsId: "G-XXXXXXXXXX",
  };
</script>
<script src="https://cdn.jsdelivr.net/gh/luigipascal/plainconsent@main/dist/plainconsent.js" defer></script>
```

### 2. Add a cookie settings link in your footer

```html
<a href="#" data-plainconsent-settings>Cookie settings</a>
```

(`data-cookie-settings` also works for backward compatibility.)

### 3. Update your privacy policy

Mention that analytics cookies load only after opt-in, and that visitors can change their choice via “Cookie settings”.

## Configuration

Set `window.plainConsentConfig` **before** loading `plainconsent.js`:

```html
<script>
  window.plainConsentConfig = {
    privacyUrl: "/privacy.html",
    storageKey: "my-site-consent",
    googleAnalyticsId: "G-XXXXXXXXXX",
    consentMode: true,
    texts: {
      title: "Cookies on this site",
      description:
        "We use essential cookies so the site works. Analytics loads only if you opt in. See our {privacy}.",
      privacyLabel: "Privacy Policy",
      accept: "Accept analytics",
      reject: "Essential only",
    },
    credit: {
      show: true,
      coffeeUrl: "https://buymeacoffee.com/luigipascal",
    },
    scripts: [
      {
        category: "analytics",
        src: "https://example.com/my-analytics.js",
      },
    ],
  };
</script>
```

### Data attributes (minimal setup)

```html
<script
  src="plainconsent.js"
  data-privacy-url="/privacy.html"
  data-ga-id="G-XXXXXXXXXX"
  data-no-credit="true"
  defer
></script>
```

| Option | Default | Description |
|--------|---------|-------------|
| `privacyUrl` | `/privacy.html` | Link in banner text |
| `storageKey` | `plainconsent` | localStorage key (use per-site if needed) |
| `googleAnalyticsId` | `""` | GA4 measurement ID |
| `consentMode` | `true` | Google Consent Mode v2 |
| `credit.show` | `true` | Show coffee credit line |
| `credit.coffeeUrl` | Buy Me a Coffee link | Donation URL |
| `noStyles` | `false` | Skip auto-loading CSS (bring your own) |

## JavaScript API

```js
PlainConsent.open();       // reopen the banner
PlainConsent.getConsent(); // { analytics: true/false, updated: "..." } or null
PlainConsent.version;      // "1.0.0"
```

## Theming

PlainConsent ships with self-contained CSS. Override CSS variables on `:root`:

```css
:root {
  --pc-bg: #121820;
  --pc-border: #243044;
  --pc-text: #e8eef7;
  --pc-muted: #8b9cb3;
  --pc-accent: #3b82f6;
  --pc-accent-text: #fff;
}
```

## Legal note

PlainConsent helps you implement common consent UX patterns (opt-in before analytics, equal reject, easy withdrawal). It does **not** constitute legal advice. Requirements vary by jurisdiction, traffic, and which trackers you use. When in doubt, check the [ICO cookie guidance](https://ico.org.uk/for-organisations/advice-for-small-organisations/privacy-notices-and-cookies/) (UK) or consult a privacy professional.

## Development

```bash
# src/ is the source of truth; dist/ is what you ship
cp src/plainconsent.js dist/plainconsent.js
cp src/plainconsent.css dist/plainconsent.css
```

See [`examples/basic.html`](examples/basic.html) for a working demo.

## License

MIT — see [LICENSE](LICENSE).

## Support

- [Buy us a coffee](https://buymeacoffee.com/luigipascal)
- [GitHub Sponsors](https://github.com/sponsors/luigipascal) (if enabled)
- Issues and PRs welcome
