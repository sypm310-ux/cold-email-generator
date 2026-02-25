import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = express();
app.use(cors());
app.use(express.json());

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

let toneProfile = "";

const COLD_EMAIL_SYSTEM = `You are an expert cold email copywriter. Generate concise, professional cold emails that:
- Start with a personalized hook (reference their company/role when possible)
- Clearly state the value proposition in 1-2 sentences
- Include a single, low-friction call to action
- Are under 150 words
- Sound human and avoid spammy language or excessive punctuation
- Do NOT use subject lines that are clickbait or all caps

Return ONLY the email body and a subject line. Format your response exactly like this:
SUBJECT: [subject line here]
---
[email body here]`;

const FOLLOW_UP_SYSTEM = `You are an expert cold email copywriter. Generate a brief FOLLOW-UP email that:
- References that you reached out before (do not repeat the full original email)
- Is shorter than the first email (under 80 words)
- Adds one new angle, reminder, or gentle value (e.g. a specific result, a short case note, or "still relevant?")
- Has a single, low-friction call to action (e.g. reply, quick call, or "no thanks" option)
- Sounds human and never pushy or desperate
- Uses a subject line that works for a follow-up (e.g. Re: [original topic], or a short question)

Return ONLY the email body and a subject line. Format your response exactly like this:
SUBJECT: [subject line here]
---
[email body here]`;

async function generateEmail(systemPrompt, userPrompt) {
  const toneSnippet = toneProfile
    ? `\n\nWhen writing, strictly mimic this tone of voice profile (do not mention that you are doing so):\n${toneProfile.trim()}`
    : "";

  const fullPrompt = `${systemPrompt}${toneSnippet}\n\n---\n\n${userPrompt}`;
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: fullPrompt,
  });
  const text = (response?.text ?? String(response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "")).trim();
  const subjectMatch = text.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
  const subject = subjectMatch ? subjectMatch[1].trim() : "";
  const body = text
    .replace(/SUBJECT:\s*.+?\n---\s*\n?/is, "")
    .replace(/^---\s*\n?/i, "")
    .trim();
  return { subject, body, raw: text };
}

async function createToneProfileFromExamples(emailsText) {
  const systemPrompt = `You are an expert writing style analyst.

Given several example emails from the SAME person, you will distill their *tone of voice* and *writing style* into a concise profile that another AI can follow.

Focus on:
- Formality vs. casualness
- Sentence length and rhythm
- Use of humor, emojis, and contractions
- How direct or indirect they are with asks
- Typical sign-offs and greetings
- Any consistent patterns in phrasing or structure.

Write the profile in second person, as instructions to a writer (\"you\"). Keep it under 250 words.`;

  const userPrompt = `Here are example emails from the same person. Analyze and summarize their tone of voice and writing style into a concise profile that a model can mimic on future emails.

EXAMPLE EMAILS (verbatim, in chronological order):
${emailsText}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `${systemPrompt}\n\n---\n\n${userPrompt}`,
  });

  const text = (response?.text ?? String(response?.candidates?.[0]?.content?.parts?.[0]?.text ?? "")).trim();
  return text;
}

app.post("/api/tone-profile", async (req, res) => {
  try {
    const { examplesText } = req.body || {};

    if (!examplesText || !examplesText.trim()) {
      return res.status(400).json({
        error: "Please paste 5–20 previous emails into the text box.",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: "Server misconfiguration: GEMINI_API_KEY is not set.",
      });
    }

    const maxChars = 25000;
    const clipped = examplesText.length > maxChars ? examplesText.slice(0, maxChars) : examplesText;

    const profile = await createToneProfileFromExamples(clipped);
    toneProfile = profile;

    res.json({
      message: "Tone of voice profile created and will be used for future emails.",
      profile,
    });
  } catch (err) {
    console.error("Tone profile error:", err);
    res.status(500).json({
      error: err?.message || "Failed to create tone profile",
    });
  }
});

app.post("/api/generate", async (req, res) => {
  const {
    productOrService,
    targetAudience,
    extraContext,
    tone,
    firstName,
    role,
    company,
    hook,
    valueProp,
    cta,
  } = req.body;

  if (!productOrService?.trim()) {
    return res.status(400).json({
      error: "Missing required field: productOrService",
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: "Server misconfiguration: GEMINI_API_KEY is not set.",
    });
  }

  const recipientLines = [];
  if (firstName?.trim()) recipientLines.push(`- First name: ${firstName.trim()}`);
  if (role?.trim()) recipientLines.push(`- Role: ${role.trim()}`);
  if (company?.trim()) recipientLines.push(`- Company: ${company.trim()}`);
  if (!recipientLines.length) recipientLines.push("- (not provided)");

  const personalisation = (hook?.trim() || targetAudience?.trim() || "").trim();
  const value = (valueProp?.trim() || "").trim();
  const callToAction = (cta?.trim() || "").trim();

  const userPromptParts = [
    "Write a cold email with these exact details. Do not swap, merge, or confuse the following sections.",
    "",
    "RECIPIENT (use these correctly in the email):",
    ...recipientLines,
    "",
    "HOOK / PERSONALISATION (open with something about them; use only this for the opener):",
    personalisation || "(none provided)",
    "",
    "YOUR OFFER:",
    `- Product/Service: ${productOrService.trim()}`,
    value ? `- Value proposition: ${value}` : "",
    callToAction ? `- Call to action: ${callToAction}` : "",
    tone?.trim() ? `- Tone: ${tone.trim()}` : "",
    extraContext?.trim() ? `- Other context: ${extraContext.trim()}` : "",
  ].filter(Boolean);

  const userPromptFull = userPromptParts.join("\n");

  try {
    const result = await generateEmail(COLD_EMAIL_SYSTEM, userPromptFull);
    res.json(result);
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({
      error: err?.message || "Failed to generate email",
    });
  }
});

app.post("/api/generate-follow-up", async (req, res) => {
  const {
    originalSubject,
    originalBody,
    followUpNumber = 1,
    productOrService,
    targetAudience,
    extraContext,
    tone,
    firstName,
    role,
    company,
    hook,
    valueProp,
    cta,
  } = req.body;

  if (!originalSubject?.trim() || !originalBody?.trim()) {
    return res.status(400).json({
      error: "Missing required fields: originalSubject and originalBody",
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: "Server misconfiguration: GEMINI_API_KEY is not set.",
    });
  }

  const num = Math.max(1, Math.min(Number(followUpNumber) || 1, 5));
  const followUpLabel = num === 1 ? "first" : num === 2 ? "second" : num === 3 ? "third" : `${num}th`;

  const recipientParts = [];
  if (firstName?.trim()) recipientParts.push(firstName.trim());
  if (role?.trim()) recipientParts.push(role.trim());
  if (company?.trim()) recipientParts.push(company.trim());
  const recipientLine = recipientParts.length ? "RECIPIENT: " + recipientParts.join(", ") : "";
  const personalisation = (hook?.trim() || targetAudience?.trim() || "").trim();
  const value = (valueProp?.trim() || "").trim();
  const callToAction = (cta?.trim() || "").trim();

  const userPromptParts = [
    "Write a follow-up email. Do not swap or confuse the following with the original email.",
    "",
    "ORIGINAL EMAIL YOU SENT:",
    `Subject: ${originalSubject.trim()}`,
    `Body:\n${originalBody.trim()}`,
    "",
    `This is the ${followUpLabel} follow-up (no reply yet).`,
    "",
    recipientLine,
    personalisation ? `HOOK / PERSONALISATION: ${personalisation}` : "",
    productOrService?.trim() ? `Product/Service: ${productOrService.trim()}` : "",
    value ? `Value proposition: ${value}` : "",
    callToAction ? `Call to action: ${callToAction}` : "",
    tone?.trim() ? `Tone: ${tone.trim()}` : "",
    extraContext?.trim() ? `Other: ${extraContext.trim()}` : "",
  ].filter(Boolean);

  const userPromptFull = userPromptParts.join("\n");

  try {
    const result = await generateEmail(FOLLOW_UP_SYSTEM, userPromptFull);
    res.json(result);
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({
      error: err?.message || "Failed to generate follow-up email",
    });
  }
});

app.post("/api/refine", async (req, res) => {
  const { subject, body, operation } = req.body || {};

  if (!subject?.trim() || !body?.trim()) {
    return res.status(400).json({
      error: "Missing required fields: subject and body",
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: "Server misconfiguration: GEMINI_API_KEY is not set.",
    });
  }

  const op = String(operation || "").toLowerCase();
  let instruction;
  if (op === "shorter") {
    instruction =
      "Rewrite this email to be noticeably shorter while preserving clarity, intent, and core call to action. Remove filler and redundancy.";
  } else if (op === "punchier") {
    instruction =
      "Rewrite this email to be more punchy and dynamic while staying professional and non-salesy. Sharpen hooks and tighten phrasing.";
  } else if (op === "more-formal") {
    instruction =
      "Rewrite this email to be more formal and polished while preserving the same intent and call to action.";
  } else {
    instruction =
      "Rewrite this email with small improvements to clarity and flow, preserving the same intent and call to action.";
  }

  const userPrompt = `SUBJECT: ${subject.trim()}
---
${body.trim()}

${instruction}

Return ONLY the updated email in the same format:
SUBJECT: [subject]
---
[body]`;

  try {
    const result = await generateEmail(COLD_EMAIL_SYSTEM, userPrompt);
    res.json(result);
  } catch (err) {
    console.error("Gemini refine error:", err);
    res.status(500).json({
      error: err?.message || "Failed to refine email",
    });
  }
});

const PORT = process.env.PORT || 3001;

if (isProduction) {
  const distPath = path.join(__dirname, "client", "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(isProduction ? `Server running on port ${PORT}` : `Server running at http://localhost:${PORT}`);
});
