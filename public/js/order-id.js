(function attachOrderIdHelper(globalScope) {
  function toDisplayOrderId(rawId) {
    if (rawId === null || rawId === undefined) return "QB-00000";
    const text = String(rawId).trim();
    if (!text) return "QB-00000";

    if (text.startsWith("QB-")) return text;
    if (/^\d+$/.test(text)) return `QB-${text.padStart(5, "0")}`;

    const digits = text.replace(/\D/g, "");
    if (digits.length > 0) {
      return `QB-${digits.slice(-5).padStart(5, "0")}`;
    }

    return "QB-00000";
  }

  function createLocalRawId() {
    return `local-${Date.now()}`;
  }

  globalScope.qbOrderId = {
    toDisplayOrderId,
    createLocalRawId
  };
})(window);
