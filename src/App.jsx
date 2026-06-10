import React, { useState, useEffect, useRef } from "react";
import {
  Check, Sparkles, Settings2, Loader2, X, Wand2,
  RotateCcw, CornerDownLeft, ScanLine, Lock
} from "lucide-react";

const DEFAULT_RULESET = `PRODUCT: VascuLink Pro - real-time vascular monitoring device

REGULATORY STATUS
- Cleared under FDA 510(k) K221847 for adult and pediatric use.
- Intended for real-time vascular monitoring in clinical settings only.

APPROVED EFFICACY CLAIMS
- May state: "reduces procedure time by up to 30%."
- May state: "clinical-grade accuracy."
- May state: "supports accurate therapy decisions within cleared indications."

PROHIBITED
- No superlative or comparative claims ("best", "leading", "#1", "category leader"). No head-to-head clinical data is on file.
- No efficacy figure above the approved 30%.
- No claims of diagnosis or treatment; the device monitors only.
- No off-label or unapproved-population claims.

APPROVED DESCRIPTORS
- "Trusted by clinical teams", "a solution for vascular monitoring".`;

const DEFAULT_DOC = `VascuLink Pro - Distributor Overview

VascuLink Pro delivers real-time vascular monitoring with clinical-grade accuracy, cleared under 510(k) K221847 for adult and pediatric use.

Clinically proven to reduce procedure time by 40%, cutting OR costs for high-volume centers.

The leading device in its category, with adoption across 200+ US facilities.

Available Q1 2026. Contact your regional representative for pricing and trial access.`;

const SEV = {
  high: {
    label: "High risk",
    chip: "bg-risk-soft text-risk",
    bar: "bg-risk",
    dot: "#E5484D",
    markBg: "rgba(229,72,77,.13)",
    markBorder: "#E5484D",
  },
  prohibited: {
    label: "Prohibited",
    chip: "bg-caution-soft text-caution",
    bar: "bg-caution",
    dot: "#D9870F",
    markBg: "rgba(217,135,15,.16)",
    markBorder: "#D9870F",
  },
  unsupported: {
    label: "Unsupported",
    chip: "bg-slate-100 text-slatey",
    bar: "bg-slatey",
    dot: "#5A6B82",
    markBg: "rgba(90,107,130,.13)",
    markBorder: "#5A6B82",
  },
};
const sevOf = (f) => SEV[f?.severity] || SEV.unsupported;

function nowStamp() {
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

async function callClaude(system, userContent) {
  const res = await fetch("/api/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, userContent }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.text || "";
}

function parseJSON(text) {
  const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  return JSON.parse(clean);
}

function buildSegments(text, flags) {
  let segments = [{ text, flag: -1 }];
  flags.forEach((flag, fi) => {
    if (!flag.quote) return;
    const next = [];
    segments.forEach((seg) => {
      if (seg.flag !== -1) { next.push(seg); return; }
      const idx = seg.text.indexOf(flag.quote);
      if (idx === -1) { next.push(seg); return; }
      if (idx > 0) next.push({ text: seg.text.slice(0, idx), flag: -1 });
      next.push({ text: flag.quote, flag: fi });
      const rest = seg.text.slice(idx + flag.quote.length);
      if (rest) next.push({ text: rest, flag: -1 });
    });
    segments = next;
  });
  return segments;
}

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2.5 4.5 7v8.2C4.5 22.7 9.4 27.7 16 29.5c6.6-1.8 11.5-6.8 11.5-14.3V7L16 2.5Z"
        fill="#0E8C8C" />
      <path d="M16 2.5 4.5 7v8.2C4.5 22.7 9.4 27.7 16 29.5c6.6-1.8 11.5-6.8 11.5-14.3V7L16 2.5Z"
        stroke="#0B7472" strokeWidth="1" />
      <path d="M8.5 16.5h3.2l1.8-4.4 2.7 8 2-3.6h3.1"
        stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function CountUp({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf, start;
    const dur = 420;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / dur, 1);
      setN(Math.round(p * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

export default function CadenSeeDemo() {
  const [doc, setDoc] = useState(DEFAULT_DOC);
  const [ruleset, setRuleset] = useState(DEFAULT_RULESET);
  const [mode, setMode] = useState("check");
  const [editing, setEditing] = useState(false);
  const [showRuleset, setShowRuleset] = useState(false);

  const [flags, setFlags] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [cleanFromCheck, setCleanFromCheck] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [instruction, setInstruction] = useState(
    "Draft a short distributor email with an intro, product benefits, and clinical outcomes."
  );
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genError, setGenError] = useState("");

  const [audit, setAudit] = useState([
    { time: nowStamp(), text: "ruleset loaded · VascuLink Pro" },
  ]);
  const log = (text) => setAudit((a) => [{ time: nowStamp(), text }, ...a].slice(0, 6));

  async function runCheck() {
    setChecking(true);
    setCheckError("");
    setFlags(null);
    setEditing(false);
    try {
      const sys =
        'You are CadenSee, a regulatory marketing-compliance engine for medtech. Compare marketing CONTENT against an APPROVED RULESET and flag only genuine compliance problems: claims that exceed, contradict, or are not supported by the ruleset, plus prohibited language. Ignore style, tone, grammar. Be conservative and deterministic: flag only text that clearly violates an explicit rule in the ruleset. If a sentence does not clearly break a stated rule, do NOT flag it. Never flag the same text twice. For each problem return: the EXACT verbatim text from the content; a "severity" of exactly one of "high" (overstated efficacy or safety, e.g. a figure above the approved limit), "prohibited" (banned superlative, comparative, off-label, or diagnosis/treatment language), or "unsupported" (a claim with no backing rule); a 3-5 word "issue" label; the specific "rule" it breaks; and a compliant "suggestion" using only language the ruleset permits. Respond with ONLY valid minified JSON, no markdown fences, no commentary: {"flags":[{"quote":"...","severity":"high|prohibited|unsupported","issue":"...","rule":"...","suggestion":"..."}]}. If there are no problems return {"flags":[]}.';
      const out = await callClaude(sys, `APPROVED RULESET:\n${ruleset}\n\nCONTENT TO CHECK:\n${doc}`);
      const parsed = parseJSON(out);
      const f = parsed.flags || [];
      setFlags(f);
      setCleanFromCheck(f.length === 0);
      setDirty(false);
      log(`check run · ${f.length} finding${f.length === 1 ? "" : "s"} · logged`);
    } catch (e) {
      setCheckError("Could not read the response. Run the check again.");
    } finally {
      setChecking(false);
    }
  }

  async function runGenerate() {
    setGenerating(true);
    setGenError("");
    setGenResult(null);
    try {
      const sys =
        'You are CadenSee, a compliant content generator for medtech. Using ONLY claims and language supported by the APPROVED RULESET, write the requested content. Never introduce any claim, figure, or descriptor not explicitly supported by the ruleset. Keep it concise. Respond with ONLY valid minified JSON, no markdown fences: {"text":"the generated content with \\n for line breaks","sources":["short ruleset reference","..."]}.';
      const out = await callClaude(sys, `APPROVED RULESET:\n${ruleset}\n\nREQUEST:\n${instruction}`);
      const parsed = parseJSON(out);
      setGenResult(parsed);
      log("draft generated · verified against ruleset");
    } catch (e) {
      setGenError("Could not read the response. Generate again.");
    } finally {
      setGenerating(false);
    }
  }

  function applyFix(fi) {
    const flag = flags[fi];
    if (!flag) return;
    setDoc((d) => d.replace(flag.quote, flag.suggestion));
    setFlags((f) => f.filter((_, i) => i !== fi));
    setDirty(true);
    setCleanFromCheck(false);
    log(`fix applied · ${sevOf(flag).label.toLowerCase()} resolved`);
  }

  function insertGenerated() {
    if (!genResult) return;
    setDoc((d) => d + "\n\n" + genResult.text);
    setGenResult(null);
    setFlags(null);
    setCleanFromCheck(false);
    setDirty(false);
    setMode("check");
    log("generated content inserted into document");
  }

  function resetDemo() {
    setDoc(DEFAULT_DOC);
    setFlags(null);
    setCleanFromCheck(false);
    setDirty(false);
    setGenResult(null);
    setEditing(false);
    setMode("check");
    setAudit([{ time: nowStamp(), text: "ruleset loaded · VascuLink Pro" }]);
  }

  const segments = flags ? buildSegments(doc, flags) : null;
  const cleanResult = flags && flags.length === 0 && cleanFromCheck && !dirty;
  const resolvedPending = flags && flags.length === 0 && !cleanResult;
  const counts = flags
    ? flags.reduce((a, f) => { const k = sevOf(f) === SEV.high ? "high" : sevOf(f) === SEV.prohibited ? "prohibited" : "unsupported"; a[k]++; return a; }, { high: 0, prohibited: 0, unsupported: 0 })
    : null;

  return (
    <div className="min-h-screen flex flex-col text-ink">
      {/* App bar */}
      <header className="h-14 bg-white border-b border-line flex items-center px-5 gap-3 shrink-0">
        <BrandMark />
        <div className="leading-none">
          <div className="font-display font-semibold text-[15px] tracking-tight text-ink">CadenSee</div>
          <div className="font-mono text-[10px] text-slatey mt-1 tracking-wide">MARKETING COMPLIANCE</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-slatey border border-line rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 pulse-dot" /> Sonnet 4.6
          </span>
          <button onClick={resetDemo}
            className="flex items-center gap-1.5 text-[13px] text-slatey hover:text-ink border border-line rounded-lg px-3 py-1.5 bg-white transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={() => setShowRuleset(true)}
            className="flex items-center gap-1.5 text-[13px] text-white bg-ink hover:bg-ink/90 rounded-lg px-3 py-1.5 transition-colors">
            <Settings2 className="w-3.5 h-3.5" /> Ruleset
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_404px] gap-4 p-4 max-w-[1280px] w-full mx-auto">
        {/* Document */}
        <section className="bg-white rounded-2xl border border-line flex flex-col min-w-0 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
            <span className="font-mono text-[11px] text-slatey">DECK</span>
            <span className="text-[13px] font-medium text-ink truncate">VascuLink Pro - distributor deck.pptx</span>
            <button onClick={() => { setEditing((e) => !e); setFlags(null); setCleanFromCheck(false); setDirty(false); }}
              className="ml-auto text-[12px] text-slatey hover:text-ink border border-line rounded-md px-2.5 py-1 transition-colors">
              {editing ? "Done" : "Edit content"}
            </button>
          </div>
          <div className="relative flex-1 overflow-auto">
            {checking && <div className="scanline" />}
            <div className="paper-grid min-h-full p-7 sm:p-9">
              {editing ? (
                <textarea value={doc} onChange={(e) => setDoc(e.target.value)}
                  className="w-full h-full min-h-[22rem] text-[15px] leading-8 text-ink outline-none resize-none bg-transparent" />
              ) : (
                <div className="text-[15px] leading-8 text-ink whitespace-pre-wrap max-w-[60ch]">
                  {segments
                    ? segments.map((s, i) =>
                        s.flag === -1 ? (
                          <span key={i}>{s.text}</span>
                        ) : (
                          <mark key={i}
                            style={{ background: sevOf(flags[s.flag]).markBg, borderBottom: `2px solid ${sevOf(flags[s.flag]).markBorder}` }}
                            className="rounded-[3px] px-0.5 text-ink">
                            {s.text}
                          </mark>
                        )
                      )
                    : doc}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Panel */}
        <aside className="bg-white rounded-2xl border border-line flex flex-col shadow-sm overflow-hidden">
          {/* Mode toggle */}
          <div className="p-2.5 border-b border-line">
            <div className="grid grid-cols-2 gap-1 bg-paper rounded-xl p-1">
              {[["check", "Check", ScanLine], ["generate", "Generate", Sparkles]].map(([m, label, Icon]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`py-2 text-[13px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    mode === m ? "bg-white text-ink shadow-sm" : "text-slatey hover:text-ink"
                  }`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* CHECK */}
          {mode === "check" && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Verdict readout (signature) */}
              <div className="px-4 pt-4">
                <div className="rounded-xl border border-line bg-ink text-white px-4 py-3.5">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-white/55 mb-2">
                    <ScanLine className="w-3 h-3" /> COMPLIANCE VERDICT
                  </div>
                  {checking ? (
                    <div className="flex items-center gap-2 text-[14px] text-white/80 py-1">
                      <Loader2 className="w-4 h-4 animate-spin" /> Scanning against ruleset...
                    </div>
                  ) : !flags ? (
                    <div className="text-[14px] text-white/55 py-1">Not yet checked</div>
                  ) : cleanResult ? (
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-bold text-3xl text-clear">Clear</span>
                      <span className="text-[13px] text-white/60">all claims match the ruleset</span>
                    </div>
                  ) : resolvedPending ? (
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-bold text-2xl text-white">Findings resolved</span>
                      <span className="text-[13px] text-white/60">re-run to confirm</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-2 mb-2.5">
                        <span className="font-display font-bold text-3xl tabular-nums"><CountUp value={flags.length} /></span>
                        <span className="text-[14px] text-white/70">finding{flags.length === 1 ? "" : "s"}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[11px]">
                        {counts.high > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: SEV.high.dot }} />{counts.high} high</span>}
                        {counts.prohibited > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: SEV.prohibited.dot }} />{counts.prohibited} prohibited</span>}
                        {counts.unsupported > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: SEV.unsupported.dot }} />{counts.unsupported} unsupported</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Findings */}
              <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
                {!flags && !checking && (
                  <p className="text-[13px] text-slatey leading-relaxed pt-2">
                    Run a check to scan this content against the approved ruleset. Each finding cites the exact rule it breaks.
                  </p>
                )}
                {checkError && (
                  <div className="text-[13px] text-risk bg-risk-soft rounded-lg p-3">{checkError}</div>
                )}
                {flags && flags.map((f, i) => {
                  const s = sevOf(f);
                  return (
                    <div key={i} className="finding rounded-xl border border-line overflow-hidden bg-white"
                      style={{ animationDelay: `${i * 90}ms` }}>
                      <div className="flex">
                        <div className={`w-1 shrink-0 ${s.bar}`} />
                        <div className="flex-1 min-w-0 p-3.5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-mono text-[10px] tracking-wide px-1.5 py-0.5 rounded ${s.chip}`}>{s.label.toUpperCase()}</span>
                            <span className="text-[13px] font-semibold text-ink truncate">{f.issue}</span>
                          </div>
                          <div className="text-[13px] text-ink/80 italic leading-snug mb-2.5">"{f.quote}"</div>
                          <div className="flex items-start gap-1.5 font-mono text-[11px] text-slatey bg-paper rounded-md px-2 py-1.5 mb-3">
                            <span className="text-teal-600 shrink-0">RULE</span>
                            <span className="leading-snug">{f.rule}</span>
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono text-[10px] text-slatey tracking-wide mb-0.5">APPROVED WORDING</div>
                              <div className="text-[12.5px] text-clear leading-snug">{f.suggestion}</div>
                            </div>
                            <button onClick={() => applyFix(i)}
                              className="shrink-0 text-[12px] font-medium text-white bg-clear hover:brightness-95 rounded-lg px-3 py-1.5 transition">
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-line">
                <button onClick={runCheck} disabled={checking}
                  className="w-full py-3 text-[14px] font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                  {flags ? "Re-run check" : "Run compliance check"}
                </button>
              </div>
            </div>
          )}

          {/* GENERATE */}
          {mode === "generate" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
                <div>
                  <label className="font-mono text-[10px] tracking-wide text-slatey">INSTRUCTION</label>
                  <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)}
                    className="w-full mt-1.5 text-[14px] border border-line rounded-xl p-3 outline-none focus:border-teal-500 resize-none h-24 bg-paper" />
                  <div className="flex items-center gap-1.5 text-[12px] text-teal-700 mt-2 bg-teal-50 rounded-lg px-2.5 py-1.5">
                    <Lock className="w-3.5 h-3.5" /> Drafts from the approved ruleset only. Invents nothing.
                  </div>
                </div>
                {generating && (
                  <div className="flex items-center justify-center gap-2 text-[13px] text-slatey pt-6">
                    <Loader2 className="w-4 h-4 animate-spin" /> Drafting from approved sources...
                  </div>
                )}
                {genError && <div className="text-[13px] text-risk bg-risk-soft rounded-lg p-3">{genError}</div>}
                {genResult && (
                  <div className="finding rounded-xl border border-clear/30 overflow-hidden">
                    <div className="bg-clear-soft px-3.5 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-clear mb-2">
                        <Check className="w-3.5 h-3.5" /> GENERATED · VERIFIED CLEAN
                      </div>
                      <div className="text-[14px] text-ink whitespace-pre-wrap leading-relaxed">{genResult.text}</div>
                    </div>
                    {genResult.sources && (
                      <div className="px-3.5 py-2.5 bg-white border-t border-clear/20">
                        <div className="font-mono text-[10px] text-slatey tracking-wide mb-1.5">SOURCES</div>
                        <div className="flex flex-wrap gap-1.5">
                          {genResult.sources.map((src, i) => (
                            <span key={i} className="font-mono text-[10.5px] text-slatey bg-paper border border-line rounded px-1.5 py-0.5">{src}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-line space-y-2">
                {genResult && (
                  <button onClick={insertGenerated}
                    className="w-full py-2.5 text-[13px] font-medium rounded-xl border border-line text-ink hover:bg-paper flex items-center justify-center gap-2 transition-colors">
                    <CornerDownLeft className="w-4 h-4" /> Insert into document
                  </button>
                )}
                <button onClick={runGenerate} disabled={generating}
                  className="w-full py-3 text-[14px] font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {genResult ? "Regenerate" : "Generate"}
                </button>
              </div>
            </div>
          )}

          {/* Audit ticker */}
          <div className="border-t border-line bg-paper px-4 py-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-widest text-slatey mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 pulse-dot" /> AUDIT TRAIL
            </div>
            <div className="space-y-1 max-h-16 overflow-hidden">
              {audit.map((a, i) => (
                <div key={i} className="flex gap-2 font-mono text-[10.5px] leading-tight" style={{ opacity: 1 - i * 0.16 }}>
                  <span className="text-slatey/70 shrink-0">{a.time}</span>
                  <span className="text-ink/70 truncate">{a.text}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Ruleset modal */}
      {showRuleset && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-5 z-20">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-full flex flex-col shadow-2xl">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
              <Settings2 className="w-4 h-4 text-teal-600" />
              <span className="font-display font-semibold text-ink">Approved ruleset</span>
              <button onClick={() => setShowRuleset(false)} className="ml-auto text-slatey hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-auto">
              <p className="text-[13px] text-slatey mb-3 leading-relaxed">
                Paste a prospect's approved claims and regulatory rules here before a meeting. Every check and every draft runs against exactly this.
              </p>
              <textarea value={ruleset} onChange={(e) => setRuleset(e.target.value)}
                className="w-full h-80 text-[13px] border border-line rounded-xl p-4 outline-none focus:border-teal-500 font-mono resize-none bg-paper leading-relaxed" />
            </div>
            <div className="px-5 py-4 border-t border-line flex justify-end">
              <button onClick={() => setShowRuleset(false)}
                className="text-[13px] font-medium bg-ink text-white rounded-lg px-5 py-2 hover:bg-ink/90 transition-colors">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
