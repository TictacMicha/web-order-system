const socket = window.io ? window.io() : null;

const ORDER_STEPS = ["received", "preparing", "ready_for_delivery", "completed"];
const STEP_LABELS = {
  received: "Pesanan Diterima",
  preparing: "Sedang Disiapkan",
  ready_for_delivery: "Siap Diantar",
  completed: "Selesai"
};
const STEP_BADGES = {
  received: "Baru",
  preparing: "Diproses",
  ready_for_delivery: "Siap Antar",
  completed: "Selesai"
};
const STEP_BADGE_CLASS = {
  received: "bg-secondary-container text-on-secondary-container",
  preparing: "bg-tertiary-container text-on-tertiary-container",
  ready_for_delivery: "bg-primary-fixed text-on-primary-fixed-variant",
  completed: "bg-surface-container-high text-on-surface-variant"
};

const orderGrid = document.getElementById("orderGrid");
const emptyState = document.getElementById("emptyState");
const queueSubtitle = document.getElementById("queueSubtitle");
const refreshButton = document.getElementById("refreshOrders");

let latestSocketQueue = [];

function publishStatusToConsumer(order, status) {
  const payload = {
    orderId: order.id,
    orderCode: order.orderCode || window.qbOrderId.toDisplayOrderId(order.id),
    status,
    at: Date.now()
  };
  localStorage.setItem("qb:lastStatusUpdate", JSON.stringify(payload));
}

function readDemoQueue() {
  const raw = JSON.parse(localStorage.getItem("qb:chefQueue") || "[]");
  return Array.isArray(raw) ? raw : [];
}

function writeDemoQueue(queue) {
  localStorage.setItem("qb:chefQueue", JSON.stringify(queue));
}

function normalizeOrder(order) {
  return {
    id: order.id,
    orderCode: order.orderCode || window.qbOrderId.toDisplayOrderId(order.id),
    meja: order.meja || order.nomorMeja || "Delivery",
    namaPelanggan: order.namaPelanggan || order.customerName || "Pelanggan",
    items: Array.isArray(order.items) ? order.items : [],
    status: ORDER_STEPS.includes(order.status) ? order.status : "received",
    address: order.address || order.alamat || "-",
    note: order.note || order.catatan || "-",
    source: order.source || "server"
  };
}

function getUnifiedQueue() {
  const socketQueue = latestSocketQueue.map(normalizeOrder);
  const demoQueue = readDemoQueue().map(normalizeOrder);
  const merged = [...socketQueue];

  for (const demoOrder of demoQueue) {
    const exists = merged.some((item) => String(item.id) === String(demoOrder.id));
    if (!exists) merged.push(demoOrder);
  }

  return merged.filter((order) => order.status !== "completed");
}

function createItemLine(itemText) {
  const row = document.createElement("li");
  row.className = "flex justify-between text-body-md text-on-background border-b border-surface-variant pb-2";
  row.innerHTML = `
    <span>${itemText}</span>
    <span class="font-semibold"></span>
  `;
  return row;
}

function updateLocalOrderStatus(orderId, status) {
  const next = readDemoQueue().map((item) => {
    if (String(item.id) !== String(orderId)) return item;
    return { ...item, status };
  });
  writeDemoQueue(next);
}

function removeLocalOrder(orderId) {
  const next = readDemoQueue().filter((item) => String(item.id) !== String(orderId));
  writeDemoQueue(next);
}

function emitOrUpdateLocal(order, status) {
  if (order.source === "demo" || String(order.id).startsWith("demo-") || !socket) {
    updateLocalOrderStatus(order.id, status);
    publishStatusToConsumer(order, status);
    renderQueue();
    if (window.qbToast) window.qbToast.showToast("Tahap pesanan diperbarui", "success");
    return;
  }

  socket.emit("updateOrderStatus", {
    orderId: order.id,
    status
  });
  publishStatusToConsumer(order, status);
  if (window.qbToast) window.qbToast.showToast("Update tahap dikirim", "success");
}

function dequeueOrder(order) {
  if (order.source === "demo" || String(order.id).startsWith("demo-") || !socket) {
    publishStatusToConsumer(order, "completed");
    removeLocalOrder(order.id);
    renderQueue();
    if (window.qbToast) window.qbToast.showToast("Pesanan selesai dan keluar antrean", "success");
    return;
  }

  publishStatusToConsumer(order, "completed");
  socket.emit("finishOrder", order.id);
  if (window.qbToast) window.qbToast.showToast("Pesanan dikeluarkan dari antrean", "success");
}

function createOrderCard(order) {
  const card = document.createElement("article");
  card.className = "bg-surface-container-lowest rounded-xl p-5 warm-shadow hover:warm-shadow-hover transition-all duration-300 border border-surface-container-high relative overflow-hidden";

  const accent = document.createElement("div");
  accent.className = "absolute top-0 left-0 w-1 h-full bg-primary";

  const header = document.createElement("div");
  header.className = "flex justify-between items-start mb-4 pl-2";

  const left = document.createElement("div");
  const badgeClass = STEP_BADGE_CLASS[order.status] || STEP_BADGE_CLASS.received;
  left.innerHTML = `
    <div class="flex items-center gap-2 mb-1">
      <span class="text-2xl font-semibold text-on-background">${order.namaPelanggan}</span>
      <span class="${badgeClass} px-2 py-0.5 rounded-full text-xs">${STEP_BADGES[order.status]}</span>
    </div>
    <p class="text-xs text-on-surface-variant flex items-center gap-1">
      <span class="material-symbols-outlined" style="font-size: 14px;">schedule</span>
      ${STEP_LABELS[order.status]}
    </p>
  `;

  const right = document.createElement("span");
  right.className = "text-sm text-primary font-bold";
  right.innerText = `#${order.orderCode || window.qbOrderId.toDisplayOrderId(order.id)}`;

  header.append(left, right);

  const detail = document.createElement("div");
  detail.className = "pl-2 mb-4";
  detail.innerHTML = `
    <p class="text-sm text-on-surface-variant mb-1"><strong>Meja:</strong> ${order.meja}</p>
    <p class="text-sm text-on-surface-variant mb-1"><strong>Alamat:</strong> ${order.address || "-"}</p>
    <p class="text-sm text-on-surface-variant mb-3"><strong>Catatan:</strong> ${order.note || "-"}</p>
  `;

  const list = document.createElement("ul");
  list.className = "space-y-2 mb-3";
  (order.items || []).forEach((item) => list.appendChild(createItemLine(item)));
  detail.appendChild(list);

  const statusWrap = document.createElement("div");
  statusWrap.className = "pl-2 flex gap-3 mt-6";

  const statusSelect = document.createElement("select");
  statusSelect.className = "flex-1 rounded-full border border-outline-variant bg-surface px-4 py-2 text-sm";
  statusSelect.innerHTML = ORDER_STEPS.map((step) => `<option value="${step}">${STEP_LABELS[step]}</option>`).join("");
  statusSelect.value = order.status;

  const updateButton = document.createElement("button");
  updateButton.className = "bg-primary text-on-primary px-4 py-2 rounded-full text-sm font-semibold hover:opacity-90 active:scale-95 transition-all";
  updateButton.innerText = "Update Tahap";
  updateButton.addEventListener("click", () => emitOrUpdateLocal(order, statusSelect.value));

  statusWrap.append(statusSelect, updateButton);

  const finishButton = document.createElement("button");
  finishButton.className = "w-full mt-3 bg-tertiary text-on-tertiary px-4 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 active:scale-95 transition-all";
  finishButton.innerText = "Selesai (Dequeue)";
  finishButton.addEventListener("click", () => dequeueOrder(order));

  card.append(accent, header, detail, statusWrap, finishButton);
  return card;
}

function renderQueue() {
  const queue = getUnifiedQueue();
  orderGrid.innerHTML = "";

  if (queue.length === 0) {
    emptyState.classList.remove("hidden");
    queueSubtitle.textContent = "Belum ada pesanan aktif saat ini.";
    return;
  }

  emptyState.classList.add("hidden");
  queueSubtitle.textContent = `You have ${queue.length} orders needing attention.`;
  queue.forEach((order) => orderGrid.appendChild(createOrderCard(order)));
}

function refreshQueue() {
  renderQueue();
  if (window.qbToast) window.qbToast.showToast("Daftar pesanan diperbarui", "info");
}

refreshButton.addEventListener("click", refreshQueue);
window.addEventListener("storage", (event) => {
  if (event.key === "qb:chefQueue") refreshQueue();
});

if (socket) {
  socket.on("updateQueue", (queue) => {
    latestSocketQueue = Array.isArray(queue) ? queue : [];
    renderQueue();
  });
}

renderQueue();
