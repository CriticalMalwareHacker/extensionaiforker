import { Message, Site } from "../shared/types";
import { estimateTokens, checkTokenLimits } from "../core/tokens";
import { showToast } from "./toast";

export interface ModalOptions {
  messages: Message[];
  currentIndex: number;
  currentSite: Site;
  onConfirm: (options: {
    excludedIndexes: number[];
    compaction: "none" | "summary";
    targetSites: Site[];
    customLabel?: string;
  }) => void;
  onCancel: () => void;
}

export function openSelectiveForkModal(options: ModalOptions): void {
  // Remove any existing modal
  document.getElementById("forkline-modal-backdrop")?.remove();

  const { messages, currentIndex, currentSite, onConfirm, onCancel } = options;

  // Active messages up to the current turn
  const availableMessages = messages.filter((m) => m.index <= currentIndex);
  const excludedSet = new Set<number>();
  let compaction: "none" | "summary" = "none";
  const selectedSites = new Set<Site>([currentSite]);

  const backdrop = document.createElement("div");
  backdrop.id = "forkline-modal-backdrop";
  Object.assign(backdrop.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(4px)",
    zIndex: "2147483646",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  });

  const modal = document.createElement("div");
  modal.id = "forkline-modal";
  Object.assign(modal.style, {
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    width: "90%",
    maxWidth: "620px",
    maxHeight: "85vh",
    borderRadius: "14px",
    border: "1px solid #334155",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  });

  const calculateCurrentTokens = () => {
    const included = availableMessages.filter((m) => !excludedSet.has(m.index));
    const rawText = included.map((m) => m.text).join("\n\n");
    return checkTokenLimits(rawText, currentSite);
  };

  const renderContent = () => {
    const status = calculateCurrentTokens();
    const tokenBadgeColor = status.exceedsMax
      ? "#ef4444"
      : status.exceedsWarning
      ? "#f59e0b"
      : "#10b981";

    modal.innerHTML = `
      <div style="padding: 16px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h2 style="margin: 0; font-size: 18px; font-weight: 600; color: #f8fafc; display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
              <line x1="6" y1="3" x2="6" y2="15"></line>
              <circle cx="18" cy="6" r="3"></circle>
              <circle cx="6" cy="18" r="3"></circle>
              <path d="M18 9a9 9 0 0 1-9 9"></path>
            </svg>
            Forkline: Selective Context
          </h2>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">
            Forking up to message #${currentIndex + 1} (${availableMessages.length} turns)
          </div>
        </div>
        <button id="modal-close-btn" style="background: transparent; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px;">&times;</button>
      </div>

      <div style="padding: 16px 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;">
        <!-- Token preview indicator -->
        <div style="background: #1e293b; padding: 10px 14px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #334155;">
          <div>
            <span style="font-size: 13px; font-weight: 500; color: #cbd5e1;">Context Size:</span>
            <span style="font-size: 13px; font-weight: 700; color: ${tokenBadgeColor}; margin-left: 6px;">
              ~${status.tokens.toLocaleString()} tokens
            </span>
          </div>
          <span style="font-size: 11px; color: ${status.exceedsWarning ? "#f59e0b" : "#94a3b8"};">
            ${status.exceedsMax ? "Warning: Exceeds safe model limit!" : status.exceedsWarning ? "Warning: Approaching site context limit" : "Safe for model context"}
          </span>
        </div>

        <!-- Target models (Multi-model fork) -->
        <div>
          <label style="font-size: 13px; font-weight: 600; color: #e2e8f0; display: block; margin-bottom: 6px;">
            Target Model(s) <span style="font-size: 11px; font-weight: 400; color: #94a3b8;">(Select multiple for side-by-side multi-model comparison)</span>
          </label>
          <div style="display: flex; gap: 10px;">
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #1e293b; padding: 8px 12px; border-radius: 8px; border: 1px solid ${selectedSites.has("chatgpt") ? "#38bdf8" : "#334155"}; cursor: pointer; font-size: 13px;">
              <input type="checkbox" data-site="chatgpt" ${selectedSites.has("chatgpt") ? "checked" : ""} />
              ChatGPT
            </label>
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #1e293b; padding: 8px 12px; border-radius: 8px; border: 1px solid ${selectedSites.has("claude") ? "#38bdf8" : "#334155"}; cursor: pointer; font-size: 13px;">
              <input type="checkbox" data-site="claude" ${selectedSites.has("claude") ? "checked" : ""} />
              Claude
            </label>
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #1e293b; padding: 8px 12px; border-radius: 8px; border: 1px solid ${selectedSites.has("gemini") ? "#38bdf8" : "#334155"}; cursor: pointer; font-size: 13px;">
              <input type="checkbox" data-site="gemini" ${selectedSites.has("gemini") ? "checked" : ""} />
              Gemini
            </label>
          </div>
        </div>

        <!-- Smart Compaction option -->
        <div style="background: #1e293b; padding: 12px; border-radius: 8px; border: 1px solid #334155;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="compaction-checkbox" ${compaction === "summary" ? "checked" : ""} style="margin-top: 3px;" />
            <div>
              <div style="font-size: 13px; font-weight: 600; color: #f8fafc;">
                Smart Compaction (Preserve code, summarize older history)
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 2px;">
                Keeps the last 6 turns and all code snippets verbatim; compresses earlier turns into a compact digest.
              </div>
            </div>
          </label>
        </div>

        <!-- Turn Selection list -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 13px; font-weight: 600; color: #e2e8f0;">
              Include Messages:
            </label>
            <button id="toggle-all-btn" style="background: none; border: none; color: #38bdf8; font-size: 11px; cursor: pointer; text-decoration: underline;">
              ${excludedSet.size === 0 ? "Exclude All" : "Select All"}
            </button>
          </div>

          <div id="messages-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 220px; overflow-y: auto; padding-right: 4px;">
            ${availableMessages
              .map((msg) => {
                const isExcluded = excludedSet.has(msg.index);
                const roleBadge =
                  msg.role === "user"
                    ? '<span style="background: #0284c7; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">USER</span>'
                    : '<span style="background: #475569; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">AI</span>';

                const snippet = msg.text.slice(0, 120).replace(/</g, "&lt;");

                return `
                <div style="display: flex; align-items: center; gap: 10px; background: ${isExcluded ? "#0f172a" : "#1e293b"}; padding: 8px 10px; border-radius: 6px; border: 1px solid ${isExcluded ? "#334155" : "#475569"}; opacity: ${isExcluded ? "0.6" : "1"};">
                  <input type="checkbox" class="msg-checkbox" data-index="${msg.index}" ${isExcluded ? "" : "checked"} />
                  ${roleBadge}
                  <div style="font-size: 12px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                    ${snippet}...
                  </div>
                  ${msg.hasAttachments ? '<span title="Has attachment" style="font-size: 10px; color: #fbbf24;">📎</span>' : ""}
                  ${msg.codeBlocks ? '<span title="Has code" style="font-size: 10px; color: #38bdf8;">💻</span>' : ""}
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      </div>

      <div style="padding: 14px 20px; border-top: 1px solid #334155; display: flex; justify-content: flex-end; gap: 10px; background: #0b1120;">
        <button id="modal-cancel-btn" style="background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 8px 14px; border-radius: 6px; font-size: 13px; cursor: pointer;">
          Cancel
        </button>
        <button id="modal-fork-btn" style="background: #0284c7; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          Start Fork (${selectedSites.size} ${selectedSites.size > 1 ? "models" : "chat"})
        </button>
      </div>
    `;

    // Reattach listeners
    modal.querySelector("#modal-close-btn")?.addEventListener("click", () => {
      backdrop.remove();
      onCancel();
    });

    modal.querySelector("#modal-cancel-btn")?.addEventListener("click", () => {
      backdrop.remove();
      onCancel();
    });

    modal.querySelectorAll("input[data-site]").forEach((cb: any) => {
      cb.addEventListener("change", (e: any) => {
        const s = e.target.getAttribute("data-site") as Site;
        if (e.target.checked) selectedSites.add(s);
        else {
          if (selectedSites.size > 1) selectedSites.delete(s);
          else e.target.checked = true; // keep at least one
        }
        renderContent();
      });
    });

    modal.querySelector("#compaction-checkbox")?.addEventListener("change", (e: any) => {
      compaction = e.target.checked ? "summary" : "none";
      renderContent();
    });

    modal.querySelector("#toggle-all-btn")?.addEventListener("click", () => {
      if (excludedSet.size === 0) {
        availableMessages.forEach((m) => excludedSet.add(m.index));
      } else {
        excludedSet.clear();
      }
      renderContent();
    });

    modal.querySelectorAll(".msg-checkbox").forEach((cb: any) => {
      cb.addEventListener("change", (e: any) => {
        const idx = Number(e.target.getAttribute("data-index"));
        if (e.target.checked) excludedSet.delete(idx);
        else excludedSet.add(idx);
        renderContent();
      });
    });

    modal.querySelector("#modal-fork-btn")?.addEventListener("click", () => {
      backdrop.remove();
      onConfirm({
        excludedIndexes: Array.from(excludedSet),
        compaction,
        targetSites: Array.from(selectedSites),
      });
    });
  };

  renderContent();
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}
