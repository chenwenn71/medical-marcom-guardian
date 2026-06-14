import React, { useState } from "react";
import { Loader2, ExternalLink, Activity, Radar, MessageCircle, AlertTriangle, Sparkles } from "lucide-react";
import { callClaude, parseJSON } from "./shared.js";
import { PULSE_TOPIC, SOURCE_LINKS, fetchMarketChatter } from "./marketpulse.js";

const MARKET_SYS =
  'You are CadenSee Market Pulse, a market-intelligence summarizer for medtech marketing teams. You read raw patient and clinician chatter from public forums and return the top discussion themes for the week. This is MARKET CONTEXT, not regulatory review. Identify the 3 to 5 most significant themes. Derive the themes, sentiment, quotes, and insights ONLY from the RAW CHATTER — never from the ruleset. For each theme return: a short "title" phrase; "sentiment" exactly one of "positive", "neutral", "negative"; one short representative "quote" taken verbatim from the chatter; a "source" label copied exactly from the [SOURCE: ...] tag on that quote\'s line; and a one-line "insight" telling a marketer what to do with it. Then return one "positioningRisk": use the APPROVED RULESET only here — a single sentence flagging when an approved claim the user is allowed to make is contradicted by the dominant market theme, so the team avoids echoing it. If no approved claim is contradicted, set positioningRisk to "". Also return an overall "sentiment". Respond with ONLY valid minified JSON, no markdown fences: {"sentiment":"positive|neutral|negative","themes":[{"title":"...","sentiment":"positive|neutral|negative","quote":"...","source":"...","insight":"..."}],"positioningRisk":"..."}';

const SENT = {
  positive: { label: "Positive", cls: "bg-leaf-soft text-leaf-dark", dot: "#57B23A" },
  neutral: { label: "Neutral", cls: "bg-paper text-muted", dot: "#6B6E68" },
  negative: { label: "Negative", cls: "bg-risk-soft text-risk", dot: "#E5484D" },
};
const sentOf = (s) => SENT[s] || SENT.neutral;

function StatTile({ icon: Icon, value, label }) {
  return (
    <div className="flex-1 bg-white rounded-2xl border border-line shadow-sm px-4 py-3.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted mb-1.5">
        <Icon className="w-3.5 h-3.5 text-leaf-dark" /> {label}
      </div>
      <div className="font-display font-bold text-2xl text-ink leading-none">{value}</div>
    </div>
  );
}

export function MarketPulseView({ log, ruleset }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | done
  const [result, setResult] = useState(null);
  const [sources, setSources] = useState(0);
  const [error, setError] = useState("");

  async function generate() {
    setPhase("loading"); setError(""); setResult(null);
    try {
      const chatter = await fetchMarketChatter(PULSE_TOPIC);
      setSources(chatter.length);
      const blob = chatter.map((c) => `[SOURCE: ${c.source}] ${c.text}`).join("\n");
      // Ruleset is provided for positioning-risk reasoning ONLY; themes/sentiment come from chatter alone.
      const rulesetBlock = ruleset && ruleset.trim()
        ? `APPROVED RULESET (use ONLY for positioningRisk):\n${ruleset}\n\n`
        : "";
      const out = await callClaude(MARKET_SYS, `MARKET TOPIC: ${PULSE_TOPIC}\n\n${rulesetBlock}RAW CHATTER:\n${blob}`);
      setResult(parseJSON(out));
      setPhase("done");
      log(`market pulse generated · ${PULSE_TOPIC}`);
    } catch (e) {
      setError("Could not read the response. Generate again.");
      setPhase("idle");
    }
  }

  const themes = result?.themes || [];
  const overall = sentOf(result?.sentiment);

  return (
    <div className="flex-1 w-full max-w-[1100px] mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-line shadow-sm p-4 flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-leaf-dark" />
            <span className="text-[15px] font-semibold text-ink">Market Pulse</span>
            <span className="font-mono text-[10px] tracking-widest text-muted uppercase">{PULSE_TOPIC}</span>
          </div>
          <p className="text-[12.5px] text-muted mt-1">What patients and clinicians are actually saying — market context to shape your message, not regulatory review.</p>
        </div>
        <button onClick={generate} disabled={phase === "loading"}
          className="ml-auto shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-white bg-leaf hover:bg-leaf-dark disabled:opacity-50 rounded-lg px-4 py-2 transition-colors">
          {phase === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          {phase === "done" ? "Refresh pulse" : "Generate weekly pulse"}
        </button>
      </div>

      {error && <div className="text-[13px] text-risk bg-risk-soft rounded-lg p-3">{error}</div>}

      {phase === "idle" && !error && (
        <div className="bg-white rounded-2xl border border-line shadow-sm px-5 py-10 text-center text-[13px] text-muted">
          Generate this week's pulse to see the top discussion themes, sentiment, and positioning risks.
        </div>
      )}

      {phase === "loading" && (
        <div className="bg-white rounded-2xl border border-line shadow-sm px-5 py-10 text-center text-[13px] text-muted flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Scanning forums and summarizing themes…
        </div>
      )}

      {phase === "done" && result && (
        <>
          {/* Summary strip */}
          <div className="flex flex-col sm:flex-row gap-3">
            <StatTile icon={MessageCircle} value={themes.length} label="THEMES TRACKED" />
            <StatTile icon={Activity} value={overall.label} label="OVERALL SENTIMENT" />
            <StatTile icon={Radar} value={sources} label="SOURCES SCANNED" />
          </div>

          {/* Themes */}
          <div className="space-y-3">
            {themes.map((t, i) => {
              const s = sentOf(t.sentiment);
              const url = SOURCE_LINKS[t.source] || "#";
              return (
                <div key={i} className="bg-white rounded-2xl border border-line shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: s.dot }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="text-[14px] font-semibold text-ink">{t.title}</span>
                        <span className={`font-mono text-[10px] tracking-wide px-1.5 py-0.5 rounded ${s.cls}`}>{s.label.toUpperCase()}</span>
                      </div>
                      <div className="text-[13px] text-ink/80 italic leading-snug mb-2">"{t.quote}"</div>
                      <div className="flex items-center gap-3 mb-2.5">
                        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-leaf-dark hover:underline">
                          <ExternalLink className="w-3 h-3" /> {t.source}
                        </a>
                      </div>
                      <div className="flex items-start gap-1.5 text-[12.5px] text-ink bg-leaf-soft/50 rounded-lg px-2.5 py-2">
                        <Sparkles className="w-3.5 h-3.5 text-leaf-dark shrink-0 mt-0.5" />
                        <span className="leading-snug">{t.insight}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Positioning risk */}
          {result.positioningRisk && (
            <div className="bg-white rounded-2xl border border-caution/40 shadow-sm overflow-hidden">
              <div className="bg-caution-soft px-4 py-2.5 flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-caution">
                <AlertTriangle className="w-3.5 h-3.5" /> POSITIONING RISK
              </div>
              <p className="px-4 py-3 text-[13px] text-ink leading-snug">{result.positioningRisk}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
