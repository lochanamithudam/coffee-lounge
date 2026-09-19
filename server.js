if (!globalThis.crypto) {
  globalThis.crypto = require('crypto');
}
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  console.warn('⚠️ Mongoose module load warning:', e.message);
}

// Fix for Windows DNS resolution for MongoDB Atlas SRV connection strings in local dev
if (process.platform === 'win32' && !process.env.VERCEL) {
  try {
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {
    console.warn('DNS server configuration warning:', e.message);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Setup Nodemailer Email Transporter
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
} else {
  console.warn('⚠️ EMAIL_USER or EMAIL_PASS missing. Email notifications disabled.');
}

// -------------------------------------------------------------
// MONGODB ATLAS CONNECTION & SCHEMAS
// -------------------------------------------------------------
let Reservation = null;
let Order = null;
let Subscriber = null;

if (mongoose) {
  // 1. Reservation Schema & Model
  const reservationSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guests: { type: String, default: '2 Guests' },
    eventType: { type: String, default: 'Casual Dining' },
    message: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: 'Confirmed' }
  }, { collection: 'Reservations' });
  Reservation = mongoose.models.Reservation || mongoose.model('Reservation', reservationSchema);

  // 2. Order Schema & Model
  const orderSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    orderType: { type: String, default: 'pickup' },
    address: { type: String, default: null },
    pickupTime: { type: String, default: null },
    notes: { type: String, default: '' },
    specialInstructions: { type: String, default: '' },
    items: { type: Array, required: true },
    subtotal: String,
    deliveryFee: String,
    taxes: String,
    total: String,
    status: { type: String, default: 'Confirmed' },
    createdAt: { type: Date, default: Date.now }
  }, { collection: 'Orders' });
  Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

  // 3. Subscriber Schema & Model
  const subscriberSchema = new mongoose.Schema({
    id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    subscribedAt: { type: Date, default: Date.now }
  }, { collection: 'Subscribers' });
  Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', subscriberSchema);
}

let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function ensureDbConnected() {
  const uri = process.env.MONGO_URI;
  if (!mongoose || !uri) {
    console.warn('⚠️ Mongoose or MONGO_URI missing.');
    return false;
  }
  if (cached.conn && mongoose.connection.readyState === 1) {
    return true;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      bufferCommands: false
    }).then((m) => {
      console.log('🍃 Connected to MongoDB Atlas (CoffeeLoungeDB) successfully!');
      return m;
    }).catch(err => {
      console.error('❌ MongoDB Atlas Connection Error:', err.message);
      cached.promise = null;
      throw err;
    });
  }
  try {
    cached.conn = await cached.promise;
    return mongoose.connection.readyState === 1;
  } catch {
    cached.promise = null;
    return false;
  }
}

// Initial connection attempt
if (mongoose && process.env.MONGO_URI) {
  ensureDbConnected().catch(() => { });
}

// Middleware & CORS
app.use(cors({
  origin: (origin, callback) => {
    // Allow any request from *.vercel.app, localhost, or without origin
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

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiters
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { status: 'error', message: 'Too many orders. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { status: 'error', message: 'Too many subscription attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const reservationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { status: 'error', message: 'Too many reservation requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Admin Authentication Middleware (protects private customer data endpoints)
const requireAdminAuth = (req, res, next) => {
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    return res.status(503).json({
      status: 'error',
      message: 'Admin access is not configured on this server.'
    });
  }

  const providedKey = req.headers['x-admin-key'] ||
    req.query.adminKey ||
    req.query.key ||
    (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '').trim() : null);

  if (providedKey && providedKey === expectedKey) {
    return next();
  }

  return res.status(401).json({
    status: 'error',
    message: 'Unauthorized: Admin API key required to view customer records.'
  });
};


// Serve static frontend files (CSS, JS, Images, Videos, HTML)
app.use(express.static(path.join(__dirname)));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/Images', express.static(path.join(__dirname, 'Images')));
app.use('/Videos', express.static(path.join(__dirname, 'Videos')));

// Local File Fallback Paths
const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(__dirname, 'data');
const RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');
const SUBSCRIBERS_FILE = path.join(DATA_DIR, 'subscribers.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(RESERVATIONS_FILE)) {
      fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(SUBSCRIBERS_FILE)) {
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
    }
  } catch (err) {
    console.warn('Data directory creation warning:', err.message);
  }
}

ensureDataFiles();

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false; // fixed: was incorrectly returning true on error
  }
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Health Check
app.get('/api/health', async (req, res) => {
  const isConnected = await ensureDbConnected();
  res.json({
    status: 'success',
    message: 'Coffee Lounge API Backend is active and operational.',
    database: isConnected ? 'MongoDB Atlas (Connected)' : 'Local JSON Storage',
    mongoUriConfigured: Boolean(process.env.MONGO_URI),
    timestamp: new Date().toISOString()
  });
});

// 2. Dynamic Menu Endpoint
app.get('/api/menu', (req, res) => {
  const menu = [
    {
      category: 'Specialty Coffee',
      items: [
        { id: 'c1', name: 'Signature Velvet Latte', price: '₹340', description: 'Espresso infused with Madagascar vanilla bean & steamed oat milk', popular: true, image: 'Images/WhatsApp Image 2026-08-09 at 14.37.58.jpeg' },
        { id: 'c2', name: 'Gold Leaf Cappuccino', price: '₹420', description: 'Dark roast espresso, velvety foam, dusted with 24k edible gold dust', popular: true, image: 'Images/specialty_drinks.jpg' },
        { id: 'c3', name: 'Ethiopian Yirgacheffe Pour-Over', price: '₹310', description: 'Single-origin pour over with jasmine floral notes & bright citrus acidity', popular: false, image: 'Images/coffee_beans.jpg' },
        { id: 'c4', name: 'Spanish Saffron Gold Latte', price: '₹450', description: 'Rich espresso blended with condensed milk, Spanish saffron & 24k edible gold dust', popular: true, image: 'Images/spanish_saffron_latte.png' },
        { id: 'c5', name: 'Smoked Salted Caramel Cold Brew', price: '₹390', description: '18-hour cold brew infused with house smoked caramel, capped with vanilla cold foam', popular: true, image: 'Images/smoked_caramel_cold_brew.png' },
        { id: 'c6', name: 'Vanilla Bean Affogato Al Caffè', price: '₹440', description: 'Artisanal Tahitian vanilla bean gelato drowned in a double espresso shot & chocolate curls', popular: true, image: 'Images/vanilla_affogato_al_caffe.png' },
        { id: 'c7', name: 'Kashmiri Rose & Pistachio Latte', price: '₹410', description: 'Velvety espresso with white chocolate rose milk, crushed Sicilian pistachios & rose petals', popular: true, image: 'Images/kashmiri_rose_espresso.png' }
      ]
    },
    {
      category: 'Artisan Teas & Infusions',
      items: [
        { id: 't1', name: 'First Flush Darjeeling', price: '₹320', description: 'Light, muscatel, and floral — brewed at 80°C for exactly 3 minutes', popular: true, image: 'Images/darjeeling_tea.png' },
        { id: 't2', name: 'Ceremonial Grade Matcha', price: '₹380', description: 'Japanese ceremonial matcha whisked to silky perfection with oat milk', popular: true, image: 'Images/ceremonial_matcha.png' },
        { id: 't3', name: 'Rose Oolong Blend', price: '₹340', description: 'Taiwanese high-mountain oolong blended with dried rose petals and vanilla', popular: false, image: 'Images/rose_oolong_tea.png' }
      ]
    },
    {
      category: 'Bakery & Desserts',
      items: [
        { id: 'b1', name: 'Twice-Baked Almond Croissant', price: '₹240', description: 'Laminated croissant filled with frangipane cream & toasted almond flakes', popular: true, image: 'Images/almond_croissant.png' },
        { id: 'b2', name: 'Dark Chocolate Ganache Tart', price: '₹320', description: 'Valrhona 70% ganache topped with sea salt flakes and edible gold dust', popular: true, image: 'Images/dark_chocolate_tart.png' },
        { id: 'b3', name: 'Seasonal Macaron Selection', price: '₹480', description: 'Curated box of six French macarons in rotating seasonal flavors', popular: false, image: 'Images/artisan_pastries.jpg' },
        { id: 'b4', name: 'Blueberry Lemon Thyme Scone', price: '₹290', description: 'Warm scone with wild blueberries, lemon zest, clotted cream & berry compote', popular: true, image: 'Images/blueberry_lemon_scone.jpg' },
        { id: 'b5', name: 'Pistachio Praline Éclair', price: '₹360', description: 'Choux pastry filled with roasted pistachio cream & white chocolate glaze', popular: true, image: 'Images/pistachio_eclair.jpg' },
        { id: 'b6', name: 'Vanilla Bean Basque Cheesecake', price: '₹380', description: 'Crustless Spanish cheesecake with molten vanilla center & raspberry reduction', popular: true, image: 'Images/basque_cheesecake.jpg' }
      ]
    },
    {
      category: 'Savory Bites',
      items: [
        { id: 's1', name: 'Smashed Avocado Toast', price: '₹485', description: 'Sourdough, whipped ricotta, Hass avocado, cherry tomatoes & poached egg', popular: true, image: 'Images/avocado_toast.jpg' },
        { id: 's2', name: 'Smoked Salmon Bagel', price: '₹560', description: 'House sesame bagel, cream cheese, Norwegian smoked salmon & fresh dill', popular: true, image: 'Images/smoked_salmon_bagel.jpg' },
        { id: 's3', name: 'Garden Bruschetta Board', price: '₹425', description: 'Toasted ciabatta bites with heirloom tomatoes, fresh basil & aged balsamic', popular: false, image: 'Images/garden_bruschetta.jpg' },
        { id: 's4', name: 'Truffle & Wild Mushroom Crostini', price: '₹490', description: 'Sourdough crostini with wild chanterelles, fontina cheese & black truffle oil', popular: true, image: 'Images/truffle_crostini.jpg' },
        { id: 's5', name: 'Prosciutto & Fig Burrata Tartine', price: '₹540', description: 'Italian burrata over sourdough with prosciutto di Parma, fresh figs & balsamic', popular: true, image: 'Images/burrata_tartine.jpg' },
        { id: 's6', name: 'Mediterranean Halloumi Sliders', price: '₹460', description: 'Grilled halloumi cheese on brioche with roasted red pepper hummus & arugula', popular: true, image: 'Images/halloumi_sliders.jpg' }
      ]
    }
  ];

  res.json({ status: 'success', data: menu });
});

// 3. Table Reservation Endpoint
app.post('/api/reservations', reservationLimiter, async (req, res) => {
  const { name, email, phone, date, time, guests, eventType, message } = req.body;

  // Validation
  if (!name || !email || !phone || !date || !time) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide all required fields (Name, Email, Phone, Date, and Time).'
    });
  }

  const reservationData = {
    id: 'RES-' + Date.now().toString(36).toUpperCase(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    date: date.trim(),
    time: time.trim(),
    guests: guests || '2 Guests',
    eventType: eventType || 'Casual Dining',
    message: message ? message.trim() : '',
    createdAt: new Date(),
    status: 'Confirmed'
  };

  try {
    // Save directly to MongoDB Atlas
    try {
      await ensureDbConnected();
      if (Reservation && mongoose && mongoose.connection.readyState === 1) {
        const newDoc = new Reservation(reservationData);
        await newDoc.save();
        console.log(`🍃 Saved reservation ${reservationData.id} to MongoDB Atlas!`);
      }
    } catch (dbErr) {
      console.error(`❌ MongoDB Atlas Reservation Save Error:`, dbErr.message);
    }

    // Save to local JSON fallback
    const reservations = readJSON(RESERVATIONS_FILE);
    reservations.push(reservationData);
    writeJSON(RESERVATIONS_FILE, reservations);

    // Send confirmation email asynchronously via Nodemailer
    if (transporter) {
      const mailOptions = {
        from: `"Coffee Lounge" <${process.env.EMAIL_USER}>`,
        to: reservationData.email,
        subject: '✨ Your Table is Reserved - The Coffee Lounge',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #17120e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #17120e; padding: 40px 15px;">
              <tr>
                <td align="center">
                  
                  <!-- Main Luxury Card Container -->
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.35); border: 1px solid #36251b;">
                    
                    <!-- Luxury Photo Banner (Hosted CDN - No Attachment Issue) -->
                    <tr>
                      <td style="padding: 0; line-height: 0; background-color: #2c1a11;">
                        <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop" alt="The Coffee Lounge Atmosphere" width="580" style="width: 100%; max-width: 580px; height: 250px; object-fit: cover; display: block; border-top-left-radius: 18px; border-top-right-radius: 18px;" />
                      </td>
                    </tr>

                    <!-- Luxury Branding Strip -->
                    <tr>
                      <td align="center" style="background-color: #1c110a; padding: 24px 30px 20px 30px; text-align: center; border-bottom: 2px solid #c5a059;">
                        <p style="color: #c5a059; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 6px 0; font-weight: 700;">★ ★ ★ ★ ★ &nbsp; EXCLUSIVE RESERVATION</p>
                        <h1 style="color: #ffffff; font-size: 26px; margin: 0; font-weight: 700; letter-spacing: 1px; font-family: 'Georgia', serif;">THE COFFEE LOUNGE</h1>
                        <p style="color: #a89f91; font-size: 12px; letter-spacing: 1.5px; margin: 6px 0 0 0; text-transform: uppercase;">Artisan Espresso Bar & Private Lounge</p>
                      </td>
                    </tr>

                    <!-- Greeting Section -->
                    <tr>
                      <td style="padding: 35px 35px 15px 35px; text-align: center;">
                        <div style="display: inline-block; background-color: #f7f2ea; color: #8e6d36; border: 1px solid #e0ceb1; font-size: 11px; font-weight: 700; padding: 6px 18px; border-radius: 25px; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 16px;">
                          ✓ Reservation Confirmed
                        </div>
                        <h2 style="color: #1c110a; font-size: 23px; margin: 0 0 12px 0; font-weight: 700; font-family: 'Georgia', serif;">Table Reservation Confirmed!</h2>
                        <p style="color: #555555; font-size: 14.5px; line-height: 1.7; margin: 0;">
                          Dear <strong style="color: #1c110a;">${reservationData.name}</strong>,<br>
                          We are honored to confirm your upcoming table reservation. Our baristas and culinary team are preparing to host you for a truly memorable coffee lounge experience.
                        </p>
                      </td>
                    </tr>

                    <!-- Luxury Details Card (Gold-accented Ticket) -->
                    <tr>
                      <td style="padding: 15px 35px 25px 35px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf7f2; border: 1px solid #ebdccb; border-radius: 14px; overflow: hidden;">
                          
                          <!-- Ticket Header -->
                          <tr>
                            <td colspan="2" style="background-color: #2c1a11; padding: 12px 20px; border-bottom: 2px solid #c5a059;">
                              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                                <tr>
                                  <td style="color: #c5a059; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">Reservation Reference</td>
                                  <td align="right" style="color: #ffffff; font-size: 13px; font-family: monospace; font-weight: 700; letter-spacing: 1px;">
                                    ${reservationData.id}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <!-- Details Rows -->
                          <tr>
                            <td style="padding: 14px 20px; color: #7a6e65; font-size: 13.5px; font-weight: 500; border-bottom: 1px dashed #e3ddd3;">📅 Date</td>
                            <td align="right" style="padding: 14px 20px; color: #1c110a; font-size: 14.5px; font-weight: 700; border-bottom: 1px dashed #e3ddd3;">
                              ${reservationData.date}
                            </td>
                          </tr>

                          <tr>
                            <td style="padding: 14px 20px; color: #7a6e65; font-size: 13.5px; font-weight: 500; border-bottom: 1px dashed #e3ddd3;">⏰ Time</td>
                            <td align="right" style="padding: 14px 20px; color: #1c110a; font-size: 14.5px; font-weight: 700; border-bottom: 1px dashed #e3ddd3;">
                              ${reservationData.time}
                            </td>
                          </tr>

                          <tr>
                            <td style="padding: 14px 20px; color: #7a6e65; font-size: 13.5px; font-weight: 500; border-bottom: 1px dashed #e3ddd3;">👥 Party Size</td>
                            <td align="right" style="padding: 14px 20px; color: #1c110a; font-size: 14.5px; font-weight: 700; border-bottom: 1px dashed #e3ddd3;">
                              ${reservationData.guests}
                            </td>
                          </tr>

                          <tr>
                            <td style="padding: 14px 20px; color: #7a6e65; font-size: 13.5px; font-weight: 500;">✨ Atmosphere</td>
                            <td align="right" style="padding: 14px 20px; color: #8e6d36; font-size: 13.5px; font-weight: 700;">
                              ${reservationData.eventType || 'Main Lounge & Dining'}
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>

                    <!-- Concierge Hospitality Note -->
                    <tr>
                      <td style="padding: 0 35px 28px 35px;">
                        <div style="background-color: #fff9f0; border: 1px solid #fae6cb; border-left: 4px solid #c5a059; padding: 14px 18px; border-radius: 0 10px 10px 0; color: #704f26; font-size: 12.5px; line-height: 1.6;">
                          <strong style="color: #523819;">Concierge Note:</strong> Your table is held exclusively for 15 minutes past reservation time. If you have any special seating requests or need to modify your timing, please notify our host desk.
                        </div>
                      </td>
                    </tr>

                    <!-- Luxury Footer -->
                    <tr>
                      <td style="background-color: #1c110a; padding: 30px 35px; text-align: center; color: #9c9284; font-size: 12px; line-height: 1.7; border-top: 1px solid #2f1d13;">
                        <p style="margin: 0 0 6px 0; font-weight: 700; color: #e8ded2; font-size: 13px; letter-spacing: 0.5px;">The Coffee Lounge Hospitality Team</p>
                        <p style="margin: 0 0 12px 0;">123 Galle Road, Colombo | Concierge: +94 11 234 5678</p>
                        <p style="margin: 0; font-size: 11px; color: #6b6155;">© 2026 The Coffee Lounge. Dedicated to the craft of exceptional coffee.</p>
                      </td>
                    </tr>

                  </table>

                </td>
              </tr>
            </table>

          </body>
          </html>
        `
      };
      try {
        await transporter.sendMail(mailOptions);
        console.log(`✉️ Confirmation email sent to ${reservationData.email}`);
      } catch (mailErr) {
        console.error(`⚠️ Email sending failed to ${reservationData.email}:`, mailErr.message);
      }
    }

    return res.status(201).json({
      status: 'success',
      message: 'Your table reservation inquiry has been confirmed!',
      reservation: reservationData
    });
  } catch (err) {
    console.error('Reservation error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to process reservation. Please try again.'
    });
  }
});

// GET Reservations (Protected)
app.get('/api/reservations', requireAdminAuth, async (req, res) => {
  try {
    await ensureDbConnected();
    if (Reservation && mongoose && mongoose.connection.readyState === 1) {
      const data = await Reservation.find().sort({ createdAt: -1 });
      return res.json({ status: 'success', data });
    }
    throw new Error('MongoDB not connected');
  } catch {
    const fallbackData = readJSON(RESERVATIONS_FILE);
    return res.json({ status: 'success', data: fallbackData });
  }
});

// 4. Online Order Endpoint
app.post('/api/orders', orderLimiter, async (req, res) => {
  const { name, email, phone, orderType, address, pickupTime, notes, specialInstructions, items, subtotal, deliveryFee, taxes, total } = req.body;

  // Basic validation
  if (!name || !email || !phone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide name, email, phone, and at least one item.'
    });
  }

  if (orderType === 'delivery' && !address) {
    return res.status(400).json({
      status: 'error',
      message: 'Delivery address is required for delivery orders.'
    });
  }

  const orderData = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    orderType: orderType || 'pickup',
    address: address ? address.trim() : null,
    pickupTime: pickupTime || null,
    notes: notes ? notes.trim() : '',
    specialInstructions: specialInstructions ? specialInstructions.trim() : '',
    items,
    subtotal,
    deliveryFee,
    taxes,
    total,
    status: 'Confirmed',
    createdAt: new Date()
  };

  try {
    // Save directly to MongoDB Atlas
    try {
      await ensureDbConnected();
      if (Order && mongoose && mongoose.connection.readyState === 1) {
        const newDoc = new Order(orderData);
        await newDoc.save();
        console.log(`🍃 Saved order ${orderData.id} to MongoDB Atlas!`);
      }
    } catch (dbErr) {
      console.error(`❌ MongoDB Atlas Order Save Error:`, dbErr.message);
    }

    // Save to local JSON fallback
    const orders = readJSON(ORDERS_FILE);
    orders.push(orderData);
    writeJSON(ORDERS_FILE, orders);

    // Send confirmation email
    if (transporter) {
      const itemsHtml = items.map(i =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #ddd;">${i.name}</td><td style="padding:6px 8px;border-bottom:1px solid #ddd;">x${i.qty}</td><td style="padding:6px 8px;border-bottom:1px solid #ddd;">${i.lineTotal}</td></tr>`
      ).join('');

      const mailOptions = {
        from: `"Coffee Lounge" <${process.env.EMAIL_USER}>`,
        to: orderData.email,
        subject: `☕ Order Confirmed — ${orderData.id} | Coffee Lounge`,
        html: `
          <div style="font-family: Georgia, serif; padding: 30px; background:#1e1008; color:#f8ede0; max-width:600px; margin:0 auto; border-radius:12px;">
            <h1 style="color:#d4b05c; font-size:28px; margin-bottom:4px;">Coffee Lounge</h1>
            <p style="color:#a08060; margin-top:0; font-size:14px;">— Fine Coffee &amp; Lounge —</p>
            <hr style="border:1px solid rgba(212,176,92,0.2); margin:20px 0;" />
            <h2 style="color:#d4b05c;">Your Order is Confirmed!</h2>
            <p>Dear <strong>${orderData.name}</strong>,</p>
            <p>Thank you for your order. Here is your order summary:</p>
            <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(212,176,92,0.2); border-radius:8px; padding:16px; margin:20px 0;">
              <strong style="color:#d4b05c;">Order Reference: ${orderData.id}</strong><br/>
              <span style="color:#a08060; font-size:13px;">Type: ${orderData.orderType === 'pickup' ? 'Pickup' : 'Delivery'} | Est. Ready: 15–25 mins</span>
            </div>
            <table style="width:100%; border-collapse:collapse; margin:16px 0;">
              <thead>
                <tr style="background:rgba(212,176,92,0.1);">
                  <th style="padding:8px; text-align:left; color:#d4b05c;">Item</th>
                  <th style="padding:8px; text-align:left; color:#d4b05c;">Qty</th>
                  <th style="padding:8px; text-align:left; color:#d4b05c;">Price</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <table style="width:100%; margin-top:10px;">
              <tr><td style="padding:4px 0;">Subtotal:</td><td style="text-align:right;">${subtotal}</td></tr>
              ${deliveryFee && deliveryFee !== '₹0' ? `<tr><td style="padding:4px 0;">Delivery Fee:</td><td style="text-align:right;">${deliveryFee}</td></tr>` : ''}
              <tr><td style="padding:4px 0;">Taxes:</td><td style="text-align:right;">${taxes}</td></tr>
              <tr style="font-weight:bold; color:#d4b05c; border-top:1px solid rgba(212,176,92,0.3);"><td style="padding:8px 0;">Total:</td><td style="text-align:right;">${total}</td></tr>
            </table>
            <hr style="border:1px solid rgba(212,176,92,0.2); margin:24px 0;" />
            <p style="color:#a08060; font-size:13px;">We look forward to serving you. If you have any questions, contact us at Coffee Lounge.</p>
            <p>Warm regards,<br/><strong style="color:#d4b05c;">The Coffee Lounge Team</strong></p>
          </div>
        `
      };
      try {
        await transporter.sendMail(mailOptions);
        console.log(`☕ Order confirmation email sent to ${orderData.email}`);
      } catch (mailErr) {
        console.error(`⚠️ Order email failed for ${orderData.email}:`, mailErr.message);
      }
    }

    return res.status(201).json({
      status: 'success',
      message: 'Your order has been placed successfully!',
      order: orderData
    });
  } catch (err) {
    console.error('Order saving error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to save order. Please try again.'
    });
  }
});

// GET Orders (Protected)
app.get('/api/orders', requireAdminAuth, async (req, res) => {
  try {
    await ensureDbConnected();
    if (Order && mongoose && mongoose.connection.readyState === 1) {
      const data = await Order.find().sort({ createdAt: -1 });
      return res.json({ status: 'success', data });
    }
    throw new Error('MongoDB not connected');
  } catch {
    const fallbackData = readJSON(ORDERS_FILE);
    return res.json({ status: 'success', data: fallbackData });
  }
});

// 5. Newsletter Subscription Endpoint
app.post('/api/newsletter', newsletterLimiter, async (req, res) => {
  const { email } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    return res.status(400).json({
      status: 'error',
      message: 'Please enter a valid email address.'
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check for duplicates in local fallback first (universal gate regardless of DB state)
    const subscribers = readJSON(SUBSCRIBERS_FILE);
    const existingLocal = subscribers.find(sub => sub.email === normalizedEmail);

    const subscriberData = {
      id: 'SUB-' + Date.now().toString(36).toUpperCase(),
      email: normalizedEmail,
      subscribedAt: new Date()
    };

    // Save directly to MongoDB Atlas
    try {
      await ensureDbConnected();
      if (Subscriber && mongoose && mongoose.connection.readyState === 1) {
        const existingDoc = await Subscriber.findOne({ email: normalizedEmail });
        if (existingDoc) {
          return res.status(200).json({
            status: 'success',
            message: 'You are already subscribed to our VIP Newsletter!'
          });
        }
        const newDoc = new Subscriber(subscriberData);
        await newDoc.save();
        console.log(`🍃 Saved subscriber ${subscriberData.email} to MongoDB Atlas!`);
      } else if (existingLocal) {
        // MongoDB offline — use local duplicate check result
        return res.status(200).json({
          status: 'success',
          message: 'You are already subscribed to our VIP Newsletter!'
        });
      }
    } catch (dbErr) {
      console.error(`❌ MongoDB Atlas Subscriber Save Error:`, dbErr.message);
      if (existingLocal) {
        return res.status(200).json({
          status: 'success',
          message: 'You are already subscribed to our VIP Newsletter!'
        });
      }
    }

    // Save to local JSON fallback
    if (!existingLocal) {
      subscribers.push(subscriberData);
      writeJSON(SUBSCRIBERS_FILE, subscribers);
    }

    // Send welcome email asynchronously
    if (transporter) {
      const mailOptions = {
        from: `"Coffee Lounge VIP" <${process.env.EMAIL_USER}>`,
        to: normalizedEmail,
        subject: '✨ Welcome to Coffee Lounge VIP Club!',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #c9a84c;">Welcome to the Coffee Lounge VIP Club!</h2>
            <p>Thank you for joining our exclusive circle. As a VIP member, you'll enjoy early invitations to private coffee tastings, secret menu drops, and seasonal culinary releases.</p>
            <p>Warm regards,<br><strong>Coffee Lounge Team</strong></p>
          </div>
        `
      };
      try {
        await transporter.sendMail(mailOptions);
        console.log(`✉️ VIP Welcome email sent to ${normalizedEmail}`);
      } catch (mailErr) {
        console.error(`⚠️ VIP Email sending failed for ${normalizedEmail}:`, mailErr.message);
      }
    }

    return res.status(201).json({
      status: 'success',
      message: 'Welcome to the Coffee Lounge VIP Club!',
      subscriber: subscriberData
    });
  } catch (err) {
    console.error('Newsletter error:', err);
    return res.status(500).json({
      status: 'error',
      message: 'Server error while processing subscription. Please try again.'
    });
  }
});

// GET Subscribers (Protected)
app.get('/api/newsletter', requireAdminAuth, async (req, res) => {
  try {
    await ensureDbConnected();
    if (Subscriber && mongoose && mongoose.connection.readyState === 1) {
      const data = await Subscriber.find().sort({ subscribedAt: -1 });
      return res.json({ status: 'success', data });
    }
    throw new Error('MongoDB not connected');
  } catch {
    const fallbackData = readJSON(SUBSCRIBERS_FILE);
    return res.json({ status: 'success', data: fallbackData });
  }
});

// 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'API endpoint not found.'
  });
});

// HTML page routing
app.get('/order', (req, res) => {
  res.sendFile(path.join(__dirname, 'order.html'));
});
app.get('/order.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'order.html'));
});
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Catch-all fallback for static assets and page navigation
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, req.path);
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return res.sendFile(filePath);
    }
  } catch {
    // Ignore file stat errors
  }
  if (req.path.includes('order')) {
    return res.sendFile(path.join(__dirname, 'order.html'));
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server with automatic port fallback
function startServer(portToUse) {
  const server = app.listen(portToUse, () => {
    console.log(`================================================`);
    console.log(`☕ Coffee Lounge Backend Server is running!`);
    console.log(`🌐 Server URL: http://localhost:${portToUse}`);
    console.log(`📡 Health Check: http://localhost:${portToUse}/api/health`);
    console.log(`================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${portToUse} is already in use. Trying port ${portToUse + 1}...`);
      startServer(portToUse + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

if (!process.env.VERCEL) {
  startServer(Number(PORT));
}

module.exports = app;
