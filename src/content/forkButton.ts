import { SiteAdapter } from "../adapters";
import { Message, Site } from "../shared/types";
import { openSelectiveForkModal } from "./forkDialogModal";
import { showToast } from "./toast";

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

    // Container for fork button
    const btnContainer = document.createElement("div");
    btnContainer.className = "forkline-btn-wrapper";
    Object.assign(btnContainer.style, {
      display: "inline-flex",
      alignItems: "center",
      gap: "2px",
      margin: "4px 6px",
      zIndex: "100",
      verticalAlign: "middle",
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
      color: "#94a3b8",
      backgroundColor: "rgba(30, 41, 59, 0.7)",
      border: "1px solid rgba(148, 163, 184, 0.2)",
      borderRadius: "6px",
      cursor: "pointer",
      transition: "all 0.15s ease",
      lineHeight: "1",
    });

    forkBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #38bdf8;">
        <line x1="6" y1="3" x2="6" y2="15"></line>
        <circle cx="18" cy="6" r="3"></circle>
        <circle cx="6" cy="18" r="3"></circle>
        <path d="M18 9a9 9 0 0 1-9 9"></path>
      </svg>
      <span>Fork</span>
    `;

    forkBtn.addEventListener("mouseenter", () => {
      forkBtn.style.color = "#f8fafc";
      forkBtn.style.backgroundColor = "#1e293b";
      forkBtn.style.borderColor = "#38bdf8";
    });

    forkBtn.addEventListener("mouseleave", () => {
      forkBtn.style.color = "#94a3b8";
      forkBtn.style.backgroundColor = "rgba(30, 41, 59, 0.7)";
      forkBtn.style.borderColor = "rgba(148, 163, 184, 0.2)";
    });

    // Options button (down arrow for selective context / multi-model)
    const optionsBtn = document.createElement("button");
    optionsBtn.className = "forkline-options-btn";
    optionsBtn.title = "Selective context & multi-model fork options";
    Object.assign(optionsBtn.style, {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 4px",
      fontSize: "10px",
      color: "#94a3b8",
      backgroundColor: "rgba(30, 41, 59, 0.7)",
      border: "1px solid rgba(148, 163, 184, 0.2)",
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

    // Direct click on Fork button: triggers quick fork
    forkBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      onForkTriggered(index);
    });

    // Click on options button: opens modal
    optionsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      // Extract all current messages
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

    // Merge styling: round forkBtn corners if options button is present
    forkBtn.style.borderRadius = "6px 0 0 6px";
    btnContainer.appendChild(forkBtn);
    btnContainer.appendChild(optionsBtn);

    // Find the best insertion point inside the message
    // Usually an actions bar or right at the end of the message element
    const actionToolbar =
      el.querySelector("div[class*=\"action\" i], div[class*=\"toolbar\" i], div[class*=\"footer\" i]") ||
      el.lastElementChild ||
      el;

    if (actionToolbar && actionToolbar !== el) {
      actionToolbar.appendChild(btnContainer);
    } else {
      el.appendChild(btnContainer);
    }
  });
}
