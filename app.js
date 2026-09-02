// ============================================================
// Unicraft Storefront — client-side logic (index.html)
// ============================================================
import { supabase } from './supabaseClient.js';

const CART_STORAGE_KEY = 'unicraft_cart';

const state = {
  products: [],
  category: 'All',
  search: '',
  cart: loadCart(),
};

// ---------- DOM refs ----------
const el = {
  grid: document.getElementById('product-grid'),
  resultsTitle: document.getElementById('results-title'),
  categoryList: document.getElementById('category-list'),
  searchInput: document.getElementById('search-input'),

  productModal: document.getElementById('product-modal'),
  productModalBody: document.getElementById('product-modal-body'),
  productModalClose: document.getElementById('product-modal-close'),

  cartToggle: document.getElementById('cart-toggle'),
  cartCount: document.getElementById('cart-count'),
  cartDrawer: document.getElementById('cart-drawer'),
  cartClose: document.getElementById('cart-close'),
  backdrop: document.getElementById('backdrop'),
  cartItems: document.getElementById('cart-items'),
  cartTotal: document.getElementById('cart-total'),
  checkoutBtn: document.getElementById('checkout-btn'),

  cartView: document.getElementById('cart-view'),
  checkoutView: document.getElementById('checkout-view'),
  checkoutForm: document.getElementById('checkout-form'),
  checkoutTotal: document.getElementById('checkout-total'),
  checkoutError: document.getElementById('checkout-error'),
  placeOrderBtn: document.getElementById('place-order-btn'),
  backToCartBtn: document.getElementById('back-to-cart'),
  checkoutSuccess: document.getElementById('checkout-success'),
  continueShoppingBtn: document.getElementById('continue-shopping-btn'),

  toast: document.getElementById('toast'),
};

// ---------- Init ----------
init();

async function init() {
  bindGlobalEvents();
  await loadProducts();
  renderCategories();
  renderProductGrid();
  renderCart();
}

async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, selling_price, category, image_url, in_stock')
    .eq('in_stock', true)
    .order('created_at', { ascending: false });

  if (error) {
    el.grid.innerHTML = `<div class="empty-state">Couldn't load products. Please refresh.</div>`;
    console.error(error);
    return;
  }
  state.products = data || [];
}

// ---------- Categories ----------
function renderCategories() {
  const categories = ['All', ...new Set(state.products.map((p) => p.category))];
  el.categoryList.innerHTML = categories
    .map(
      (cat) =>
        `<button class="chip ${cat === state.category ? 'active' : ''}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
    )
    .join('');

  el.categoryList.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      state.category = chip.dataset.category;
      renderCategories();
      renderProductGrid();
    });
  });
}

// ---------- Product grid ----------
function getFilteredProducts() {
  const term = state.search.trim().toLowerCase();
  return state.products.filter((p) => {
    const matchesCategory = state.category === 'All' || p.category === state.category;
    const matchesSearch = !term || p.name.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });
}

function renderProductGrid() {
  const filtered = getFilteredProducts();
  el.resultsTitle.textContent = state.category === 'All' ? 'All Products' : state.category;

  if (filtered.length === 0) {
    el.grid.innerHTML = `<div class="empty-state">No products found.</div>`;
    return;
  }

  el.grid.innerHTML = filtered.map(productCardHtml).join('');

  el.grid.querySelectorAll('[data-open-product]').forEach((node) => {
    node.addEventListener('click', () => openProductModal(node.dataset.openProduct));
  });
  el.grid.querySelectorAll('[data-quick-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.quickAdd, 1);
      showToast('Added to cart');
    });
  });
}

function productCardHtml(p) {
  const img = p.image_url || placeholderImage();
  return `
    <div class="product-card">
      <img class="product-card__image" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" data-open-product="${p.id}" />
      <div class="product-card__body">
        <span class="product-card__category">${escapeHtml(p.category)}</span>
        <h3 class="product-card__name" data-open-product="${p.id}">${escapeHtml(p.name)}</h3>
        <span class="product-card__price">${formatPrice(p.selling_price)}</span>
      </div>
      <div class="product-card__footer">
        <button class="btn btn-primary" data-quick-add="${p.id}">Add to Cart</button>
      </div>
    </div>
  `;
}

// ---------- Search ----------
let searchDebounce;
el.searchInput.addEventListener('input', (e) => {
  clearTimeout(searchDebounce);
  const value = e.target.value;
  searchDebounce = setTimeout(() => {
    state.search = value;
    renderProductGrid();
  }, 200);
});

// ---------- Product detail modal ----------
let modalQty = 1;

function openProductModal(productId) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;
  modalQty = 1;
  el.productModalBody.innerHTML = productDetailHtml(product);
  bindModalQtyControls();
  el.productModalBody.querySelector('[data-add-to-cart]').addEventListener('click', () => {
    addToCart(product.id, modalQty);
    showToast('Added to cart');
    closeProductModal();
  });
  el.productModal.classList.add('open');
}

function productDetailHtml(p) {
  const img = p.image_url || placeholderImage();
  return `
    <img class="product-detail__image" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" />
    <span class="product-detail__category">${escapeHtml(p.category)}</span>
    <h2>${escapeHtml(p.name)}</h2>
    <div class="product-detail__price">${formatPrice(p.selling_price)}</div>
    <p class="product-detail__description">${escapeHtml(p.description || '')}</p>
    <div class="qty-stepper">
      <button type="button" data-qty-decrease>−</button>
      <span data-qty-display>1</span>
      <button type="button" data-qty-increase>+</button>
    </div>
    <button class="btn btn-primary" data-add-to-cart>Add to Cart</button>
  `;
}

function bindModalQtyControls() {
  const display = el.productModalBody.querySelector('[data-qty-display]');
  el.productModalBody.querySelector('[data-qty-decrease]').addEventListener('click', () => {
    modalQty = Math.max(1, modalQty - 1);
    display.textContent = modalQty;
  });
  el.productModalBody.querySelector('[data-qty-increase]').addEventListener('click', () => {
    modalQty += 1;
    display.textContent = modalQty;
  });
}

function closeProductModal() {
  el.productModal.classList.remove('open');
}

el.productModalClose.addEventListener('click', closeProductModal);
el.productModal.addEventListener('click', (e) => {
  if (e.target === el.productModal) closeProductModal();
});

// ---------- Cart ----------
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state.cart));
}

function addToCart(productId, qty) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) return;

  const existing = state.cart.find((item) => item.product_id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({
      product_id: product.id,
      name: product.name,
      price: product.selling_price,
      image_url: product.image_url,
      qty,
    });
  }
  saveCart();
  renderCart();
}

function updateCartQty(productId, delta) {
  const item = state.cart.find((i) => i.product_id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter((i) => i.product_id !== productId);
  }
  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((i) => i.product_id !== productId);
  saveCart();
  renderCart();
}

function cartTotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function cartItemCount() {
  return state.cart.reduce((sum, item) => sum + item.qty, 0);
}

function renderCart() {
  el.cartCount.textContent = cartItemCount();
  el.checkoutBtn.disabled = state.cart.length === 0;

  if (state.cart.length === 0) {
    el.cartItems.innerHTML = `<div class="empty-state">Your cart is empty.</div>`;
  } else {
    el.cartItems.innerHTML = state.cart.map(cartItemHtml).join('');
    el.cartItems.querySelectorAll('[data-decrease]').forEach((btn) =>
      btn.addEventListener('click', () => updateCartQty(btn.dataset.decrease, -1))
    );
    el.cartItems.querySelectorAll('[data-increase]').forEach((btn) =>
      btn.addEventListener('click', () => updateCartQty(btn.dataset.increase, 1))
    );
    el.cartItems.querySelectorAll('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', () => removeFromCart(btn.dataset.remove))
    );
  }

  const total = formatPrice(cartTotal());
  el.cartTotal.textContent = total;
  el.checkoutTotal.textContent = total;
}

function cartItemHtml(item) {
  const img = item.image_url || placeholderImage();
  return `
    <div class="cart-item">
      <img class="cart-item__image" src="${escapeHtml(img)}" alt="${escapeHtml(item.name)}" />
      <div class="cart-item__info">
        <p class="cart-item__name">${escapeHtml(item.name)}</p>
        <span class="cart-item__price">${formatPrice(item.price)} × ${item.qty}</span>
        <div class="cart-item__controls">
          <button type="button" data-decrease="${item.product_id}">−</button>
          <span>${item.qty}</span>
          <button type="button" data-increase="${item.product_id}">+</button>
        </div>
        <button type="button" class="cart-item__remove" data-remove="${item.product_id}">Remove</button>
      </div>
    </div>
  `;
}

// ---------- Cart drawer open/close ----------
function openCart() {
  showCartView();
  el.cartDrawer.classList.add('open');
  el.backdrop.classList.add('open');
}

function closeCart() {
  el.cartDrawer.classList.remove('open');
  el.backdrop.classList.remove('open');
}

el.cartToggle.addEventListener('click', openCart);
el.cartClose.addEventListener('click', closeCart);
el.backdrop.addEventListener('click', closeCart);

// ---------- Checkout ----------
function showCartView() {
  el.cartView.hidden = false;
  el.checkoutView.hidden = true;
  document.getElementById('cart-drawer-title').textContent = 'Your Cart';
}

function showCheckoutFormView() {
  el.cartView.hidden = true;
  el.checkoutView.hidden = false;
  el.checkoutForm.hidden = false;
  el.checkoutSuccess.hidden = true;
  document.getElementById('cart-drawer-title').textContent = 'Checkout';
}

el.checkoutBtn.addEventListener('click', showCheckoutFormView);
el.backToCartBtn.addEventListener('click', showCartView);

el.checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  el.checkoutError.hidden = true;

  if (state.cart.length === 0) return;

  const formData = new FormData(el.checkoutForm);
  const order = {
    customer_name: formData.get('customer_name').toString().trim(),
    customer_phone: formData.get('customer_phone').toString().trim(),
    delivery_address: formData.get('delivery_address').toString().trim(),
    items: state.cart.map((i) => ({
      product_id: i.product_id,
      name: i.name,
      price: i.price,
      qty: i.qty,
    })),
    total_amount: cartTotal(),
    status: 'New',
  };

  el.placeOrderBtn.disabled = true;
  el.placeOrderBtn.textContent = 'Placing order…';

  const { error } = await supabase.from('orders').insert(order);

  el.placeOrderBtn.disabled = false;
  el.placeOrderBtn.textContent = 'Place Order';

  if (error) {
    el.checkoutError.textContent = "Couldn't place your order. Please try again.";
    el.checkoutError.hidden = false;
    console.error(error);
    return;
  }

  state.cart = [];
  saveCart();
  renderCart();
  el.checkoutForm.reset();
  el.checkoutForm.hidden = true;
  el.checkoutSuccess.hidden = false;
});

el.continueShoppingBtn.addEventListener('click', () => {
  closeCart();
  showCartView();
  el.checkoutForm.hidden = false;
  el.checkoutSuccess.hidden = true;
});

// ---------- Global events ----------
function bindGlobalEvents() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProductModal();
      closeCart();
    }
  });
}

// ---------- Helpers ----------
function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

function placeholderImage() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="100%" height="100%" fill="#e5e5e0"/></svg>`
  );
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

let toastTimeout;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.toast.classList.remove('show'), 2000);
}
