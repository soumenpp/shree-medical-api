# 💊 Medical Store Backend

A **Node.js + Express** backend API for managing a medical store — billing, inventory, QR codes, and PDF invoices.

---

## 📦 Project Structure

```
medical-store-backend/
├── src/
│   ├── app.js              # Express app entry
│   ├── config/             # DB & passport config
│   ├── controllers/        # Auth, store, inventory, bills, medicines
│   ├── middleware/         # Auth, error handling, file upload
│   ├── routes/             # All API routes
│   ├── services/           # Inventory, QR, bill logic
│   └── utils/              # PDF gen, logger, helpers
├── prisma/
│   ├── schema.prisma       # DB schema (PostgreSQL)
│   └── seed.js             # Sample data
├── .env.example            # Config template
├── setup.sh                # One-line install
└── deploy.sh               # Deploy / git-push
```

---

## 🚀 Quick Deploy

```bash
# 1. Clone & configure
cp .env.example .env
nano .env

# 2. Install & run
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm start
```

Or **one-line install**:
```bash
bash <(curl -sL https://raw.githubusercontent.com/soumenpp/medical-store-backend/main/setup.sh)
```

---

## ✨ Features

- 🏪 **Multi-store support** — manage multiple medical stores
- 💊 **Medicine management** — add, search, track inventory
- 🧾 **Billing** — generate bills with PDF receipts
- 📱 **QR Code** — scan medicines via QR
- 🔐 **Auth** — JWT-based login (OWNER/STAFF roles)
- 📦 **Inventory tracking** — stock levels, expiry alerts
- 📄 **PDF invoice generation**

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT tokens |
| `PORT` | ❌ | Server port (default: 5000) |
| `STORE_NAME` | ❌ | Default store name |
| `MAX_FILE_SIZE` | ❌ | Upload limit (bytes) |

---

## 🛠️ Commands

```bash
./deploy.sh start     # Start production
./deploy.sh dev       # Dev mode with nodemon
./deploy.sh git-push  # Push to GitHub
```

---

**Built by Soumen** 🧠
