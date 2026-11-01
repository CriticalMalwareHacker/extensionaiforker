let toastContainer: HTMLElement | null = null;

export function showToast(message: string, durationMs: number = 3500, type: "info" | "success" | "warning" = "info"): void {
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
      gap: "8px",
      pointerEvents: "none",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    });
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");

  Object.assign(toast.style, {
    backgroundColor: "#09090b",
    color: "#fafafa",
    padding: "10px 14px",
    borderRadius: "8px",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.8), 0 8px 10px -6px rgba(0, 0, 0, 0.6)",
    fontSize: "12px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    opacity: "0",
    transform: "translateY(8px)",
    transition: "all 200ms cubic-bezier(0.16, 1, 0.3, 1)",
    border: "1px solid #27272a",
    pointerEvents: "auto",
    maxWidth: "340px",
    lineHeight: "1.4",
  });

  const iconSvg = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fafafa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
      <line x1="6" y1="3" x2="6" y2="15"></line>
      <circle cx="18" cy="6" r="3"></circle>
      <circle cx="6" cy="18" r="3"></circle>
      <path d="M18 9a9 9 0 0 1-9 9"></path>
    </svg>
  `;

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => {
      toast.remove();
    }, 250);
  }, durationMs);
}
