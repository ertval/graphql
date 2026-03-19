# Deployment Guide: GraphQL Profile

This guide explains how to host your Vanilla Web Application online, as required by the `requirements.md` and `audit.md` documents. 

Since this project uses no external bundlers (like Vite or Webpack) and relies solely on raw HTML, CSS, and JS files, deploying it is incredibly fast and completely free. You do **not** need a build step.

---

## 🚀 Option 1: Deploying to GitHub Pages (Recommended)

GitHub Pages is the easiest way to host a static web application directly from your GitHub repository.

### Prerequisites:
1. You have a GitHub account.
2. Your project is pushed to a GitHub repository.

### Step-by-Step Instructions:

1. **Push your code to GitHub**:
   Make sure all your files (`index.html`, `app.js`, `app.css`, `api.js`, `graphs.js`) are in the root directory (the main folder) of your repository.
   ```bash
   git init
   git add .
   git commit -m "Initial commit for GraphQL profile"
   git branch -M main
   git remote add origin https://github.com/YourUsername/YourRepoName.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click on the **Settings** tab.
   - In the left sidebar, scroll down and click on **Pages**.

3. **Configure the Source**:
   - Under the **Build and deployment** section, look for the "Source" dropdown.
   - Ensure it is set to **Deploy from a branch**.
   - Under the **Branch** dropdown, select your main branch (usually `main` or `master`).
   - Leave the folder as `/ (root)`.
   - Click **Save**.

4. **Access your site**:
   - GitHub will now build and deploy your site. This usually takes 1-2 minutes.
   - Refresh the page, and at the top of the "Pages" settings, you will see a message: *“Your site is live at `https://<your-username>.github.io/<your-repo-name>/`”*.
   - Click the link! Your application is now accessible from anywhere in the world.

---

## ⚡ Option 2: Deploying to Netlify

Netlify is incredibly fast and provides automatic deployments simply by dragging and dropping a folder or connecting your GitHub account.

### Step-by-Step Instructions:

#### Method A: Drag and Drop (Fastest, No Git required)
1. Open your browser and go to [Drop - Netlify](https://app.netlify.com/drop).
2. Open your computer's file explorer.
3. Select the folder containing your project files (`index.html`, etc.).
4. Drag and drop that entire folder into the circle on the Netlify webpage.
5. Netlify will instantly generate a random URL (like `https://happy-hopper-12345.netlify.app`) where your site is live!

#### Method B: Connect your GitHub Repo (Best Practice)
1. Go to [Netlify.com](https://www.netlify.com/) and create a free account or log in with GitHub.
2. On your team overview page, click the **Add new site** button, then select **Import an existing project**.
3. Choose **GitHub** as your Git provider.
4. Authorize Netlify and select the repository containing your GraphQL Profile project.
5. In the configuration settings:
   - **Base directory**: Leave blank.
   - **Build command**: Leave blank (since this is vanilla JS, there is nothing to build).
   - **Publish directory**: Leave blank (or type `/` or `.`).
6. Click **Deploy site**.
7. In a few seconds, Netlify will provide you with a live URL. You can even change the site name in the settings to something cleaner (e.g., `https://my-graphql-profile.netlify.app`).

---

## 📋 Audit Verification

When the peer-reviewer (or auditor) reaches this step in the `audit.md`:

> *Try to access the profile from the host domain. Is the profile successfully accessible and hosted online?*

All you have to do is provide them the URL generated from either **GitHub Pages** or **Netlify**. As long as they can visit the link on their device, log in, and see your SVGs, you pass this requirement!
