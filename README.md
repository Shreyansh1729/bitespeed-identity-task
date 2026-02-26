# Bitespeed Backend Task: Identity Reconciliation

## 🔗 Live Endpoint
```
POST https://YOUR-APP-URL.up.railway.app/identify
```
> Replace with your actual hosted URL after deployment.

---

## 📌 Problem Statement

FluxKart.com integrates Bitespeed to track customer identity across multiple purchases. A single customer may use different emails and phone numbers for different orders. This service reconciles all contact information and links them under one unified identity.

---

## 🗄️ Database Schema

```prisma
model Contact {
  id              Int      @id @default(autoincrement())
  phoneNumber     String?
  email           String?
  linkedId        Int?     // ID of the primary contact this is linked to
  linkPrecedence  String   // "primary" | "secondary"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  deletedAt       DateTime?
}
```

---

## 🚀 API Reference

### `POST /identify`

Identifies and consolidates a customer's contact information.

#### Request Body
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```
> At least one of `email` or `phoneNumber` must be provided.

#### Response — `200 OK`
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@email.com", "secondary@email.com"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [23, 27]
  }
}
```
> Primary contact's email and phone number always appear **first** in their respective arrays.

---

## 🧠 Business Logic

### Case 1 — No existing contact found
- Create a new `primary` contact
- Return it with empty `secondaryContactIds: []`

### Case 2 — Exact match found (no new info)
- No new contact created
- Return the consolidated contact group as-is

### Case 3 — Partial match found (new info present)
- A contact matches on email OR phone, but the other field is new
- Create a new `secondary` contact linked to the existing primary
- Return the full consolidated group

### Case 4 — Two separate primaries get linked
- Request contains email from one primary cluster and phone from another
- The **older** primary stays as primary
- The **newer** primary is demoted to `secondary` (linkedId updated)
- All contacts previously linked to the demoted primary are re-linked to the older primary

---

## 💡 Example Walkthrough

### Example 1 — Secondary contact creation

**Existing DB:**
```json
{ "id": 1, "email": "lorraine@hillvalley.edu", "phoneNumber": "123456", "linkPrecedence": "primary" }
```

**Request:**
```json
{ "email": "mcfly@hillvalley.edu", "phoneNumber": "123456" }
```

**After:**
```json
{ "id": 1,  "email": "lorraine@hillvalley.edu", "phoneNumber": "123456", "linkPrecedence": "primary" },
{ "id": 23, "email": "mcfly@hillvalley.edu",    "phoneNumber": "123456", "linkedId": 1, "linkPrecedence": "secondary" }
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

---

### Example 2 — Two primaries merging

**Existing DB:**
```json
{ "id": 11, "email": "george@hillvalley.edu",   "phoneNumber": "919191", "linkPrecedence": "primary" },
{ "id": 27, "email": "biffsucks@hillvalley.edu", "phoneNumber": "717171", "linkPrecedence": "primary" }
```

**Request:**
```json
{ "email": "george@hillvalley.edu", "phoneNumber": "717171" }
```

**After:** Contact 27 is demoted to secondary, linkedId set to 11.

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 11,
    "emails": ["george@hillvalley.edu", "biffsucks@hillvalley.edu"],
    "phoneNumbers": ["919191", "717171"],
    "secondaryContactIds": [27]
  }
}
```

---

## 🛠️ Tech Stack

| Layer     | Technology              |
|-----------|-------------------------|
| Runtime   | Node.js                 |
| Language  | TypeScript              |
| Framework | Express.js              |
| Database  | PostgreSQL              |
| ORM       | Prisma                  |
| Hosting   | Railway.app             |

---

## 📁 Project Structure

```
bitespeed-identity/
├── src/
│   ├── index.ts          # Entry point
│   ├── routes/
│   │   └── identify.ts   # /identify route handler
│   ├── controllers/
│   │   └── identifyController.ts
│   ├── services/
│   │   └── contactService.ts  # Core business logic
│   └── prisma/
│       └── client.ts     # Prisma client instance
├── prisma/
│   └── schema.prisma     # DB schema
├── .env.example
├── package.json
├── tsconfig.json
├── railway.toml          # Railway build instructions
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js v18+
- PostgreSQL database
- npm

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/Shreyansh1729/bitespeed-identity-task.git
cd bitespeed-identity-task

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your DATABASE_URL in .env

# 4. Run Prisma migrations
npx prisma migrate dev --name init

# 5. Start the development server
npm run dev
```

### Environment Variables
```env
DATABASE_URL="postgresql://user:password@localhost:5432/bitespeed"
PORT=3000
```

---

## 🧪 Testing the Endpoint

```bash
# Test with curl
curl -X POST https://YOUR-APP-URL.up.railway.app/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

---

## 🚢 Deployment (Railway.app)

1. Push your code to GitHub.
2. Go to [Railway.app](https://railway.app/) and log in with your GitHub account.
3. Click **New Project** → **Provision PostgreSQL**. Wait for it to initialize.
4. Once the Postgres database is ready, click **New** inside your project → **GitHub Repo** → select `bitespeed-identity-task`.
5. Railway will automatically detect the `railway.toml` file to run the Prisma migrations and build the TypeScript app.
6. Click on your newly created web service -> **Variables**.
7. Click **New Variable** -> select `DATABASE_URL` -> link it to your PostgreSQL database.
8. Go to **Settings** -> **Networking** -> click **Generate Domain** to get your public API URL.
9. Done!

---

## 📬 Submission

Submitted via: [BiteSpeed Task Submission Form](https://forms.gle/hsQBJQ8tzbsp53D77)
