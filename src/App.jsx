import React, { useState } from "react";
import {
  ShieldCheck, Flag, Check, Send, Sparkles, Settings2,
  Loader2, X, Wand2, FileText, RotateCcw
} from "lucide-react";

const DEFAULT_RULESET = `PRODUCT: VascuLink Pro — real-time vascular monitoring device

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

const DEFAULT_DOC = `VascuLink Pro — Distributor Overview

VascuLink Pro delivers real-time vascular monitoring with clinical-grade accuracy, cleared under 510(k) K221847 for adult and pediatric use.

Clinically proven to reduce procedure time by 40%, cutting OR costs for high-volume centers.

The leading device in its category, with adoption across 200+ US facilities.

Available Q1 2026. Contact your regional representative for pricing and trial access.`;

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

export default function CadenSeeDemo() {
  const [doc, setDoc] = useState(DEFAULT_DOC);
  const [ruleset, setRuleset] = useState(DEFAULT_RULESET);
  const [mode, setMode] = useState("check");
  const [editing, setEditing] = useState(false);
  const [showRuleset, setShowRuleset] = useState(false);

  const [flags, setFlags] = useState(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState("");

  const [instruction, setInstruction] = useState(
    "Draft a short distributor email with an intro, product benefits, and clinical outcomes."
  );
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [genError, setGenError] = useState("");

  async function runCheck() {
    setChecking(true);
    setCheckError("");
    setFlags(null);
    setEditing(false);
    try {
      const sys =
        'You are CadenSee, a regulatory marketing-compliance engine for medtech. You compare marketing CONTENT against an APPROVED RULESET and flag only genuine compliance problems: claims that exceed, contradict, or are not supported by the ruleset, plus any prohibited language. Do not flag style, tone, or grammar. For each problem return the EXACT verbatim text from the content (so it can be located in the document), a short issue label of 3-5 words, the specific rule it breaks, and a compliant replacement that uses only language permitted by the ruleset. Respond with ONLY valid minified JSON, no markdown fences, no commentary, in this shape: {"flags":[{"quote":"...","issue":"...","rule":"...","suggestion":"..."}]}. If there are no problems return {"flags":[]}.';
      const out = await callClaude(sys, `APPROVED RULESET:\n${ruleset}\n\nCONTENT TO CHECK:\n${doc}`);
      const parsed = parseJSON(out);
      setFlags(parsed.flags || []);
    } catch (e) {
      setCheckError("Could not read the response. Try again.");
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
    } catch (e) {
      setGenError("Could not read the response. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  function applyFix(fi) {
    const flag = flags[fi];
    if (!flag) return;
    setDoc((d) => d.replace(flag.quote, flag.suggestion));
    setFlags((f) => f.filter((_, i) => i !== fi));
  }

  function insertGenerated() {
    if (!genResult) return;
    setDoc((d) => d + "\n\n" + genResult.text);
    setGenResult(null);
    setMode("check");
  }

  function resetDemo() {
    setDoc(DEFAULT_DOC);
    setFlags(null);
    setGenResult(null);
    setEditing(false);
    setMode("check");
  }

  const segments = flags ? buildSegments(doc, flags) : null;
  const cleanResult = flags && flags.length === 0;

  return (
    <div className="w-full min-h-screen bg-stone-100 text-slate-800 font-sans p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 leading-tight">CadenSee</div>
            <div className="text-xs text-slate-500 leading-tight">Messaging compliance</div>
          </div>
        </div>
        <span className="text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
          Live demo
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={resetDemo}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            onClick={() => setShowRuleset(true)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 bg-white"
          >
            <Settings2 className="w-3.5 h-3.5" /> Edit ruleset
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Document panel */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 flex flex-col min-w-0">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700">VascuLink Pro — distributor deck.pptx</span>
            <button
              onClick={() => { setEditing((e) => !e); setFlags(null); }}
              className="ml-auto text-xs text-slate-500 hover:text-slate-800 border border-slate-200 rounded-md px-2 py-1"
            >
              {editing ? "Done" : "Edit content"}
            </button>
          </div>
          <div className="p-6 overflow-auto flex-1">
            {editing ? (
              <textarea
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                className="w-full h-full min-h-80 text-sm leading-relaxed text-slate-800 outline-none resize-none"
              />
            ) : (
              <div className="text-sm leading-7 text-slate-800 whitespace-pre-wrap">
                {segments
                  ? segments.map((s, i) =>
                      s.flag === -1 ? (
                        <span key={i}>{s.text}</span>
                      ) : (
                        <mark key={i} className="bg-amber-100 text-amber-900 border-b-2 border-amber-400 rounded-sm px-0.5">
                          {s.text}
                        </mark>
                      )
                    )
                  : doc}
              </div>
            )}
          </div>
        </div>

        {/* Taskpane */}
        <div className="w-96 bg-white rounded-xl border border-slate-200 flex flex-col">
          {/* Mode toggle */}
          <div className="p-3 border-b border-slate-100">
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setMode("check")}
                className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 ${
                  mode === "check" ? "bg-slate-100 text-slate-900" : "bg-white text-slate-500"
                }`}
              >
                <ShieldCheck className="w-4 h-4" /> Check
              </button>
              <button
                onClick={() => setMode("generate")}
                className={`flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 border-l border-slate-200 ${
                  mode === "generate" ? "bg-slate-100 text-slate-900" : "bg-white text-slate-500"
                }`}
              >
                <Sparkles className="w-4 h-4" /> Generate
              </button>
            </div>
          </div>

          {/* CHECK MODE */}
          {mode === "check" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-auto p-3 space-y-3">
                {!flags && !checking && (
                  <div className="text-center text-sm text-slate-400 pt-10 px-4">
                    Run a check to scan this content against the approved ruleset.
                  </div>
                )}
                {checking && (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-10">
                    <Loader2 className="w-4 h-4 animate-spin" /> Checking against ruleset…
                  </div>
                )}
                {checkError && (
                  <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">{checkError}</div>
                )}
                {cleanResult && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                      <Check className="w-4 h-4" /> No flags found
                    </div>
                    <div className="text-xs text-emerald-700/80 mt-1">All claims align with the approved ruleset.</div>
                  </div>
                )}
                {flags &&
                  flags.map((f, i) => (
                    <div key={i} className="rounded-lg border border-amber-200 overflow-hidden">
                      <div className="bg-amber-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1.5">
                          <Flag className="w-3.5 h-3.5" /> {f.issue}
                        </div>
                        <div className="text-xs italic text-slate-700 mb-1.5">"{f.quote}"</div>
                        <div className="text-xs text-slate-500 leading-snug">{f.rule}</div>
                      </div>
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border-t border-amber-100">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-400">Replace with</div>
                          <div className="text-xs italic text-slate-700 truncate">"{f.suggestion}"</div>
                        </div>
                        <button
                          onClick={() => applyFix(i)}
                          className="shrink-0 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1 hover:bg-emerald-100"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="p-3 border-t border-slate-100">
                <button
                  onClick={runCheck}
                  disabled={checking}
                  className="w-full py-2.5 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {flags ? "Re-run check" : "Run check"}
                </button>
              </div>
            </div>
          )}

          {/* GENERATE MODE */}
          {mode === "generate" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-auto p-3 space-y-3">
                <div>
                  <label className="text-xs text-slate-500">Instruction</label>
                  <textarea
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    className="w-full mt-1 text-sm border border-slate-200 rounded-lg p-2 outline-none focus:border-teal-400 resize-none h-20"
                  />
                  <div className="flex items-center gap-1 text-xs text-teal-700 mt-1.5">
                    <Wand2 className="w-3.5 h-3.5" /> Generates from the approved ruleset only
                  </div>
                </div>
                {generating && (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-6">
                    <Loader2 className="w-4 h-4 animate-spin" /> Drafting from approved sources…
                  </div>
                )}
                {genError && (
                  <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">{genError}</div>
                )}
                {genResult && (
                  <div className="rounded-lg border border-emerald-200 overflow-hidden">
                    <div className="bg-emerald-50 p-3">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 mb-2">
                        <Check className="w-3.5 h-3.5" /> Generated — no flags
                      </div>
                      <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{genResult.text}</div>
                    </div>
                    {genResult.sources && (
                      <div className="px-3 py-2 bg-slate-50 border-t border-emerald-100">
                        <div className="text-xs text-slate-400 mb-0.5">Sources</div>
                        <div className="text-xs text-slate-500">{genResult.sources.join("  ·  ")}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-slate-100 space-y-2">
                {genResult && (
                  <button
                    onClick={insertGenerated}
                    className="w-full py-2 text-sm font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" /> Insert into document
                  </button>
                )}
                <button
                  onClick={runGenerate}
                  disabled={generating}
                  className="w-full py-2.5 text-sm font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {genResult ? "Regenerate" : "Generate"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ruleset modal */}
      {showRuleset && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-10">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-full flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
              <Settings2 className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-800">Approved ruleset</span>
              <button onClick={() => setShowRuleset(false)} className="ml-auto text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <p className="text-xs text-slate-500 mb-2">
                Paste a prospect's approved claims and regulatory rules here before a demo. The check and generation run against this.
              </p>
              <textarea
                value={ruleset}
                onChange={(e) => setRuleset(e.target.value)}
                className="w-full h-80 text-sm border border-slate-200 rounded-lg p-3 outline-none focus:border-teal-400 font-mono resize-none"
              />
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowRuleset(false)}
                className="text-sm font-medium bg-teal-600 text-white rounded-lg px-4 py-2 hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Demo runs the real check against the ruleset above. Flags, citations, and suggestions are generated live.
      </p>
    </div>
  );
}
