import { SiteAdapter } from "../adapters";
import { Message, Site } from "../shared/types";
import { openSelectiveForkModal } from "./forkDialogModal";

export function injectForkButtons(
  adapter: SiteAdapter,
  onForkTriggered: (
    index: number,
    options?: {
      excludedIndexes?: number[];
      compaction?: "none" | "summary";
      targetSites?: Site[];
    }
  ) => void
): void {
  const elements = adapter.getMessageElements();

  elements.forEach((el, index) => {
    if (el.getAttribute("data-forkline-injected") === "true") {
      return;
    }
    el.setAttribute("data-forkline-injected", "true");

    // Container for fork button group
    const btnContainer = document.createElement("div");
    btnContainer.className = "forkline-btn-wrapper";
    Object.assign(btnContainer.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "0px",
      margin: "2px 4px",
      zIndex: "50",
      verticalAlign: "middle",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    });

    const forkBtn = document.createElement("button");
    forkBtn.className = "forkline-action-btn";
    forkBtn.title = `Fork chat from this message (#${index + 1})`;
    Object.assign(forkBtn.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "4px 8px",
      fontSize: "12px",
      fontWeight: "500",
      color: "#f4f4f5",
      backgroundColor: "#09090b",
      border: "1px solid #27272a",
      borderRadius: "6px 0 0 6px",
      cursor: "pointer",
      transition: "all 0.15s ease",
      lineHeight: "1",
      fontFamily: "inherit",
    });

    forkBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #fafafa;">
        <line x1="6" y1="3" x2="6" y2="15"></line>
        <circle cx="18" cy="6" r="3"></circle>
        <circle cx="6" cy="18" r="3"></circle>
        <path d="M18 9a9 9 0 0 1-9 9"></path>
      </svg>
      <span>Fork</span>
    `;

    forkBtn.addEventListener("mouseenter", () => {
      forkBtn.style.color = "#000000";
      forkBtn.style.backgroundColor = "#ffffff";
      forkBtn.style.borderColor = "#ffffff";
      const icon = forkBtn.querySelector("svg");
      if (icon) icon.style.stroke = "#000000";
    });

    forkBtn.addEventListener("mouseleave", () => {
      forkBtn.style.color = "#f4f4f5";
      forkBtn.style.backgroundColor = "#09090b";
      forkBtn.style.borderColor = "#27272a";
      const icon = forkBtn.querySelector("svg");
      if (icon) icon.style.stroke = "#fafafa";
    });

    // Options dropdown button (arrow)
    const optionsBtn = document.createElement("button");
    optionsBtn.className = "forkline-options-btn";
    optionsBtn.title = "Selective context & multi-model fork options";
    Object.assign(optionsBtn.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 5px",
      fontSize: "10px",
      color: "#a1a1aa",
      backgroundColor: "#09090b",
      border: "1px solid #27272a",
      borderLeft: "none",
      borderRadius: "0 6px 6px 0",
      cursor: "pointer",
      transition: "all 0.15s ease",
    });

    optionsBtn.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    optionsBtn.addEventListener("mouseenter", () => {
      optionsBtn.style.color = "#000000";
      optionsBtn.style.backgroundColor = "#ffffff";
      optionsBtn.style.borderColor = "#ffffff";
    });

    optionsBtn.addEventListener("mouseleave", () => {
      optionsBtn.style.color = "#a1a1aa";
      optionsBtn.style.backgroundColor = "#09090b";
      optionsBtn.style.borderColor = "#27272a";
    });

    // 1-Click Fork
    forkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      onForkTriggered(index);
    });

    // Selective Options Fork
    optionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      const allMessages = elements.map((item, i) => adapter.readMessage(item, i));

      openSelectiveForkModal({
        messages: allMessages,
        currentIndex: index,
        currentSite: adapter.site,
        onConfirm: (modalOpts) => {
          onForkTriggered(index, {
            excludedIndexes: modalOpts.excludedIndexes,
            compaction: modalOpts.compaction,
            targetSites: modalOpts.targetSites,
          });
        },
        onCancel: () => {},
      });
    });

    btnContainer.appendChild(forkBtn);
    btnContainer.appendChild(optionsBtn);

    // Find insertion target
    const existingCopyBtn = el.querySelector("button[aria-label*='Copy' i], button[title*='Copy' i]");
    const existingToolbar =
      existingCopyBtn?.parentElement ||
      el.querySelector("div.empty\\:hidden, div[class*=\"action\" i], div[class*=\"toolbar\" i], div[class*=\"footer\" i]");

    if (existingToolbar) {
      existingToolbar.appendChild(btnContainer);
    } else {
      const inlineRow = document.createElement("div");
      inlineRow.className = "forkline-inline-row";
      Object.assign(inlineRow.style, {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "4px",
        marginBottom: "4px",
      });
      inlineRow.appendChild(btnContainer);
      el.appendChild(inlineRow);
    }
  });
}
