# Deployment Guide: GraphQL Profile

Since this project uses no bundler (Vite, Webpack, etc.) and relies on raw HTML, CSS, and JS files, deploying it is immediate and completely free. No build step is required.

---

## 🚀 Option 1: GitHub Pages (Recommended)

### Step-by-Step

1. **Push your code**
   Make sure the project root contains `index.html`, `app.js`, `api.js`, `graphs.js`, `students.js`, and the `css/` directory.
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

## 📋 Audit Checklist for Reviewers

When asked *"Try to access the profile from the host domain"* in `audit.md`:

Provide the live URL from GitHub Pages, Netlify, or Vercel. The reviewer visits the link, logs in, verifies the three data sections and four SVG graphs display correct data, then confirms logout works.

---

## 🗂️ File Manifest (what to include in deployment)

```text
index.html
app.js
api.js
graphs.js
students.js
css/
  theme.css
  base.css
  login.css
  nav.css
  dashboard.css
  graphs.css
  students.css
docs/       (optional — only needed for audit reviewers)
```
