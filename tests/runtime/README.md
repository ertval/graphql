# Runtime Tests (Playwright)

This suite validates core runtime behavior from requirements/audit flows using browser-level checks and mocked API responses.

## Covered flows

- Login form required field behavior (DOM validation + runtime error message)
- Logout returns to login and clears credential inputs
- XP by Project interaction opens the project detail modal
- Main nav/tab switching between Dashboard and Collaborations

## Run

1. Install dev dependencies:

```bash
npm install
```

2. Ensure the app is served (default URL expected by config):

```bash
npx serve . -l 4173
```

3. Run runtime tests:

```bash
npm run test:e2e
```

You can override the target URL with `BASE_URL`:

```bash
BASE_URL=http://127.0.0.1:4173 npm run test:e2e
```
