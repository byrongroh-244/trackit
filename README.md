# TrackIt Web
 
Assignment tracker — merged from HTML POC and React Native POC, rebuilt as a Vite + React + TypeScript web app.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Project structure

```
src/
  types/       — TypeScript interfaces (Assignment, Course, Subtask, Screen)
  data/
    store.ts   — localStorage persistence, subtask generation, Canvas API import
  hooks/
    useApp.tsx — React context providing global state + actions
  components/
    UI.tsx           — Shared primitives (Header, Field, BottomNav, CheckCircle…)
    AssignmentCard.tsx
  screens/
    TodayScreen.tsx   — Assignment list, grouped by urgency
    AddScreen.tsx     — Manual form + Canvas/photo/file import options
    ClassesScreen.tsx — Course management with color picker
    DetailScreen.tsx  — Subtask breakdown, progress, date editing
    CanvasScreen.tsx  — Canvas LMS API connection flow
    SettingsScreen.tsx
  theme.ts     — Colors, urgency helpers, section metadata
  App.tsx      — Screen router
  main.tsx     — Entry point
```

## What was merged from each source

**From the HTML POC:**
- Urgency grouping logic (needs attention / coming up / on track)
- Subtask auto-generation with date spacing across due date
- Subtask inline date editing with clear button
- Canvas API integration with course + assignment import
- All color tokens and urgency config
- "Show completed" toggle

**From the React Native POC:**
- Clean component architecture and separation of concerns
- TypeScript types for all data models
- `generateSubtasks` keyword matching
- Section metadata pattern
- Proper async/await data layer pattern (adapted to localStorage)

## Canvas integration

In Canvas: Account → Settings → Approved Integrations → + New Access Token

Enter your institution URL (e.g. `university.instructure.com`) and token in the Canvas screen. Imports up to 8 active courses and their upcoming assignments with auto-generated subtasks.

## Build for production

```bash
npm run build
```

Output goes to `dist/` — deploy to Vercel, Netlify, or any static host.
# trackit
