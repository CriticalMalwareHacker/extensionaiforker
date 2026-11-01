let toastContainer: HTMLElement | null = null;

export function showToast(message: string, durationMs: number = 4000, type: "info" | "success" | "warning" = "info"): void {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "forkline-toast-container";
    Object.assign(toastContainer.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: "2147483647",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      pointerEvents: "none",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    });
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  const bgColors = {
    info: "#1e293b",
    success: "#065f46",
    warning: "#854d0e",
  };

  Object.assign(toast.style, {
    backgroundColor: bgColors[type] || "#1e293b",
    color: "#ffffff",
    padding: "12px 18px",
    borderRadius: "10px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    opacity: "0",
    transform: "translateY(12px)",
    transition: "all 250ms cubic-bezier(0.16, 1, 0.3, 1)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    pointerEvents: "auto",
    maxWidth: "380px",
    lineHeight: "1.4",
  });

  const iconSvg = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; color:#38bdf8;">
      <line x1="6" y1="3" x2="6" y2="15"></line>
      <circle cx="18" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <path d="M18 9a9 9 0 0 1-9 9"></path>
    </svg>
  `;

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(12px)";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, durationMs);
}
