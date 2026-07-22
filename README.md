# Health Chatbot Web

Next.js web UI for the Health Chatbot.

LINE is used for authentication and friend-gating only. Users chat with the bot on this web app, not inside LINE.

## Tech Stack

- Next.js
- TypeScript
- Prisma
- SQLite for local development

## Requirements

- Node.js
- npm
- Existing backend running at `C:\ChatBot\health-chatbot`

## Setup

```powershell
cd C:\ChatBot\health-chatbot-web
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local`, then copy it to `.env` for Prisma:

```powershell
Copy-Item .env.local .env -Force
```

Generate Prisma Client:

```powershell
npx prisma generate
```

Initialize the local database:

```powershell
npx prisma migrate dev --name init
```

If Prisma migrate fails on Windows with a blank schema engine error, use:

```powershell
sqlite3.exe prisma\dev.db ".read prisma/migrations/20260603153000_init/migration.sql"
```

## Environment

Use `.env.example` as the template.

For local chat testing without LINE:

```env
DEV_AUTH_BYPASS="true"
LINE_CHANNEL_ID=""
LINE_CHANNEL_SECRET=""
```

For real LINE Login:

```env
DEV_AUTH_BYPASS="false"
LINE_CHANNEL_ID="your-line-channel-id"
LINE_CHANNEL_SECRET="your-line-channel-secret"
```

Do not commit:

```text
.env
.env.local
node_modules
.next
prisma/dev.db
```

## Run

Start the existing backend:

```powershell
cd C:\ChatBot\health-chatbot
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Start the web app:

```powershell
cd C:\ChatBot\health-chatbot-web
npm run dev
```

Open:

```text
http://localhost:3000
```

When `DEV_AUTH_BYPASS="true"`, open:

```text
http://localhost:3000/chat
```

## API Documentation

See [docs/API.md](docs/API.md) for all API routes, request bodies, response shapes, auth requirements, and common errors.

## Useful Commands

```powershell
npm run dev
npm run lint
npx tsc --noEmit
npx prisma generate
npx prisma studio
```
