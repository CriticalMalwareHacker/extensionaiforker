import { Message, Site } from "../shared/types";
import { checkTokenLimits } from "../core/tokens";

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
  document.getElementById("forkline-modal-backdrop")?.remove();

  const { messages, currentIndex, currentSite, onConfirm, onCancel } = options;

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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    zIndex: "2147483646",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  });

  const modal = document.createElement("div");
  modal.id = "forkline-modal";
  Object.assign(modal.style, {
    backgroundColor: "#09090b",
    color: "#fafafa",
    width: "90%",
    maxWidth: "540px",
    maxHeight: "85vh",
    borderRadius: "10px",
    border: "1px solid #27272a",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
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

    modal.innerHTML = `
      <div style="padding: 14px 18px; border-bottom: 1px solid #18181b; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 14px; font-weight: 600; color: #fafafa; letter-spacing: -0.2px;">
            Selective Context Fork
          </div>
          <div style="font-size: 11px; color: #71717a; margin-top: 1px;">
            Turn #${currentIndex + 1} (${availableMessages.length} total turns)
          </div>
        </div>
        <button id="modal-close-btn" style="background: transparent; border: none; color: #71717a; font-size: 16px; cursor: pointer; padding: 4px;">&times;</button>
      </div>

      <div style="padding: 16px 18px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px;">
        <!-- Token preview -->
        <div style="background: #000000; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #27272a;">
          <div style="font-size: 12px; color: #a1a1aa;">
            Estimated context size: <b style="color: #fafafa; font-family: monospace;">~${status.tokens.toLocaleString()} tokens</b>
          </div>
          <span style="font-size: 11px; color: ${status.exceedsWarning ? "#f43f5e" : "#71717a"};">
            ${status.exceedsMax ? "Exceeds recommended limit" : status.exceedsWarning ? "High token count" : "Optimal"}
          </span>
        </div>

        <!-- Target platforms -->
        <div>
          <label style="font-size: 12px; font-weight: 500; color: #e4e4e7; display: block; margin-bottom: 6px;">
            Target Platform(s)
          </label>
          <div style="display: flex; gap: 8px;">
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #000000; padding: 7px 10px; border-radius: 6px; border: 1px solid ${selectedSites.has("chatgpt") ? "#ffffff" : "#27272a"}; cursor: pointer; font-size: 12px;">
              <input type="checkbox" data-site="chatgpt" ${selectedSites.has("chatgpt") ? "checked" : ""} />
              ChatGPT
            </label>
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #000000; padding: 7px 10px; border-radius: 6px; border: 1px solid ${selectedSites.has("claude") ? "#ffffff" : "#27272a"}; cursor: pointer; font-size: 12px;">
              <input type="checkbox" data-site="claude" ${selectedSites.has("claude") ? "checked" : ""} />
              Claude
            </label>
            <label style="flex: 1; display: flex; align-items: center; gap: 8px; background: #000000; padding: 7px 10px; border-radius: 6px; border: 1px solid ${selectedSites.has("gemini") ? "#ffffff" : "#27272a"}; cursor: pointer; font-size: 12px;">
              <input type="checkbox" data-site="gemini" ${selectedSites.has("gemini") ? "checked" : ""} />
              Gemini
            </label>
          </div>
        </div>

        <!-- Smart Compaction -->
        <div style="background: #000000; padding: 10px 12px; border-radius: 6px; border: 1px solid #18181b;">
          <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="compaction-checkbox" ${compaction === "summary" ? "checked" : ""} style="margin-top: 2px;" />
            <div>
              <div style="font-size: 12px; font-weight: 500; color: #fafafa;">
                Smart Compaction
              </div>
              <div style="font-size: 11px; color: #71717a; margin-top: 1px;">
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
                <div style="display: flex; align-items: center; gap: 8px; background: #000000; padding: 6px 10px; border-radius: 5px; border: 1px solid ${isExcluded ? "#18181b" : "#27272a"}; opacity: ${isExcluded ? "0.4" : "1"};">
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

      <div style="padding: 12px 18px; border-top: 1px solid #18181b; display: flex; justify-content: flex-end; gap: 8px; background: #000000;">
        <button id="modal-cancel-btn" style="background: transparent; color: #a1a1aa; border: 1px solid #27272a; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
          Cancel
        </button>
        <button id="modal-fork-btn" style="background: #ffffff; color: #000000; border: none; padding: 6px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
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
