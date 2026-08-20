# Neon PostgreSQL Setup

This project uses Neon PostgreSQL through Prisma. LINE remains the authentication
provider; Neon only replaces the local SQLite database.

## 1. Create the shared Neon organization

1. Sign in to the Neon Console with an account owned by the team, not a personal
   throwaway account.
2. Create an organization named `health-chatbot-team` (or the team's official
   name).
3. Invite team members from **Organization > People**. Give administrative access
   to only one or two maintainers.
4. Require 2FA for accounts that can access production.

Do not share a single Neon account or a database password in chat. Invite each
person with their own account so access can be revoked individually.

## 2. Create the Neon project and branches

Create a project named `health-chatbot` and choose the closest available region to
the application hosting region.

Use this branch layout:

```text
production               real application data
staging                  synthetic or sanitized test data
  dev-<name>             optional per-developer branches
  feature-<short-name>   optional short-lived branches
```

Neon branches include the parent branch's schema and data. Health data must not be
copied from `production` into developer branches. Create developer branches from a
sanitized `staging` branch instead.

## 3. Copy both connection strings

Open the target Neon branch and click **Connect**.

Copy the pooled connection string for application traffic. Its hostname contains
`-pooler`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@EP_NAME-pooler.REGION.aws.neon.tech/neondb?sslmode=require"
```

Turn connection pooling off in the Connect dialog and copy the direct connection
string for Prisma migrations and administration:

```env
DIRECT_URL="postgresql://USER:PASSWORD@EP_NAME.REGION.aws.neon.tech/neondb?sslmode=require"
```

Use the URLs for `staging` or a personal development branch locally. Production
URLs belong only in the deployment platform's secret settings and CI/CD.

## 4. Configure local development

Create the local environment files:

```powershell
Copy-Item .env.example .env.local
```

Edit `.env.local` and replace the database placeholders. For local development
without LINE Login, use:

```env
APP_URL="http://localhost:3000"
DATABASE_URL="<pooled URL for a Neon development branch>"
DIRECT_URL="<direct URL for the same Neon development branch>"
SESSION_SECRET="<at least 32 random characters>"
DEV_AUTH_BYPASS="true"

LINE_CHANNEL_ID=""
LINE_CHANNEL_SECRET=""
LINE_BOT_PROMPT="aggressive"

CHAT_COMPLETIONS_BASE_URL="http://127.0.0.1:8000"
CHAT_COMPLETIONS_PATH="/v1/chat/completions"
CHAT_MODEL="health-agent"
CHAT_COMPLETIONS_API_KEY=""
LAB_EXTRACTION_PATH=""
```

Prisma CLI reads `.env`, while Next.js local development reads `.env.local`.
Copy the completed local file for Prisma:

```powershell
Copy-Item .env.local .env -Force
```

Both files are ignored by Git.

## 5. Initialize a new Neon branch

Install dependencies, generate Prisma Client, and apply the committed migrations:

```powershell
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run prisma:migrate:status
```

The first deployment creates these application tables:

```text
User, Session, Conversation, Message, Attachment, PatientProfile,
ConversationHealthState, LabReport, LabResult
```

Use `prisma migrate deploy` on shared, staging, and production databases. It applies
committed migrations without generating or rewriting migration files.

## 6. Make future schema changes safely

Never edit the production schema in the Neon Tables page. Use this workflow:

1. Create or reset a Neon branch from sanitized `staging`.
2. Point local `DATABASE_URL` and `DIRECT_URL` to that branch.
3. Change `prisma/schema.prisma`.
4. Generate a migration:

   ```powershell
   npm run prisma:migrate -- --name describe_the_change
   ```

5. Run the application and test the change.
6. Commit both `schema.prisma` and the new `prisma/migrations/.../migration.sql`.
7. Review the SQL in the pull request.
8. Run `npm run prisma:migrate:deploy` against staging.
9. After verification, run the same command against production through CI/CD.

The `prisma/migrations-sqlite-archive` directory is historical documentation only.
Do not move its SQL files back into `prisma/migrations`.

## 7. Configure production environment variables

Set these in the web deployment platform's encrypted environment settings:

```env
APP_URL="https://YOUR_WEB_DOMAIN"
DATABASE_URL="<pooled URL for the Neon production branch>"
DIRECT_URL="<direct URL for the Neon production branch>"
SESSION_SECRET="<stable production secret with at least 32 random characters>"
DEV_AUTH_BYPASS="false"

LINE_CHANNEL_ID="<LINE Login channel ID>"
LINE_CHANNEL_SECRET="<LINE Login channel secret>"
LINE_BOT_PROMPT="aggressive"

CHAT_COMPLETIONS_BASE_URL="https://YOUR_HEALTH_BACKEND_DOMAIN"
CHAT_COMPLETIONS_PATH="/v1/chat/completions"
CHAT_MODEL="health-agent"
CHAT_COMPLETIONS_API_KEY="<shared backend secret if enabled>"
LAB_EXTRACTION_PATH="<backend extraction path or empty>"
```

Keep `SESSION_SECRET` stable between deployments. Changing it invalidates all
existing web sessions.

## 8. Configure LINE for the deployed web domain

In the LINE Login channel used by the team, register this exact callback URL:

```text
https://YOUR_WEB_DOMAIN/api/auth/line/callback
```

The callback is derived from `APP_URL`; there is no separate callback environment
variable. The LINE Login channel must also be linked to the intended LINE Official
Account for the friend-status gate to work.

This implementation does not require `LIFF_ID`, a Messaging API channel access
token, or a webhook URL. It uses LINE Login OAuth and the friendship status API.

## 9. Deployment migration command

Run migrations once per release before starting the new application version:

```powershell
npm run prisma:migrate:deploy
```

Prefer a CI/CD migration job with `DIRECT_URL` rather than running migrations from
a developer laptop. Do not run `prisma migrate dev`, `prisma db push`, or
`prisma migrate reset` against production.

## 10. Team maintenance rules

- Use the Neon Tables and SQL editors freely on sanitized development branches.
- Restrict production data access to maintainers who need it.
- Use migrations for schema changes; do not make untracked production schema edits.
- Take a snapshot or verify the restore window before a risky production migration.
- Store connection strings in a password manager and deployment secret manager.
- Rotate database credentials when a team member with production credentials leaves.
- Prefer object storage for large lab attachments as the application grows; the
  current `Attachment.data` field stores each file as PostgreSQL `BYTEA`.

## 11. Existing SQLite data

The archived SQLite database is not copied automatically. The recommended first
deployment starts Neon with an empty database because the existing file contains
development data and an incomplete schema.

If any existing users or conversations must be retained, migrate them in a separate,
reviewed data-import step. Do not import old `Session` rows; users should sign in
again on the deployed domain.
