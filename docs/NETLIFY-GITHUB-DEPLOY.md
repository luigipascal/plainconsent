# PlainConsent rollout — GitHub + Netlify deploy

All static publisher sites already have GitHub remotes. **Do not manually upload zips to Netlify.** Connect each repo once; every `git push` deploys automatically.

## 1. Push PlainConsent CDN first

```powershell
cd D:\mix\plainconsent
git add -A
git commit -m "Prevent double banner init; improve integrate dedupe"
git push origin main
```

Netlify site: **plainconsent.berta.one** → repo `luigipascal/plainconsent`

## 2. Push updated site repos

After each push, Netlify rebuilds if the site is linked to GitHub.

| Site | Local path | GitHub repo | Netlify domain |
|------|------------|-------------|----------------|
| Build with Claude | `D:\buildwithclaude\buildwithclaude` | `Berta-one/buildwithclaude` | buildwithclaude.berta.one |
| ClaudeSign | `D:\buildwithclaude\_tmp_claudesign` | `luigipascal/claudesign` | claudesign.berta.one |
| 4Schools | `D:\Archive\4schools` | `luigipascal/4schools` | 4schools.rondanini.com |
| Blackthorn | `D:\Archive\btporg` | `luigipascal/btporg` | blackthornpreservation.org.uk |
| Berta.one | `D:\Archive\berta.one` | `luigipascal/berta.one` | berta.one |
| Free Media Stack | `D:\Archive\free-media-stack` | `Berta-one/free-media-stack` | freemedia.berta.one |
| Publishing map | `D:\Archive\rondaninisitesmap` | `luigipascal/Publishing` | rondaninipublishing.com |

## 3. Link Netlify to GitHub (one-time per site)

1. [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Choose **GitHub** → authorize → select the repo above
3. Build settings (most static sites):
   - **Build command:** leave empty or `echo static`
   - **Publish directory:** `.` (or `public` for plainconsent)
4. Deploy → **Domain settings** → attach custom domain

If a site already exists with manual deploy: **Site settings → Build & deploy → Link repository** (replaces drag-and-drop).

## 4. What changed in this rollout

- **One banner per site** — removed duplicate gtag + homemade `cookie-consent.js` where PlainConsent is present
- **Claudesign** — resolved git merge conflicts in consent config; added PlainConsent to landing pages
- **4Schools** — MS Clarity now loads only after analytics opt-in
- **Free Media Stack** — Plausible loads only after opt-in
- **Rondanini Publishing** — PlainConsent added (no GA yet; ready when you add analytics)

## 5. Verify after deploy

Open each site in a private window. You should see **exactly one** cookie banner. Accept analytics → check GA/Clarity/Plausible in network tab.

Footer link pattern (optional on each site):

```html
<a href="#" data-plainconsent-settings>Cookie settings</a>
```
