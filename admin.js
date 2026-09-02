// ============================================================
// Unicraft Admin — dashboard logic (admin.html)
// ============================================================
import { supabase, PRODUCT_IMAGE_BUCKET, ORDER_STATUSES } from './supabaseClient.js';

const state = {
  products: [],
  orders: [],
  editingProductId: null,
  selectedImageFile: null,
};

// ---------- DOM refs ----------
const el = {
  loginScreen: document.getElementById('login-screen'),
  loginForm: document.getElementById('login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginError: document.getElementById('login-error'),
  loginBtn: document.getElementById('login-btn'),

  adminApp: document.getElementById('admin-app'),
  logoutBtn: document.getElementById('logout-btn'),
  tabs: document.querySelectorAll('.admin-tab'),
  panelProducts: document.getElementById('panel-products'),
  panelOrders: document.getElementById('panel-orders'),

  productsTableBody: document.getElementById('products-table-body'),
  addProductBtn: document.getElementById('add-product-btn'),

  ordersTableBody: document.getElementById('orders-table-body'),
  refreshOrdersBtn: document.getElementById('refresh-orders-btn'),

  productFormModal: document.getElementById('product-form-modal'),
  productFormTitle: document.getElementById('product-form-title'),
  productFormClose: document.getElementById('product-form-close'),
  productForm: document.getElementById('product-form'),
  productId: document.getElementById('product-id'),
  productName: document.getElementById('product-name'),
  productDescription: document.getElementById('product-description'),
  productBaseCost: document.getElementById('product-base-cost'),
  productSellingPrice: document.getElementById('product-selling-price'),
  productCategory: document.getElementById('product-category'),
  productImage: document.getElementById('product-image'),
  productImagePreview: document.getElementById('product-image-preview'),
  productInStock: document.getElementById('product-in-stock'),
  productFormError: document.getElementById('product-form-error'),
  productSaveBtn: document.getElementById('product-save-btn'),

  toast: document.getElementById('toast'),
};

init();

async function init() {
  bindAuthEvents();
  bindTabEvents();
  bindProductFormEvents();
  bindOrderEvents();

  const { data } = await supabase.auth.getSession();
  console.log('[debug] initial getSession ->', data.session ? 'has session' : 'no session');
  if (data.session) {
    showDashboard();
  } else {
    showLogin();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    console.log('[debug] onAuthStateChange event =', event, 'session =', session ? 'present' : 'null');
    if (session) {
      showDashboard();
    } else {
      showLogin();
    }
  });
}

// ---------- Auth ----------
function bindAuthEvents() {
  el.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    el.loginError.hidden = true;
    el.loginBtn.disabled = true;
    el.loginBtn.textContent = 'Signing in…';

    const { data, error } = await supabase.auth.signInWithPassword({
      email: el.loginEmail.value.trim(),
      password: el.loginPassword.value,
    });
    console.log('[debug] signInWithPassword result -> error:', error, 'session:', data?.session ? 'present' : 'null');

    el.loginBtn.disabled = false;
    el.loginBtn.textContent = 'Sign In';

    if (error) {
      el.loginError.textContent = 'Invalid email or password.';
      el.loginError.hidden = false;
      return;
    }
    el.loginForm.reset();
  });

  el.logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
  });
}

function showLogin() {
  el.loginScreen.hidden = false;
  el.adminApp.hidden = true;
}

function showDashboard() {
  el.loginScreen.hidden = true;
  el.adminApp.hidden = false;
  loadProducts();
  loadOrders();
}

// ---------- Tabs ----------
function bindTabEvents() {
  el.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      el.tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      el.panelProducts.hidden = target !== 'products';
      el.panelOrders.hidden = target !== 'orders';
    });
  });
}

// ============================================================
// PRODUCTS
// ============================================================
async function loadProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    el.productsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Couldn't load products.</td></tr>`;
    console.error(error);
    return;
  }
  state.products = data || [];
  renderProductsTable();
}

function renderProductsTable() {
  if (state.products.length === 0) {
    el.productsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No products yet. Click "Add Product" to create one.</td></tr>`;
    return;
  }

  el.productsTableBody.innerHTML = state.products.map(productRowHtml).join('');

  el.productsTableBody.querySelectorAll('[data-edit]').forEach((btn) =>
    btn.addEventListener('click', () => openProductForm(btn.dataset.edit))
  );
  el.productsTableBody.querySelectorAll('[data-delete]').forEach((btn) =>
    btn.addEventListener('click', () => deleteProduct(btn.dataset.delete))
  );
}

function productRowHtml(p) {
  const img = p.image_url || placeholderImage();
  return `
    <tr>
      <td><img class="admin-table__thumb" src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" /></td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${formatPrice(p.base_cost)}</td>
      <td>${formatPrice(p.selling_price)}</td>
      <td>${p.in_stock ? 'Yes' : 'No'}</td>
      <td>
        <div class="row-actions">
          <button type="button" data-edit="${p.id}">Edit</button>
          <button type="button" class="delete-action" data-delete="${p.id}">Delete</button>
        </div>
      </td>
    </tr>
  `;
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) {
    showToast("Couldn't delete product.");
    console.error(error);
    return;
  }
  showToast('Product deleted');
  loadProducts();
}

// ---------- Product form modal ----------
function bindProductFormEvents() {
  el.addProductBtn.addEventListener('click', () => openProductForm(null));
  el.productFormClose.addEventListener('click', closeProductForm);
  el.productFormModal.addEventListener('click', (e) => {
    if (e.target === el.productFormModal) closeProductForm();
  });

  el.productImage.addEventListener('change', () => {
    const file = el.productImage.files[0];
    state.selectedImageFile = file || null;
    if (file) {
      el.productImagePreview.src = URL.createObjectURL(file);
      el.productImagePreview.hidden = false;
    }
  });

  el.productForm.addEventListener('submit', saveProduct);
}

function openProductForm(productId) {
  state.editingProductId = productId;
  state.selectedImageFile = null;
  el.productForm.reset();
  el.productFormError.hidden = true;
  el.productImagePreview.hidden = true;

  if (productId) {
    const p = state.products.find((prod) => prod.id === productId);
    if (!p) return;
    el.productFormTitle.textContent = 'Edit Product';
    el.productId.value = p.id;
    el.productName.value = p.name;
    el.productDescription.value = p.description || '';
    el.productBaseCost.value = p.base_cost;
    el.productSellingPrice.value = p.selling_price;
    el.productCategory.value = p.category;
    el.productInStock.checked = p.in_stock;
    if (p.image_url) {
      el.productImagePreview.src = p.image_url;
      el.productImagePreview.hidden = false;
    }
  } else {
    el.productFormTitle.textContent = 'Add Product';
    el.productId.value = '';
    el.productInStock.checked = true;
  }

  el.productFormModal.classList.add('open');
}

function closeProductForm() {
  el.productFormModal.classList.remove('open');
}

async function saveProduct(e) {
  e.preventDefault();
  el.productFormError.hidden = true;
  el.productSaveBtn.disabled = true;
  el.productSaveBtn.textContent = 'Saving…';

  try {
    let imageUrl = null;
    const existing = state.editingProductId
      ? state.products.find((p) => p.id === state.editingProductId)
      : null;
    if (existing) imageUrl = existing.image_url;

    if (state.selectedImageFile) {
      const uploadedUrl = await uploadProductImage(state.selectedImageFile);
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const payload = {
      name: el.productName.value.trim(),
      description: el.productDescription.value.trim(),
      base_cost: parseFloat(el.productBaseCost.value),
      selling_price: parseFloat(el.productSellingPrice.value),
      category: el.productCategory.value.trim(),
      in_stock: el.productInStock.checked,
      image_url: imageUrl,
    };

    let error;
    if (state.editingProductId) {
      ({ error } = await supabase.from('products').update(payload).eq('id', state.editingProductId));
    } else {
      ({ error } = await supabase.from('products').insert(payload));
    }

    if (error) throw error;

    showToast(state.editingProductId ? 'Product updated' : 'Product added');
    closeProductForm();
    await loadProducts();
  } catch (error) {
    el.productFormError.textContent = error.message || "Couldn't save product.";
    el.productFormError.hidden = false;
    console.error(error);
  } finally {
    el.productSaveBtn.disabled = false;
    el.productSaveBtn.textContent = 'Save Product';
  }
}

async function uploadProductImage(file) {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ============================================================
// ORDERS
// ============================================================
function bindOrderEvents() {
  el.refreshOrdersBtn.addEventListener('click', loadOrders);
}

async function loadOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    el.ordersTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Couldn't load orders.</td></tr>`;
    console.error(error);
    return;
  }
  state.orders = data || [];
  renderOrdersTable();
}

function renderOrdersTable() {
  if (state.orders.length === 0) {
    el.ordersTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">No orders yet.</td></tr>`;
    return;
  }

  el.ordersTableBody.innerHTML = state.orders.map(orderRowHtml).join('');

  el.ordersTableBody.querySelectorAll('[data-status-select]').forEach((select) => {
    select.addEventListener('change', () => updateOrderStatus(select.dataset.statusSelect, select.value));
  });
}

function orderRowHtml(o) {
  const date = new Date(o.created_at).toLocaleString();
  const items = Array.isArray(o.items) ? o.items : [];
  const itemsList = items.map((i) => `<li>${escapeHtml(i.name)} × ${i.qty}</li>`).join('');

  return `
    <tr>
      <td>${escapeHtml(date)}</td>
      <td>${escapeHtml(o.customer_name)}</td>
      <td>${escapeHtml(o.customer_phone)}</td>
      <td>${escapeHtml(o.delivery_address)}</td>
      <td><ul class="order-items-list">${itemsList}</ul></td>
      <td>${formatPrice(o.total_amount)}</td>
      <td>
        <select class="status-select" data-status-select="${o.id}">
          ${ORDER_STATUSES.map(
            (s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
    </tr>
  `;
}

async function updateOrderStatus(orderId, status) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
  if (error) {
    showToast("Couldn't update order status.");
    console.error(error);
    return;
  }
  showToast('Order status updated');
  const order = state.orders.find((o) => o.id === orderId);
  if (order) order.status = status;
}

// ---------- Helpers ----------
function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

function placeholderImage() {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="#e5e5e0"/></svg>`
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
