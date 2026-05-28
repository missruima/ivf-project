# IVFHelper

## What This Is
Next.js application providing IVF-related information and tools with an interactive interface.

## Tech Stack
- **Framework**: Next.js 16.1.6
- **UI**: React, Tailwind CSS, shadcn/ui, Radix UI, Lucide icons
- **Data Visualization**: Recharts
- **Database**: SQLite (better-sqlite3)
- **Utilities**: Zod (validation), UUID, bcryptjs
- **Auth**: bcryptjs for password hashing

## Structure
- `/app` - Next.js app routes and API endpoints
- `/components` - React UI components
- `/data` - Data files and database setup
- `/public` - Static assets

## Key Notes for Claude
- Uses Claude API (@anthropic-ai/sdk) for AI features
- SQLite database with bcryptjs for secure password handling
- Markdown rendering with react-markdown and remark-gfm
- Spreadsheet support via xlsx library
- TypeScript throughout for type safety
- Run: `npm run dev` (default port 3000)
