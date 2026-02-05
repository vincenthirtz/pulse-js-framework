import { pulse, computed, effect, batch, el, text, on, bind, list, when, mount, model } from 'pulse-js-framework/runtime';

// Component imports
import Header from './components/Header.js';
import Sidebar from './components/Sidebar.js';
import ProductCard from './components/ProductCard.js';
import ProductModal from './components/ProductModal.js';
import CartSidebar from './components/CartSidebar.js';
import CheckoutModal from './components/CheckoutModal.js';
import Notification from './components/Notification.js';

// State
const products = pulse([]);
const cart = pulse([]);
const category = pulse("all");
const searchQuery = pulse("");
const sortBy = pulse("name");
const selectedProduct = pulse(null);
const showCart = pulse(false);
const showCheckout = pulse(false);
const notification = pulse(null);

// Actions
function init() {
  products.set(getProductsData()); const savedCart = localStorage.getItem("pulse-cart") ; if(savedCart) {cart.set(JSON.parse(savedCart));}
}

function getProductsData() {
  return[{id : 1, name : "Wireless Headphones", price : 79.99, category : "electronics", image : "🎧", rating : 4.5, stock : 15, description : "Premium wireless headphones with noise cancellation and 30h battery life."}, {id : 2, name : "Smart Watch", price : 199.99, category : "electronics", image : "⌚", rating : 4.8, stock : 8, description : "Track your fitness, receive notifications, and stay connected on the go."}, {id : 3, name : "Laptop Stand", price : 49.99, category : "accessories", image : "💻", rating : 4.2, stock : 25, description : "Ergonomic aluminum laptop stand for better posture and cooling."}, {id : 4, name : "Mechanical Keyboard", price : 129.99, category : "electronics", image : "⌨️", rating : 4.7, stock : 12, description : "RGB mechanical keyboard with Cherry MX switches."}, {id : 5, name : "USB-C Hub", price : 39.99, category : "accessories", image : "🔌", rating : 4.3, stock : 30, description : "7-in-1 USB-C hub with HDMI, SD card, and USB 3.0 ports."}, {id : 6, name : "Wireless Mouse", price : 29.99, category : "accessories", image : "🖱️", rating : 4.1, stock : 45, description : "Ergonomic wireless mouse with precision tracking."}, {id : 7, name : "Monitor Light Bar", price : 59.99, category : "accessories", image : "💡", rating : 4.6, stock : 18, description : "LED light bar that reduces eye strain during work."}, {id : 8, name : "Webcam HD", price : 89.99, category : "electronics", image : "📷", rating : 4.4, stock : 20, description : "1080p webcam with auto-focus and built-in microphone."}, {id : 9, name : "Desk Pad", price : 24.99, category : "accessories", image : "📋", rating : 4, stock : 50, description : "Large leather desk pad for a clean workspace."}, {id : 10, name : "Phone Stand", price : 19.99, category : "accessories", image : "📱", rating : 4.2, stock : 60, description : "Adjustable aluminum phone stand for desk."}, {id : 11, name : "Bluetooth Speaker", price : 69.99, category : "electronics", image : "🔊", rating : 4.5, stock : 22, description : "Portable Bluetooth speaker with 360-degree sound."}, {id : 12, name : "Gaming Controller", price : 59.99, category : "electronics", image : "🎮", rating : 4.6, stock : 15, description : "Wireless gaming controller compatible with PC and console."}]
}

function getCategories() {
  return[{id : "all", name : "All Products", icon : "🏪"}, {id : "electronics", name : "Electronics", icon : "🔌"}, {id : "accessories", name : "Accessories", icon : "🎒"}]
}

function getFilteredProducts() {
  let items = products.get() ; const query = searchQuery.get().toLowerCase() ; if(category.get() !== "all") {items = items.filter(p => p.category === category.get())} ; if(query) {items = items.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))} ; switch(sortBy.get()) {case "price-asc" : items =[...items].sort((a, b) => a.price - b.price) ; break ; case "price-desc" : items =[...items].sort((a, b) => b.price - a.price) ; break ; case "rating" : items =[...items].sort((a, b) => b.rating - a.rating) ; break ; default : items =[...items].sort((a, b) => a.name.localeCompare(b.name))} ; return items
}

function getResultsInfo() {
  const filtered = getFilteredProducts() ; let info = filtered.length + " product" +(filtered.length !== 1 ? "s" : "") ; if(searchQuery.get()) info += " matching \"" + searchQuery.get() + "\"" ; if(category.get() !== "all") {const cat = getCategories().find(c => c.id === category.get()) ; if(cat) info += " in " + cat.name} ; return info
}

function getCartTotal() {
  return cart.get().reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function getCartCount() {
  return cart.get().reduce((sum, item) => sum + item.quantity, 0)
}

function saveCart() {
  localStorage.setItem("pulse-cart", JSON.stringify(cart.get()))
}

function showNotificationFn(message, type) {
  notification.set({message : message, type : type || "success"}); setTimeout(() => {notification.set(null);}, 3000)
}

function setSearchQuery(query) {
  searchQuery.set(query);
}

function setCategory(cat) {
  category.set(cat);
}

function setSortBy(sort) {
  sortBy.set(sort);
}

function selectProduct(product) {
  selectedProduct.set(product);
}

function closeProductModal() {
  selectedProduct.set(null);
}

function openCart() {
  showCart.set(true);
}

function closeCart() {
  showCart.set(false);
}

function closeCheckout() {
  showCheckout.set(false);
}

function addToCart(product) {
  const existing = cart.get().find(item => item.id === product.id) ; if(existing) {if(existing.quantity >= product.stock) {showNotificationFn("Maximum stock reached!", "error") ; return} ; cart.set(cart.get().map(item => item.id === product.id ? {...item, quantity : item.quantity + 1} : item));} else {cart.set([...cart.get(), {...product, quantity : 1}]);} ; saveCart() ; showNotificationFn(product.name + " added to cart!")
}

function removeFromCart(productId) {
  cart.set(cart.get().filter(item => item.id !== productId)); saveCart()
}

function updateQuantity(productId, delta) {
  const item = cart.get().find(i => i.id === productId) ; if(!item) return ; const newQty = item.quantity + delta ; if(newQty <= 0) {removeFromCart(productId) ; return} ; const product = products.get().find(p => p.id === productId) ; if(newQty > product.stock) {showNotificationFn("Maximum stock reached!", "error") ; return} ; cart.set(cart.get().map(i => i.id === productId ? {...i, quantity : newQty} : i)); saveCart()
}

function clearCart() {
  cart.set([]); saveCart()
}

function checkout() {
  showCheckout.set(true); showCart.set(false);
}

function completeOrder() {
  showNotificationFn("Order placed successfully! Thank you for shopping with us.") ; clearCart() ; showCheckout.set(false);
}


// View
function render({ props = {}, slots = {} } = {}) {
  return (
    el('.pr1hhf6.shop-app',
      Header.render({ props: { cartCount: getCartCount(), onSearch: setSearchQuery, onOpenCart: openCart } }),
      el('.pr1hhf6.main-content',
        Sidebar.render({ props: { categories: getCategories(), currentCategory: category.get(), currentSort: sortBy.get(), onCategoryChange: setCategory, onSortChange: setSortBy } }),
        el('.pr1hhf6.product-grid-container',
          el('.pr1hhf6.results-info',
            text(() => `${getResultsInfo()}`)),
          el('.pr1hhf6.product-grid',
            when(
              () => (getFilteredProducts()?.length === 0),
              () =>                 el('.pr1hhf6.empty-results',
                  el('span.pr1hhf6.empty-icon',
                    "🔍"),
                  el('span.pr1hhf6.empty-text',
                    "No products found"),
                  el('span.pr1hhf6.empty-hint',
                    "Try a different search or category"))
            ),
            list(
              () => getFilteredProducts(),
              (product, _index) => (
              ProductCard.render({ props: { product: product, onClick: selectProduct, onAddToCart: addToCart } })
              )
            )))),
      ProductModal.render({ props: { product: selectedProduct.get(), onClose: closeProductModal, onAddToCart: addToCart } }),
      CartSidebar.render({ props: { show: showCart.get(), items: cart.get(), total: getCartTotal(), onClose: closeCart, onUpdateQuantity: updateQuantity, onRemove: removeFromCart, onCheckout: checkout, onClear: clearCart } }),
      CheckoutModal.render({ props: { show: showCheckout.get(), items: cart.get(), total: getCartTotal(), onClose: closeCheckout, onPlaceOrder: completeOrder } }),
      Notification.render({ props: { notification: notification.get() } }),
      el('footer.pr1hhf6.shop-footer',
        "Built with Pulse Framework"))
  );
}

// Styles
const SCOPE_ID = 'pr1hhf6';
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
    --shadow: 0 4px 6px-1px rgba(0, 0, 0, 0.1), 0 2px 4px-2px rgba(0, 0, 0, 0.1);
    --shadow-lg: 0 10px 15px-3px rgba(0, 0, 0, 0.1), 0 4px 6px-4px rgba(0, 0, 0, 0.1);
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
  .shop-app.pr1hhf6 {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .main-content.pr1hhf6 {
    display: grid;
    grid-template-columns: 250px 1fr;
    gap: 24px;
    padding: 24px;
    flex: 1;
  }
  @media (max-width:900px) {
    .main-content.pr1hhf6 {
      grid-template-columns: 1fr;
    }
  }
  .product-grid-container.pr1hhf6 {
    flex: 1;
  }
  .results-info.pr1hhf6 {
    margin-bottom: 16px;
    color: var(--text-light);
  }
  .product-grid.pr1hhf6 {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 24px;
  }
  .empty-results.pr1hhf6 {
    grid-column: 1 /-1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 64px 24px;
    color: var(--text-light);
  }
  .empty-icon.pr1hhf6 {
    font-size: 4em;
    margin-bottom: 16px;
  }
  .empty-text.pr1hhf6 {
    font-size: 1.2em;
    margin-bottom: 8px;
  }
  .empty-hint.pr1hhf6 {
    font-size: 0.9em;
    opacity: 0.7;
  }
  .shop-footer.pr1hhf6 {
    text-align: center;
    padding: 24px;
    color: var(--text-light);
    background: var(--card-bg);
    border-top: 1px solid var(--border);
  }
`;

// Inject styles
const styleEl = document.createElement("style");
styleEl.setAttribute('data-p-scope', SCOPE_ID);
styleEl.textContent = styles;
document.head.appendChild(styleEl);

// Export
export const App = {
  render,
  mount: (target) => {
    const container = typeof target === "string" ? document.querySelector(target) : target;
    let currentEl = null;
    effect(() => {
      // Save focus state before re-render
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
      const focusInfo = isInput ? {
        tag: activeEl.tagName.toLowerCase(),
        type: activeEl.type || "",
        placeholder: activeEl.placeholder || "",
        ariaLabel: activeEl.getAttribute("aria-label") || "",
        start: activeEl.selectionStart,
        end: activeEl.selectionEnd
      } : null;
      const newEl = render();
      if (currentEl) {
        container.replaceChild(newEl, currentEl);
      } else {
        container.appendChild(newEl);
      }
      currentEl = newEl;
      // Restore focus after re-render
      if (focusInfo) {
        let selector = focusInfo.tag;
        if (focusInfo.ariaLabel) selector += `[aria-label="${focusInfo.ariaLabel}"]`;
        else if (focusInfo.placeholder) selector += `[placeholder="${focusInfo.placeholder}"]`;
        const newActive = newEl.querySelector(selector);
        if (newActive) {
          newActive.focus();
          if (typeof focusInfo.start === "number") {
            try { newActive.setSelectionRange(focusInfo.start, focusInfo.end); } catch(e) {}
          }
        }
      }
    });
    init();
    return { unmount: () => currentEl?.remove() };
  }
};

export default App;