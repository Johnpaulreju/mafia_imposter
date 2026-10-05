import { randomUUID } from "node:crypto";
import { STORY_LOCATIONS } from "./constants";
import { env } from "./env";
import type { MatchConfig } from "./types";

const templates = [
  "{WITNESS} was passing {LOCATION} when the silence suddenly felt wrong. A few steps later, they discovered {VICTIM} and froze at the scene.",
  "The lights flickered around {LOCATION}. {WITNESS} followed a strange sound and found {VICTIM} there, with no clear answer to what had happened.",
  "{WITNESS} noticed something unsettling near {LOCATION}. When they looked closer, {VICTIM} was already there, leaving everyone with more questions than answers.",
];

function templateStory(witness: string, victim: string, style: MatchConfig["storyStyle"]) {
  const location = STORY_LOCATIONS[Math.floor(Math.random() * STORY_LOCATIONS.length)];
  let template = templates[Math.floor(Math.random() * templates.length)];
  if (style === "FUNNY") template = "{WITNESS} was wandering around {LOCATION}, minding their own business, when they discovered {VICTIM} and immediately realized this was above their pay grade.";
  if (style === "CREEPY") template = "The silence around {LOCATION} felt unnatural. {WITNESS} followed a faint sound and found {VICTIM}, with no explanation for how the place had become so still.";
  return template.replaceAll("{WITNESS}", witness).replaceAll("{VICTIM}", victim).replaceAll("{LOCATION}", location);
}

const FORBIDDEN_WORDS = /\b(imposter|impostor|killer|murderer|assassin|mafia)\b/i;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Validates the raw AI output BEFORE placeholders are replaced with real names.
// The AI never sees player names, so any real name appearing in the raw text is a leak.
function validStory(text: string, playerNames: string[]) {
  if (text.length < 40 || text.length > 700) return false;
  if (!text.includes("VICTIM") || !text.includes("PLAYER_1")) return false;
  if (/PLAYER_(?!1\b)\d+|\bWITNESS\b|[{}[\]]/.test(text)) return false;
  if (FORBIDDEN_WORDS.test(text)) return false;
  for (const name of playerNames) {
    const trimmed = name.trim();
    if (trimmed.length >= 2 && new RegExp(`\\b${escapeRegex(trimmed)}\\b`, "i").test(text)) return false;
  }
  return true;
}

export async function generateStory(input: {
  victim: string;
  witness: string;
  allowedNames: string[];
  style: MatchConfig["storyStyle"];
}) {
  if (env.storyAiDisabled || !env.aiKey || !env.aiModel) {
    return { id: randomUUID(), text: templateStory(input.witness, input.victim, input.style), source: "template" as const };
  }

  const system = [
    "You are a fictional social-deduction narrator.",
    "Return exactly 2 or 3 short sentences.",
    "Refer to people ONLY with the exact placeholders PLAYER_1 (the witness) and VICTIM, each used at least once. Never invent or output any other name.",
    "Never identify, imply, or describe the killer.",
    "Never say imposter, killer, murderer, assassin, or who caused the death.",
    "Do not change the victim. Do not invent game results. Keep it mysterious, non-graphic, and suitable for friends.",
    `Style: ${input.style}.`,
  ].join(" ");

  const prompt = `Victim placeholder: VICTIM\nWitness placeholder: PLAYER_1\nAllowed placeholder PLAYER_1 represents the witness only.\nCreate a 2–3 sentence discovery scene.`;

  const body = JSON.stringify({
    model: env.aiModel,
    temperature: 0.8,
    max_tokens: 300,
    // Gemini 2.5 Flash "thinks" by default, which spends the token budget and adds latency.
    ...(env.aiModel.startsWith("gemini-2.5-flash") ? { reasoning_effort: "none" } : {}),
    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
  });

  // Hard overall deadline so the death reveal is never held up; one retry if time allows.
  const deadline = Date.now() + 4500;
  for (let attempt = 0; attempt < 2 && deadline - Date.now() > 800; attempt++) {
    try {
      const response = await fetch(env.aiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.aiKey}` },
        body,
        signal: AbortSignal.timeout(deadline - Date.now()),
      });
      if (!response.ok) throw new Error(`AI story request failed: ${response.status}`);
      const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const text = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (!validStory(text, input.allowedNames)) throw new Error("Story validation failed");
      const rendered = text.replaceAll("PLAYER_1", input.witness).replaceAll("VICTIM", input.victim);
      return { id: randomUUID(), text: rendered, source: "ai" as const };
    } catch (error) {
      console.warn(`[story] attempt ${attempt + 1} failed:`, error instanceof Error ? error.message : error);
    }
  }
  return { id: randomUUID(), text: templateStory(input.witness, input.victim, input.style), source: "template-fallback" as const };
}
