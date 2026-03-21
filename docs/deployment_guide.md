# Deployment Guide: GraphQL Profile

Since this project uses no bundler (Vite, Webpack, etc.) and relies on raw HTML, CSS, and JS files, deploying it is immediate and completely free. No build step is required.

---

## 🚀 Option 1: GitHub Pages (Recommended)

### Step-by-Step

1. **Push your code**
   Make sure the project root contains `index.html`, the `src/` directory, and the `css/` directory.
   ```bash
   git init
   git add .
   git commit -m "feat: initial GraphQL profile"
   git branch -M main
   git remote add origin https://github.com/YourUsername/YourRepoName.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repo → **Settings** → **Pages**.
   - Under **Build and deployment**, set Source to **Deploy from a branch**.
   - Select `main` branch, folder `/ (root)`.
   - Click **Save**.

3. **Access your site**
   After ~60 seconds your site is live at:
   `https://<your-username>.github.io/<your-repo-name>/`

### GitHub Pages performance and reliability tweaks

1. Add an empty `.nojekyll` file in repository root to prevent Jekyll processing overhead.
2. Keep all asset paths relative (already true in this project) so subpath deployments keep working.
3. Prefer versioned cache busting only when you change static files aggressively; for this repo, immutable file names are not required.

---

## ⚡ Option 2: Netlify

### Method A — Drag and Drop (fastest)
1. Open [Netlify Drop](https://app.netlify.com/drop).
2. Drag the entire project folder into the browser.
3. Netlify generates an instant URL (e.g., `https://happy-reef-12345.netlify.app`).

### Method B — GitHub Integration
1. Log in to [Netlify](https://www.netlify.com/).
2. **Add new site** → **Import an existing project** → **GitHub**.
3. Select your repo.
4. Leave **Base directory** and **Build command** blank; set **Publish directory** to `.` or leave blank.
5. Click **Deploy site**.

---

## ▲ Option 3: Vercel

1. Log in to [Vercel](https://vercel.com/) and click **Add New Project**.
2. Import your GitHub repository.
3. Framework Preset: **Other** (no framework).
4. Leave Build Command blank; Output Directory: leave blank.
5. Click **Deploy**.

---

## 🏃 Running Locally

Because the app uses ES modules and makes cross-origin API requests, it **must** be served over HTTP — not opened directly as a `file://` URI.

```bash
# Node.js (recommended)
npx serve .

# Python
python -m http.server 3000
```

Then visit `http://localhost:3000`.

> **Why a server?** ES modules are blocked on `file://` by browser security policies. A local HTTP server also provides the correct CORS origin for the GraphQL API requests. See `docs/architecture_and_learning_guide.md` for a detailed explanation.

---

## 🔐 Browser Hardening (CSP + Security Headers)

Even for static hosting, add a restrictive baseline policy to reduce XSS and clickjacking risk.

### Recommended baseline headers

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://platform.zone01.gr; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Frame-Options: DENY
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

### Notes for this project

1. `connect-src` must allow `https://platform.zone01.gr` for GraphQL/auth requests.
2. `style-src` and `font-src` allow Google Fonts used by `index.html`.
3. Avoid adding `'unsafe-inline'` to `script-src`; this app does not need inline scripts.
4. If you add analytics or CDNs later, explicitly extend CSP for those domains.

### Netlify

Create a `_headers` file at project root:

```txt
/*
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://platform.zone01.gr; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
   X-Content-Type-Options: nosniff
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: camera=(), microphone=(), geolocation=()
   X-Frame-Options: DENY
   Cross-Origin-Opener-Policy: same-origin
   Cross-Origin-Resource-Policy: same-origin
```

### Vercel

Configure headers in `vercel.json`:

```json
{
   "headers": [
      {
         "source": "/(.*)",
         "headers": [
            {
               "key": "Content-Security-Policy",
               "value": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://platform.zone01.gr; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
            },
            { "key": "X-Content-Type-Options", "value": "nosniff" },
            { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
            { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
            { "key": "X-Frame-Options", "value": "DENY" },
            { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
            { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" }
         ]
      }
   ]
}
```

### GitHub Pages

GitHub Pages does not let you set custom response headers directly.

1. Keep a strict `<meta http-equiv="Content-Security-Policy" ...>` fallback in `index.html` for CSP if needed.
2. For full header control (`X-Content-Type-Options`, `Permissions-Policy`, etc.), place a CDN/proxy in front (for example Cloudflare) and set headers there.
3. If security headers are mandatory, prefer Netlify or Vercel for this project.

---

## 📋 Audit Checklist for Reviewers

When asked *"Try to access the profile from the host domain"* in `audit.md`:

Provide the live URL from GitHub Pages, Netlify, or Vercel. The reviewer visits the link, logs in, verifies the three data sections and four SVG graphs display correct data, then confirms logout works.

---

## 🗂️ File Manifest (what to include in deployment)

```text
index.html
src/
   features/
      collaborations.controller.js
      collaborations.core.js
      collaborations.index.js
      collaborations.view.js
      dashboard.app.js
      dashboard.graphs.render.js
      dashboard.index.js
      dashboard.metrics.js
      shared.result.unwrap.js
   infrastructure/
      graphql.auth.service.js
      graphql.client.service.js
      graphql.index.js
      graphql.queries.service.js
      graphql.result.core.js
css/
  theme.css
  base.css
  login.css
  nav.css
  dashboard.css
  graphs.css
   collaborations.css
docs/       (optional — only needed for audit reviewers)
```
