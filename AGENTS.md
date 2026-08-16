# AGENTS.md

## Commands

- **dev**: `npm run dev`
- **build**: `npm run build`
- **lint**: `npm run lint`
- **lint:fix**: `npm run lint:fix`
- **format**: `npm run format`
- **type-check**: `npm run type-check`
- **test**: `npm run test`
- **server**: `npm run server`

## Project Structure

- `/` — Root source (App.tsx, components/, views/, services/, context/)
- `/src/` — Secondary source (lease module, lib, hooks)
- `/server/` — Express backend (routes/, api/, middleware/, services/)
- `/logs/` — Log files (gitignored)
- `/migrations/` — SQL migration files
- `/components/` — Shared React components
- `/views/` — Page-level components (lazy loaded)
- `/services/` — Frontend service layer (Supabase queries, API calls)
- `/context/` — React context providers
- `/utils/` — Utility functions

## Code Conventions

- React 19 with TypeScript
- Tailwind CSS v4 (via @tailwindcss/vite plugin)
- React Router v7 for routing
- Lazy load all view components
- Use `@/` alias for root imports
- Use `logger` from `@/utils/logger` instead of console.log

## Key Packages

- `@supabase/supabase-js` — Database client
- `lucide-react` — Icons
- `react-router-dom` v7 — Routing
- `@hello-pangea/dnd` — Drag and drop (Kanban, layout editor)
- `@tmcw/togeojson` — GeoJSON conversion
- `framer-motion` — Animations
- `recharts` — Charts
