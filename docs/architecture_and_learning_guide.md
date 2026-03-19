# Architecture & Learning Guide for GraphQL Profile

Welcome to the GraphQL Profile project! If you're a junior developer looking to understand how modern web applications fetch data, display it, and are structured, this guide is for you.

## 1. Simple Explanation of the Concepts 🧠

This project connects to a database through an "API" to show a user's school profile. Instead of building the database ourselves, we are asking a server for the data we want.

### What is an API?
An API (Application Programming Interface) is like a waiter in a restaurant. You sit at the table (the Frontend/Website) and look at the menu. You give your order to the waiter (the request), the waiter takes it to the kitchen (the Database/Server), and brings your food back to you (the response).

### What is GraphQL?
Usually, with an API (like REST), the "waiter" brings you exactly what the kitchen decides a "User Profile" dish includes. If it includes 50 fields but you only wanted the user's name, you still get all 50.

**GraphQL** changes this. It allows you to tell the waiter *exactly* what you want on your plate. If you only want the `id` and `login`, you ask for exactly that, and the server gives you *only* that:

```graphql
# A "Normal" Query - Just asking for basic user fields
{
  user {
    id
    login
  }
}
```

### What is Authentication (JWT)?
To protect your data, you must log in. When you log in with your username and password, the server verifies them and hands you a VIP Pass called a **JWT (JSON Web Token)**. 

Every time you make a GraphQL query, you politely hand the server that JWT to prove you are who you say you are. If the token expires or is invalid, the server rejects your request.

### What is SVG?
SVG (Scalable Vector Graphics) is a way to draw images using code (like HTML math!). Instead of an image file made of pixels (like a `.jpg`), an SVG is text telling the browser: "Draw a circle here, and a line there." Because it's math, it never loses quality when you zoom in. We use JavaScript to calculate the X and Y coordinates to draw the graph lines perfectly.

### Why do we need `npx serve -s` to run this?
We use `npx serve` (a local HTTP server) to run the project instead of just double-clicking the `index.html` file (using the `file://` protocol) for several crucial reasons:
1. **CORS (Cross-Origin Resource Sharing)**: Browsers have strict security policies when opening files directly from your hard drive (`file://`). If your JavaScript tries to `fetch()` data from the GraphQL API, the browser will likely block it as it considers `file://` an insecure origin for cross-origin requests. A local server (`http://localhost:3000`) provides your app a proper, recognized origin.
2. **ES Modules (`import`/`export`)**: This project uses modern ES modules. Browsers flat out refuse to load files via `import` over the `file://` protocol for security reasons; they strictly require an HTTP/HTTPS server for JavaScript modules.
3. **Single Page Application (SPA) Routing**: The `-s` flag stands for "single". It tells the server to redirect all 404 Not Found requests back to `index.html`. If you implement client-side routing where the URL changes but it's handled by the same file, the server ensures that refreshing the page still loads the application instead of showing a "File Not Found" error.
4. **Asset Paths**: Hosting on a server ensures absolute paths for assets (like `<link rel="stylesheet" href="/styles.css">`) resolve correctly to the root of your project directory, rather than the root of your hard drive (`C:` or `E:`).

---

## 2. What Part Could Be Written in Go? (Backend Alternative) 🐹

Currently, this app is **100% Frontend (Client-side)**. Your browser does all the work (running JavaScript, drawing SVGs, styling with CSS) and it talks directly to the Zone01 GraphQL API.

However, if you decided to pivot to a **Full-Stack** architecture, you would introduce **Go (Golang)** as the **Backend Server (Middleware)**. 

### Exact Codebase Split (Go vs. JS):
If we applied this, the codebase would be split strictly into two domains:

#### What stays in JavaScript (Frontend code):
1.  **Rendering Elements**: Building and structuring the Document Object Model (DOM) inside `index.html` and generating UI pieces dynamically with JS.
2.  **SVG Drawing Algorithms**: Calculating coordinates for lines, points, and paths in `graphs.js`. Browsers rely exclusively on JS/CSS to manipulate SVGs interactively.
3.  **Client-Side Interactivity**: Listening to user clicks, hovers to show tooltips, and managing local UI state (`app.js`).
4.  **Styling**: All CSS and layouts.

#### What moves to Go (Backend code):
1.  **Direct GraphQL Communication**: Instead of the browser fetching data directly, a Go backend (using Go's `net/http` and GraphQL client libraries like `machinebox/graphql`) would be responsible for sending the actual requests to the Zone01 GraphQL API endpoint.
2.  **Authentication & Session Management**:
    *   Currently, the JWT remains in your browser's LocalStorage or memory, vulnerable to XSS attacks. 
    *   With Go, the server would handle the login. Go would receive the JWT from Zone01, store it securely, and issue an encrypted `HttpOnly` Set-Cookie to the browser.
3.  **Data Pre-processing & Caching**: If the GraphQL data requires heavy calculations (like aggregating large audit histories), Go handles these operations dramatically faster than a browser. Go could cache the results of these queries so subsequent requests are lightning-fast.
4.  **Static File Hosting**: The Go program itself takes the place of `npx serve`. Using Go's native `http.FileServer`, it would serve the `index.html`, JavaScript, and CSS files on port 8080 or 3000.

**Example of how the architecture would change with Go:**
* **Currently (100% JS):** Browser (JS) ➔ DIRECTLY queries ➔ Zone01 GraphQL API Endpoint
* **With Go (Full-Stack):** Browser (JS) ➔ fetches `http://localhost:8080/api/profile` ➔ Your Go Server ➔ attaches JWT and executes query ➔ Zone01 GraphQL API Endpoint

---

## 3. Verification against 2026 Agile Standards (AGENTS.md) ✅

The codebase was strictly written following the provided modern JavaScript guidelines (`AGENTS.md`):

*   **Immutability by Default**: 
    *   Arrays are sorted non-destructively using `.toSorted()` in `graphs.js` and `app.js`.
    *   Data is grouped immutably using `Object.groupBy()` rather than manually mutating objects in loops.
*   **Modern APIs**:
    *   **Temporal API**: The legacy (and buggy) `Date` object is completely absent. The project uses ES2026 `Temporal.Instant` and `Temporal.Now` for all date calculations and formatting, ensuring safe time-zone conversions.
*   **Variables & Functions**:
    *   There is zero usage of `var`. Everything is locally scoped with `const`, and `let` is only used exactly where reassignment is strictly necessary (e.g., counters in `for` loops or accumulators).
    *   Arrow functions are used exclusively for standardized logic representation.
*   **Modern Modules**:
    *   No CommonJS (`require()`). The project utilizes native browser ES Modules (`import/export`) directly.
*   **Clean Code & Async**:
    *   Heavy utilization of `async/await` and Promises via `Promise.all()` to execute network queries in parallel, minimizing waiting time.
