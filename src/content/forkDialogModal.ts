import { Message, Site, SourceSite } from "../shared/types";
import { checkTokenLimits } from "../core/tokens";

export interface ModalOptions {
  messages: Message[];
  currentIndex: number;
  currentSite: SourceSite;
  onConfirm: (options: {
    excludedIndexes: number[];
    compaction: "none" | "summary";
    targetSites: Site[];
    customLabel?: string;
  }) => void;
  onCancel: () => void;
}

export function openSelectiveForkModal(options: ModalOptions): void {
  document.getElementById("forkline-modal-backdrop")?.remove();

  const { messages, currentIndex, currentSite, onConfirm, onCancel } = options;

  const availableMessages = messages.filter((m) => m.index <= currentIndex);
  const excludedSet = new Set<number>();
  let compaction: "none" | "summary" = "none";
  let customLabel = "";
  const selectedSites = new Set<Site>([currentSite === "google" ? "chatgpt" : currentSite]);

  const backdrop = document.createElement("div");
  backdrop.id = "forkline-modal-backdrop";
  Object.assign(backdrop.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    backdropFilter: "blur(12px)",
    zIndex: "2147483646",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  });

  const modal = document.createElement("div");
  modal.id = "forkline-modal";
  Object.assign(modal.style, {
    backgroundColor: "#151515",
    color: "#f0f0f0",
    width: "90%",
    maxWidth: "540px",
    maxHeight: "88vh",
    borderRadius: "18px",
    border: "1px solid #303030",
    boxShadow: "0 28px 70px rgba(0, 0, 0, 0.65)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  });

  const cleanup = () => {
    backdrop.remove();
    window.removeEventListener("keydown", handleKeyDown);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      cleanup();
      onCancel();
    }
  };
  window.addEventListener("keydown", handleKeyDown);

  // Close when clicking outside modal
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      cleanup();
      onCancel();
    }
  });

  modal.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  const calculateCurrentTokens = () => {
    const included = availableMessages.filter((m) => !excludedSet.has(m.index));
    const rawText = included.map((m) => m.text).join("\n\n");
    return checkTokenLimits(rawText, currentSite === "google" ? "chatgpt" : currentSite);
  };

  const renderContent = () => {
    const status = calculateCurrentTokens();

    modal.innerHTML = `
      <div style="padding: 20px 22px 16px; border-bottom: 1px solid #303030; display: flex; justify-content: space-between; align-items: center; background: #151515;">
        <div>
          <div style="font-size: 16px; font-weight: 650; color: #ffffff; letter-spacing: -0.3px;">
            Selective Context Fork
          </div>
          <div style="font-size: 12px; color: #888888; margin-top: 3px;">
            Turn #${currentIndex + 1} (${availableMessages.length} total turns)
          </div>
        </div>
        <button id="modal-close-btn" aria-label="Close" style="background: transparent; border: none; color: #888888; font-size: 20px; line-height: 1; cursor: pointer; padding: 4px; border-radius: 999px;">&times;</button>
      </div>

      <div style="padding: 18px 22px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px; background: #151515;">
        <!-- Token preview box (matches ss1.png) -->
        <div style="background: #1d1d1d; padding: 12px 16px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #303030;">
          <div style="font-size: 12px; color: #b3b3b3;">
            Estimated context size: <b style="color: #ffffff; font-family: monospace;">~${status.tokens.toLocaleString()} tokens</b>
          </div>
          <span style="font-size: 11px; color: ${status.exceedsWarning ? "#f43f5e" : "#888888"}; font-weight: 500;">
            ${status.exceedsMax ? "Exceeds recommended limit" : status.exceedsWarning ? "High token count" : "Optimal"}
          </span>
        </div>

        <!-- Branch Title -->
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #ffffff; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span>Branch Title</span>
            <span style="font-size: 10px; color: #888888; font-weight: 400;">Auto-named by Gemini if blank</span>
          </label>
          <input
            type="text"
            id="branch-title-input"
            value="${customLabel}"
            placeholder="e.g. OpenRouter RAG Architecture (leave blank for AI)"
            style="width: 100%; box-sizing: border-box; padding: 9px 12px; background: #1d1d1d; border: 1px solid #303030; border-radius: 10px; color: #ffffff; font-size: 12px; font-family: inherit; outline: none;"
          />
        </div>

        <!-- Target Platform(s) (matches ss1.png) -->
        <div>
          <label style="font-size: 12px; font-weight: 600; color: #ffffff; display: block; margin-bottom: 8px;">
            Target Platform(s)
          </label>
          <div style="display: flex; gap: 8px;">
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #1d1d1d; padding: 10px 12px; border-radius: 10px; border: ${selectedSites.has("chatgpt") ? "1.5px solid #ffffff" : "1px solid #303030"}; cursor: pointer; font-size: 12px; color: ${selectedSites.has("chatgpt") ? "#ffffff" : "#b3b3b3"}; font-weight: 500; transition: all 0.12s ease;">
              <input type="checkbox" data-site="chatgpt" ${selectedSites.has("chatgpt") ? "checked" : ""} style="accent-color: #ffffff; cursor: pointer;" />
              ChatGPT
            </label>
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #1d1d1d; padding: 10px 12px; border-radius: 10px; border: ${selectedSites.has("claude") ? "1.5px solid #ffffff" : "1px solid #303030"}; cursor: pointer; font-size: 12px; color: ${selectedSites.has("claude") ? "#ffffff" : "#b3b3b3"}; font-weight: 500; transition: all 0.12s ease;">
              <input type="checkbox" data-site="claude" ${selectedSites.has("claude") ? "checked" : ""} style="accent-color: #ffffff; cursor: pointer;" />
              Claude
            </label>
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #1d1d1d; padding: 10px 12px; border-radius: 10px; border: ${selectedSites.has("gemini") ? "1.5px solid #ffffff" : "1px solid #303030"}; cursor: pointer; font-size: 12px; color: ${selectedSites.has("gemini") ? "#ffffff" : "#b3b3b3"}; font-weight: 500; transition: all 0.12s ease;">
              <input type="checkbox" data-site="gemini" ${selectedSites.has("gemini") ? "checked" : ""} style="accent-color: #ffffff; cursor: pointer;" />
              Gemini
            </label>
          </div>
        </div>

        <!-- Smart Compaction (matches ss1.png) -->
        <div style="background: #1d1d1d; padding: 13px 14px; border-radius: 12px; border: 1px solid #303030;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
            <input type="checkbox" id="compaction-checkbox" ${compaction === "summary" ? "checked" : ""} style="margin-top: 2px; accent-color: #ffffff; cursor: pointer;" />
            <div>
              <div style="font-size: 12px; font-weight: 600; color: #ffffff;">
                Smart Compaction
              </div>
              <div style="font-size: 11px; color: #888888; margin-top: 3px; line-height: 1.4;">
                Keep the last 6 turns and all code snippets verbatim; compress older turns.
              </div>
            </div>
          </label>
        </div>

        <!-- Included Messages (matches ss1.png) -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-size: 12px; font-weight: 600; color: #ffffff;">
              Included Messages
            </label>
            <button id="toggle-all-btn" style="background: none; border: none; color: #888888; font-size: 11px; cursor: pointer; text-decoration: underline;">
              ${excludedSet.size === 0 ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div id="messages-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 210px; overflow-y: auto;">
            ${availableMessages
              .map((msg) => {
                const isExcluded = excludedSet.has(msg.index);
                const roleBadge =
                  msg.role === "user"
                    ? '<span style="background: #27272a; color: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; font-family: monospace;">USER</span>'
                    : '<span style="background: #1c1c1f; color: #a1a1aa; border: 1px solid #303030; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; font-family: monospace;">AI</span>';

                const prefix = msg.role === "user" ? "You said " : "AI said ";
                const rawSnippet = msg.text.slice(0, 85).replace(/</g, "&lt;");
                const snippet = `${prefix}${rawSnippet}`;

                return `
                <div style="display: flex; align-items: center; gap: 8px; background: #1d1d1d; padding: 9px 12px; border-radius: 10px; border: 1px solid ${isExcluded ? "#262626" : "#303030"}; opacity: ${isExcluded ? "0.4" : "1"}; transition: all 0.12s ease;">
                  <input type="checkbox" class="msg-checkbox" data-index="${msg.index}" ${isExcluded ? "" : "checked"} style="accent-color: #ffffff; cursor: pointer;" />
                  ${roleBadge}
                  <div style="font-size: 11px; color: #d4d4d8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                    ${snippet}...
                  </div>
                  ${msg.hasAttachments ? '<span title="Attachment" style="font-size: 9px; color: #888888;">📎</span>' : ""}
                  ${msg.codeBlocks ? '<span title="Code" style="font-size: 9px; color: #f0f0f0;">💻</span>' : ""}
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      </div>

      <div style="padding: 14px 22px 18px; border-top: 1px solid #303030; display: flex; justify-content: flex-end; gap: 10px; background: #151515;">
        <button id="modal-cancel-btn" style="background: #242424; color: #ffffff; border: 1px solid #363636; padding: 9px 16px; border-radius: 999px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.12s ease;">
          Cancel
        </button>
        <button id="modal-fork-btn" style="background: #ffffff; color: #000000; border: none; padding: 9px 20px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: opacity 0.12s ease;">
          Start Fork (${selectedSites.size} ${selectedSites.size > 1 ? "chats" : "chat"})
        </button>
      </div>
    `;

    modal.querySelector("#modal-close-btn")?.addEventListener("click", () => {
      cleanup();
      onCancel();
    });

    modal.querySelector("#modal-cancel-btn")?.addEventListener("click", () => {
      cleanup();
      onCancel();
    });

    modal.querySelectorAll("input[data-site]").forEach((cb: any) => {
      cb.addEventListener("change", (e: any) => {
        const s = e.target.getAttribute("data-site") as Site;
        if (e.target.checked) selectedSites.add(s);
        else {
          if (selectedSites.size > 1) selectedSites.delete(s);
          else e.target.checked = true;
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

    modal.querySelector("#branch-title-input")?.addEventListener("input", (e: any) => {
      customLabel = e.target.value;
    });

    modal.querySelector("#modal-fork-btn")?.addEventListener("click", () => {
      cleanup();
      onConfirm({
        excludedIndexes: Array.from(excludedSet),
        compaction,
        targetSites: Array.from(selectedSites),
        customLabel: customLabel.trim() || undefined,
      });
    });
  };

  renderContent();
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}
