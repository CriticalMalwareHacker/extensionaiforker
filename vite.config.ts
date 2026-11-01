import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const isContentBuild = mode === "content";

  if (isContentBuild) {
    // Dedicated IIFE build for content script so Chrome can execute it directly without external chunk imports
    return {
      plugins: [],
      build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
          entry: path.resolve(__dirname, "src/content/index.ts"),
          name: "ForklineContent",
          formats: ["iife"],
          fileName: () => "content.js",
        },
        rollupOptions: {
          output: {
            extend: true,
          },
        },
      },
      define: {
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
    };
  }

  // Main build: Side panel (HTML + React) and Background Service Worker (ES module)
  return {
    base: "./",
    plugins: [
      react(),
      {
        name: "copy-manifest-and-assets",
        closeBundle() {
          const distDir = path.resolve(__dirname, "dist");
          if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir, { recursive: true });
          }

          // Copy manifest.json
          const manifest = fs.readFileSync(path.resolve(__dirname, "manifest.json"), "utf-8");
          fs.writeFileSync(path.join(distDir, "manifest.json"), manifest);

          // Copy public folder contents (icons)
          const publicDir = path.resolve(__dirname, "public");
          if (fs.existsSync(publicDir)) {
            fs.cpSync(publicDir, distDir, { recursive: true });
          }

          // Ensure sidepanel.html is at root of dist/
          const srcHtml = path.join(distDir, "src/sidepanel/index.html");
          if (fs.existsSync(srcHtml)) {
            fs.copyFileSync(srcHtml, path.join(distDir, "sidepanel.html"));
          }
        },
      },
    ],
    build: {
      outDir: "dist",
      emptyOutDir: true,
      rollupOptions: {
        input: {
          sidepanel: path.resolve(__dirname, "src/sidepanel/index.html"),
          background: path.resolve(__dirname, "src/background/index.ts"),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "background") {
              return "background.js";
            }
            return "assets/[name]-[hash].js";
          },
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  };
});
