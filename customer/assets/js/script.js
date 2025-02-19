/* -------------------------------------------------------------------------
   script.js - versi terpadu dengan Backend Golang
   --------------------------------------------------------------------------
   Deskripsi:
   - Menghapus data statis menuData dan fetch data dari endpoint Golang.
   - Menjaga desain, animasi, dan flow keranjang (cart).
   - Memanggil endpoint categories, menus, orders, payments, dsb.
   - Contoh return json dari endpoint menu : ID, Name, Price, ImageUrl, dll
   -------------------------------------------------------------------------- */

// --------------------------------------------------------------------------
// Konfigurasi Endpoint Backend
// --------------------------------------------------------------------------
const BASE_URL = "http://localhost:8080"; 
// Ganti dengan URL/port sesuai server Golang Anda, misal: "https://api.restaurant.com"

// --------------------------------------------------------------------------
// Variabel Global
// --------------------------------------------------------------------------
let cart = [];
let total = 0;
let orderCounter = 1; // Simbolis, untuk menampilkan nomor order di UI
// Nomor meja (table_id) didapat dari URL param, default #08
const urlParams = new URLSearchParams(window.location.search);
const tableId = urlParams.get('table_id') || 0; // ubah sesuai kebutuhan

// --------------------------------------------------------------------------
// Fetching Data - REST API
// --------------------------------------------------------------------------

// Ambil daftar kategori dari backend: GET /categories
async function fetchCategories() {
  try {
    const response = await fetch('http://localhost:8080/categories');
    if (!response.ok) throw new Error('Network response was not ok');
    const data = await response.json();
    return data.data; // return the categories array
  } catch (error) {
    console.error('Fetch categories failed:', error);
    return [];
  }
}

// Ambil daftar menu berdasar kategori: GET /menus?category=name
async function fetchMenusByCategory(categoryName) {
  try {
    // Ubah parameter dari 'by-category' menjadi 'category'
    const res = await fetch(`${BASE_URL}/menus/by-category?category=${encodeURIComponent(categoryName)}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    console.log('Fetched menus for', categoryName, ':', data.data);
    return data.data; // Pastikan respons backend memiliki properti 'data'
  } catch (err) {
    console.error("fetchMenusByCategory error:", err);
    return [];
  }
}


// Membuat order: POST /orders
// Payload: {table_id, items:[{menu_id, quantity, notes}]}
async function createOrderInBackend(orderData) {
  try {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    const data = await res.json();
    return data; 
  } catch (err) {
    console.error("createOrderInBackend error:", err);
    return null;
  }
}

// Membuat payment: POST /payments
// Payload: {order_id, payment_method, amount}
async function createPaymentInBackend(paymentData) {
  try {
    const res = await fetch(`${BASE_URL}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paymentData),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("createPaymentInBackend error:", err);
    return null;
  }
}

// --------------------------------------------------------------------------
// Tampilkan Kategori di Halaman
// --------------------------------------------------------------------------
async function showCategories() {
  const categoriesGrid = document.querySelector(".categories-grid");
  if (!categoriesGrid) return;

  categoriesGrid.innerHTML = "";
  const categories = await fetchCategories(); 

  if (!Array.isArray(categories) || categories.length === 0) {
    console.warn("No categories data from server.");
    return;
  }

  categories.forEach((cat, idx) => {
    console.log(cat)
    const catDiv = document.createElement("div");
    catDiv.classList.add("category-item");
    if (idx === 0) catDiv.classList.add("active"); // default active category

    let iconClass = "fas fa-utensils"; // default icon
    if (cat.Name.toLowerCase().includes("minuman")) iconClass = "fas fa-coffee";
    if (cat.Name.toLowerCase().includes("snack")) iconClass = "fas fa-cookie";

    catDiv.setAttribute("data-category", cat.Name.toLowerCase()); 
    catDiv.innerHTML = `
      <i class="${iconClass}"></i>
      <p>${cat.Name}</p>
    `;

    catDiv.addEventListener("click", () => {
      // Toggle active
      document.querySelectorAll(".category-item").forEach(ci => ci.classList.remove("active"));
      catDiv.classList.add("active");
      // Show menu only for this category
      showMenu(cat.Name.toLowerCase());
    });

    categoriesGrid.appendChild(catDiv);
  });

  // Tampilkan menu dari kategori pertama
  showMenu(categories[0].Name.toLowerCase());
}


// --------------------------------------------------------------------------
// Tampilkan Daftar Menu Berdasarkan Kategori
// --------------------------------------------------------------------------
async function showMenu(categoryName) {
  console.log("Fetching menu for category:", categoryName);
  const menuGrid = document.querySelector(".menu-grid");
  if (!menuGrid) {
    console.error("Menu grid element not found!");
    return;
  }
  menuGrid.innerHTML = "";

  const menuList = await fetchMenusByCategory(categoryName);
  // Ex: menuList = [{id, name, price, image_url, description}, ...]

  if (!Array.isArray(menuList) || menuList.length === 0) {
    // Optionally show message
    menuGrid.innerHTML = "<p class='no-menu'>Menu tidak tersedia untuk kategori ini</p>";
    return;
  }

  menuList.forEach((item) => {
    const menuItem = document.createElement("div");
    menuItem.classList.add("menu-item");
    menuItem.innerHTML = `
      <img 
        src="${item.ImageUrl || ''}" 
        alt="${item.Name}" 
        onerror="this.src=''">
      <h4>${item.Name}</h4>
      <p>Rp ${item.Price.toLocaleString()}</p>
    `;
    menuItem.addEventListener("click", () => {
      openModal(item);
    });
    menuGrid.appendChild(menuItem);
  });
}

// --------------------------------------------------------------------------
// Modal (Open, Close) & Menambahkan Item
// --------------------------------------------------------------------------
function openModal(item) {
  const modal = document.getElementById("menuModal");
  if (!modal) return;

  modal.style.display = "flex";

  const menuTitle = modal.querySelector(".menu-title");
  const priceElement = modal.querySelector("#price");
  const menuImage = modal.querySelector(".menu-image");
  const menuDescription = modal.querySelector(".menu-description");
  const quantityElement = document.getElementById("quantity");

  // Isi data
  menuTitle.textContent = item.Name;
  priceElement.textContent = item.Price.toLocaleString();
  menuImage.src = item.ImageUrl || '';
  menuDescription.textContent = item.Description || "";
  quantityElement.textContent = "1";

  // Simpan ID menu ke dataset, agar mudah di-addToCart
  modal.dataset.menuId = item.ID;

  setTimeout(() => {
    modal.classList.add("show");
  }, 10);
}

function closeModal() {
  const modal = document.getElementById("menuModal");
  if (!modal) return;

  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

// --------------------------------------------------------------------------
// Cart & Keranjang Belanja
// --------------------------------------------------------------------------
function addToCart() {
  const modal = document.getElementById("menuModal");
  const modalContent = modal.querySelector(".modal-content");

  // Data item
  const menuId = parseInt(modal.dataset.menuId || "0", 10);
  const name = modalContent.querySelector(".menu-title").textContent;
  const price = parseInt(modalContent.querySelector("#price").textContent.replace(/\D/g, ""), 10);
  const quantity = parseInt(document.getElementById("quantity").textContent, 10);
  const notes = modalContent.querySelector("textarea").value;
  const image = modalContent.querySelector(".menu-image").src;

  // Hitung harga add-ons
  let addOnsTotal = 0;
  const selectedAddOns = [];
  modalContent.querySelectorAll('input[name="addon"]:checked').forEach(addon => {
    addOnsTotal += parseInt(addon.value, 10);
    selectedAddOns.push(addon.parentElement.textContent.trim());
  });

  const itemPrice = price + addOnsTotal;

  // Cek apakah item serupa sudah ada di cart
  const existingIndex = cart.findIndex(ci =>
    ci.menuId === menuId &&
    ci.notes === notes &&
    JSON.stringify(ci.addOns) === JSON.stringify(selectedAddOns)
  );

  if (existingIndex !== -1) {
    // update quantity
    cart[existingIndex].quantity += quantity;
    cart[existingIndex].total = cart[existingIndex].price * cart[existingIndex].quantity;
  } else {
    const cartItem = {
      menuId, 
      name,
      price: itemPrice,
      quantity,
      addOns: selectedAddOns,
      notes,
      total: itemPrice * quantity,
      image
    };
    cart.push(cartItem);
  }

  updateCart();
  addToCartAnimation();
  closeModal();
}

function updateCart() {
  const cartItems = document.querySelector(".cart-items");
  const badge = document.querySelector(".badge");
  const cartContent = document.querySelector(".cart-content");

  badge.textContent = cart.length;
  cartItems.innerHTML = "";

  if (cart.length === 0) {
    cartItems.innerHTML = "<p class='empty-cart'>Keranjang kosong</p>";
    document.querySelector(".clear-cart")?.remove();
    updateCartTotal();
    return;
  }

  // Tampilkan tombol clear cart jika belum ada
  if (!document.querySelector(".clear-cart")) {
    const clearBtn = document.createElement("button");
    clearBtn.classList.add("clear-cart");
    clearBtn.innerHTML = '<i class="fas fa-trash"></i> Batalkan Semua Pesanan';
    clearBtn.addEventListener("click", clearCart);
    cartContent.insertBefore(clearBtn, cartContent.querySelector(".cart-items"));
  }

  cart.forEach((item, index) => {
    const cartItem = document.createElement("div");
    cartItem.classList.add("cart-item");
    cartItem.innerHTML = `
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.name}">
      </div>
      <div class="cart-item-content">
        <div class="cart-item-info">
          <h3>${item.name}</h3>
          <p class="item-price">Rp ${item.price.toLocaleString()} x ${item.quantity}</p>
          <p class="item-total">Total: Rp ${item.total.toLocaleString()}</p>
          ${item.addOns.length ? `<small class="add-ons">Add-ons: ${item.addOns.join(", ")}</small>` : ""}
          ${item.notes ? `<small class="notes">Notes: ${item.notes}</small>` : ""}
        </div>
        <div class="cart-item-actions">
          <div class="quantity-controls">
            <button onclick="updateCartItemQuantity(${index}, -1)">
              <i class="fas fa-minus"></i>
            </button>
            <span>${item.quantity}</span>
            <button onclick="updateCartItemQuantity(${index}, 1)">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <div class="item-buttons">
            <button class="cancel-btn" onclick="cancelItem(${index})" title="Batalkan pesanan">
              <i class="fas fa-times"></i>
            </button>
            <button class="delete-btn" onclick="removeItem(${index})" title="Hapus item">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    cartItems.appendChild(cartItem);
  });

  updateCartTotal();
}

function updateCartItemQuantity(index, change) {
  const item = cart[index];
  const newQty = item.quantity + change;
  if (newQty > 0) {
    item.quantity = newQty;
    item.total = item.price * newQty;
  }
  updateCart();
}

function updateCartTotal() {
  const totalElement = document.getElementById("total");
  total = cart.reduce((sum, ci) => sum + ci.total, 0);
  totalElement.textContent = total.toLocaleString();
}

function removeItem(index) {
  showConfirmation('Apakah Anda yakin ingin menghapus item ini?', () => {
    total -= cart[index].total;
    cart.splice(index, 1);
    updateCart();
    showNotification('Item telah dihapus dari keranjang', 'warning');
  });
}

function addToCartAnimation() {
  const cartIcon = document.querySelector(".cart-icon");
  cartIcon.style.transform = "scale(1.2)";
  setTimeout(() => {
    cartIcon.style.transform = "scale(1)";
  }, 200);

  // Tampilkan notifikasi
  const notification = document.createElement("div");
  notification.classList.add("notification");
  notification.textContent = "Item ditambahkan ke keranjang!";
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function clearCart() {
  showConfirmation('Apakah Anda yakin ingin membatalkan semua pesanan?', () => {
    cart = [];
    updateCart();
    updateCartTotal();
    showNotification('Semua pesanan telah dibatalkan', 'warning');
  });
}

function showNotification(message, type = 'success') {
  const notification = document.createElement("div");
  notification.classList.add("notification", type);
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function cancelItem(index) {
  showConfirmation('Apakah Anda yakin ingin membatalkan pesanan ini?', () => {
    total -= cart[index].total;
    cart.splice(index, 1);
    updateCart();
    showNotification('Pesanan telah dibatalkan', 'warning');
  });
}

// --------------------------------------------------------------------------
// Confirmation Modal
// --------------------------------------------------------------------------
function showConfirmation(message, onConfirm) {
  const modal = document.getElementById('confirmationModal');
  const messageEl = modal.querySelector('.confirm-message');
  const confirmBtn = modal.querySelector('.confirm-ok');
  const cancelBtn = modal.querySelector('.confirm-cancel');

  messageEl.textContent = message;
  modal.classList.add('show');

  // clone node to remove old listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

  newConfirmBtn.addEventListener('click', () => {
    onConfirm();
    modal.classList.remove('show');
  });
  newCancelBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

// --------------------------------------------------------------------------
// Toggle Keranjang
// --------------------------------------------------------------------------
function toggleCart() {
  const cartContent = document.querySelector(".cart-content");
  if (!cartContent) return;
  if (!cartContent.classList.contains("active")) {
    cartContent.style.display = "block";
    setTimeout(() => {
      cartContent.classList.add("active");
    }, 10);
  } else {
    cartContent.classList.remove("active");
    setTimeout(() => {
      cartContent.style.display = "none";
    }, 400);
  }
}

// --------------------------------------------------------------------------
// Event Listeners & Inisialisasi
// --------------------------------------------------------------------------
function initializeEventListeners() {
  // Tombol Kategori → ditangani di showCategories() setelah fetching
  // (Kita set onclick di createElement)

  // Quantity buttons (detail modal)
  const increaseBtn = document.getElementById("increase");
  const decreaseBtn = document.getElementById("decrease");
  if (increaseBtn) {
    increaseBtn.addEventListener("click", () => {
      const qEl = document.getElementById("quantity");
      if (qEl) qEl.textContent = parseInt(qEl.textContent, 10) + 1;
    });
  }
  if (decreaseBtn) {
    decreaseBtn.addEventListener("click", () => {
      const qEl = document.getElementById("quantity");
      if (!qEl) return;
      const cur = parseInt(qEl.textContent, 10);
      if (cur > 1) qEl.textContent = cur - 1;
    });
  }

  // Cart icon
  const cartIcon = document.querySelector(".cart-icon");
  if (cartIcon) {
    cartIcon.addEventListener("click", toggleCart);
  }

  // Close modal button
  const closeModalBtn = document.querySelector(".close-button");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  // Close cart
  const closeCartBtn = document.querySelector(".close-cart");
  if (closeCartBtn) {
    closeCartBtn.addEventListener("click", toggleCart);
  }

  // Click outside modal => close
  const modal = document.getElementById("menuModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Tombol "Masukkan ke Keranjang"
  const addToCartBtn = document.querySelector(".add-to-cart");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", addToCart);
  }

  // Tombol checkout
  const checkoutBtn = document.querySelector('.checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', handleCheckout);
  }
}

// --------------------------------------------------------------------------
// Checkout → Buat Order di backend, lalu tampil Payment Modal
// --------------------------------------------------------------------------
async function handleCheckout() {
  if (cart.length === 0) {
    showNotification('Keranjang kosong', 'warning');
    return;
  }

  // 1. payload: { table_id, items: [{menu_id, quantity, notes}, ...] }
  const itemsPayload = cart.map(ci => ({
    menu_id: ci.menuId,
    quantity: ci.quantity,
    notes: ci.notes || "",
    // addOns -> opsional
  }));

  const orderPayload = {
    table_id: parseInt(tableId, 10),
    items: itemsPayload
  };

  // 2. POST /orders
  const orderRes = await createOrderInBackend(orderPayload);
  if (!orderRes || !orderRes.data) {
    showNotification('Gagal membuat order', 'warning');
    return;
  }

  const newOrderId = orderRes.data.id; 
  // Tampilkan modal payment
  showPaymentModal(newOrderId);
}

// --------------------------------------------------------------------------
// Payment Modal
// --------------------------------------------------------------------------
function showPaymentModal(orderId) {
  const modal = document.getElementById('paymentModal');
  if (!modal) return;

  modal.classList.add('show');

  const cashBtn = modal.querySelector('.payment-method.cash');
  const qrisBtn = modal.querySelector('.payment-method.qris');
  const closeBtn = modal.querySelector('.close-payment');

  // Remove old onclick
  cashBtn.onclick = null;
  qrisBtn.onclick = null;
  closeBtn.onclick = null;

  cashBtn.onclick = async () => {
    modal.classList.remove('show');
    await payOrderCash(orderId);
  };
  qrisBtn.onclick = async () => {
    showNotification('Pembayaran QRIS belum tersedia', 'warning');
  };
  closeBtn.onclick = () => {
    modal.classList.remove('show');
  };
}

async function payOrderCash(orderId) {
  // POST /payments => {order_id, payment_method:'cash', amount: total}
  const paymentPayload = {
    order_id: orderId,
    payment_method: 'cash',
    amount: total
  };
  const paymentRes = await createPaymentInBackend(paymentPayload);
  if (!paymentRes || !paymentRes.data) {
    showNotification('Gagal memproses pembayaran', 'warning');
    return;
  }
  // Tampilkan modal kasir
  showCashPaymentModal();
}

function showCashPaymentModal() {
  const modal = document.getElementById('cashPaymentModal');
  modal.classList.add('show');

  const orderNumber = String(orderCounter).padStart(4, '0');
  document.getElementById('cashAmount').textContent = total.toLocaleString();
  document.getElementById('orderNumber').textContent = orderNumber;
  document.querySelector('.table-num').textContent = "#" + tableId;

  // Event
  const doneBtn = modal.querySelector('.done-btn');
  doneBtn.onclick = () => {
    modal.classList.remove('show');
    // Bersihkan keranjang
    cart = [];
    total = 0;
    updateCart();
    orderCounter++;
    showNotification('Terima kasih atas pesanan Anda!', 'success');
  };
}

// --------------------------------------------------------------------------
// DOM Loaded
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');

  // Tampilkan nomor meja
  const tableNumEl = document.querySelector(".table-number .number");
  if (tableNumEl) tableNumEl.textContent = `#${tableId}`;

  // Tampilkan kategori & menu
  showCategories();

  // Inisialisasi event listeners
  initializeEventListeners();
});


// Debug logs
console.log('Script loaded');

// CSS untuk notifikasi (tambahkan ke file CSS Anda)
const style = document.createElement('style');
style.textContent = `
  .notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    animation: slideIn 0.3s ease, slideOut 0.3s ease 1.7s;
    z-index: 1000;
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Tambahkan style untuk cart item yang baru
const cartStyle = document.createElement('style');
cartStyle.textContent = `
  .cart-item {
    display: flex;
    gap: 15px;
    padding: 15px;
    border-bottom: 1px solid #eee;
    animation: slideIn 0.3s ease;
  }

  .cart-item-image {
    width: 80px;
    height: 80px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .cart-item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cart-item-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .cart-item-info h3 {
    margin: 0 0 5px 0;
    font-size: 16px;
  }

  .cart-item-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 10px;
  }

  .quantity-controls {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 8px;
    padding: 5px;
    gap: 8px;
  }

  .quantity-controls button {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: none;
    background: white;
    color: #333;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
  }

  .quantity-controls button:hover {
    background: #009FFD;
    color: white;
  }

  .quantity-controls span {
    min-width: 30px;
    text-align: center;
    font-weight: 600;
    font-size: 14px;
  }

  .delete-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: none;
    background: #ff4b4b20;
    color: #FF4B4B;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .delete-btn:hover {
    background: #FF4B4B;
    color: white;
  }

  .item-price {
    color: #666;
    margin: 2px 0;
    font-size: 14px;
  }

  .item-total {
    color: #009FFD;
    font-weight: 600;
    margin: 2px 0;
  }

  .add-ons, .notes {
    display: block;
    color: #666;
    font-size: 12px;
    margin-top: 4px;
  }

  .quantity-changed {
    animation: pulse 0.3s ease;
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(cartStyle);