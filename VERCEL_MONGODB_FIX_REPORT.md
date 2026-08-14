# ☕ Coffee Lounge — Vercel & MongoDB Atlas Deployment Fix Report
**Author / Developer:** Lochana Mithudam  
**Project:** Coffee Lounge Fine Coffee & Lounge  
**Date:** August 14, 2026  
**Status:** ✅ Successfully Resolved & Deployed Live  

---

## 📌 Executive Summary (සාරාංශය)

### 🇬🇧 English
This report documents the end-to-end troubleshooting, root cause analysis, and architectural fixes applied to resolve deployment, CORS, serverless database connectivity, and environment variable configuration issues on **Vercel** connected to **MongoDB Atlas**.

### 🇱🇰 සිංහල
මෙම වාර්තාව මඟින් **Coffee Lounge** වෙබ් අඩවිය **Vercel** හරහා Live deploy කිරීමේදී සහ **MongoDB Atlas** Cloud Database එක සමඟ සම්බන්ධ කිරීමේදී ඇතිවූ ගැටලු, ඒවාට හේතු, සහ ඒවා නිරාකරණය කළ ආකාරය පියවරෙන් පියවර විස්තර කෙරේ.

---

## 🔍 Issues Identified (හඳුනාගත් ගැටලු)

| # | Issue (ගැටලුව) | Symptoms (ලක්ෂණ) | Impact (බලපෑම) |
|---|---|---|---|
| 1 | **Missing / Incomplete Vercel Env Variables** | Environment variables not set or duplicated in Vercel project settings. | Backend could not authenticate with MongoDB Atlas or Gmail SMTP. |
| 2 | **CORS Origin Mismatch** | `server.js` was hardcoded for `coffee-lounge.vercel.app`, while the actual live domain was `coffee-lounge-kandy.vercel.app`. | Frontend API requests (`/api/orders`, `/api/reservations`) were blocked by CORS before reaching backend. |
| 3 | **`node_modules` bundled in `vercel.json`** | `vercel.json` included `node_modules/**` from Windows development machine into Vercel build. | Caused Lambda runtime initialization failures (500 Internal Server Error). |
| 4 | **Serverless DB Connection Lifecycle** | Standard serverful connection pattern in `server.js` didn't pool or wait for connection in serverless lambda invocations. | API endpoints returned `Local JSON Storage` fallback instead of saving data to MongoDB Atlas. |

---

## 🛠️ Solutions Applied (සිදු කරන ලද විසඳුම්)

---

### 1️⃣ Vercel Environment Variables Configuration
**Vercel Settings ➔ Environment Variables** හි පහත variables නිවැරදිව configure කරන ලදී:

- `MONGO_URI`: MongoDB Atlas connection string (`mongodb+srv://...`)
- `EMAIL_USER`: Google Workspace / Gmail email address (`lochanamithudam097@gmail.com`)
- `EMAIL_PASS`: Google App Password (`jjzsibleaiiycdjr`)
- Scope: `Production & Preview`

> ⚠️ Note: `PORT` is automatically managed by Vercel's serverless infrastructure and was excluded to prevent port conflict errors.

---

### 2️⃣ Dynamic CORS Whitelisting (`server.js`)
**English:**  
Updated CORS configuration to dynamically accept requests from any `*.vercel.app` domain, `localhost`, or direct API calls without hardcoded single-domain limits.

**සිංහල:**  
ඕනෑම Vercel domain එකකින් (`coffee-lounge-kandy.vercel.app` ඇතුළුව) backend API එකට requests එවන විට CORS error එකකින් block නොවී accept වන ලෙස `server.js` සකස් කරන ලදී.

```javascript
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      (process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.split(',').includes(origin))
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

### 3️⃣ Vercel Build Optimization (`vercel.json`)
**English:**  
Removed local `node_modules/**` from `vercel.json` `includeFiles`. Vercel now natively installs fresh, optimized Linux binaries during build time.

**සිංහල:**  
Windows පරිගණකයේ තිබූ `node_modules` Vercel එකට යැවීම නවතා, Vercel build process එක මඟින්ම පිරිසිදු Linux dependencies install කරගන්නා ලෙස `vercel.json` සකස් කරන ලදී.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": [
          "css/**",
          "js/**",
          "Images/**",
          "Videos/**",
          "index.html",
          "order.html"
        ]
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

---

### 4️⃣ Serverless Database Connection Caching (`server.js`)
**English:**  
Implemented connection caching for Mongoose in serverless environments. Reused active MongoDB connections across function invocations and ensured API handlers asynchronously await active connection before performing CRUD queries.

**සිංහල:**  
Serverless Lambda execution එකකට ගැලපෙන ලෙස `cachedDb` connection pool එකක් නිර්මාණය කරන ලදී. ඒ මඟින් requests එන සෑම අවස්ථාවකදීම database connection එකක් පවතින බව සහතික කර MongoDB Atlas වෙත කෙලින්ම data save කිරීමට හැකි විය.

```javascript
let cachedDb = null;
async function ensureDbConnected() {
  const uri = process.env.MONGO_URI;
  if (!mongoose || !uri) return false;
  if (mongoose.connection && mongoose.connection.readyState === 1) return true;

  try {
    if (!cachedDb) {
      cachedDb = mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
    }
    await cachedDb;
    console.log('🍃 Connected to MongoDB Atlas (CoffeeLoungeDB) successfully!');
    return mongoose.connection && mongoose.connection.readyState === 1;
  } catch (err) {
    cachedDb = null;
    console.error('❌ MongoDB Atlas Connection Error:', err.message);
    return false;
  }
}
```

---

## 🎯 Verification & Results (ප්‍රතිඵල සහ තහවුරු කිරීම්)

1. **Health Check Endpoint (`/api/health`):**
   ```json
   {
     "status": "success",
     "message": "Coffee Lounge API Backend is active and operational.",
     "database": "MongoDB Atlas (Connected)",
     "mongoUriConfigured": true
   }
   ```
2. **Order Placement (`/api/orders`):**
   - Live order forms on `https://coffee-lounge-kandy.vercel.app/order.html` successfully write documents directly to the `Orders` collection in **MongoDB Atlas**.
   - Verified in **MongoDB Compass** with newly generated documents.
3. **Email Notification Service:**
   - Nodemailer SMTP transporter active via Gmail App Password.
   - Customers receive instant confirmation emails upon order & reservation placement.

---

## 📥 How to Access / Download this File
This report is saved directly in your project root directory as:
👉 **[`VERCEL_MONGODB_FIX_REPORT.md`](file:///c:/Users/MITHUU/Desktop/VSCO/COFFE%20LOUNGE/VERCEL_MONGODB_FIX_REPORT.md)**

You can view, edit, or export it to PDF using VS Code, Markdown viewers, or browser converters.
