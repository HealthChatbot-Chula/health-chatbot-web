# Health Chatbot Web

Next.js web UI for the Health Chatbot.

LINE is used for authentication and friend-gating only. Users chat with the bot on this web app, not inside LINE.

## Tech Stack

- Next.js
- TypeScript
- Prisma
- Neon PostgreSQL for shared development and production

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
npm run prisma:generate
```

Apply the committed PostgreSQL migrations to your Neon development branch:

```powershell
npm run prisma:migrate:deploy
npm run prisma:migrate:status
```

See [NEON_SETUP.md](NEON_SETUP.md) before creating the Neon project or changing a
database schema. The old SQLite migrations are retained in
`prisma/migrations-sqlite-archive` for reference only and must not be deployed.

## Environment

Use `.env.example` as the template.

Set `DATABASE_URL` to the pooled Neon connection string and `DIRECT_URL` to the
direct Neon connection string. Never commit either value.

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

## Useful Commands

```powershell
npm run dev
npm run lint
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run prisma:studio
```
