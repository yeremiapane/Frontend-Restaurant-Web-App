// Data Menu
const menuData = {
  makanan: [
    { 
      name: "Nasi Goreng", 
      price: 15000, 
      image: "assets/img/gambar 2.jpg",
      description: "Nasi goreng spesial dengan telur dan sayuran"
    },
    { 
      name: "Mie Goreng", 
      price: 12000, 
      image: "assets/img/gambar 2.jpg",
      description: "Mie goreng dengan bumbu special"
    },
  ],
  minuman: [
    { 
      name: "Es Teh", 
      price: 5000, 
      image: "assets/img/Gambar 1 (2).jpg",
      description: "Es teh manis segar"
    },
    { 
      name: "Jus Jeruk", 
      price: 8000, 
      image: "https://source.unsplash.com/300x200/?orange-juice",
      description: "Jus jeruk segar"
    },
  ],
  snack: [
    { 
      name: "Kentang Goreng", 
      price: 10000, 
      image: "https://source.unsplash.com/300x200/?french-fries",
      description: "Kentang goreng crispy"
    },
    { 
      name: "Onion Ring", 
      price: 12000, 
      image: "https://source.unsplash.com/300x200/?onion-rings",
      description: "Onion ring renyah"
    },
  ],
};

// Data Keranjang
let cart = [];
let total = 0;

// Tambahkan variabel untuk nomor pesanan
let orderCounter = 1;

// Fungsi untuk menampilkan menu
function showMenu(category) {
  console.log('Showing menu for category:', category);
  const menuGrid = document.querySelector(".menu-grid");
  
  if (!menuGrid) {
    console.error('Menu grid element not found!');
    return;
  }
  
  menuGrid.innerHTML = "";
  
  if (menuData[category]) {
    menuData[category].forEach((item) => {
      const menuItem = document.createElement("div");
      menuItem.classList.add("menu-item");
      menuItem.innerHTML = `
        <img src="${item.image}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/300x200'">
        <h4>${item.name}</h4>
        <p>Rp ${item.price.toLocaleString()}</p>
      `;
      
      menuItem.addEventListener("click", () => {
        openModal(item);
      });
      
      menuGrid.appendChild(menuItem);
    });
  }
}

// Fungsi untuk membuka modal
function openModal(item) {
  const modal = document.getElementById("menuModal");
  if (!modal) {
    console.error('Modal element not found');
    return;
  }
  
  modal.style.display = "flex";
  
  const modalContent = modal.querySelector(".modal-content");
  if (!modalContent) {
    console.error('Modal content not found');
    return;
  }
  
  // Update modal content
  const menuTitle = modalContent.querySelector(".menu-title");
  const priceElement = modalContent.querySelector("#price");
  const menuImage = modalContent.querySelector(".menu-image");
  const menuDescription = modalContent.querySelector(".menu-description");
  
  if (menuTitle) menuTitle.textContent = item.name;
  if (priceElement) priceElement.textContent = item.price.toLocaleString();
  if (menuImage) menuImage.src = item.image;
  if (menuDescription) menuDescription.textContent = item.description || "";
  
  // Reset quantity
  const quantityElement = document.getElementById("quantity");
  if (quantityElement) quantityElement.textContent = "1";
  
  setTimeout(() => {
    modal.classList.add("show");
  }, 10);
}

// Fungsi untuk menutup modal
function closeModal() {
  const modal = document.getElementById("menuModal");
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
}

// Fungsi untuk toggle cart
function toggleCart() {
  const cartContent = document.querySelector(".cart-content");
  if (cartContent) {
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
}

// Fungsi untuk menambahkan item ke keranjang
function addToCart() {
  const modal = document.getElementById("menuModal");
  const modalContent = modal.querySelector(".modal-content");
  
  // Ambil data item dari modal
  const name = modalContent.querySelector(".menu-title").textContent;
  const price = parseInt(modalContent.querySelector("#price").textContent.replace(/\D/g, ''));
  const quantity = parseInt(document.getElementById("quantity").textContent);
  const notes = modalContent.querySelector("textarea").value;
  const image = modalContent.querySelector(".menu-image").src;
  
  // Hitung harga add-ons
  let addOnsTotal = 0;
  const selectedAddOns = [];
  modalContent.querySelectorAll('input[name="addon"]:checked').forEach(addon => {
    addOnsTotal += parseInt(addon.value);
    selectedAddOns.push(addon.parentElement.textContent.trim());
  });
  
  // Hitung total harga item
  const itemPrice = price + addOnsTotal;
  
  // Cek apakah item yang sama sudah ada di keranjang
  const existingItemIndex = cart.findIndex(item => 
    item.name === name && 
    JSON.stringify(item.addOns) === JSON.stringify(selectedAddOns) &&
    item.notes === notes
  );

  if (existingItemIndex !== -1) {
    // Update quantity jika item yang sama ditemukan
    cart[existingItemIndex].quantity += quantity;
    cart[existingItemIndex].total = cart[existingItemIndex].price * cart[existingItemIndex].quantity;
  } else {
    // Tambahkan item baru jika berbeda
    const cartItem = {
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
  
  // Update total dan tampilan keranjang
  updateCartTotal();
  updateCart();
  
  // Animasi dan feedback
  addToCartAnimation();
  
  // Tutup modal
  closeModal();
}

// Fungsi untuk update tampilan keranjang
function updateCart() {
  const cartItems = document.querySelector(".cart-items");
  const badge = document.querySelector(".badge");
  const cartContent = document.querySelector(".cart-content");
  
  badge.textContent = cart.length;
  
  // Tampilkan atau sembunyikan tombol clear cart
  const clearCartButton = document.querySelector(".clear-cart");
  if (cart.length > 0) {
    if (!clearCartButton) {
      const clearBtn = document.createElement("button");
      clearBtn.classList.add("clear-cart");
      clearBtn.innerHTML = '<i class="fas fa-trash"></i> Batalkan Semua Pesanan';
      clearBtn.addEventListener("click", clearCart);
      cartContent.insertBefore(clearBtn, cartContent.querySelector(".cart-items"));
    }
  } else {
    clearCartButton?.remove();
  }
  
  cartItems.innerHTML = cart.length ? "" : "<p class='empty-cart'>Keranjang kosong</p>";
  
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

// Fungsi untuk update quantity item di keranjang
function updateCartItemQuantity(index, change) {
  const item = cart[index];
  const newQuantity = item.quantity + change;
  
  if (newQuantity > 0) {
    item.quantity = newQuantity;
    item.total = item.price * newQuantity;
    updateCart();
  }
}

// Fungsi untuk update total keranjang
function updateCartTotal() {
  const totalElement = document.getElementById("total");
  total = cart.reduce((sum, item) => sum + item.total, 0);
  totalElement.textContent = total.toLocaleString();
}

// Fungsi untuk menghapus item dari keranjang
function removeItem(index) {
  showConfirmation('Apakah Anda yakin ingin menghapus item ini?', () => {
    total -= cart[index].total;
    cart.splice(index, 1);
    updateCart();
    showNotification('Item telah dihapus dari keranjang', 'warning');
  });
}

// Fungsi animasi ketika menambah ke keranjang
function addToCartAnimation() {
  const cartIcon = document.querySelector(".cart-icon");
  cartIcon.style.transform = "scale(1.2)";
  setTimeout(() => {
    cartIcon.style.transform = "scale(1)";
  }, 200);
  
  // Optional: Tampilkan notifikasi
  const notification = document.createElement("div");
  notification.classList.add("notification");
  notification.textContent = "Item ditambahkan ke keranjang!";
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// Fungsi untuk membersihkan keranjang
function clearCart() {
  showConfirmation('Apakah Anda yakin ingin membatalkan semua pesanan?', () => {
    cart = [];
    updateCart();
    updateCartTotal();
    showNotification('Semua pesanan telah dibatalkan', 'warning');
  });
}

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'success') {
  const notification = document.createElement("div");
  notification.classList.add("notification", type);
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

// Fungsi untuk membatalkan pesanan menu
function cancelItem(index) {
  showConfirmation('Apakah Anda yakin ingin membatalkan pesanan ini?', () => {
    total -= cart[index].total;
    cart.splice(index, 1);
    updateCart();
    showNotification('Pesanan telah dibatalkan', 'warning');
  });
}

// Fungsi untuk menampilkan konfirmasi
function showConfirmation(message, onConfirm) {
  const modal = document.getElementById('confirmationModal');
  const messageEl = modal.querySelector('.confirm-message');
  const confirmBtn = modal.querySelector('.confirm-ok');
  const cancelBtn = modal.querySelector('.confirm-cancel');
  
  messageEl.textContent = message;
  modal.classList.add('show');
  
  // Remove old event listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  // Add new event listeners
  newConfirmBtn.addEventListener('click', () => {
    onConfirm();
    modal.classList.remove('show');
  });
  
  newCancelBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

// Initialize all event listeners
function initializeEventListeners() {
  // Category click events
  const categoryItems = document.querySelectorAll(".category-item");
  categoryItems.forEach(category => {
    category.addEventListener("click", () => {
      categoryItems.forEach(item => item.classList.remove("active"));
      category.classList.add("active");
      showMenu(category.getAttribute("data-category"));
    });
  });

  // Quantity buttons
  const increaseBtn = document.getElementById("increase");
  if (increaseBtn) {
    increaseBtn.addEventListener("click", () => {
      const quantityElement = document.getElementById("quantity");
      if (quantityElement) {
        quantityElement.textContent = parseInt(quantityElement.textContent) + 1;
      }
    });
  }

  const decreaseBtn = document.getElementById("decrease");
  if (decreaseBtn) {
    decreaseBtn.addEventListener("click", () => {
      const quantityElement = document.getElementById("quantity");
      if (quantityElement) {
        const currentQuantity = parseInt(quantityElement.textContent);
        if (currentQuantity > 1) {
          quantityElement.textContent = currentQuantity - 1;
        }
      }
    });
  }

  // Cart icon
  const cartIcon = document.querySelector(".cart-icon");
  if (cartIcon) {
    cartIcon.addEventListener("click", toggleCart);
  }

  // Close buttons
  const closeModalBtn = document.querySelector(".close-button");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModal);
  }

  const closeCartBtn = document.querySelector(".close-cart");
  if (closeCartBtn) {
    closeCartBtn.addEventListener("click", toggleCart);
  }

  // Close modal when clicking outside
  const modal = document.getElementById("menuModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Tambahkan event listener untuk tombol "Masukkan ke Keranjang"
  const addToCartBtn = document.querySelector(".add-to-cart");
  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", addToCart);
  }

  // Update event listener untuk tombol checkout
  const checkoutBtn = document.querySelector('.checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cart.length > 0) {
        showPaymentModal();
      } else {
        showNotification('Keranjang belanja kosong', 'warning');
      }
    });
  }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  
  // Initialize menu and event listeners
  showMenu("makanan");
  initializeEventListeners();
  
  // Set initial active category
  const defaultCategory = document.querySelector('[data-category="makanan"]');
  if (defaultCategory) {
    defaultCategory.classList.add("active");
  }
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

// Fungsi untuk menampilkan modal pembayaran
function showPaymentModal() {
  const modal = document.getElementById('paymentModal');
  modal.classList.add('show');

  // Event listener untuk metode pembayaran
  const cashBtn = modal.querySelector('.payment-method.cash');
  const qrisBtn = modal.querySelector('.payment-method.qris');
  const closeBtn = modal.querySelector('.close-payment');

  cashBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    showCashPaymentModal();
  });

  qrisBtn.addEventListener('click', () => {
    // Implementasi QRIS akan ditambahkan nanti
    showNotification('Pembayaran QRIS akan segera tersedia', 'warning');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
  });
}

// Fungsi untuk menampilkan modal pembayaran tunai
function showCashPaymentModal() {
  const modal = document.getElementById('cashPaymentModal');
  const orderNumber = String(orderCounter).padStart(4, '0');
  
  document.getElementById('cashAmount').textContent = total.toLocaleString();
  document.getElementById('orderNumber').textContent = orderNumber;
  
  modal.classList.add('show');

  // Event listener untuk tombol selesai
  const doneBtn = modal.querySelector('.done-btn');
  doneBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    // Reset keranjang
    cart = [];
    total = 0;
    updateCart();
    orderCounter++;
    showNotification('Terima kasih atas pesanan Anda!', 'success');
  });
}