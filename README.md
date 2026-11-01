# Forkline: AI Chat Forker (Chrome Extension)

> **Fork any AI chat from any message, carry full context into a new chat, and track branches in a visual tree.**

Forkline is a local-first Chrome extension (Manifest V3) that adds Git-like version control and branching to your conversations across ChatGPT, Claude, and Gemini.

---

## ✨ Features

- 🌿 **One-Click Forking:** Fork conversations from any message turn with all prior context automatically preserved.
- 🌳 **Visual Branch Tree:** Interactive React Flow graph in Chrome's side panel showing the lineage and evolution of all your chat branches.
- 🎯 **Selective Context:** Modal dialog with checkboxes to drop unneeded messages and control exact context.
- ⚡ **Smart Compaction:** Preserves the last $N$ turns and all code snippets verbatim; summarizes older turns into a compact digest.
- 🔀 **Branch Merge:** Summarize branch conclusions and paste the summary back into the parent conversation.
- 🤖 **Multi-Model Fork:** Fork the same context into ChatGPT, Claude, and Gemini simultaneously with automatic Chrome tab grouping.
- 🧠 **On-Device AI with Gemini Nano:** Chrome built-in AI (Prompt API & Summarizer API) for 100% private, instantaneous auto-naming and summarization.
- ☁️ **Cloud Run Fallback:** Lightweight Express proxy for Gemini API when on-device Nano is unavailable.
- 💾 **Local-First & Private:** All chat branches, references, and trees are stored locally in IndexedDB via Dexie. No tracking, no auto-submission.

---

## 🚀 Getting Started

### 1. Build the Extension

Ensure Node.js 18+ is installed:

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Build extension into dist/
npm run build
```

### 2. Load Extension in Chrome

1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in top right).
3. Click **Load unpacked**.
4. Select the `dist/` directory located in this repository (`devdays/dist`).
5. Pin **Forkline** to your Chrome toolbar.

---

## 📖 How It Works

```
+--------------------+       messages        +----------------------+
|  Content script    | <-------------------> |  Service worker      |
|  (per site adapter)|                       |  (background)        |
|  - find messages   |                       |  - storage (IndexedDB)|
|  - add fork buttons|                       |  - fork orchestration |
|  - insert context  |                       |  - AI calls           |
+--------------------+                       +----------+-----------+
                                                        |
                         +------------------------------+--------------+
                         |                              |              |
                 +-------v------+              +--------v-----+  +-----v--------+
                 | Side panel   |              | Gemini Nano  |  | Cloud Run    |
                 | (React, tree)|              | (on device)  |  | proxy -> Gemini API |
                 +--------------+              +--------------+  +--------------+
```

### 1. Forking a Conversation
1. Open any chat on [ChatGPT](https://chatgpt.com), [Claude](https://claude.ai), or [Gemini](https://gemini.google.com).
2. Hover over any message turn to reveal the **Fork** button.
3. Click **Fork** directly for a 1-click quick branch, or click the **▾** arrow for the **Selective Context & Multi-Model Dialog**:
   - Check/uncheck individual message turns.
   - Toggle **Smart Compaction**.
   - Select multiple target AI platforms.
4. A new tab opens with the formatted primer and conversation context inserted into the prompt box.
5. Review the context and press **Enter** to start your branch!

### 2. Navigating the Visual Tree
- Click the **Forkline** extension icon in your toolbar to open Chrome's Side Panel.
- View the branch graph in real time with model badges, token estimates, and lineage edges.
- Click **Open** on any node to jump directly to that conversation.
- Use the **Search bar** to filter branches by topic, tags, or platform.
- Click **Export** to save your branch tree as Markdown or JSON.

### 3. Merging Branches
1. Open the Side Panel and click **Merge** on any branch node.
2. Forkline auto-generates a summary of the branch's conclusions and decisions using Gemini.
3. Review and edit the summary in the merge dialog.
4. Click **Complete Merge** to switch back to the parent chat and insert the update!

---

## 🧪 Testing

Vitest is configured with jsdom to test site adapters against HTML snapshots:

```bash
npm test
```

Test coverage includes:
- `tests/adapters.test.ts`: Extraction from HTML fixtures for ChatGPT, Claude, and Gemini.
- `tests/core.test.ts`: Primer delimiters, token estimation, smart compaction partitioning, and branch merge logic.

---

## ☁️ Optional Cloud Run Proxy

A minimal proxy is provided in `proxy/` to call the Gemini API without exposing API keys:

```bash
cd proxy
npm install
export GEMINI_API_KEY="your-key"
npm start
```

Deploy to Google Cloud Run:
```bash
gcloud run deploy forkline-proxy \
  --source proxy \
  --region us-central1 \
  --set-secrets GEMINI_API_KEY=gemini-key:latest,PROXY_AUTH_TOKEN=forkline-proxy-token:latest \
  --allow-unauthenticated
```
Then paste the deployed HTTPS URL and its bearer token into Forkline's Side Panel **Settings**. Set `CORS_ORIGINS` only if a browser client (rather than the extension) needs to call the proxy.

---

## 📁 Repository Structure

```
forkline/
├── manifest.json            # Chrome MV3 manifest
├── package.json             # Scripts & dependencies
├── vite.config.ts           # Vite build pipeline (sidepanel, background, content)
├── public/icons/            # Extension icons (16, 48, 128)
├── src/
│   ├── background/
│   │   ├── index.ts         # Service worker message router
│   │   ├── forkService.ts   # Fork orchestration & tab manager
│   │   └── db.ts            # Dexie IndexedDB schema & settings
│   ├── content/
│   │   ├── index.ts         # Content script entry & observer
│   │   ├── forkButton.ts    # Message turn button injection
│   │   ├── forkDialogModal.ts# Selective context & multi-model modal
│   │   ├── inject.ts        # 3-step robust prompt insertion
│   │   └── toast.ts         # In-page toast feedback
│   ├── adapters/
│   │   ├── types.ts         # SiteAdapter interface
│   │   ├── chatgpt.ts       # ChatGPT DOM adapter
│   │   ├── claude.ts        # Claude DOM adapter
│   │   ├── gemini.ts        # Gemini DOM adapter
│   │   └── __fixtures__/    # Saved HTML fixtures for tests
│   ├── core/
│   │   ├── primer.ts        # Delimiter templates & formatting
│   │   ├── tokens.ts        # Token estimation & site limits
│   │   ├── compact.ts       # Smart compaction logic
│   │   └── merge.ts         # Merge summarization logic
│   ├── ai/
│   │   ├── nano.ts          # Chrome Built-in AI (Gemini Nano)
│   │   └── remote.ts        # Cloud Run proxy client
│   ├── sidepanel/
│   │   ├── index.html       # Side panel entry HTML
│   │   ├── index.tsx        # React mount
│   │   ├── App.tsx          # Side panel UI container & search
│   │   ├── BranchTree.tsx   # React Flow visual tree
│   │   ├── BranchNodeComponent.tsx # Tree node renderer
│   │   ├── MergeModal.tsx   # Branch merge UI
│   │   └── SettingsModal.tsx# Extension settings
│   └── shared/
│       └── types.ts         # Shared TypeScript interfaces
├── proxy/                   # Optional Cloud Run Gemini proxy
│   ├── server.ts
│   └── Dockerfile
└── tests/                   # Vitest unit test suite
```

