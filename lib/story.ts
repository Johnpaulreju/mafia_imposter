import { randomUUID } from "node:crypto";
import { STORY_LOCATIONS } from "./constants";
import { env } from "./env";
import type { MatchConfig } from "./types";

const templatesByStyle: Record<MatchConfig["storyStyle"], string[]> = {
  MYSTERY: [
    "{WITNESS} was passing {LOCATION} when a stopped clock caught their attention. A few steps later, they discovered {VICTIM}—and one set of footprints that ended at the wall.",
    "The lights flickered around {LOCATION}. {WITNESS} followed the sound of a phone ringing and found {VICTIM}, but the call had already ended.",
    "{WITNESS} noticed an open door near {LOCATION} that everyone remembered closing. Inside, {VICTIM} was gone from the game and a chair was still rocking.",
    "A handwritten note appeared near {LOCATION}: ‘You were looking the wrong way.’ {WITNESS} turned the corner and found {VICTIM}.",
  ],
  CINEMATIC: [
    "Rain hammered the windows of {LOCATION} as every light went dark. When the emergency glow returned, {WITNESS} saw {VICTIM} and the shadow of a door swinging shut.",
    "A distant alarm echoed through {LOCATION}. {WITNESS} arrived just as the last light faded, leaving {VICTIM} at the center of an unfinished scene.",
    "The music stopped mid-note at {LOCATION}. A spotlight snapped on, revealing {VICTIM} while {WITNESS} stood frozen at the edge of the room.",
    "Fog rolled through {LOCATION} and swallowed the far end of the hall. {WITNESS} stepped through it and discovered {VICTIM}, moments too late.",
  ],
  FUNNY: [
    "{WITNESS} went to {LOCATION} looking for snacks and found {VICTIM} instead. The snacks were also missing, which somehow made the situation feel personal.",
    "A suspiciously dramatic noise came from {LOCATION}. {WITNESS} rushed in, found {VICTIM}, and immediately regretted wearing squeaky shoes.",
    "{WITNESS} followed a trail of crumbs through {LOCATION}. It led to {VICTIM}, an empty plate, and absolutely no useful explanation.",
    "Someone had rearranged everything in {LOCATION} by colour. {WITNESS} admired the effort for three seconds before noticing {VICTIM}.",
  ],
  CREEPY: [
    "The silence around {LOCATION} felt unnatural. {WITNESS} heard their name whispered once, then found {VICTIM} beneath a light that would not stop flickering.",
    "Every door in {LOCATION} closed at the same time. When {WITNESS} opened the nearest one, {VICTIM} was waiting on the other side—completely still.",
    "{WITNESS} saw a reflection move in the glass at {LOCATION}, but nobody stood behind them. When they turned back, they discovered {VICTIM}.",
    "A slow knocking travelled through {LOCATION}, always one room ahead. It stopped the moment {WITNESS} found {VICTIM}.",
  ],
};

function templateStory(witness: string, victim: string, style: MatchConfig["storyStyle"]) {
  const location = STORY_LOCATIONS[Math.floor(Math.random() * STORY_LOCATIONS.length)];
  const templates = templatesByStyle[style];
  const template = templates[Math.floor(Math.random() * templates.length)];
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
