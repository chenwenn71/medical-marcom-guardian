import React, { useState, useEffect, useRef } from "react";
import {
  Check, Sparkles, Settings2, Loader2, X, Wand2,
  RotateCcw, CornerDownLeft, ScanLine, Lock, ChevronDown, Circle, MessageSquarePlus
} from "lucide-react";
import { LOGO } from "./logo.js";
import { CompetitorsView } from "./CompetitorsView.jsx";
import { MarketPulseView } from "./MarketPulseView.jsx";

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

const CHECK_SYS =
  'You are CadenSee, a regulatory marketing-compliance engine for medtech. Compare marketing CONTENT against an APPROVED RULESET and flag only genuine compliance problems: claims that exceed, contradict, or are not supported by the ruleset, plus prohibited language. Ignore style, tone, grammar. Be conservative and deterministic: flag only text that clearly violates an explicit rule in the ruleset. If a sentence does not clearly break a stated rule, do NOT flag it. Never flag the same text twice. For each problem return: the EXACT verbatim text from the content as "quote"; a "severity" of exactly one of "high" (overstated efficacy or safety, e.g. a figure above the approved limit), "prohibited" (banned superlative, comparative, off-label, or diagnosis or treatment language), or "unsupported" (a claim with no backing rule); a 3 to 5 word "issue" label; the specific "rule" it breaks; and a "suggestion". The suggestion MUST be a drop-in replacement for the exact quoted text: it has to fit the surrounding sentence grammar, keep the same capitalization as the first character of the quoted span, and not add or remove trailing punctuation. Do NOT restate the full approved claim; correct only the minimal span so the sentence still reads naturally. Respond with ONLY valid minified JSON, no markdown fences, no commentary: {"flags":[{"quote":"...","severity":"high|prohibited|unsupported","issue":"...","rule":"...","suggestion":"..."}]}. If there are no problems return {"flags":[]}.';

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
  let clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) clean = clean.slice(first, last + 1);
  return JSON.parse(clean.trim());
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

const scoreFromCounts = (c) => Math.min(100, c.high * 45 + c.prohibited * 28 + c.unsupported * 14);
const bandColor = (s) => (s === 0 ? "#57B23A" : s < 50 ? "#D9870F" : "#E5484D");

function CountUp({ value }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / 600, 1);
      setN(Math.round(p * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{n}</>;
}

function RiskGauge({ score }) {
  const L = Math.PI * 50;
  const color = bandColor(score);
  return (
    <div className="relative shrink-0" style={{ width: 120, height: 78 }}>
      <svg viewBox="0 0 120 70" width="120" height="70">
        <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="9" strokeLinecap="round" />
        <path d="M10,60 A50,50 0 0 1 110,60" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={L} strokeDashoffset={L * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset .85s cubic-bezier(.16,1,.3,1), stroke .4s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-0.5">
        <span className="font-display font-bold text-2xl leading-none" style={{ color }}><CountUp value={score} /></span>
        <span className="font-mono text-[8.5px] tracking-widest text-white/45 mt-1">RISK SCORE</span>
      </div>
    </div>
  );
}

function StepRow({ state, label }) {
  return (
    <div className="flex items-center gap-2.5">
      {state === "done" ? (
        <span className="w-5 h-5 rounded-full bg-leaf flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" strokeWidth={3} /></span>
      ) : state === "active" ? (
        <span className="w-5 h-5 rounded-full border-2 border-leaf flex items-center justify-center shrink-0"><Loader2 className="w-3 h-3 text-leaf animate-spin" /></span>
      ) : (
        <span className="w-5 h-5 rounded-full border-2 border-line flex items-center justify-center shrink-0"><Circle className="w-1.5 h-1.5 text-line fill-line" /></span>
      )}
      <span className={`text-[13px] ${state === "idle" ? "text-muted" : "text-ink font-medium"}`}>{label}</span>
    </div>
  );
}

const DOC_CLS = "px-7 py-7 sm:px-9 text-[15px] leading-8 font-sans whitespace-pre-wrap break-words";

function DocPane({ doc, setDoc, segments, flags, onUserEdit }) {
  const taRef = useRef(null), bdRef = useRef(null);
  const sync = () => {
    if (bdRef.current && taRef.current) {
      bdRef.current.scrollTop = taRef.current.scrollTop;
      bdRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  };
  return (
    <div className="relative flex-1 min-h-0 paper-grid">
      <div ref={bdRef} aria-hidden="true"
        className={`absolute inset-0 overflow-hidden text-ink ${DOC_CLS}`}>
        {!doc ? (
          <span className="text-muted/55">Start typing or paste your marketing copy here. Then run a compliance check.</span>
        ) : segments ? (
          <>
            {segments.map((s, i) =>
              s.flag === -1 ? <span key={i}>{s.text}</span> : (
                <mark key={i}
                  style={{ background: sevOf(flags[s.flag]).markBg, borderBottom: `2px solid ${sevOf(flags[s.flag]).markBorder}` }}
                  className="rounded-[3px] px-0.5 text-ink">{s.text}</mark>
              ))}
            {"\n"}
          </>
        ) : (<>{doc}{"\n"}</>)}
      </div>
      <textarea
        ref={taRef}
        value={doc}
        onChange={(e) => { setDoc(e.target.value); onUserEdit(); }}
        onScroll={sync}
        spellCheck="false"
        className={`absolute inset-0 w-full h-full overflow-auto resize-none bg-transparent outline-none caret-ink ${DOC_CLS}`}
        style={{ color: "transparent" }}
      />
    </div>
  );
}

export default function CadenSeeDemo() {
  const [doc, setDoc] = useState("");
  const [ruleset, setRuleset] = useState("");
  const [view, setView] = useState("workspace"); // workspace | competitors | market
  const [mode, setMode] = useState("check");
  const [showRuleset, setShowRuleset] = useState(false);

  const [flags, setFlags] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");
  const [cleanFromCheck, setCleanFromCheck] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [contentType, setContentType] = useState(CONTENT_TYPES[0]);
  const [instruction, setInstruction] = useState("");
  const [comment, setComment] = useState("");
  const [genPhase, setGenPhase] = useState("idle"); // idle | drafting | verifying | done
  const [genResult, setGenResult] = useState(null);
  const [genVerify, setGenVerify] = useState(null);
  const [genError, setGenError] = useState("");

  const [audit, setAudit] = useState([]);
  const log = (text) => setAudit((a) => [{ time: nowStamp(), text }, ...a].slice(0, 6));

  const hasDoc = doc.trim().length > 0;
  const hasRules = ruleset.trim().length > 0;
  const isGenBusy = genPhase === "drafting" || genPhase === "verifying";

  const clearVerdict = () => { setFlags(null); setCleanFromCheck(false); setDirty(false); };
  const onUserEdit = () => { if (flags) clearVerdict(); };

  async function runCheck() {
    if (!hasDoc || !hasRules) return;
    setChecking(true); setCheckError(""); setFlags(null);
    try {
      const out = await callClaude(CHECK_SYS, `APPROVED RULESET:\n${ruleset}\n\nCONTENT TO CHECK:\n${doc}`);
      const f = parseJSON(out).flags || [];
      setFlags(f); setCleanFromCheck(f.length === 0); setDirty(false);
      log(`check run · ${f.length} finding${f.length === 1 ? "" : "s"} · logged`);
    } catch (e) {
      setCheckError("Could not read the response. Run the check again.");
    } finally { setChecking(false); }
  }

  async function produce(commentText) {
    if (!hasRules) { setShowRuleset(true); return; }
    if (!commentText && !instruction.trim()) return;
    setGenError(""); setGenPhase("drafting");
    if (!commentText) { setGenResult(null); setGenVerify(null); }
    try {
      const genSys =
        `You are CadenSee, a compliant content generator for medtech. Write ${contentType} using ONLY claims and language supported by the APPROVED RULESET. Never introduce any claim, figure, or descriptor not explicitly supported by the ruleset. Keep it concise and appropriate for ${contentType}. Respond with ONLY valid minified JSON, no markdown fences: {"text":"the content with \\n for line breaks","sources":["short ruleset reference","..."]}. The "text" value MUST be a valid minified JSON string with every newline escaped as \\n and every double quote escaped; do not emit raw line breaks inside it.`;
      let userContent = `APPROVED RULESET:\n${ruleset}\n\nREQUEST:\n${instruction}`;
      if (commentText && genResult) {
        userContent += `\n\nCURRENT DRAFT:\n${genResult.text}\n\nREVISION COMMENT:\n${commentText}\n\nRevise the current draft to satisfy the revision comment. Keep everything else as-is. Use only the ruleset.`;
      }
      const draftOut = await callClaude(genSys, userContent);
      const draft = parseJSON(draftOut);
      setGenResult(draft); setGenPhase("verifying");
      const verifyOut = await callClaude(CHECK_SYS, `APPROVED RULESET:\n${ruleset}\n\nCONTENT TO CHECK:\n${draft.text}`);
      const vflags = parseJSON(verifyOut).flags || [];
      setGenVerify(vflags); setGenPhase("done");
      log(`${commentText ? "draft refined" : "draft generated"} · ${contentType.toLowerCase()} · ${vflags.length === 0 ? "verified clean" : vflags.length + " to review"}`);
    } catch (e) {
      setGenError("Could not read the response. Try again.");
      setGenPhase(genResult ? "done" : "idle");
    }
  }

  function applyFix(fi) {
    const flag = flags[fi];
    if (!flag) return;
    setDoc((d) => d.replace(flag.quote, flag.suggestion));
    setFlags((f) => f.filter((_, i) => i !== fi));
    setDirty(true); setCleanFromCheck(false);
    log(`fix applied · ${sevOf(flag).label.toLowerCase()} resolved`);
  }

  function insertGenerated() {
    if (!genResult) return;
    setDoc((d) => (d ? d + "\n\n" : "") + genResult.text);
    setGenResult(null); setGenVerify(null); setGenPhase("idle"); setComment("");
    clearVerdict(); setMode("check");
    log("generated content inserted into document");
  }

  function resetDemo() {
    setDoc(""); setRuleset(""); clearVerdict();
    setGenResult(null); setGenVerify(null); setGenPhase("idle"); setInstruction(""); setComment("");
    setContentType(CONTENT_TYPES[0]); setMode("check"); setAudit([]);
  }

  const segments = (flags && hasDoc) ? buildSegments(doc, flags) : null;
  const cleanResult = flags && flags.length === 0 && cleanFromCheck && !dirty;
  const resolvedPending = flags && flags.length === 0 && !cleanResult;
  const counts = flags
    ? flags.reduce((a, f) => { const k = f.severity === "high" ? "high" : f.severity === "prohibited" ? "prohibited" : "unsupported"; a[k] = (a[k] || 0) + 1; return a; }, { high: 0, prohibited: 0, unsupported: 0 })
    : null;
  const score = cleanResult ? 0 : counts ? scoreFromCounts(counts) : 0;
  const showGauge = flags && (cleanResult || flags.length > 0);

  return (
    <div className="min-h-screen flex flex-col text-ink">
      {/* App bar */}
      <header className="h-16 bg-white border-b border-line flex items-center px-6 gap-3 shrink-0">
        <img src={LOGO} alt="cadensee" className="h-[26px] w-auto" />
        <span className="hidden sm:block w-px h-5 bg-line" />
        <span className="hidden sm:block font-mono text-[10px] tracking-widest text-muted uppercase">Marketing compliance</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center bg-paper rounded-lg p-0.5 border border-line">
            {[["workspace", "Workspace"], ["competitors", "Competitors"], ["market", "Market Pulse"]].map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className={`text-[12.5px] font-medium px-3 py-1.5 rounded-md transition-colors ${
                  view === v ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}>
                {label}
              </button>
            ))}
          </div>
          <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] text-muted border border-line rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-leaf pulse-dot" /> Sonnet 4.6
          </span>
          <button onClick={resetDemo}
            className="flex items-center gap-1.5 text-[13px] text-muted hover:text-ink border border-line rounded-lg px-3 py-1.5 bg-white transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </header>

      {/* Body */}
      {view === "competitors" && (
        <CompetitorsView ruleset={ruleset} hasRules={hasRules} onOpenRuleset={() => setShowRuleset(true)} log={log} />
      )}

      {view === "market" && <MarketPulseView log={log} ruleset={ruleset} />}

      {view === "workspace" && (
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_410px] gap-4 p-4 max-w-[1320px] w-full mx-auto">
        {/* Document */}
        <section className="bg-white rounded-2xl border border-line flex flex-col min-w-0 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-line">
            <span className="font-mono text-[11px] text-muted">DOC</span>
            <span className="text-[13px] font-medium text-ink truncate">{hasDoc ? "Document under review" : "Untitled document"}</span>
            {!hasDoc && (
              <button onClick={() => { setDoc(EXAMPLE_DOC); clearVerdict(); log("example content loaded"); }}
                className="ml-auto text-[12px] text-leaf-dark font-medium hover:underline">Load example</button>
            )}
          </div>
          <div className="relative flex-1 min-h-0 overflow-hidden">
            {checking && <div className="scanline" />}
            <DocPane doc={doc} setDoc={setDoc} segments={segments} flags={flags} onUserEdit={onUserEdit} />
          </div>
        </section>

        {/* Panel */}
        <aside className="bg-white rounded-2xl border border-line flex flex-col shadow-sm overflow-hidden">
          {/* Ruleset bar */}
          <div className="p-3 border-b border-line">
            <button onClick={() => setShowRuleset(true)}
              className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                hasRules ? "border-line hover:bg-paper" : "border-leaf bg-leaf-soft hover:bg-leaf-soft/70"
              }`}>
              <Settings2 className={`w-4 h-4 shrink-0 ${hasRules ? "text-leaf-dark" : "text-leaf-dark"}`} />
              <div className="min-w-0">
                <div className="font-mono text-[9.5px] tracking-widest text-muted">APPROVED RULESET</div>
                <div className="text-[13px] font-medium text-ink">{hasRules ? "Loaded" : "Not set - add to begin"}</div>
              </div>
              <span className={`ml-auto flex items-center gap-1.5 text-[12px] font-medium ${hasRules ? "text-muted" : "text-leaf-dark"}`}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: hasRules ? "#57B23A" : "#D9870F" }} />
                {hasRules ? "Edit" : "Add"}
              </span>
            </button>
          </div>

          {/* Mode toggle */}
          <div className="px-3 pb-2.5">
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
            <div className="flex flex-col flex-1 min-h-0 border-t border-line">
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
                  ) : resolvedPending ? (
                    <div className="flex items-baseline gap-2">
                      <span className="font-display font-bold text-2xl text-white">Findings resolved</span>
                      <span className="text-[13px] text-white/60">re-run to confirm</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      {showGauge && <RiskGauge score={score} />}
                      <div className="min-w-0">
                        {cleanResult ? (
                          <div>
                            <div className="font-display font-bold text-2xl text-leaf leading-none">Clear</div>
                            <div className="text-[12.5px] text-white/60 mt-1.5">all claims match the ruleset</div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1.5 mb-2">
                              <span className="font-display font-bold text-2xl tabular-nums"><CountUp value={flags.length} /></span>
                              <span className="text-[13px] text-white/70">finding{flags.length === 1 ? "" : "s"}</span>
                            </div>
                            <div className="flex flex-col gap-1 font-mono text-[11px]">
                              {counts.high > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: SEV.high.dot }} />{counts.high} high</span>}
                              {counts.prohibited > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: SEV.prohibited.dot }} />{counts.prohibited} prohibited</span>}
                              {counts.unsupported > 0 && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: SEV.unsupported.dot }} />{counts.unsupported} unsupported</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
                {!hasRules && (
                  <div className="text-[13px] text-muted leading-relaxed bg-paper rounded-lg p-3">
                    Add an approved ruleset first using the panel above.
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
            <div className="flex flex-col flex-1 min-h-0 border-t border-line">
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
                    className="w-full mt-1.5 text-[14px] border border-line rounded-xl p-3 outline-none focus:border-leaf resize-none h-20 bg-white placeholder:text-muted/60" />
                  <div className="flex items-center gap-1.5 text-[12px] text-leaf-dark mt-2 bg-leaf-soft rounded-lg px-2.5 py-1.5">
                    <Lock className="w-3.5 h-3.5" /> Drafts from the approved ruleset only. Invents nothing.
                  </div>
                </div>

                {genPhase !== "idle" && (
                  <div className="rounded-xl border border-line bg-paper px-3.5 py-3 space-y-2.5">
                    <StepRow state={genPhase === "drafting" ? "active" : "done"} label="Draft from approved sources" />
                    <StepRow state={genPhase === "verifying" ? "active" : genPhase === "done" ? "done" : "idle"} label="Verify against ruleset" />
                  </div>
                )}

                {genError && <div className="text-[13px] text-risk bg-risk-soft rounded-lg p-3">{genError}</div>}

                {genPhase === "done" && genResult && (
                  <>
                    <div className="finding rounded-xl border overflow-hidden" style={{ borderColor: genVerify && genVerify.length ? "rgba(217,135,15,.4)" : "rgba(87,178,58,.4)" }}>
                      <div className={genVerify && genVerify.length ? "bg-caution-soft px-3.5 py-3" : "bg-leaf-soft px-3.5 py-3"}>
                        <div className={`flex items-center gap-1.5 font-mono text-[10px] tracking-wide mb-2 ${genVerify && genVerify.length ? "text-caution" : "text-leaf-dark"}`}>
                          <Check className="w-3.5 h-3.5" /> {contentType.toUpperCase()} · {genVerify && genVerify.length ? `${genVerify.length} TO REVIEW` : "VERIFIED CLEAN"}
                        </div>
                        <div className="text-[14px] text-ink whitespace-pre-wrap leading-relaxed">{genResult.text}</div>
                      </div>
                      {genResult.sources && (
                        <div className="px-3.5 py-2.5 bg-white border-t border-line">
                          <div className="font-mono text-[10px] text-muted tracking-wide mb-1.5">SOURCES</div>
                          <div className="flex flex-wrap gap-1.5">
                            {genResult.sources.map((src, i) => (
                              <span key={i} className="font-mono text-[10.5px] text-muted bg-paper border border-line rounded px-1.5 py-0.5">{src}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Refine by comment */}
                    <div>
                      <label className="font-mono text-[10px] tracking-wide text-muted">REFINE</label>
                      <div className="flex items-center gap-2 mt-1.5">
                        <input value={comment} onChange={(e) => setComment(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter" && comment.trim() && !isGenBusy) { const c = comment; setComment(""); produce(c); } }}
                          placeholder="e.g. make it shorter, add a call to action"
                          className="flex-1 min-w-0 text-[13px] border border-line rounded-lg px-3 py-2 outline-none focus:border-leaf bg-white placeholder:text-muted/60" />
                        <button onClick={() => { const c = comment; setComment(""); produce(c); }} disabled={!comment.trim() || isGenBusy}
                          className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-white bg-ink hover:bg-ink/90 disabled:opacity-40 rounded-lg px-3 py-2 transition-colors">
                          <MessageSquarePlus className="w-3.5 h-3.5" /> Refine
                        </button>
                      </div>
                      <p className="text-[11px] text-muted mt-1.5">Refines this draft and re-verifies. Does not regenerate from scratch.</p>
                    </div>
                  </>
                )}
              </div>
              <div className="p-4 border-t border-line space-y-2">
                {genPhase === "done" && genResult && (
                  <button onClick={insertGenerated}
                    className="w-full py-2.5 text-[13px] font-medium rounded-xl border border-line text-ink hover:bg-paper flex items-center justify-center gap-2 transition-colors">
                    <CornerDownLeft className="w-4 h-4" /> Insert into document
                  </button>
                )}
                <button onClick={() => produce(null)} disabled={isGenBusy || !instruction.trim()}
                  className="w-full py-3 text-[14px] font-semibold rounded-xl bg-leaf text-white hover:bg-leaf-dark disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
                  {isGenBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  {isGenBusy ? (genPhase === "drafting" ? "Drafting..." : "Verifying...") : genPhase === "done" ? "Regenerate" : "Generate"}
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
      )}

      {/* Ruleset modal */}
      {showRuleset && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-5 z-20">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-full flex flex-col shadow-2xl">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-line">
              <Settings2 className="w-4 h-4 text-leaf-dark" />
              <span className="font-display font-semibold text-ink">Approved ruleset</span>
              {!hasRules && (
                <button onClick={() => { setRuleset(EXAMPLE_RULESET); log("example ruleset loaded"); }} className="ml-auto text-[12px] text-leaf-dark font-medium hover:underline">Load example</button>
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
