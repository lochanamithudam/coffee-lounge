<div align="center">

# ☕ COFFEE LOUNGE — Fine Coffee & Artisan Lounge
### *A Modern, Production-Ready Full-Stack Web Application*

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.19-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-Cloud_DB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment_Ready-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

<p align="center">
  <b>Luxury Coffee & Dining Experience</b> • <b>Real-time Table Booking</b> • <b>Interactive Online Ordering</b> • <b>Automated Email Notifications</b>
</p>

---

</div>

## 📖 Table of Contents
- [Project Overview](#-project-overview)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Environment Variables](#-environment-variables)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Security & Resilience](#-security--resilience)
- [License & Credits](#-license--credits)

---

## 🌟 Project Overview

**Coffee Lounge** is an end-to-end full-stack web application designed for a luxury artisanal coffee shop and lounge. It delivers a rich, immersive user experience with luxury lounge aesthetics, dynamic menus, interactive cart management, table reservation systems with automated email confirmations, and cloud data persistence via MongoDB Atlas.

---

## 🚀 Key Features

### 🎨 1. Premium Frontend UI/UX
* **Artisanal Aesthetics:** High-end typography, glassmorphic elements, gold accents, smooth scroll animations, and parallax effects.
* **Interactive Online Order System (`/order`):** Dynamic item customization, live subtotal/tax/delivery calculation, and responsive checkout flows.
* **Live Dynamic Menu:** Real-time menu catalog fetched directly from the backend API.

### ⚙️ 2. Robust Backend & REST API
* **Express & Node.js Server:** Scalable RESTful micro-architecture with centralized routing.
* **Automated Email Service:** Integrated **Nodemailer** transporter with Gmail SMTP that sends formatted HTML reservation confirmations to customers instantly.
* **Admin-Protected Endpoints:** Secure customer records endpoint protected by API Key authentication middleware (`X-Admin-Key` / `Bearer`).
* **Rate Limiting & Security:** Integrated `express-rate-limit` for DDoS prevention and `helmet` for secure HTTP headers.

### 🍃 3. Cloud Database & Fault Tolerance
* **MongoDB Atlas (Primary):** Cloud NoSQL database with Mongoose schemas for `Reservations`, `Orders`, and `Subscribers`.
* **Zero-Downtime Local JSON Fallback:** If cloud database connectivity drops, the system seamlessly saves and retrieves records from local persistent JSON storage.

---

## 🏛️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    1. FRONTEND (Client)                     │
│   • HTML5, CSS3 (Modern Glassmorphism & Animations)         │
│   • Vanilla JavaScript (ES6+ Modules & Async API Fetch)     │
│   • Entrypoints: index.html (Lounge) | order.html (Order)   │
└──────────────────────────────┬──────────────────────────────┘
                               │  REST API Requests (fetch / JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     2. BACKEND (Server)                     │
│   • Node.js & Express.js REST API (server.js)               │
│   • Security: Helmet, CORS, Rate Limiters, Admin API Auth   │
│   • Email: Nodemailer (Gmail SMTP Email Transporter)        │
│   • Serverless Entry: api/index.js (Vercel Serverless)      │
└──────────────────────────────┬──────────────────────────────┘
                               │  Mongoose ODM / File System
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    3. DATA & PERSISTENCE                    │
│   • Primary: MongoDB Atlas Cloud Cluster (CoffeeLoungeDB)   │
│   • Schemas: Reservations, Orders, Newsletter Subscribers   │
│   • Resilience Fallback: Local JSON Store (data/*.json)     │
└─────────────────────────────────────────────────────────────┘
```

### 💻 Technologies Used:

| Category | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, Modern JavaScript (ES6+), Google Fonts |
| **Backend Framework** | Node.js, Express.js (v4.19) |
| **Database & ODM** | MongoDB Atlas, Mongoose (v9.9) |
| **Email Service** | Nodemailer (Gmail SMTP Integration) |
| **Security & Utilities** | Helmet, CORS, Express-Rate-Limit, Dotenv |
| **DevOps & Containers** | Docker, Docker Compose, Vercel Serverless |

---

## 📂 Project Structure

```bash
COFFEE LOUNGE/
├── api/
│   └── index.js              # Vercel serverless function entry point
├── css/
│   ├── animations.css        # Keyframes, parallax & scroll animations
│   ├── base.css              # Global tokens, typography, CSS resets
│   ├── components.css        # Buttons, cards, modals, navigation
│   ├── layout.css            # Grid & Flexbox layout systems
│   ├── main.css              # Main lounge style bundle
│   ├── order.css             # Dedicated online order styling
│   └── responsive.css       # Mobile & tablet media queries
├── data/                     # Local JSON storage (Fault-tolerance fallback)
│   ├── orders.json
│   ├── reservations.json
│   └── subscribers.json
├── js/
│   ├── main.js               # Lounge interactions, parallax & booking logic
│   └── order.js              # Online cart, item customization & order submission
├── Images/                   # Optimized food, drink, and ambiance photography
├── Videos/                   # Hero background video assets
├── .env.example              # Environment variables template
├── Dockerfile                # Production Docker container configuration
├── docker-compose.yml        # Multi-container orchestration
├── index.html                # Main Coffee Lounge landing & reservation page
├── order.html                # Dedicated Online Ordering page
├── package.json              # Project dependencies & npm scripts
├── server.js                 # Primary Express server & API routes
└── vercel.json               # Vercel serverless rewrite & routing rules
```

---

## 📡 API Documentation

### Base URL: `http://localhost:5000`

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Returns server health, uptime, and database connection status |
| `GET` | `/api/menu` | Public | Fetches dynamic menu categories, items, prices, and tags |
| `POST` | `/api/reservations` | Public (Rate Limited) | Books a table reservation, saves to DB, and sends email |
| `GET` | `/api/reservations` | 🔒 **Admin Only** | Retrieves all customer reservations (Requires `X-Admin-Key`) |
| `POST` | `/api/orders` | Public (Rate Limited) | Creates and confirms an online takeaway / delivery order |
| `GET` | `/api/orders` | 🔒 **Admin Only** | Retrieves all placed customer orders (Requires `X-Admin-Key`) |
| `POST` | `/api/newsletter` | Public (Rate Limited) | Subscribes an email to the Coffee Lounge newsletter |

#### Example: Health Check Response
```json
{
  "status": "success",
  "message": "Coffee Lounge API Backend is active and operational.",
  "database": "MongoDB Atlas (Connected)",
  "mongoUriConfigured": true,
  "timestamp": "2026-08-16T09:47:08.268Z"
}
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory and configure the following:

```env
# Server Port
PORT=5000

# MongoDB Atlas Connection String
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/CoffeeLoungeDB?retryWrites=true&w=majority

# Nodemailer Email Configuration (Gmail App Password)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-gmail-app-password

# Admin API Key for protected records access
ADMIN_API_KEY=your_secure_random_admin_key_here
```

---

## 🛠️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (Version 18 or higher)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/lochanamithudam/coffee-lounge.git
cd coffee-lounge

# Install dependencies
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your MongoDB and Email credentials:
```bash
cp .env.example .env
```

### 3. Start the Application
```bash
# Start backend server
npm start
```

### 4. Open in Browser
* **Main Lounge Website:** [http://localhost:5000](http://localhost:5000)
* **Online Ordering:** [http://localhost:5000/order](http://localhost:5000/order)
* **API Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🚢 Deployment

### Deploying to Vercel
This repository is pre-configured with `vercel.json` and `api/index.js` for serverless deployment:
1. Push code to your GitHub repository.
2. Import project into [Vercel](https://vercel.com).
3. Add Environment Variables (`MONGO_URI`, `EMAIL_USER`, `EMAIL_PASS`, `ADMIN_API_KEY`) in the Vercel Project Settings.
4. Deploy!

### Deploying with Docker
```bash
# Build and start container
docker-compose up --build -d

# View logs
docker-compose logs -f
```

---

## 🛡️ Security & Fault Tolerance

1. **DDoS & Spam Protection:** Rate limiters prevent spam on reservations, orders, and newsletter forms.
2. **HTTP Security Headers:** Protected with `helmet` to mitigate cross-site scripting and injection vectors.
3. **Data Redundancy:** Automatic dual-write system (MongoDB Atlas + Local JSON) ensures customer orders and reservations are never lost during cloud outages.
4. **Environment Isolation:** Sensitive credentials (`MONGO_URI`, `EMAIL_PASS`, `ADMIN_API_KEY`) are protected via `.env` and ignored in `.gitignore`.

---

## 📄 License & Credits

Developed with ❤️ for **Coffee Lounge**.  
All rights reserved © 2026.
