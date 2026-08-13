/* ============================================
   COFFEE LOUNGE — Order Page JS
   order.js — Cart, Menu, Checkout Logic
   ============================================ */

'use strict';

// ─── STATE ──────────────────────────────────────────────────────────────────
const state = {
  orderType: 'pickup',    // 'pickup' | 'delivery'
  cart: [],               // [{ id, name, price, priceNum, image, qty }]
  activeCategory: 'all',
  menuData: [],
  isLoading: true,
  checkoutStep: 1,
  placedOrder: null
};

const DELIVERY_FEE = 60;
const TAX_RATE = 0.05;

// ─── ELEMENT REFS ────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const el = {
  navbar: $('order-navbar'),
  cartNavBtn: $('cartNavBtn'),
  cartNavCount: $('cartNavCount'),

  btnPickup: $('btnPickup'),
  btnDelivery: $('btnDelivery'),

  catBtns: document.querySelectorAll('.cat-btn'),

  menuLoading: $('menuLoading'),
  menuContent: $('menuContent'),
  menuEmpty: $('menuEmpty'),

  // Cart sidebar
  cartItemsLabel: $('cartItemsLabel'),
  cartOrderTypeIcon: $('cartOrderTypeIcon'),
  cartOrderTypeText: $('cartOrderTypeText'),
  cartChangeType: $('cartChangeType'),
  cartEmpty: $('cartEmpty'),
  cartItemsList: $('cartItemsList'),
  cartInstructions: $('cartInstructions'),
  specialInstructions: $('specialInstructions'),
  cartSummary: $('cartSummary'),
  cartSubtotal: $('cartSubtotal'),
  deliveryFeeRow: $('deliveryFeeRow'),
  cartTaxes: $('cartTaxes'),
  cartTotal: $('cartTotal'),
  btnCheckout: $('btnCheckout'),

  // Floating cart (mobile)
  floatCartBtn: $('floatCartBtn'),
  floatCartCount: $('floatCartCount'),
  floatCartTotal: $('floatCartTotal'),

  // Cart drawer
  cartDrawerOverlay: $('cartDrawerOverlay'),
  cartDrawer: $('cartDrawer'),
  cartDrawerClose: $('cartDrawerClose'),
  cartDrawerBody: $('cartDrawerBody'),

  // Checkout modal
  checkoutOverlay: $('checkoutOverlay'),
  checkoutModal: $('checkoutModal'),
  checkoutClose: $('checkoutClose'),
  step1Indicator: $('step1Indicator'),
  step2Indicator: $('step2Indicator'),
  step3Indicator: $('step3Indicator'),
  checkoutStep1: $('checkoutStep1'),
  checkoutStep2: $('checkoutStep2'),
  checkoutStep3: $('checkoutStep3'),

  // Form
  checkoutForm: $('checkoutForm'),
  orderName: $('orderName'),
  orderPhone: $('orderPhone'),
  orderEmail: $('orderEmail'),
  orderAddress: $('orderAddress'),
  addressGroup: $('addressGroup'),
  pickupTimeGroup: $('pickupTimeGroup'),
  orderPickupTime: $('orderPickupTime'),
  orderNotes: $('orderNotes'),
  nameError: $('nameError'),
  phoneError: $('phoneError'),
  emailError: $('emailError'),
  addressError: $('addressError'),

  cancelCheckout: $('cancelCheckout'),
  nextToReview: $('nextToReview'),
  backToDetails: $('backToDetails'),
  placeOrderBtn: $('placeOrderBtn'),
  backToMenu: $('backToMenu'),

  // Review
  reviewCustomerInfo: $('reviewCustomerInfo'),
  reviewItemsList: $('reviewItemsList'),
  reviewTotals: $('reviewTotals'),

  // Confirmation
  orderRefNumber: $('orderRefNumber'),
  confirmationDetails: $('confirmationDetails'),

  // Toast
  toastContainer: $('toastContainer')
};

// ─── NAVBAR SCROLL ────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  el.navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ─── ORDER TYPE TOGGLE ───────────────────────────────────────────────────────
function setOrderType(type) {
  state.orderType = type;
  el.btnPickup.classList.toggle('active', type === 'pickup');
  el.btnDelivery.classList.toggle('active', type === 'delivery');

  // Sync cart sidebar badge
  el.cartOrderTypeIcon.className = type === 'pickup'
    ? 'fa-solid fa-store'
    : 'fa-solid fa-motorcycle';
  el.cartOrderTypeText.textContent = type === 'pickup' ? 'Pickup' : 'Delivery';

  // Toggle delivery fee visibility
  el.deliveryFeeRow.hidden = type !== 'delivery';

  // Toggle address/time fields in checkout form
  el.addressGroup.hidden = type !== 'delivery';
  el.pickupTimeGroup.hidden = type !== 'pickup';

  updateCartTotals();
  showToast('info', type === 'pickup' ? 'Pickup Selected' : 'Delivery Selected',
    type === 'pickup' ? 'Your order will be ready for pickup.' : 'Delivery fee of ₹60 applies.');
}

el.btnPickup.addEventListener('click', () => setOrderType('pickup'));
el.btnDelivery.addEventListener('click', () => setOrderType('delivery'));
el.cartChangeType.addEventListener('click', () => {
  setOrderType(state.orderType === 'pickup' ? 'delivery' : 'pickup');
});

// ─── API BASE URL HELPER ──────────────────────────────────────────────────────
function getApiBaseUrl() {
  const hostname = window.location.hostname;
  const port = window.location.port;

  if (hostname !== 'localhost' && hostname !== '127.0.0.1' && !window.location.protocol.startsWith('file')) {
    return '';
  }
  if (['5000', '5001', '5002'].includes(port)) {
    return '';
  }
  return 'http://localhost:5002';
}

// ─── FETCH MENU ───────────────────────────────────────────────────────────────
async function fetchMenu() {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/menu`);
    const json = await res.json();
    if (json.status === 'success') {
      state.menuData = json.data;
    } else {
      throw new Error('Menu fetch failed');
    }
  } catch (err) {
    console.warn('API unavailable, using fallback menu:', err.message);
    state.menuData = getFallbackMenu();
  } finally {
    state.isLoading = false;
    renderMenu();
  }
}

function getFallbackMenu() {
  return [
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
}

// ─── MENU RENDER ──────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  'Specialty Coffee': 'fa-mug-hot',
  'Artisan Teas & Infusions': 'fa-leaf',
  'Bakery & Desserts': 'fa-cookie-bite',
  'Savory Bites': 'fa-utensils'
};

function parsePrice(priceStr) {
  return parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
}

function renderMenu() {
  el.menuLoading.hidden = true;

  const cat = state.activeCategory;
  const data = cat === 'all'
    ? state.menuData
    : state.menuData.filter(c => c.category === cat);

  if (!data.length || data.every(c => !c.items.length)) {
    el.menuEmpty.hidden = false;
    el.menuContent.innerHTML = '';
    return;
  }

  el.menuEmpty.hidden = true;
  el.menuContent.innerHTML = '';

  data.forEach(category => {
    if (!category.items.length) return;

    const block = document.createElement('div');
    block.className = 'menu-category-block';
    block.dataset.category = category.category;

    const iconClass = CATEGORY_ICONS[category.category] || 'fa-star';

    block.innerHTML = `
      <div class="category-heading">
        <div class="category-heading-icon" aria-hidden="true">
          <i class="fa-solid ${iconClass}"></i>
        </div>
        <h2>${escapeHtml(category.category)}</h2>
        <div class="category-heading-line" aria-hidden="true"></div>
      </div>
      <div class="menu-items-grid"></div>
    `;

    const grid = block.querySelector('.menu-items-grid');

    category.items.forEach(item => {
      const card = createMenuCard(item);
      grid.appendChild(card);
    });

    el.menuContent.appendChild(block);
  });
}

function createMenuCard(item) {
  const inCart = state.cart.find(c => c.id === item.id);
  const qty = inCart ? inCart.qty : 0;

  const card = document.createElement('div');
  card.className = 'menu-item-card';
  card.dataset.itemId = item.id;
  card.setAttribute('role', 'article');

  card.innerHTML = `
    ${item.popular ? `<div class="popular-badge" aria-label="Popular item"><i class="fa-solid fa-fire-flame-curved" aria-hidden="true"></i> Chef's Pick</div>` : ''}
    <div class="menu-item-image-wrap">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='Images/coffe.jpg'" />
      <div class="menu-item-image-overlay" aria-hidden="true"></div>
    </div>
    <div class="menu-item-body">
      <h3 class="menu-item-name">${escapeHtml(item.name)}</h3>
      <p class="menu-item-desc">${escapeHtml(item.description)}</p>
      <div class="menu-item-footer">
        <span class="menu-item-price">${escapeHtml(item.price)}</span>
        ${qty === 0
          ? `<button class="btn-add-to-cart" data-id="${item.id}" aria-label="Add ${escapeHtml(item.name)} to cart">
               <i class="fa-solid fa-plus" aria-hidden="true"></i> Add
             </button>`
          : `<div class="item-qty-control" role="group" aria-label="Quantity for ${escapeHtml(item.name)}">
               <button class="qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease quantity">−</button>
               <span class="qty-display" aria-live="polite" aria-atomic="true">${qty}</span>
               <button class="qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase quantity">+</button>
             </div>`
        }
      </div>
    </div>
  `;

  // Event delegation on the card itself
  card.addEventListener('click', e => {
    const addBtn = e.target.closest('.btn-add-to-cart');
    const qtyBtn = e.target.closest('.qty-btn');

    if (addBtn) {
      addToCart(item);
    } else if (qtyBtn) {
      const action = qtyBtn.dataset.action;
      if (action === 'increase') increaseQty(item.id);
      else if (action === 'decrease') decreaseQty(item.id);
    }
  });

  return card;
}

// ─── CATEGORY FILTER ─────────────────────────────────────────────────────────
el.catBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    el.catBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.activeCategory = btn.dataset.cat;
    renderMenu();
    // Smooth scroll to menu
    document.querySelector('.order-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ─── CART OPERATIONS ──────────────────────────────────────────────────────────
function addToCart(item) {
  const existing = state.cart.find(c => c.id === item.id);
  if (existing) {
    existing.qty++;
  } else {
    state.cart.push({
      id: item.id,
      name: item.name,
      price: item.price,
      priceNum: parsePrice(item.price),
      image: item.image,
      qty: 1
    });
  }
  syncCartUI();
  updateMenuCardControls(item.id);
  showToast('success', 'Added to Order', item.name);
}

function increaseQty(id) {
  const item = state.cart.find(c => c.id === id);
  if (item) {
    item.qty++;
    syncCartUI();
    updateMenuCardControls(id);
  }
}

function decreaseQty(id) {
  const item = state.cart.find(c => c.id === id);
  if (!item) return;
  if (item.qty <= 1) {
    removeFromCart(id);
  } else {
    item.qty--;
    syncCartUI();
    updateMenuCardControls(id);
  }
}

function removeFromCart(id) {
  state.cart = state.cart.filter(c => c.id !== id);
  syncCartUI();
  updateMenuCardControls(id);
}

function updateMenuCardControls(id) {
  // Update all cards with this item id (could be multiple if categories overlap)
  document.querySelectorAll(`.menu-item-card[data-item-id="${id}"]`).forEach(card => {
    const inCart = state.cart.find(c => c.id === id);
    const qty = inCart ? inCart.qty : 0;
    const footer = card.querySelector('.menu-item-footer');
    const nameEl = card.querySelector('.menu-item-name');
    const name = nameEl ? nameEl.textContent : '';

    const existingAddBtn = footer.querySelector('.btn-add-to-cart');
    const existingQtyCtrl = footer.querySelector('.item-qty-control');

    if (qty === 0) {
      if (!existingAddBtn) {
        if (existingQtyCtrl) existingQtyCtrl.remove();
        const btn = document.createElement('button');
        btn.className = 'btn-add-to-cart';
        btn.dataset.id = id;
        btn.setAttribute('aria-label', `Add ${name} to cart`);
        btn.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Add';
        footer.appendChild(btn);
      }
    } else {
      if (existingQtyCtrl) {
        existingQtyCtrl.querySelector('.qty-display').textContent = qty;
      } else {
        if (existingAddBtn) existingAddBtn.remove();
        const ctrl = document.createElement('div');
        ctrl.className = 'item-qty-control';
        ctrl.setAttribute('role', 'group');
        ctrl.setAttribute('aria-label', `Quantity for ${name}`);
        ctrl.innerHTML = `
          <button class="qty-btn" data-action="decrease" data-id="${id}" aria-label="Decrease quantity">−</button>
          <span class="qty-display" aria-live="polite" aria-atomic="true">${qty}</span>
          <button class="qty-btn" data-action="increase" data-id="${id}" aria-label="Increase quantity">+</button>
        `;
        footer.appendChild(ctrl);
      }
    }
  });
}

// ─── CART UI SYNC ────────────────────────────────────────────────────────────
function syncCartUI() {
  const totalItems = state.cart.reduce((sum, c) => sum + c.qty, 0);

  // Nav badge
  el.cartNavCount.textContent = totalItems;
  el.cartNavCount.classList.toggle('visible', totalItems > 0);

  // Items label
  el.cartItemsLabel.textContent = `${totalItems} ${totalItems === 1 ? 'item' : 'items'}`;

  // Cart empty state
  el.cartEmpty.hidden = totalItems > 0;
  el.cartItemsList.hidden = totalItems === 0;

  // Instructions & summary
  el.cartInstructions.hidden = totalItems === 0;
  el.cartSummary.hidden = totalItems === 0;

  // Checkout button
  el.btnCheckout.disabled = totalItems === 0;
  el.btnCheckout.setAttribute('aria-disabled', totalItems === 0 ? 'true' : 'false');

  // Render cart items list
  renderCartItems();
  updateCartTotals();
  updateFloatingCart(totalItems);
  renderCartDrawer();
}

function renderCartItems() {
  el.cartItemsList.innerHTML = '';
  state.cart.forEach(item => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.dataset.itemId = item.id;
    li.innerHTML = `
      <img class="cart-item-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='Images/coffe.jpg'" />
      <div class="cart-item-info">
        <div class="cart-item-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${escapeHtml(item.price)}</div>
      </div>
      <div class="cart-item-controls">
        <div class="cart-item-qty-row">
          <button class="cart-qty-btn remove-btn" data-action="decrease" data-id="${item.id}" aria-label="Decrease ${escapeHtml(item.name)}">−</button>
          <span class="cart-item-qty" aria-live="polite">${item.qty}</span>
          <button class="cart-qty-btn" data-action="increase" data-id="${item.id}" aria-label="Increase ${escapeHtml(item.name)}">+</button>
        </div>
      </div>
    `;

    li.addEventListener('click', e => {
      const btn = e.target.closest('.cart-qty-btn');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'increase') increaseQty(id);
      else decreaseQty(id);
    });

    el.cartItemsList.appendChild(li);
  });
}

function updateCartTotals() {
  const subtotal = state.cart.reduce((sum, c) => sum + c.priceNum * c.qty, 0);
  const delivery = state.orderType === 'delivery' ? DELIVERY_FEE : 0;
  const taxes = Math.round((subtotal + delivery) * TAX_RATE);
  const total = subtotal + delivery + taxes;

  el.cartSubtotal.textContent = formatCurrency(subtotal);
  el.cartTaxes.textContent = formatCurrency(taxes);
  el.cartTotal.textContent = formatCurrency(total);
  el.deliveryFeeRow.hidden = state.orderType !== 'delivery';

  // Float cart total
  el.floatCartTotal.textContent = formatCurrency(total);
}

function updateFloatingCart(totalItems) {
  const isMobile = window.innerWidth <= 1100;
  el.floatCartBtn.hidden = !(isMobile && totalItems > 0);
  el.floatCartBtn.classList.toggle('show', isMobile && totalItems > 0);
  el.floatCartCount.textContent = totalItems;
}

function renderCartDrawer() {
  el.cartDrawerBody.innerHTML = '';

  // Order type badge
  const typeBadge = document.createElement('div');
  typeBadge.className = 'cart-order-type';
  typeBadge.innerHTML = `
    <i class="${state.orderType === 'pickup' ? 'fa-solid fa-store' : 'fa-solid fa-motorcycle'}" aria-hidden="true"></i>
    <span>${state.orderType === 'pickup' ? 'Pickup' : 'Delivery'}</span>
  `;
  el.cartDrawerBody.appendChild(typeBadge);

  // Items
  if (state.cart.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cart-empty';
    empty.innerHTML = `
      <div class="cart-empty-icon"><i class="fa-solid fa-mug-saucer"></i></div>
      <p class="cart-empty-title">Your cup is empty</p>
      <p class="cart-empty-sub">Add items from the menu to get started.</p>
    `;
    el.cartDrawerBody.appendChild(empty);
    return;
  }

  const list = document.createElement('ul');
  list.className = 'cart-items-list';
  state.cart.forEach(item => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `
      <img class="cart-item-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='Images/coffe.jpg'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${escapeHtml(item.price)}</div>
      </div>
      <div class="cart-item-controls">
        <div class="cart-item-qty-row">
          <button class="cart-qty-btn remove-btn" data-action="decrease" data-id="${item.id}">−</button>
          <span class="cart-item-qty">${item.qty}</span>
          <button class="cart-qty-btn" data-action="increase" data-id="${item.id}">+</button>
        </div>
      </div>
    `;
    li.addEventListener('click', e => {
      const btn = e.target.closest('.cart-qty-btn');
      if (!btn) return;
      if (btn.dataset.action === 'increase') increaseQty(btn.dataset.id);
      else decreaseQty(btn.dataset.id);
    });
    list.appendChild(li);
  });
  el.cartDrawerBody.appendChild(list);

  // Summary
  const subtotal = state.cart.reduce((sum, c) => sum + c.priceNum * c.qty, 0);
  const delivery = state.orderType === 'delivery' ? DELIVERY_FEE : 0;
  const taxes = Math.round((subtotal + delivery) * TAX_RATE);
  const total = subtotal + delivery + taxes;

  const summary = document.createElement('div');
  summary.className = 'cart-summary';
  summary.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    ${state.orderType === 'delivery' ? `<div class="summary-row"><span>Delivery Fee</span><span>${formatCurrency(delivery)}</span></div>` : ''}
    <div class="summary-row summary-taxes"><span>Taxes (5%)</span><span>${formatCurrency(taxes)}</span></div>
    <div class="summary-divider"></div>
    <div class="summary-row summary-total"><span>Total</span><span>${formatCurrency(total)}</span></div>
  `;
  el.cartDrawerBody.appendChild(summary);

  // Checkout btn
  const checkoutBtn = document.createElement('button');
  checkoutBtn.className = 'btn-checkout';
  checkoutBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i> Proceed to Checkout';
  checkoutBtn.addEventListener('click', () => {
    closeCartDrawer();
    openCheckoutModal();
  });
  el.cartDrawerBody.appendChild(checkoutBtn);
}

// ─── CART DRAWER ─────────────────────────────────────────────────────────────
function openCartDrawer() {
  el.cartDrawerOverlay.classList.add('open');
  el.cartDrawer.classList.add('open');
  el.cartDrawer.setAttribute('aria-hidden', 'false');
  el.cartNavBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  renderCartDrawer();
}

function closeCartDrawer() {
  el.cartDrawerOverlay.classList.remove('open');
  el.cartDrawer.classList.remove('open');
  el.cartDrawer.setAttribute('aria-hidden', 'true');
  el.cartNavBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

el.floatCartBtn.addEventListener('click', openCartDrawer);
el.cartNavBtn.addEventListener('click', () => {
  if (window.innerWidth <= 1100) openCartDrawer();
  else openCheckoutModal();
});
el.cartDrawerClose.addEventListener('click', closeCartDrawer);
el.cartDrawerOverlay.addEventListener('click', closeCartDrawer);

// ─── CHECKOUT MODAL ──────────────────────────────────────────────────────────
function openCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('error', 'Cart is Empty', 'Add items to proceed to checkout.');
    return;
  }
  setCheckoutStep(1);
  el.checkoutOverlay.classList.add('open');
  el.checkoutOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCheckoutModal() {
  el.checkoutOverlay.classList.remove('open');
  el.checkoutOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function setCheckoutStep(step) {
  state.checkoutStep = step;

  // Step content
  el.checkoutStep1.hidden = step !== 1;
  el.checkoutStep2.hidden = step !== 2;
  el.checkoutStep3.hidden = step !== 3;

  // Indicators
  [el.step1Indicator, el.step2Indicator, el.step3Indicator].forEach((ind, i) => {
    ind.classList.remove('active', 'done');
    const n = i + 1;
    if (n < step) ind.classList.add('done');
    else if (n === step) ind.classList.add('active');
  });

  // Step lines
  document.querySelectorAll('.step-line').forEach((line, i) => {
    line.classList.toggle('done', step > i + 1);
  });
}

el.btnCheckout.addEventListener('click', openCheckoutModal);
el.checkoutClose.addEventListener('click', closeCheckoutModal);
el.cancelCheckout.addEventListener('click', closeCheckoutModal);

el.checkoutOverlay.addEventListener('click', e => {
  if (e.target === el.checkoutOverlay) closeCheckoutModal();
});

// Keyboard close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeCheckoutModal();
    closeCartDrawer();
  }
});

// Step 1 → Step 2
el.nextToReview.addEventListener('click', () => {
  if (!validateForm()) return;
  populateReviewStep();
  setCheckoutStep(2);
  el.checkoutModal.scrollTop = 0;
});

// Step 2 → Step 1
el.backToDetails.addEventListener('click', () => {
  setCheckoutStep(1);
  el.checkoutModal.scrollTop = 0;
});

// Step 2 → Place Order
el.placeOrderBtn.addEventListener('click', placeOrder);

// Step 3 → Back to Menu
el.backToMenu.addEventListener('click', () => {
  closeCheckoutModal();
  resetCart();
});

// ─── FORM VALIDATION ─────────────────────────────────────────────────────────
function validateForm() {
  let valid = true;

  // Name
  if (!el.orderName.value.trim()) {
    el.nameError.textContent = 'Please enter your full name.';
    el.orderName.classList.add('error');
    valid = false;
  } else {
    el.nameError.textContent = '';
    el.orderName.classList.remove('error');
  }

  // Phone
  const phoneClean = el.orderPhone.value.replace(/\D/g, '');
  if (phoneClean.length < 10) {
    el.phoneError.textContent = 'Please enter a valid phone number (at least 10 digits).';
    el.orderPhone.classList.add('error');
    valid = false;
  } else {
    el.phoneError.textContent = '';
    el.orderPhone.classList.remove('error');
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(el.orderEmail.value.trim())) {
    el.emailError.textContent = 'Please enter a valid email address.';
    el.orderEmail.classList.add('error');
    valid = false;
  } else {
    el.emailError.textContent = '';
    el.orderEmail.classList.remove('error');
  }

  // Address (delivery only)
  if (state.orderType === 'delivery') {
    if (!el.orderAddress.value.trim()) {
      el.addressError.textContent = 'Please enter your delivery address.';
      el.orderAddress.classList.add('error');
      valid = false;
    } else {
      el.addressError.textContent = '';
      el.orderAddress.classList.remove('error');
    }
  }

  return valid;
}

// Real-time clear errors on input
[el.orderName, el.orderPhone, el.orderEmail, el.orderAddress].forEach(input => {
  if (!input) return;
  input.addEventListener('input', () => {
    input.classList.remove('error');
  });
});

// ─── REVIEW STEP POPULATE ────────────────────────────────────────────────────
function populateReviewStep() {
  // Customer info
  const pickupTime = el.orderPickupTime.value ? formatTime(el.orderPickupTime.value) : 'ASAP';
  const addr = state.orderType === 'delivery' ? el.orderAddress.value.trim() : null;

  el.reviewCustomerInfo.innerHTML = `
    <div class="review-info-item">
      <span class="review-info-label">Name</span>
      <span class="review-info-value">${escapeHtml(el.orderName.value.trim())}</span>
    </div>
    <div class="review-info-item">
      <span class="review-info-label">Phone</span>
      <span class="review-info-value">${escapeHtml(el.orderPhone.value.trim())}</span>
    </div>
    <div class="review-info-item">
      <span class="review-info-label">Email</span>
      <span class="review-info-value">${escapeHtml(el.orderEmail.value.trim())}</span>
    </div>
    <div class="review-info-item">
      <span class="review-info-label">Order Type</span>
      <span class="review-info-value">${state.orderType === 'pickup' ? 'Pickup — ' + pickupTime : 'Delivery'}</span>
    </div>
    ${addr ? `<div class="review-info-item" style="grid-column: 1/-1;">
      <span class="review-info-label">Address</span>
      <span class="review-info-value">${escapeHtml(addr)}</span>
    </div>` : ''}
  `;

  // Items
  el.reviewItemsList.innerHTML = '';
  state.cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'review-item';
    div.innerHTML = `
      <img class="review-item-img" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='Images/coffe.jpg'" />
      <span class="review-item-name">${escapeHtml(item.name)}</span>
      <span class="review-item-qty">x${item.qty}</span>
      <span class="review-item-price">${formatCurrency(item.priceNum * item.qty)}</span>
    `;
    el.reviewItemsList.appendChild(div);
  });

  // Totals
  const subtotal = state.cart.reduce((sum, c) => sum + c.priceNum * c.qty, 0);
  const delivery = state.orderType === 'delivery' ? DELIVERY_FEE : 0;
  const taxes = Math.round((subtotal + delivery) * TAX_RATE);
  const total = subtotal + delivery + taxes;

  el.reviewTotals.innerHTML = `
    <div class="summary-row"><span>Subtotal</span><span>${formatCurrency(subtotal)}</span></div>
    ${delivery ? `<div class="summary-row"><span>Delivery Fee</span><span>${formatCurrency(delivery)}</span></div>` : ''}
    <div class="summary-row summary-taxes"><span>Taxes (5%)</span><span>${formatCurrency(taxes)}</span></div>
    <div class="summary-divider"></div>
    <div class="summary-row summary-total"><span>Total</span><span>${formatCurrency(total)}</span></div>
  `;
}

// ─── PLACE ORDER ─────────────────────────────────────────────────────────────
async function placeOrder() {
  const btn = el.placeOrderBtn;
  btn.classList.add('loading');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Placing...';
  btn.disabled = true;

  const subtotal = state.cart.reduce((sum, c) => sum + c.priceNum * c.qty, 0);
  const delivery = state.orderType === 'delivery' ? DELIVERY_FEE : 0;
  const taxes = Math.round((subtotal + delivery) * TAX_RATE);
  const total = subtotal + delivery + taxes;

  const orderPayload = {
    name: el.orderName.value.trim(),
    email: el.orderEmail.value.trim(),
    phone: el.orderPhone.value.trim(),
    orderType: state.orderType,
    address: state.orderType === 'delivery' ? el.orderAddress.value.trim() : null,
    pickupTime: state.orderType === 'pickup' ? el.orderPickupTime.value : null,
    notes: el.orderNotes.value.trim(),
    specialInstructions: el.specialInstructions ? el.specialInstructions.value.trim() : '',
    items: state.cart.map(c => ({
      id: c.id,
      name: c.name,
      price: c.price,
      qty: c.qty,
      lineTotal: formatCurrency(c.priceNum * c.qty)
    })),
    subtotal: formatCurrency(subtotal),
    deliveryFee: formatCurrency(delivery),
    taxes: formatCurrency(taxes),
    total: formatCurrency(total),
    timestamp: new Date().toISOString()
  };

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    const json = await res.json();
    if (res.ok && json.status === 'success') {
      state.placedOrder = { ...orderPayload, ref: json.order?.id || generateOrderRef() };
      showConfirmation();
    } else {
      throw new Error(json.message || 'Order processing failed');
    }
  } catch (err) {
    console.error('Order API Error:', err.message);
    showToast('error', 'Connection Error', 'Could not connect to backend server on port 5002. Please ensure server is running.');
  } finally {
    btn.classList.remove('loading');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Place Order';
    btn.disabled = false;
  }
}

function generateOrderRef() {
  return 'ORD-' + Date.now().toString(36).toUpperCase().slice(-6);
}

function showConfirmation() {
  const order = state.placedOrder;
  el.orderRefNumber.textContent = order.ref;

  el.confirmationDetails.innerHTML = `
    <div class="review-info-item">
      <span class="review-info-label">Name</span>
      <span class="review-info-value">${escapeHtml(order.name)}</span>
    </div>
    <div class="review-info-item">
      <span class="review-info-label">Order Type</span>
      <span class="review-info-value">${order.orderType === 'pickup' ? 'Pickup' : 'Delivery'}</span>
    </div>
    <div class="review-info-item">
      <span class="review-info-label">Total</span>
      <span class="review-info-value" style="color: var(--gold); font-weight: 600;">${order.total}</span>
    </div>
    <div class="review-info-item">
      <span class="review-info-label">Est. Ready</span>
      <span class="review-info-value">15–25 minutes</span>
    </div>
  `;

  setCheckoutStep(3);
  el.checkoutModal.scrollTop = 0;
  showToast('success', 'Order Confirmed!', `Your order ${order.ref} has been placed.`);
}

function resetCart() {
  state.cart = [];
  state.placedOrder = null;
  el.checkoutForm.reset();
  syncCartUI();
  // Re-render all menu cards to remove qty controls
  renderMenu();
}

// ─── TOAST SYSTEM ────────────────────────────────────────────────────────────
function showToast(type, title, message, duration = 4000) {
  const iconMap = {
    success: 'fa-check',
    error: 'fa-xmark',
    info: 'fa-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fa-solid ${iconMap[type] || 'fa-info'}" aria-hidden="true"></i></div>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      ${message ? `<div class="toast-msg">${escapeHtml(message)}</div>` : ''}
    </div>
  `;

  toast.style.setProperty('--duration', `${duration}ms`);
  el.toastContainer.appendChild(toast);

  // Auto dismiss
  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
function formatCurrency(amount) {
  return '₹' + amount.toLocaleString('en-IN');
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── RESIZE HANDLER ──────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  const totalItems = state.cart.reduce((sum, c) => sum + c.qty, 0);
  updateFloatingCart(totalItems);
}, { passive: true });

// ─── INIT ─────────────────────────────────────────────────────────────────────
fetchMenu();

// Set default cart badge state
el.cartOrderTypeIcon.className = 'fa-solid fa-store';
el.cartOrderTypeText.textContent = 'Pickup';
el.cartEmpty.hidden = false;
el.cartItemsList.hidden = true;
