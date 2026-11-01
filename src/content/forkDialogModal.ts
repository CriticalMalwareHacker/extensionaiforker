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
  const selectedSites = new Set<Site>([currentSite === "google" ? "chatgpt" : currentSite]);

  const backdrop = document.createElement("div");
  backdrop.id = "forkline-modal-backdrop";
  Object.assign(backdrop.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    backdropFilter: "blur(10px)",
    zIndex: "2147483646",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  });

  const modal = document.createElement("div");
  modal.id = "forkline-modal";
  Object.assign(modal.style, {
    backgroundColor: "#1b1b1b",
    color: "#fafafa",
    width: "90%",
    maxWidth: "540px",
    maxHeight: "85vh",
    borderRadius: "22px",
    border: "1px solid #303030",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.48)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  });

  const calculateCurrentTokens = () => {
    const included = availableMessages.filter((m) => !excludedSet.has(m.index));
    const rawText = included.map((m) => m.text).join("\n\n");
    return checkTokenLimits(rawText, currentSite === "google" ? "chatgpt" : currentSite);
  };

  const renderContent = () => {
    const status = calculateCurrentTokens();

    modal.innerHTML = `
      <div style="padding: 20px 22px 16px; border-bottom: 1px solid #303030; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 16px; font-weight: 600; color: #f1f1f1; letter-spacing: -0.3px;">
            Selective Context Fork
          </div>
          <div style="font-size: 12px; color: #9a9a9a; margin-top: 3px;">
            Turn #${currentIndex + 1} (${availableMessages.length} total turns)
          </div>
        </div>
        <button id="modal-close-btn" aria-label="Close" style="background: #272727; border: 1px solid #363636; border-radius: 999px; color: #b5b5b5; font-size: 18px; line-height: 1; cursor: pointer; width: 30px; height: 30px;">&times;</button>
      </div>

      <div style="padding: 18px 22px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 16px;">
        <!-- Token preview -->
        <div style="background: #252525; padding: 12px 14px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #303030;">
          <div style="font-size: 12px; color: #b3b3b3;">
            Estimated context size: <b style="color: #fafafa; font-family: monospace;">~${status.tokens.toLocaleString()} tokens</b>
          </div>
          <span style="font-size: 11px; color: ${status.exceedsWarning ? "#f43f5e" : "#71717a"};">
            ${status.exceedsMax ? "Exceeds recommended limit" : status.exceedsWarning ? "High token count" : "Optimal"}
          </span>
        </div>

        <!-- Target platforms -->
        <div>
          <label style="font-size: 12px; font-weight: 500; color: #e4e4e7; display: block; margin-bottom: 6px;">
            Open fork in
          </label>
          <div style="display: flex; gap: 8px;">
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #252525; padding: 10px; border-radius: 14px; border: 1px solid ${selectedSites.has("chatgpt") ? "#f0f0f0" : "#303030"}; cursor: pointer; font-size: 12px;">
              <input type="checkbox" data-site="chatgpt" ${selectedSites.has("chatgpt") ? "checked" : ""} />
              ChatGPT
            </label>
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #252525; padding: 10px; border-radius: 14px; border: 1px solid ${selectedSites.has("claude") ? "#f0f0f0" : "#303030"}; cursor: pointer; font-size: 12px;">
              <input type="checkbox" data-site="claude" ${selectedSites.has("claude") ? "checked" : ""} />
              Claude
            </label>
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #252525; padding: 10px; border-radius: 14px; border: 1px solid ${selectedSites.has("gemini") ? "#f0f0f0" : "#303030"}; cursor: pointer; font-size: 12px;">
              <input type="checkbox" data-site="gemini" ${selectedSites.has("gemini") ? "checked" : ""} />
              Gemini
            </label>
          </div>
        </div>

        <!-- Smart Compaction -->
        <div style="background: #252525; padding: 13px 14px; border-radius: 16px; border: 1px solid #303030;">
          <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="compaction-checkbox" ${compaction === "summary" ? "checked" : ""} style="margin-top: 2px;" />
            <div>
              <div style="font-size: 12px; font-weight: 500; color: #fafafa;">
                Compact earlier context
              </div>
              <div style="font-size: 11px; color: #9a9a9a; margin-top: 3px; line-height: 1.4;">
                Keep the last 6 turns and all code snippets verbatim; compress older turns.
              </div>
            </div>
          </label>
        </div>

        <!-- Message List -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 12px; font-weight: 500; color: #e4e4e7;">
              Included Messages
            </label>
            <button id="toggle-all-btn" style="background: none; border: none; color: #a1a1aa; font-size: 11px; cursor: pointer; text-decoration: underline;">
              ${excludedSet.size === 0 ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div id="messages-list" style="display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto;">
            ${availableMessages
              .map((msg) => {
                const isExcluded = excludedSet.has(msg.index);
                const roleBadge =
                  msg.role === "user"
                    ? '<span style="background: #27272a; color: #fafafa; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; font-family: monospace;">USER</span>'
                    : '<span style="background: #18181b; color: #a1a1aa; border: 1px solid #27272a; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 600; font-family: monospace;">AI</span>';

                const snippet = msg.text.slice(0, 100).replace(/</g, "&lt;");

                return `
                <div style="display: flex; align-items: center; gap: 8px; background: #252525; padding: 9px 11px; border-radius: 12px; border: 1px solid ${isExcluded ? "#292929" : "#353535"}; opacity: ${isExcluded ? "0.4" : "1"};">
                  <input type="checkbox" class="msg-checkbox" data-index="${msg.index}" ${isExcluded ? "" : "checked"} />
                  ${roleBadge}
                  <div style="font-size: 11px; color: #d4d4d8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">
                    ${snippet}...
                  </div>
                  ${msg.hasAttachments ? '<span title="Attachment" style="font-size: 9px; color: #a1a1aa;">📎</span>' : ""}
                  ${msg.codeBlocks ? '<span title="Code" style="font-size: 9px; color: #fafafa;">💻</span>' : ""}
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      </div>

      <div style="padding: 14px 22px 20px; border-top: 1px solid #303030; display: flex; justify-content: flex-end; gap: 8px; background: #1b1b1b;">
        <button id="modal-cancel-btn" style="background: #252525; color: #b5b5b5; border: 1px solid #363636; padding: 9px 14px; border-radius: 999px; font-size: 12px; cursor: pointer;">
          Cancel
        </button>
        <button id="modal-fork-btn" style="background: #f1f1f1; color: #161616; border: none; padding: 9px 16px; border-radius: 999px; font-size: 12px; font-weight: 650; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          Start Fork (${selectedSites.size} ${selectedSites.size > 1 ? "tabs" : "chat"})
        </button>
      </div>
    `;

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
