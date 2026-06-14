// Shared helpers used by the Workspace, Competitors, and Market Pulse views.
// Single seam to the serverless function so every view calls Claude the same way.

export const CHECK_SYS =
  'You are CadenSee, a regulatory marketing-compliance engine for medtech. Compare marketing CONTENT against an APPROVED RULESET and flag only genuine compliance problems: claims that exceed, contradict, or are not supported by the ruleset, plus prohibited language. Ignore style, tone, grammar. Be conservative and deterministic: flag only text that clearly violates an explicit rule in the ruleset. If a sentence does not clearly break a stated rule, do NOT flag it. Never flag the same text twice. For each problem return: the EXACT verbatim text from the content as "quote"; a "severity" of exactly one of "high" (overstated efficacy or safety, e.g. a figure above the approved limit), "prohibited" (banned superlative, comparative, off-label, or diagnosis or treatment language), or "unsupported" (a claim with no backing rule); a 3 to 5 word "issue" label; the specific "rule" it breaks; and a "suggestion". The suggestion MUST be a drop-in replacement for the exact quoted text: it has to fit the surrounding sentence grammar, keep the same capitalization as the first character of the quoted span, and not add or remove trailing punctuation. Do NOT restate the full approved claim; correct only the minimal span so the sentence still reads naturally. Respond with ONLY valid minified JSON, no markdown fences, no commentary: {"flags":[{"quote":"...","severity":"high|prohibited|unsupported","issue":"...","rule":"...","suggestion":"..."}]}. If there are no problems return {"flags":[]}.';

export const SEV = {
  high: { label: "High risk", chip: "bg-risk-soft text-risk", bar: "bg-risk", dot: "#E5484D", markBg: "rgba(229,72,77,.13)", markBorder: "#E5484D" },
  prohibited: { label: "Prohibited", chip: "bg-caution-soft text-caution", bar: "bg-caution", dot: "#D9870F", markBg: "rgba(217,135,15,.16)", markBorder: "#D9870F" },
  unsupported: { label: "Unsupported", chip: "bg-paper text-muted", bar: "bg-muted", dot: "#6B6E68", markBg: "rgba(107,110,104,.13)", markBorder: "#6B6E68" },
};
export const sevOf = (f) => SEV[f?.severity] || SEV.unsupported;
export const nowStamp = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

export async function callClaude(system, userContent) {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, userContent }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.text || "";
}

export function parseJSON(text) {
  return JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
}
