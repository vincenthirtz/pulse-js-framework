/**
 * Pulse E-Commerce App
 * Full-featured shop demo
 */

import {
  pulse,
  effect,
  el,
  mount,
} from '/runtime/index.js';

// =============================================================================
// Mock Products Data
// =============================================================================

const PRODUCTS = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, category: 'electronics', image: '🎧', rating: 4.5, stock: 15, description: 'Premium wireless headphones with noise cancellation and 30h battery life.' },
  { id: 2, name: 'Smart Watch', price: 199.99, category: 'electronics', image: '⌚', rating: 4.8, stock: 8, description: 'Track your fitness, receive notifications, and stay connected on the go.' },
  { id: 3, name: 'Laptop Stand', price: 49.99, category: 'accessories', image: '💻', rating: 4.2, stock: 25, description: 'Ergonomic aluminum laptop stand for better posture and cooling.' },
  { id: 4, name: 'Mechanical Keyboard', price: 129.99, category: 'electronics', image: '⌨️', rating: 4.7, stock: 12, description: 'RGB mechanical keyboard with Cherry MX switches.' },
  { id: 5, name: 'USB-C Hub', price: 39.99, category: 'accessories', image: '🔌', rating: 4.3, stock: 30, description: '7-in-1 USB-C hub with HDMI, SD card, and USB 3.0 ports.' },
  { id: 6, name: 'Wireless Mouse', price: 29.99, category: 'accessories', image: '🖱️', rating: 4.1, stock: 45, description: 'Ergonomic wireless mouse with precision tracking.' },
  { id: 7, name: 'Monitor Light Bar', price: 59.99, category: 'accessories', image: '💡', rating: 4.6, stock: 18, description: 'LED light bar that reduces eye strain during work.' },
  { id: 8, name: 'Webcam HD', price: 89.99, category: 'electronics', image: '📷', rating: 4.4, stock: 20, description: '1080p webcam with auto-focus and built-in microphone.' },
  { id: 9, name: 'Desk Pad', price: 24.99, category: 'accessories', image: '📋', rating: 4.0, stock: 50, description: 'Large leather desk pad for a clean workspace.' },
  { id: 10, name: 'Phone Stand', price: 19.99, category: 'accessories', image: '📱', rating: 4.2, stock: 60, description: 'Adjustable aluminum phone stand for desk.' },
  { id: 11, name: 'Bluetooth Speaker', price: 69.99, category: 'electronics', image: '🔊', rating: 4.5, stock: 22, description: 'Portable Bluetooth speaker with 360-degree sound.' },
  { id: 12, name: 'Gaming Controller', price: 59.99, category: 'electronics', image: '🎮', rating: 4.6, stock: 15, description: 'Wireless gaming controller compatible with PC and console.' },
];

const CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🏪' },
  { id: 'electronics', name: 'Electronics', icon: '🔌' },
  { id: 'accessories', name: 'Accessories', icon: '🎒' },
];

// =============================================================================
// State
// =============================================================================

const products = pulse(PRODUCTS);
const cart = pulse(JSON.parse(localStorage.getItem('pulse-cart') || '[]'));
const category = pulse('all');
const searchQuery = pulse('');
const sortBy = pulse('name'); // name, price-asc, price-desc, rating
const selectedProduct = pulse(null);
const showCart = pulse(false);
const showCheckout = pulse(false);
const notification = pulse(null);

// =============================================================================
// Persistence
// =============================================================================

function saveCart() {
  localStorage.setItem('pulse-cart', JSON.stringify(cart.peek()));
}

// =============================================================================
// Computed Values
// =============================================================================

function getFilteredProducts() {
  let items = products.get();
  const cat = category.get();
  const query = searchQuery.get().toLowerCase();
  const sort = sortBy.get();

  // Filter by category
  if (cat !== 'all') {
    items = items.filter(p => p.category === cat);
  }

  // Filter by search
  if (query) {
    items = items.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }

  // Sort
  switch (sort) {
    case 'price-asc':
      items = [...items].sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      items = [...items].sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      items = [...items].sort((a, b) => b.rating - a.rating);
      break;
    default:
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
  }

  return items;
}

function getCartTotal() {
  return cart.get().reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function getCartCount() {
  return cart.get().reduce((sum, item) => sum + item.quantity, 0);
}

// =============================================================================
// Actions
// =============================================================================

function showNotification(message, type = 'success') {
  notification.set({ message, type });
  setTimeout(() => notification.set(null), 3000);
}

function addToCart(product) {
  const items = cart.peek();
  const existing = items.find(item => item.id === product.id);

  if (existing) {
    if (existing.quantity >= product.stock) {
      showNotification('Maximum stock reached!', 'error');
      return;
    }
    cart.set(items.map(item =>
      item.id === product.id
        ? { ...item, quantity: item.quantity + 1 }
        : item
    ));
  } else {
    cart.set([...items, { ...product, quantity: 1 }]);
  }
  saveCart();
  showNotification(`${product.name} added to cart!`);
}

function removeFromCart(productId) {
  cart.update(items => items.filter(item => item.id !== productId));
  saveCart();
}

function updateQuantity(productId, delta) {
  const items = cart.peek();
  const item = items.find(i => i.id === productId);

  if (!item) return;

  const newQty = item.quantity + delta;
  if (newQty <= 0) {
    removeFromCart(productId);
    return;
  }

  const product = PRODUCTS.find(p => p.id === productId);
  if (newQty > product.stock) {
    showNotification('Maximum stock reached!', 'error');
    return;
  }

  cart.set(items.map(i =>
    i.id === productId ? { ...i, quantity: newQty } : i
  ));
  saveCart();
}

function clearCart() {
  cart.set([]);
  saveCart();
}

function checkout() {
  showCheckout.set(true);
  showCart.set(false);
}

function completeOrder() {
  showNotification('Order placed successfully! Thank you for shopping with us.');
  clearCart();
  showCheckout.set(false);
}

// =============================================================================
// Components
// =============================================================================

function Notification() {
  const container = el('.notification-container');

  effect(() => {
    container.innerHTML = '';
    const notif = notification.get();

    if (notif) {
      const notifEl = el(`.notification.${notif.type}`, notif.message);
      container.appendChild(notifEl);
    }
  });

  return container;
}

function Header() {
  const header = el('header.header');

  // Logo
  const logo = el('.logo');
  logo.appendChild(el('span.logo-icon', '🛒'));
  logo.appendChild(el('span.logo-text', 'Pulse Shop'));
  header.appendChild(logo);

  // Search
  const searchContainer = el('.search-container');
  const searchInput = el('input.search-input[type=text][placeholder="Search products..."]');
  searchInput.addEventListener('input', (e) => searchQuery.set(e.target.value));
  searchContainer.appendChild(el('span.search-icon', '🔍'));
  searchContainer.appendChild(searchInput);
  header.appendChild(searchContainer);

  // Cart button
  const cartBtn = el('button.cart-btn');
  cartBtn.addEventListener('click', () => showCart.set(true));

  effect(() => {
    const count = getCartCount();
    cartBtn.innerHTML = `🛒 <span class="cart-count">${count}</span>`;
  });

  header.appendChild(cartBtn);

  return header;
}

function Sidebar() {
  const sidebar = el('aside.sidebar');

  // Categories
  const catSection = el('.sidebar-section');
  catSection.appendChild(el('h3', '📁 Categories'));

  const catList = el('.category-list');
  effect(() => {
    catList.innerHTML = '';
    const currentCat = category.get();

    for (const cat of CATEGORIES) {
      const item = el(`.category-item${currentCat === cat.id ? '.active' : ''}`);
      item.innerHTML = `${cat.icon} ${cat.name}`;
      item.addEventListener('click', () => category.set(cat.id));
      catList.appendChild(item);
    }
  });

  catSection.appendChild(catList);
  sidebar.appendChild(catSection);

  // Sort
  const sortSection = el('.sidebar-section');
  sortSection.appendChild(el('h3', '📊 Sort By'));

  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Rating' },
  ];

  const sortSelect = el('select.sort-select');
  for (const opt of sortOptions) {
    const option = el('option', opt.label);
    option.value = opt.value;
    sortSelect.appendChild(option);
  }
  sortSelect.addEventListener('change', (e) => sortBy.set(e.target.value));
  sortSection.appendChild(sortSelect);
  sidebar.appendChild(sortSection);

  return sidebar;
}

function ProductCard(product) {
  const card = el('.product-card');
  card.addEventListener('click', () => selectedProduct.set(product));

  // Image
  card.appendChild(el('.product-image', product.image));

  // Info
  const info = el('.product-info');
  info.appendChild(el('.product-name', product.name));
  info.appendChild(el('.product-price', `$${product.price.toFixed(2)}`));

  // Rating
  const rating = el('.product-rating');
  const stars = '★'.repeat(Math.floor(product.rating)) + '☆'.repeat(5 - Math.floor(product.rating));
  rating.appendChild(el('span.stars', stars));
  rating.appendChild(el('span.rating-value', product.rating.toFixed(1)));
  info.appendChild(rating);

  // Stock
  const stockClass = product.stock < 10 ? '.low-stock' : '';
  info.appendChild(el(`.product-stock${stockClass}`, `${product.stock} in stock`));

  card.appendChild(info);

  // Add to cart button
  const addBtn = el('button.add-to-cart-btn', '🛒 Add to Cart');
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    addToCart(product);
  });
  card.appendChild(addBtn);

  return card;
}

function ProductGrid() {
  const container = el('.product-grid-container');

  // Results count
  const resultsInfo = el('.results-info');
  container.appendChild(resultsInfo);

  // Grid
  const grid = el('.product-grid');

  effect(() => {
    const filtered = getFilteredProducts();
    const query = searchQuery.get();
    const cat = category.get();

    // Update results info
    let infoText = `${filtered.length} product${filtered.length !== 1 ? 's' : ''}`;
    if (query) infoText += ` matching "${query}"`;
    if (cat !== 'all') infoText += ` in ${CATEGORIES.find(c => c.id === cat)?.name}`;
    resultsInfo.textContent = infoText;

    // Update grid
    grid.innerHTML = '';

    if (filtered.length === 0) {
      const empty = el('.empty-results');
      empty.innerHTML = `
        <span class="empty-icon">🔍</span>
        <span class="empty-text">No products found</span>
        <span class="empty-hint">Try a different search or category</span>
      `;
      grid.appendChild(empty);
    } else {
      for (const product of filtered) {
        grid.appendChild(ProductCard(product));
      }
    }
  });

  container.appendChild(grid);
  return container;
}

function ProductModal() {
  const overlay = el('.modal-overlay');

  effect(() => {
    const product = selectedProduct.get();
    overlay.innerHTML = '';
    overlay.style.display = product ? 'flex' : 'none';

    if (!product) return;

    const modal = el('.modal.product-modal');

    // Close button
    const closeBtn = el('button.modal-close', '×');
    closeBtn.addEventListener('click', () => selectedProduct.set(null));
    modal.appendChild(closeBtn);

    // Content
    const content = el('.modal-content');

    // Image
    content.appendChild(el('.modal-image', product.image));

    // Details
    const details = el('.modal-details');
    details.appendChild(el('h2.modal-title', product.name));
    details.appendChild(el('.modal-price', `$${product.price.toFixed(2)}`));

    // Rating
    const rating = el('.modal-rating');
    const stars = '★'.repeat(Math.floor(product.rating)) + '☆'.repeat(5 - Math.floor(product.rating));
    rating.innerHTML = `${stars} <span>${product.rating.toFixed(1)}</span> rating`;
    details.appendChild(rating);

    details.appendChild(el('.modal-description', product.description));

    // Stock
    const stockClass = product.stock < 10 ? '.low-stock' : '';
    details.appendChild(el(`.modal-stock${stockClass}`, `📦 ${product.stock} items in stock`));

    // Add to cart
    const addBtn = el('button.modal-add-btn', '🛒 Add to Cart');
    addBtn.addEventListener('click', () => {
      addToCart(product);
      selectedProduct.set(null);
    });
    details.appendChild(addBtn);

    content.appendChild(details);
    modal.appendChild(content);
    overlay.appendChild(modal);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) selectedProduct.set(null);
  });

  return overlay;
}

function CartSidebar() {
  const overlay = el('.cart-overlay');

  effect(() => {
    const show = showCart.get();
    overlay.style.display = show ? 'block' : 'none';
    overlay.innerHTML = '';

    if (!show) return;

    // Backdrop
    const backdrop = el('.cart-backdrop');
    backdrop.addEventListener('click', () => showCart.set(false));
    overlay.appendChild(backdrop);

    // Sidebar
    const sidebar = el('.cart-sidebar');

    // Header
    const header = el('.cart-header');
    header.appendChild(el('h2', '🛒 Your Cart'));
    const closeBtn = el('button.cart-close', '×');
    closeBtn.addEventListener('click', () => showCart.set(false));
    header.appendChild(closeBtn);
    sidebar.appendChild(header);

    // Items
    const items = cart.get();
    const itemsContainer = el('.cart-items');

    if (items.length === 0) {
      const empty = el('.cart-empty');
      empty.innerHTML = `
        <span class="empty-icon">🛒</span>
        <span>Your cart is empty</span>
        <span class="empty-hint">Add some products!</span>
      `;
      itemsContainer.appendChild(empty);
    } else {
      for (const item of items) {
        const itemEl = el('.cart-item');

        itemEl.appendChild(el('.cart-item-image', item.image));

        const info = el('.cart-item-info');
        info.appendChild(el('.cart-item-name', item.name));
        info.appendChild(el('.cart-item-price', `$${(item.price * item.quantity).toFixed(2)}`));

        // Quantity controls
        const qty = el('.cart-item-qty');
        const minusBtn = el('button.qty-btn', '-');
        minusBtn.addEventListener('click', () => updateQuantity(item.id, -1));
        const qtyNum = el('span.qty-num', item.quantity.toString());
        const plusBtn = el('button.qty-btn', '+');
        plusBtn.addEventListener('click', () => updateQuantity(item.id, 1));
        qty.appendChild(minusBtn);
        qty.appendChild(qtyNum);
        qty.appendChild(plusBtn);
        info.appendChild(qty);

        itemEl.appendChild(info);

        // Remove button
        const removeBtn = el('button.cart-item-remove', '🗑️');
        removeBtn.addEventListener('click', () => removeFromCart(item.id));
        itemEl.appendChild(removeBtn);

        itemsContainer.appendChild(itemEl);
      }
    }

    sidebar.appendChild(itemsContainer);

    // Footer
    if (items.length > 0) {
      const footer = el('.cart-footer');

      const total = el('.cart-total');
      total.innerHTML = `<span>Total:</span> <strong>$${getCartTotal().toFixed(2)}</strong>`;
      footer.appendChild(total);

      const checkoutBtn = el('button.checkout-btn', '💳 Checkout');
      checkoutBtn.addEventListener('click', checkout);
      footer.appendChild(checkoutBtn);

      const clearBtn = el('button.clear-cart-btn', '🗑️ Clear Cart');
      clearBtn.addEventListener('click', () => {
        clearCart();
        showCart.set(false);
      });
      footer.appendChild(clearBtn);

      sidebar.appendChild(footer);
    }

    overlay.appendChild(sidebar);
  });

  return overlay;
}

function CheckoutModal() {
  const overlay = el('.modal-overlay.checkout-overlay');

  effect(() => {
    const show = showCheckout.get();
    overlay.style.display = show ? 'flex' : 'none';
    overlay.innerHTML = '';

    if (!show) return;

    const modal = el('.modal.checkout-modal');

    // Close button
    const closeBtn = el('button.modal-close', '×');
    closeBtn.addEventListener('click', () => showCheckout.set(false));
    modal.appendChild(closeBtn);

    modal.appendChild(el('h2.checkout-title', '💳 Checkout'));

    // Order summary
    const summary = el('.checkout-summary');
    summary.appendChild(el('h3', 'Order Summary'));

    const items = cart.get();
    for (const item of items) {
      const row = el('.checkout-item');
      row.innerHTML = `
        <span>${item.image} ${item.name} x${item.quantity}</span>
        <span>$${(item.price * item.quantity).toFixed(2)}</span>
      `;
      summary.appendChild(row);
    }

    const totalRow = el('.checkout-total');
    totalRow.innerHTML = `<strong>Total</strong> <strong>$${getCartTotal().toFixed(2)}</strong>`;
    summary.appendChild(totalRow);

    modal.appendChild(summary);

    // Form (simplified demo)
    const form = el('.checkout-form');

    form.appendChild(el('h3', 'Shipping Information'));

    const nameInput = el('input.checkout-input[type=text][placeholder="Full Name"]');
    form.appendChild(nameInput);

    const emailInput = el('input.checkout-input[type=email][placeholder="Email Address"]');
    form.appendChild(emailInput);

    const addressInput = el('input.checkout-input[type=text][placeholder="Shipping Address"]');
    form.appendChild(addressInput);

    form.appendChild(el('h3', 'Payment'));

    const cardInput = el('input.checkout-input[type=text][placeholder="Card Number (demo)"]');
    form.appendChild(cardInput);

    const row = el('.checkout-row');
    row.appendChild(el('input.checkout-input[type=text][placeholder="MM/YY"]'));
    row.appendChild(el('input.checkout-input[type=text][placeholder="CVC"]'));
    form.appendChild(row);

    const placeOrderBtn = el('button.place-order-btn', '🎉 Place Order');
    placeOrderBtn.addEventListener('click', completeOrder);
    form.appendChild(placeOrderBtn);

    modal.appendChild(form);
    overlay.appendChild(modal);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) showCheckout.set(false);
  });

  return overlay;
}

function App() {
  const app = el('.shop-app');

  app.appendChild(Header());

  const main = el('.main-content');
  main.appendChild(Sidebar());
  main.appendChild(ProductGrid());
  app.appendChild(main);

  app.appendChild(ProductModal());
  app.appendChild(CartSidebar());
  app.appendChild(CheckoutModal());
  app.appendChild(Notification());

  app.appendChild(el('footer.shop-footer', 'Built with Pulse Framework'));

  return app;
}

// =============================================================================
// Styles
// =============================================================================

const styles = `
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text: #1e293b;
  --text-light: #64748b;
  --border: #e2e8f0;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --radius: 12px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

.shop-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: var(--card-bg);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
  box-shadow: var(--shadow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.5em;
  font-weight: 700;
  color: var(--primary);
}

.logo-icon {
  font-size: 1.2em;
}

.search-container {
  flex: 1;
  max-width: 500px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  font-size: 1em;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
}

.cart-btn {
  position: relative;
  padding: 12px 20px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 1em;
  cursor: pointer;
  transition: background 0.2s;
}

.cart-btn:hover {
  background: var(--primary-dark);
}

.cart-count {
  background: var(--danger);
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 0.85em;
  margin-left: 8px;
}

/* Main Content */
.main-content {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 24px;
  padding: 24px;
  flex: 1;
}

@media (max-width: 900px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  .sidebar {
    order: 2;
  }
}

/* Sidebar */
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-section {
  background: var(--card-bg);
  padding: 20px;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.sidebar-section h3 {
  margin-bottom: 16px;
  font-size: 1em;
  color: var(--text-light);
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-item:hover {
  background: var(--bg);
}

.category-item.active {
  background: var(--primary);
  color: white;
}

.sort-select {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 1em;
  cursor: pointer;
}

/* Product Grid */
.product-grid-container {
  flex: 1;
}

.results-info {
  margin-bottom: 16px;
  color: var(--text-light);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}

.empty-results {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64px 24px;
  color: var(--text-light);
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 1.2em;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 0.9em;
  opacity: 0.7;
}

/* Product Card */
.product-card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.product-image {
  font-size: 4em;
  text-align: center;
  padding: 24px;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 16px;
}

.product-info {
  flex: 1;
}

.product-name {
  font-weight: 600;
  margin-bottom: 8px;
}

.product-price {
  font-size: 1.3em;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 8px;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.stars {
  color: var(--warning);
}

.rating-value {
  font-size: 0.9em;
  color: var(--text-light);
}

.product-stock {
  font-size: 0.85em;
  color: var(--success);
  margin-bottom: 16px;
}

.product-stock.low-stock {
  color: var(--warning);
}

.add-to-cart-btn {
  width: 100%;
  padding: 12px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  cursor: pointer;
  transition: background 0.2s;
}

.add-to-cart-btn:hover {
  background: var(--primary-dark);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 200;
  padding: 24px;
}

.modal {
  background: var(--card-bg);
  border-radius: var(--radius);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg);
  border-radius: 50%;
  font-size: 1.5em;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-close:hover {
  background: var(--border);
}

/* Product Modal */
.product-modal .modal-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 32px;
}

@media (max-width: 600px) {
  .product-modal .modal-content {
    grid-template-columns: 1fr;
  }
}

.modal-image {
  font-size: 8em;
  text-align: center;
  padding: 48px;
  background: var(--bg);
  border-radius: var(--radius);
}

.modal-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-title {
  font-size: 1.5em;
}

.modal-price {
  font-size: 2em;
  font-weight: 700;
  color: var(--primary);
}

.modal-rating {
  color: var(--warning);
}

.modal-rating span {
  color: var(--text-light);
  margin-left: 8px;
}

.modal-description {
  color: var(--text-light);
  line-height: 1.6;
}

.modal-stock {
  color: var(--success);
}

.modal-stock.low-stock {
  color: var(--warning);
}

.modal-add-btn {
  padding: 16px 32px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 1.1em;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: auto;
}

.modal-add-btn:hover {
  background: var(--primary-dark);
}

/* Cart Sidebar */
.cart-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: none;
}

.cart-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
}

.cart-sidebar {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 400px;
  max-width: 100%;
  background: var(--card-bg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border);
}

.cart-header h2 {
  font-size: 1.3em;
}

.cart-close {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg);
  border-radius: 50%;
  font-size: 1.5em;
  cursor: pointer;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-light);
  text-align: center;
  gap: 8px;
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg);
  border-radius: var(--radius);
  margin-bottom: 12px;
}

.cart-item-image {
  font-size: 2.5em;
}

.cart-item-info {
  flex: 1;
}

.cart-item-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.cart-item-price {
  color: var(--primary);
  font-weight: 600;
  margin-bottom: 8px;
}

.cart-item-qty {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
}

.qty-btn:hover {
  background: var(--border);
}

.qty-num {
  width: 24px;
  text-align: center;
}

.cart-item-remove {
  background: none;
  border: none;
  font-size: 1.2em;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.cart-item-remove:hover {
  opacity: 1;
}

.cart-footer {
  padding: 20px 24px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cart-total {
  display: flex;
  justify-content: space-between;
  font-size: 1.2em;
}

.checkout-btn {
  padding: 16px;
  background: var(--success);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 1.1em;
  cursor: pointer;
  transition: background 0.2s;
}

.checkout-btn:hover {
  background: #059669;
}

.clear-cart-btn {
  padding: 12px;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s;
}

.clear-cart-btn:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* Checkout Modal */
.checkout-modal {
  max-width: 500px;
  padding: 32px;
}

.checkout-title {
  text-align: center;
  margin-bottom: 24px;
}

.checkout-summary {
  background: var(--bg);
  padding: 20px;
  border-radius: var(--radius);
  margin-bottom: 24px;
}

.checkout-summary h3 {
  margin-bottom: 16px;
}

.checkout-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.checkout-total {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  font-size: 1.1em;
}

.checkout-form h3 {
  margin: 16px 0 12px;
  font-size: 1em;
  color: var(--text-light);
}

.checkout-input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--border);
  border-radius: 8px;
  font-size: 1em;
  margin-bottom: 12px;
}

.checkout-input:focus {
  outline: none;
  border-color: var(--primary);
}

.checkout-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.place-order-btn {
  width: 100%;
  padding: 16px;
  background: var(--success);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-size: 1.1em;
  cursor: pointer;
  margin-top: 16px;
  transition: background 0.2s;
}

.place-order-btn:hover {
  background: #059669;
}

/* Notification */
.notification-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 400;
}

.notification {
  padding: 16px 24px;
  border-radius: var(--radius);
  color: white;
  font-weight: 500;
  animation: slideUp 0.3s ease;
  box-shadow: var(--shadow-lg);
}

.notification.success {
  background: var(--success);
}

.notification.error {
  background: var(--danger);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Footer */
.shop-footer {
  text-align: center;
  padding: 24px;
  color: var(--text-light);
  background: var(--card-bg);
  border-top: 1px solid var(--border);
}
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// =============================================================================
// Mount
// =============================================================================

mount('#app', App());

console.log('🛒 Pulse E-Commerce App loaded!');
