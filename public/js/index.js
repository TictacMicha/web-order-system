let menuItems = [];
const fallbackMenuItems = [
  { id: "burger-deluxe", name: "Double Patty Smokehouse", price: 125000, rating: 4.8, eta: "15-20 min", image: "/Image/menu-burger.png", desc: "Dua patty daging sapi dengan cheddar leleh, beef bacon, caramelized onion, dan house sauce.", category: "burger" },
  { id: "woodfired-pepperoni", name: "Woodfired Pepperoni Pizza", price: 180000, rating: 4.9, eta: "25-30 min", image: "/Image/menu-pizza.png", desc: "Pizza oven klasik dengan pepperoni premium, mozzarella lembut, olive hitam, dan basil segar.", category: "pizza" },
  { id: "luxury-sushi-boat", name: "Luxury Sushi Boat Set", price: 220000, rating: 4.7, eta: "20-25 min", image: "/Image/menu-sushi.png", desc: "Kombinasi nigiri, sashimi, dan rolls dalam sajian boat mewah dengan ikan segar pilihan harian.", category: "sushi" },
  { id: "summer-cocktail-flight", name: "Summer Mocktail Flight", price: 30000, rating: 4.9, eta: "5-10 min", image: "/Image/menu-drinks.png", desc: "Tiga minuman segar fruity: mint citrus cooler, berry punch, dan blue lagoon di satu tray.", category: "drinks" }
];

const cart = new Map();
const menuGrid = document.getElementById("menuGrid");
const searchInput = document.getElementById("searchInput");
const locationLabel = document.getElementById("locationLabel");
const locationTrigger = document.getElementById("locationTrigger");
const DEFAULT_LOCATION = "Jl. Sudirman, Jakarta";

function currency(value) {
  return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

function readCartCache() {
  const raw = JSON.parse(localStorage.getItem("qb:cart") || "[]");
  return Array.isArray(raw) ? raw : [];
}

function writeCartCache(nextCart) {
  localStorage.setItem("qb:cart", JSON.stringify(nextCart));
}

function addMenuToCart(menu) {
  const cached = readCartCache();
  const existingIndex = cached.findIndex((item) => item.menuId === menu.id && !item.note && (!item.addons || item.addons.length === 0));

  if (existingIndex >= 0) {
    cached[existingIndex].quantity += 1;
  } else {
    cached.push({
      id: `${menu.id}-${Date.now()}`,
      menuId: menu.id,
      name: menu.name,
      unitPrice: Number(menu.price),
      quantity: 1,
      addons: [],
      note: "",
      image: menu.image
    });
  }

  writeCartCache(cached);
}

function renderMenu(list) {
  menuGrid.innerHTML = "";
  list.forEach((item) => {
    const qty = cart.get(item.id) || 0;
    const card = document.createElement("article");
    card.className = "bg-white rounded-xl overflow-hidden shadow-md border border-outline-variant/30 flex flex-col";
    card.innerHTML = `
      <div class="relative h-48 overflow-hidden">
        <img alt="${item.name}" class="w-full h-full object-cover" src="${item.image}" />
        <div class="absolute top-sm right-sm bg-white/90 px-base py-xs rounded-full flex items-center gap-xs shadow-sm">
          <span class="material-symbols-outlined text-primary text-sm" style="font-variation-settings:'FILL' 1;">star</span>
          <span class="text-xs font-bold">${item.rating}</span>
        </div>
      </div>
      <div class="p-md flex-grow">
        <div class="flex justify-between items-start mb-xs">
          <h4 class="font-semibold">${item.name}</h4>
          <span class="font-semibold text-primary">${currency(item.price)}</span>
        </div>
        <p class="text-sm text-on-surface-variant mb-md">${item.desc}</p>
        <a href="/menu-detail.html?id=${item.id}" class="inline-flex text-sm text-primary font-semibold mb-md qb-focus-ring rounded">Lihat Detail</a>
        <div class="flex items-center justify-between">
          <div class="text-xs text-on-surface-variant">${item.eta} • Delivery</div>
          <button data-id="${item.id}" class="add-btn bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center">
            <span class="material-symbols-outlined">${qty > 0 ? "done" : "add"}</span>
          </button>
        </div>
      </div>
    `;
    menuGrid.appendChild(card);
  });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".add-btn");
  if (!button) return;
  const itemId = button.getAttribute("data-id");
  const selectedMenu = menuItems.find((item) => item.id === itemId);
  if (!selectedMenu) return;
  const currentQty = cart.get(itemId) || 0;
  cart.set(itemId, currentQty + 1);
  addMenuToCart(selectedMenu);
  renderMenu(menuItems);
  Swal.fire({
    icon: "success",
    toast: true,
    position: "top-end",
    timer: 1200,
    showConfirmButton: false,
    title: "Added to cart"
  });
});

document.getElementById("claimPromoButton").addEventListener("click", async () => {
  const claimedAt = new Date().toISOString();
  const response = await fetch("/api/promos/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promoCode: "QB50", claimedAt })
  });
  if (!response.ok) return;

  const date = dayjs().format("DD MMM YYYY");
  Swal.fire({
    title: "Promo claimed",
    text: `Voucher aktif pada ${date}.`,
    icon: "success",
    confirmButtonColor: "#d32f2f"
  });
});

document.getElementById("filterButton").addEventListener("click", () => {
  const value = searchInput.value.trim();
  if (!value || !validator.isLength(value, { min: 2 })) {
    Swal.fire({
      title: "Input belum valid",
      text: "Masukkan minimal 2 karakter untuk mencari menu.",
      icon: "warning",
      confirmButtonColor: "#d32f2f"
    });
    return;
  }
  const result = menuItems.filter((item) =>
    validator.contains(item.name.toLowerCase(), value.toLowerCase())
  );
  renderMenu(result);
});

function syncLocationLabel() {
  const saved = localStorage.getItem("qb:userLocation") || DEFAULT_LOCATION;
  locationLabel.textContent = saved;
}

locationTrigger.addEventListener("click", async () => {
  const current = localStorage.getItem("qb:userLocation") || DEFAULT_LOCATION;
  const result = await Swal.fire({
    title: "Ubah Lokasi Pengantaran",
    input: "text",
    inputValue: current,
    inputPlaceholder: "Masukkan lokasi pengantaran",
    confirmButtonText: "Simpan",
    showCancelButton: true,
    confirmButtonColor: "#d32f2f"
  });
  if (!result.isConfirmed) return;
  const nextLocation = (result.value || "").trim();
  if (!nextLocation) return;
  localStorage.setItem("qb:userLocation", nextLocation);
  const deliveryInfo = JSON.parse(localStorage.getItem("qb:deliveryInfo") || "{}");
  localStorage.setItem("qb:deliveryInfo", JSON.stringify({
    ...deliveryInfo,
    address: nextLocation
  }));
  syncLocationLabel();
});

syncLocationLabel();

async function bootstrap() {
  try {
    const response = await fetch("/api/menu");
    if (!response.ok) throw new Error("Menu API unavailable");
    const result = await response.json();
    if (Array.isArray(result?.data) && result.data.length > 0) {
      menuItems = result.data;
    } else {
      throw new Error("API menu empty");
    }
  } catch (_error) {
    try {
      const staticResponse = await fetch("/data/menu.json");
      if (!staticResponse.ok) throw new Error("Static menu unavailable");
      const staticData = await staticResponse.json();
      menuItems = Array.isArray(staticData) && staticData.length > 0 ? staticData : fallbackMenuItems;
    } catch (_staticError) {
      menuItems = fallbackMenuItems;
    }
  }
  renderMenu(menuItems);
}

bootstrap();
