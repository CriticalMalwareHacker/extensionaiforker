import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));
app.use(express.json({ limit: "2mb" }));

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN;

if (process.env.NODE_ENV === "production" && !AUTH_TOKEN) {
  throw new Error("PROXY_AUTH_TOKEN must be set when running the proxy in production.");
}

// Auth middleware if token is set
app.use((req, res, next) => {
  if (AUTH_TOKEN) {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${AUTH_TOKEN}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
  next();
});

app.post("/v1/compact", async (req, res) => {
  const { text, mode } = req.body ?? {};
  if (typeof text !== "string" || text.length > 200_000) {
    return res.status(400).json({ error: "Invalid text input. Max 200k characters." });
  }

  const instruction =
    mode === "merge"
      ? "Summarize the conclusions, solutions, and decisions of this conversation branch in under 200 words. Keep it clear and actionable."
      : "Summarize this earlier conversation concisely. Preserve key names, technical parameters, architectural decisions, and open questions.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: `${instruction}\n\n${text}`,
    });

    res.json({ summary: response.text });
  } catch (err: any) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Summarization failed" });
  }
});

app.post("/v1/title", async (req, res) => {
  const { text } = req.body ?? {};
  if (typeof text !== "string") {
    return res.status(400).json({ error: "Invalid text input" });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: "Generate a 3 to 6 word title for this conversation. Reply with the title only:\n\n" + text.slice(0, 4000),
    });

    const title = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : "Branch Exploration";
    res.json({ title });
  } catch (err: any) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Title generation failed" });
  }
});

const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`Forkline Gemini Proxy listening on port ${PORT}`);
});

