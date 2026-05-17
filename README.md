# Singil System

Singil System is a full-stack web app with a React client and an Express API server.

## Tech Stack

- Client: React, Vite, ESLint
- Server: Node.js, Express, TypeScript, Nodemon, TSX
- Database: Neon Postgres, Drizzle ORM, Drizzle Kit
- Server middleware: CORS, Helmet, Morgan, Cookie Parser

## Project Structure

```txt
singil-system/
  client/
    src/
    package.json
  server/
    server.ts
    src/
      db/
        db.ts
        schema.ts
      types/
    drizzle/
    drizzle.config.ts
    package.json
```

## Getting Started

Install dependencies in both apps:

```bash
cd client
npm install

cd ../server
npm install
```

Create the server environment file:

```bash
cd server
copy .env.example .env
```

Then update `server/.env` with your Neon connection string:

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

## Development

Run the client:

```bash
cd client
npm run dev
```

Run the server:

```bash
cd server
npm run dev
```

The client usually runs on `http://localhost:5173`.
The server runs on `http://localhost:5000`.

## Database

Generate Drizzle migrations after changing `server/src/db/schema.ts`:

```bash
cd server
npm run db:generate
```

Apply migrations to Neon:

```bash
npm run db:migrate
```

Open Drizzle Studio:

```bash
npm run db:studio
```

The `server/drizzle/` folder contains generated migration history. Commit it once migrations are part of the project.

## Useful Scripts

Client:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Server:

```bash
npm run dev
npm run start
npm run db:generate
npm run db:migrate
npm run db:studio
```
