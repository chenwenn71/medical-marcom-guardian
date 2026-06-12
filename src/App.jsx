import React, { useState, useEffect } from "react";
import {
  Check, Sparkles, Settings2, Loader2, X, Wand2, Plus,
  RotateCcw, CornerDownLeft, ScanLine, Lock, FileText, ClipboardPaste, ChevronDown
} from "lucide-react";

const EXAMPLE_RULESET = `PRODUCT: VascuLink Pro - real-time vascular monitoring device

REGULATORY STATUS
- Cleared under FDA 510(k) K221847 for adult and pediatric use.
- Intended for real-time vascular monitoring in clinical settings only.

APPROVED EFFICACY CLAIMS
- May state: "reduces procedure time by up to 30%."
- May state: "clinical-grade accuracy."
- May state: "supports accurate therapy decisions within cleared indications."

PROHIBITED
- No superlative or comparative claims ("best", "leading", "#1", "category leader"). No head-to-head clinical data is on file.
- No efficacy figure above the approved limit stated above.
- No claims of diagnosis or treatment; the device monitors only.
- No off-label or unapproved-population claims.

APPROVED DESCRIPTORS
- "Trusted by clinical teams", "a solution for vascular monitoring".`;

const EXAMPLE_DOC = `VascuLink Pro - Distributor Overview

VascuLink Pro delivers real-time vascular monitoring with clinical-grade accuracy, cleared under 510(k) K221847 for adult and pediatric use.

Clinically proven to reduce procedure time by 40%, cutting OR costs for high-volume centers.

The leading device in its category, with adoption across 200+ US facilities.

Available Q1 2026. Contact your regional representative for pricing and trial access.`;

const CONTENT_TYPES = ["Website copy", "Brochure", "RFQ response", "Email", "Social post", "Datasheet"];

const SEV = {
  high: { label: "High risk", chip: "bg-risk-soft text-risk", bar: "bg-risk", dot: "#E5484D", markBg: "rgba(229,72,77,.13)", markBorder: "#E5484D" },
  prohibited: { label: "Prohibited", chip: "bg-caution-soft text-caution", bar: "bg-caution", dot: "#D9870F", markBg: "rgba(217,135,15,.16)", markBorder: "#D9870F" },
  unsupported: { label: "Unsupported", chip: "bg-paper text-muted", bar: "bg-muted", dot: "#6B6E68", markBg: "rgba(107,110,104,.13)", markBorder: "#6B6E68" },
};
const sevOf = (f) => SEV[f?.severity] || SEV.unsupported;

const nowStamp = () => new Date().toLocaleTimeString("en-GB", { hour12: false });

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

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex items-center">
        <span className="font-logo font-bold text-[23px] leading-none text-ink tracking-tight">cadensee</span>
        <span className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-[5px] bg-leaf text-white ml-1 mb-1.5 self-end">
          <Plus className="w-3 h-3" strokeWidth={3.5} />
        </span>
      </div>
      <span className="hidden sm:block w-px h-5 bg-line" />
      <span className="hidden sm:block font-mono text-[10px] tracking-widest text-muted uppercase">Marketing compliance</span>
    </div>
  );
}

function CountUp({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / 420, 1);
      setN(Math.round(p * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

export default function CadenSeeDemo() {
  const [doc, setDoc] = useState("");
  const [ruleset, setRuleset] = useState("");
  const [mode, setMode] = useState("check");
  const [editing, setEditing] = useState(false);
  const [showRuleset, setShowRuleset] = useState(false);

  const [flags, setFlags] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [cleanFromCheck, setCleanFromCheck] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [instruction, setInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genError, setGenError] = useState("");

  const [audit, setAudit] = useState([]);
  const log = (text) => setAudit((a) => [{ time: nowStamp(), text }, ...a].slice(0, 6));

  const hasDoc = doc.trim().length > 0;
  const hasRules = ruleset.trim().length > 0;

  function clearVerdict() { setFlags(null); setCleanFromCheck(false); setDirty(false); }

  async function runCheck() {
    if (!hasDoc || !hasRules) return;
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
    if (!hasRules) { setShowRuleset(true); return; }
    if (!instruction.trim()) return;
    setGenerating(true);
    setGenError("");
    setGenResult(null);
    try {
      const sys =
        `You are CadenSee, a compliant content generator for medtech. Write ${contentType} for the request below, using ONLY claims and language supported by the APPROVED RULESET. Never introduce any claim, figure, or descriptor not explicitly supported by the ruleset. Keep it concise and appropriate for ${contentType}. Respond with ONLY valid minified JSON, no markdown fences: {"text":"the generated content with \\n for line breaks","sources":["short ruleset reference","..."]}.`;
      const out = await callClaude(sys, `APPROVED RULESET:\n${ruleset}\n\nREQUEST:\n${instruction}`);
      const parsed = parseJSON(out);
      setGenResult(parsed);
      log(`draft generated · ${contentType.toLowerCase()} · verified`);
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
    setDoc((d) => (d ? d + "\n\n" : "") + genResult.text);
    setGenResult(null);
    clearVerdict();
    setMode("check");
    log("generated content inserted into document");
  }

  function loadExampleDoc() { setDoc(EXAMPLE_DOC); setEditing(false); clearVerdict(); log("example content loaded"); }
  function loadExampleRules() { setRuleset(EXAMPLE_RULESET); log("example ruleset loaded"); }

  function resetDemo() {
    setDoc(""); setRuleset(""); clearVerdict();
    setGenResult(null); setInstruction(""); setEditing(false);
    setContentType(CONTENT_TYPES[0]); setMode("check"); setAudit([]);
  }

  const segments = (flags && hasDoc) ? buildSegments(doc, flags) : null;
  const cleanResult = flags && flags.length === 0 && cleanFromCheck && !dirty;
  const resolvedPending = flags && flags.length === 0 && !cleanResult;
  const counts = flags
    ? flags.reduce((a, f) => { const k = f.severity === "high" ? "high" : f.severity === "prohibited" ? "prohibited" : "unsupported"; a[k] = (a[k] || 0) + 1; return a; }, { high: 0, prohibited: 0, unsupported: 0 })
    : null;

  return (
    <div className="min-h-screen flex flex-col text-ink">
      {/* App bar */}
      <header className="h-16 bg-white border-b border-line flex items-center px-6 gap-3 shrink-0">
        <Wordmark />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-muted border border-line rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-leaf pulse-dot" /> Sonnet 4.6
          </span>
          <button onClick={resetDemo}
            className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink border border-line rounded-lg px-3 py-1.5 bg-white transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={() => setShowRuleset(true)}
            className={`flex items-center gap-1.5 text-[13px] rounded-lg px-3 py-1.5 transition-colors ${
              hasRules ? "text-white bg-ink hover:bg-ink/90" : "text-white bg-leaf hover:bg-leaf-dark"
            }`}>
            <Settings2 className="w-3.5 h-3.5" /> {hasRules ? "Ruleset" : "Add ruleset"}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_410px] gap-4 p-4 max-w-[1320px] w-full mx-auto">
        {/* Document */}
        <section className="bg-white rounded-2xl border border-line flex flex-col min-w-0 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
            <span className="font-mono text-[11px] text-muted">DOC</span>
            <span className="text-[13px] font-medium text-ink truncate">{hasDoc ? "Document under review" : "No document"}</span>
            {hasDoc && (
              <button onClick={() => { setEditing((e) => !e); clearVerdict(); }}
                className="ml-auto text-[12px] text-muted hover:text-ink border border-line rounded-md px-2.5 py-1 transition-colors">
                {editing ? "Done" : "Edit content"}
              </button>
            )}
          </div>
          <div className="relative flex-1 overflow-auto">
            {checking && <div className="scanline" />}
            {!hasDoc && !editing ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-8 py-16">
                <div className="w-12 h-12 rounded-xl bg-paper flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-muted" />
                </div>
                <div className="text-[15px] font-medium text-ink mb-1">No content loaded</div>
                <p className="text-[13px] text-muted max-w-xs mb-5 leading-relaxed">
                  Paste the marketing copy you want to check against the approved ruleset.
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-white bg-leaf hover:bg-leaf-dark rounded-lg px-3.5 py-2 transition-colors">
                    <ClipboardPaste className="w-4 h-4" /> Paste content
                  </button>
                  <button onClick={loadExampleDoc}
                    className="text-[13px] text-muted hover:text-ink border border-line rounded-lg px-3.5 py-2 transition-colors">
                    Load example
                  </button>
                </div>
              </div>
            ) : (
              <div className="paper-grid min-h-full p-7 sm:p-9">
                {editing ? (
                  <textarea autoFocus value={doc} onChange={(e) => setDoc(e.target.value)}
                    placeholder="Paste your marketing copy here..."
                    className="w-full h-full min-h-[24rem] text-[15px] leading-8 text-ink outline-none resize-none bg-transparent placeholder:text-muted/60" />
                ) : (
                  <div className="text-[15px] leading-8 text-ink whitespace-pre-wrap max-w-[62ch]">
                    {segments
                      ? segments.map((s, i) =>
                          s.flag === -1 ? <span key={i}>{s.text}</span> : (
                            <mark key={i}
                              style={{ background: sevOf(flags[s.flag]).markBg, borderBottom: `2px solid ${sevOf(flags[s.flag]).markBorder}` }}
                              className="rounded-[3px] px-0.5 text-ink">{s.text}</mark>
                          ))
                      : doc}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Panel */}
        <aside className="bg-white rounded-2xl border border-line flex flex-col shadow-sm overflow-hidden">
          <div className="p-2.5 border-b border-line">
            <div className="grid grid-cols-2 gap-1 bg-paper rounded-xl p-1">
              {[["check", "Check", ScanLine], ["generate", "Generate", Sparkles]].map(([m, label, Icon]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`py-2 text-[13px] font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                    mode === m ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                  }`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* CHECK */}
          {mode === "check" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="px-4 pt-4">
                <div className="rounded-xl bg-ink text-white px-4 py-3.5">
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
                      <span className="font-display font-bold text-3xl text-leaf">Clear</span>
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

              <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
                {!hasRules && (
                  <div className="text-[13px] text-muted leading-relaxed bg-paper rounded-lg p-3">
                    Add an approved ruleset first. <button onClick={() => setShowRuleset(true)} className="text-leaf-dark font-medium hover:underline">Add ruleset</button>
                  </div>
                )}
                {hasRules && !flags && !checking && (
                  <p className="text-[13px] text-muted leading-relaxed pt-1">
                    Run a check to scan this content against the approved ruleset. Each finding cites the exact rule it breaks.
                  </p>
                )}
                {checkError && <div className="text-[13px] text-risk bg-risk-soft rounded-lg p-3">{checkError}</div>}
                {flags && flags.map((f, i) => {
                  const s = sevOf(f);
                  return (
                    <div key={i} className="finding rounded-xl border border-line overflow-hidden bg-white" style={{ animationDelay: `${i * 90}ms` }}>
                      <div className="flex">
                        <div className={`w-1 shrink-0 ${s.bar}`} />
                        <div className="flex-1 min-w-0 p-3.5">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-mono text-[10px] tracking-wide px-1.5 py-0.5 rounded ${s.chip}`}>{s.label.toUpperCase()}</span>
                            <span className="text-[13px] font-semibold text-ink truncate">{f.issue}</span>
                          </div>
                          <div className="text-[13px] text-ink/80 italic leading-snug mb-2.5">"{f.quote}"</div>
                          <div className="flex items-start gap-1.5 font-mono text-[11px] text-muted bg-paper rounded-md px-2 py-1.5 mb-3">
                            <span className="text-leaf-dark shrink-0">RULE</span>
                            <span className="leading-snug">{f.rule}</span>
                          </div>
                          <div className="flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-mono text-[10px] text-muted tracking-wide mb-0.5">APPROVED WORDING</div>
                              <div className="text-[12.5px] text-leaf-dark leading-snug">{f.suggestion}</div>
                            </div>
                            <button onClick={() => applyFix(i)}
                              className="shrink-0 text-[12px] font-medium text-white bg-leaf hover:bg-leaf-dark rounded-lg px-3 py-1.5 transition-colors">
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
                <button onClick={runCheck} disabled={checking || !hasDoc || !hasRules}
                  className="w-full py-3 text-[14px] font-semibold rounded-xl bg-leaf text-white hover:bg-leaf-dark disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
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
                  <label className="font-mono text-[10px] tracking-wide text-muted">CONTENT TYPE</label>
                  <div className="relative mt-1.5">
                    <select value={contentType} onChange={(e) => setContentType(e.target.value)}
                      className="w-full appearance-none text-[14px] border border-line rounded-xl pl-3 pr-9 py-2.5 outline-none focus:border-leaf bg-white cursor-pointer">
                      {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="w-4 h-4 text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] tracking-wide text-muted">INSTRUCTION</label>
                  <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)}
                    placeholder={`Describe the ${contentType.toLowerCase()} you need...`}
                    className="w-full mt-1.5 text-[14px] border border-line rounded-xl p-3 outline-none focus:border-leaf resize-none h-24 bg-white placeholder:text-muted/60" />
                  <div className="flex items-center gap-1.5 text-[12px] text-leaf-dark mt-2 bg-leaf-soft rounded-lg px-2.5 py-1.5">
                    <Lock className="w-3.5 h-3.5" /> Drafts from the approved ruleset only. Invents nothing.
                  </div>
                </div>
                {generating && (
                  <div className="flex items-center justify-center gap-2 text-[13px] text-muted pt-6">
                    <Loader2 className="w-4 h-4 animate-spin" /> Drafting from approved sources...
                  </div>
                )}
                {genError && <div className="text-[13px] text-risk bg-risk-soft rounded-lg p-3">{genError}</div>}
                {genResult && (
                  <div className="finding rounded-xl border border-leaf/30 overflow-hidden">
                    <div className="bg-leaf-soft px-3.5 py-3">
                      <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-leaf-dark mb-2">
                        <Check className="w-3.5 h-3.5" /> {contentType.toUpperCase()} · VERIFIED CLEAN
                      </div>
                      <div className="text-[14px] text-ink whitespace-pre-wrap leading-relaxed">{genResult.text}</div>
                    </div>
                    {genResult.sources && (
                      <div className="px-3.5 py-2.5 bg-white border-t border-leaf/20">
                        <div className="font-mono text-[10px] text-muted tracking-wide mb-1.5">SOURCES</div>
                        <div className="flex flex-wrap gap-1.5">
                          {genResult.sources.map((src, i) => (
                            <span key={i} className="font-mono text-[10.5px] text-muted bg-paper border border-line rounded px-1.5 py-0.5">{src}</span>
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
                <button onClick={runGenerate} disabled={generating || !instruction.trim()}
                  className="w-full py-3 text-[14px] font-semibold rounded-xl bg-leaf text-white hover:bg-leaf-dark disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {genResult ? "Regenerate" : "Generate"}
                </button>
              </div>
            </div>
          )}

          {/* Audit ticker */}
          <div className="border-t border-line bg-paper px-4 py-2.5">
            <div className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-widest text-muted mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-leaf pulse-dot" /> AUDIT TRAIL
            </div>
            {audit.length === 0 ? (
              <div className="font-mono text-[10.5px] text-muted/60">No activity yet</div>
            ) : (
              <div className="space-y-1 max-h-16 overflow-hidden">
                {audit.map((a, i) => (
                  <div key={i} className="flex gap-2 font-mono text-[10.5px] leading-tight" style={{ opacity: 1 - i * 0.16 }}>
                    <span className="text-muted/70 shrink-0">{a.time}</span>
                    <span className="text-ink/70 truncate">{a.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Ruleset modal */}
      {showRuleset && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-5 z-20">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-full flex flex-col shadow-2xl">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
              <Settings2 className="w-4 h-4 text-leaf-dark" />
              <span className="font-display font-semibold text-ink">Approved ruleset</span>
              {!hasRules && (
                <button onClick={loadExampleRules} className="ml-auto text-[12px] text-leaf-dark font-medium hover:underline">Load example</button>
              )}
              <button onClick={() => setShowRuleset(false)} className={`text-muted hover:text-ink ${hasRules ? "ml-auto" : ""}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-auto">
              <p className="text-[13px] text-muted mb-3 leading-relaxed">
                Paste a prospect's approved claims and regulatory rules here before a meeting. Every check and every draft runs against exactly this.
              </p>
              <textarea value={ruleset} onChange={(e) => setRuleset(e.target.value)}
                placeholder="Paste the approved claims, indications, and prohibited language..."
                className="w-full h-80 text-[13px] border border-line rounded-xl p-4 outline-none focus:border-leaf font-mono resize-none bg-paper leading-relaxed placeholder:text-muted/60" />
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
