(function attachToastHelper(globalScope) {
  function ensureContainer() {
    let container = document.getElementById("qb-toast-root");
    if (container) return container;

    container = document.createElement("div");
    container.id = "qb-toast-root";
    container.style.position = "fixed";
    container.style.left = "50%";
    container.style.bottom = "96px";
    container.style.transform = "translateX(-50%)";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "8px";
    container.style.width = "min(92vw, 380px)";
    document.body.appendChild(container);
    return container;
  }

  function showToast(message, type = "info", duration = 1200) {
    const container = ensureContainer();
    const toast = document.createElement("div");
    const bg = type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#1f2937";

    toast.style.background = bg;
    toast.style.color = "#ffffff";
    toast.style.padding = "10px 14px";
    toast.style.borderRadius = "10px";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "600";
    toast.style.boxShadow = "0 10px 24px rgba(0,0,0,0.18)";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    toast.style.transition = "all 180ms ease";
    toast.textContent = message;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      setTimeout(() => toast.remove(), 180);
    }, duration);
  }

  function navigateWithToast(message, url, type = "success", delay = 900) {
    showToast(message, type, delay);
    setTimeout(() => {
      window.location.href = url;
    }, delay);
  }

  function reloadWithToast(message, type = "success", delay = 900) {
    showToast(message, type, delay);
    setTimeout(() => window.location.reload(), delay);
  }

  globalScope.qbToast = {
    showToast,
    navigateWithToast,
    reloadWithToast
  };
})(window);
