# Bitespeed Identity Reconciliation Backend

This is a Node.js + TypeScript backend service for consolidating customer contact information across multiple purchases, built with Express and Prisma (PostgreSQL).

## Prerequisites

- Node.js (v18+)
- PostgreSQL database

## Local Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env` and update the `DATABASE_URL`:
   ```bash
   cp .env.example .env
   ```

3. **Run database migrations:**
   This will apply the Prisma schema to your PostgreSQL database.
   ```bash
   npm run db:migrate
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:3000`.

## Production Build

To compile TypeScript and run the production server:

```bash
npm run build
npm start
```

## Deployment on Render.com (Free Tier)

This application can be deployed for free on Render.com:

1. Create an account on [Render.com](https://render.com).
2. Create a **New PostgreSQL** database on Render (Free tier). Copy the "Internal Database URL" (or External if required).
3. Create a **New Web Service** and connect your GitHub repository containing this codebase.
4. Configure the Web Service:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build && npx prisma generate && npx prisma migrate deploy`
   - **Start Command:** `npm start`
5. Set Environment Variables:
   - `DATABASE_URL`: Paste the PostgreSQL URL from step 2.
   - `PORT`: `3000` (Render will automatically assign a port, but it's good practice to set it).
   - *Gotcha:* If using Render's External DB URL, append `?ssl=true` to the `DATABASE_URL` if connection issues occur.
6. Deploy the service.

## Edge Cases Handled

- **Missing Fields:** Requests with only `email` or only `phoneNumber` are handled gracefully.
- **Null Values:** Null responses are filtered out of the output arrays.
- **Duplicate Data:** Duplicate emails and phone numbers are combined and deduplicated.
- **Primary Re-assignment:** When two previously separate clusters are merged (Case 4), the older cluster's primary contact remains primary, and the newer cluster's primary is demoted to secondary. All children of the newer primary are updated to point to the older primary in a single Prisma transaction to ensure Atomicity.
