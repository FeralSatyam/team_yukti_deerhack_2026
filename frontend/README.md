# Medication Interaction Analyzer — Frontend

A client-side React application (Vite) that surfaces possible adverse reactions and
drug-interaction risks for clinical decision support. All analysis runs in the
browser; there is no server-side rendering.

## Tech Stack

- **React 19** (client-side rendering only)
- **Vite** — dev server and build tool
- **React Router DOM** — declarative client-side routing
- **Tailwind CSS v4** — styling (via `@tailwindcss/vite`)
- **JavaScript (JSX)** — no TypeScript
- **jsPDF** — client-side PDF report generation

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser.

The main entry point is `src/main.jsx`, routes are declared in `src/App.jsx`, and
the primary screen lives in `src/components/AnalyzerApp.jsx`.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Produce a production build in `dist` |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |

## Project Structure

```
index.html              # HTML entry (title, meta, Geist fonts)
vite.config.js          # Vite + React + Tailwind, "@" -> ./src alias
src/
  main.jsx              # React root + BrowserRouter
  App.jsx               # Route declarations
  globals.css           # Tailwind import, theme tokens, animations
  components/           # UI components
  hooks/                # Custom hooks
  lib/                  # Analysis engine, data catalogs, PDF generation
```

The `@/` import alias maps to `src/` (configured in both `vite.config.js` and
`jsconfig.json`).
