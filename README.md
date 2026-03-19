# GraphQL Profile

A vanilla JavaScript web application that displays a user's school progression and statistics by querying a GraphQL API endpoint. This project was built to master GraphQL queries (Normal, Nested, and Parameterized), JWT authentication, and programmatic SVG generation without external libraries.

## 🚀 Features

- **JWT Authentication**: Secure login flow using Basic Auth to retrieve and store a JWT Bearer token.
- **Dynamic GraphQL Queries**: Demonstrates advanced GraphQL querying across multiple tables (`user`, `transaction`, `progress`, `result`, `object`).
- **Data Visualizations**: Custom, animated, interactive charts plotted purely with vanilla JavaScript and the DOM `createElementNS` method. No canvas or external charting libraries were used.
    - **Line Chart**: Cumulative XP progression over time.
    - **Bar Chart**: Top XP earned categorized by project.
- **Glassmorphism UI**: Beautiful, fully responsive dark-mode dashboard reflecting modern UI/UX design patterns.
- **Bonus Sections**: Displays recent project activity (Pass/Fail) and top acquired skills.

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript (ES2026 modules), HTML5, CSS3 (Custom Properties, Flexbox, CSS Grid).
- **Visualization**: Scalable Vector Graphics (SVG).
- **Data Fetching**: Native `fetch` API.
- **Data Parsing/Logic**: Native ES2026 functionality (`Object.groupBy()`, `Temporal` API, immutable array methods).
- **Zero Dependencies**: Everything is written from scratch, right down to the axes on the graphs.

## 📂 Project Structure

```text
├── index.html   # Main application entry point (Login & Dashboard views).
├── app.css      # Design system, layout, and animations.
├── api.js       # GraphQL client, queries, and authentication helpers.
├── graphs.js    # Data visualization logic (SVG creation).
└── app.js       # Application controller (routing, DOM updates).
```

## 🚀 Getting Started

This application operates entirely in the browser using ES modules. Due to browser security restrictions regarding CORS and the `file:///` protocol, it must be served via a local web server to function correctly.

### Prerequisites
- Node.js (for `npx serve`) or Python (for `http.server`) installed on your machine.
- Valid Zone01 platform (or Gitea) credentials to fetch authenticated data.

### Installation & Serving

**Method 1: Using Node.js (npx)**
```bash
# Navigate to the project directory
cd path/to/graphql-profile

# Spin up a fast local static server
npx serve .
```

**Method 2: Using Python**
```bash
# Navigate to the project directory
cd path/to/graphql-profile

# Start a python development server
python -m http.server 3000
```

Once the server is running, open your browser and navigate to `http://localhost:3000` (or whichever port was specified).

## 💡 How It Works

1. **Authentication**: Entering credentials on the login screen issues a Basic Auth `POST` request to `/api/auth/signin`. A JWT is returned and saved.
2. **Data Aggregation**: The `app.js` module orchestrates several concurrent GraphQL queries (`Promise.all`) via the `api.js` module directly to the GraphQL engine using the stored JWT as a Bearer token.
3. **Rendering Content**: Data is mapped to respective DOM elements.
4. **Drawing SVGs**: The `graphs.js` module receives arrays of transaction data, calculates max values, applies scaling and proportions, and draws `<svg>`, `<path>`, `<rect>`, and `<circle>` elements directly into the DOM.

## 🌐 Deploying to GitHub Pages

Since this codebase is 100% static, deploying it is incredibly simple:

1. Initialize a git repository and commit the code.
2. Push to a repository on GitHub.
3. In the repository settings, navigate to **Pages**.
4. Set the source branch to `main`/`master`.
5. Your application will be live at `https://<your-username>.github.io/<your-repo-name>/`.
