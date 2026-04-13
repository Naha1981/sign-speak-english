# SASL Perplexity

This repository contains the Lovable React frontend and a FastAPI backend for the SASL Perplexity app.

## Running locally

### Frontend

1. Install dependencies:

```bash
npm install
```

2. Start the frontend:

```bash
npm run dev
```

3. Open the app in your browser at:

```text
http://localhost:3000
```

This is the URL for the React app UI.

### Backend

The backend runs separately on port `8000` and serves the API and FastAPI docs.

- `http://localhost:8000` → FastAPI backend (JSON, `/docs`, health-check)
- `http://127.0.0.1:8080` → SASL sign recognition service (JSON only)

## Important: open the correct URL

If your browser opens a blank page or just JSON, you are likely on the backend, not the React app.

- `http://localhost:3000` → React app UI ✅
- `http://localhost:8000` → Backend API and docs ❌
- `http://127.0.0.1:8080` → SASL recognition service ❌

Always use the frontend URL from the terminal output when starting the app.

## Why this happens

VS Code / Codespaces / Open Code can detect multiple local servers and sometimes opens the wrong one automatically.

If it opens `http://localhost:8000` or `http://127.0.0.1:8080`, close that tab and instead open `http://localhost:3000`.

## If `http://localhost:3000` still shows blank

1. Open browser dev tools (F12) and check the Console.
2. Look for errors such as:
   - `Failed to fetch` → backend offline or CORS issue
   - `404` on assets → wrong path or build issue

If you see any errors, paste the exact message here so it can be diagnosed.
