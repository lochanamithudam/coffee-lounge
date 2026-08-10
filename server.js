const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// File Paths
const RESERVATIONS_FILE = path.join(__dirname, 'data', 'reservations.json');
const SUBSCRIBERS_FILE = path.join(__dirname, 'data', 'subscribers.json');

// Ensure data folder and files exist
function ensureDataFiles() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(RESERVATIONS_FILE)) {
    fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(SUBSCRIBERS_FILE)) {
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([], null, 2));
  }
}

ensureDataFiles();

// Helper functions for reading and writing JSON data
function readJSON(filePath) {
  try {
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
    return false;
  }
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'success',
    message: 'Coffee Lounge API Backend is active and operational.',
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
        { id: 's1', name: 'Smashed Avocado Toast', price: '₹480', description: 'Sourdough, whipped ricotta, Hass avocado, cherry tomatoes & poached egg', popular: true, image: 'Images/avocado_toast.jpg' },
        { id: 's2', name: 'Smoked Salmon Bagel', price: '₹560', description: 'House sesame bagel, cream cheese, Norwegian smoked salmon & fresh dill', popular: true, image: 'Images/smoked_salmon_bagel.jpg' },
        { id: 's3', name: 'Garden Bruschetta Board', price: '₹420', description: 'Toasted ciabatta bites with heirloom tomatoes, fresh basil & aged balsamic', popular: false, image: 'Images/garden_bruschetta.jpg' },
        { id: 's4', name: 'Truffle & Wild Mushroom Crostini', price: '₹490', description: 'Sourdough crostini with wild chanterelles, fontina cheese & black truffle oil', popular: true, image: 'Images/truffle_crostini.jpg' },
        { id: 's5', name: 'Prosciutto & Fig Burrata Tartine', price: '₹540', description: 'Italian burrata over sourdough with prosciutto di Parma, fresh figs & balsamic', popular: true, image: 'Images/burrata_tartine.jpg' },
        { id: 's6', name: 'Mediterranean Halloumi Sliders', price: '₹460', description: 'Grilled halloumi cheese on brioche with roasted red pepper hummus & arugula', popular: true, image: 'Images/halloumi_sliders.jpg' }
      ]
    }
  ];

  res.json({ status: 'success', data: menu });
});

// 3. Table Reservation Endpoint
app.post('/api/reservations', (req, res) => {
  const { name, email, phone, date, time, guests, eventType, message } = req.body;

  // Validation
  if (!name || !email || !phone || !date || !time) {
    return res.status(400).json({
      status: 'error',
      message: 'Please provide all required fields (Name, Email, Phone, Date, and Time).'
    });
  }

  const reservations = readJSON(RESERVATIONS_FILE);

  const newReservation = {
    id: 'RES-' + Date.now().toString(36).toUpperCase(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    date: date.trim(),
    time: time.trim(),
    guests: guests || '2 Guests',
    eventType: eventType || 'Casual Dining',
    message: message ? message.trim() : '',
    createdAt: new Date().toISOString(),
    status: 'Confirmed'
  };

  reservations.push(newReservation);

  if (writeJSON(RESERVATIONS_FILE, reservations)) {
    return res.status(201).json({
      status: 'success',
      message: 'Your table reservation inquiry has been confirmed!',
      reservation: newReservation
    });
  } else {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to save reservation. Please try again.'
    });
  }
});

// 4. Newsletter Subscription Endpoint
app.post('/api/newsletter', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      status: 'error',
      message: 'Please enter a valid email address.'
    });
  }

  const subscribers = readJSON(SUBSCRIBERS_FILE);
  const normalizedEmail = email.trim().toLowerCase();

  // Check if already subscribed
  const existing = subscribers.find(sub => sub.email === normalizedEmail);
  if (existing) {
    return res.status(200).json({
      status: 'success',
      message: 'You are already subscribed to our VIP Newsletter!'
    });
  }

  const newSubscriber = {
    id: 'SUB-' + Date.now().toString(36).toUpperCase(),
    email: normalizedEmail,
    subscribedAt: new Date().toISOString()
  };

  subscribers.push(newSubscriber);

  if (writeJSON(SUBSCRIBERS_FILE, subscribers)) {
    return res.status(201).json({
      status: 'success',
      message: 'Welcome to the Coffee Lounge VIP Club!',
      subscriber: newSubscriber
    });
  } else {
    return res.status(500).json({
      status: 'error',
      message: 'Server error while processing subscription. Please try again.'
    });
  }
});

// Fallback to index.html for root navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`☕ Coffee Lounge Backend Server is running!`);
  console.log(`🌐 Server URL: http://localhost:${PORT}`);
  console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`================================================`);
});
