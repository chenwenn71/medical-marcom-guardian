import React, { useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, Loader2, ExternalLink,
  Image as ImageIcon, ScanLine, Flag, ArrowRightLeft, Sparkles
} from "lucide-react";
import { callClaude, CHECK_SYS, parseJSON, sevOf } from "./shared.js";
import { SEED_COMPETITORS, fetchCompetitorContent } from "./competitors.js";

function blobFromContent(content) {
  const parts = [];
  (content.posts || []).forEach((p, i) => parts.push(`${p.kind} ${i + 1}: ${p.text}`));
  if (content.website) parts.push(`Website: ${content.website.text}`);
  return parts.join("\n");
}

function Thumb({ post }) {
  return (
    <div className="rounded-xl border border-line bg-paper overflow-hidden">
      <div className="aspect-[4/3] bg-gradient-to-br from-line/60 to-paper flex items-center justify-center">
        <ImageIcon className="w-6 h-6 text-muted/50" />
      </div>
      <div className="p-2.5">
        <div className="font-mono text-[9px] tracking-widest text-muted mb-1">{post.kind.toUpperCase()} · {post.date}</div>
        <div className="text-[12px] text-ink leading-snug line-clamp-2">{post.caption}</div>
        <a href={post.source} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-leaf-dark hover:underline mt-1.5">
          <ExternalLink className="w-3 h-3" /> Source
        </a>
      </div>
    </div>
  );
}

function CompetitorCard({ comp, expanded, onToggle, state, onRun }) {
  const flags = state?.flags || [];
  return (
    <div className="bg-white rounded-2xl border border-line shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5">
        <button onClick={onToggle} className="flex items-center gap-2 min-w-0 text-left">
          {expanded ? <ChevronDown className="w-4 h-4 text-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted shrink-0" />}
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-ink truncate">{comp.name}</div>
            <div className="flex items-center gap-3 mt-0.5">
              {comp.linkedin && <a href={comp.linkedin} target="_blank" rel="noreferrer" className="text-[11px] text-leaf-dark hover:underline truncate">LinkedIn</a>}
              {comp.website && <a href={comp.website} target="_blank" rel="noreferrer" className="text-[11px] text-leaf-dark hover:underline truncate">Website</a>}
              <span className="font-mono text-[10px] text-muted">Last run: {comp.lastRun}</span>
            </div>
          </div>
        </button>
        <div className="ml-auto flex items-center gap-2.5 shrink-0">
          {state && !state.loading && (
            <span className="font-mono text-[11px] text-muted hidden sm:inline">
              {flags.length === 0 ? "on-claim" : `${flags.length} flag${flags.length === 1 ? "" : "s"}`}
            </span>
          )}
          <button onClick={onRun} disabled={state?.loading}
            className="flex items-center gap-1.5 text-[12.5px] font-medium text-white bg-leaf hover:bg-leaf-dark disabled:opacity-50 rounded-lg px-3 py-1.5 transition-colors">
            {state?.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
            {state ? "Re-run" : "Run analysis"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-line">
          {/* Insight summary */}
          {state?.insight && (
            <div className="flex items-start gap-2 px-5 py-3 bg-leaf-soft/60 border-b border-line">
              <Sparkles className="w-4 h-4 text-leaf-dark shrink-0 mt-0.5" />
              <p className="text-[13px] text-ink leading-snug">{state.insight}</p>
            </div>
          )}

          {!state && (
            <div className="px-5 py-8 text-center text-[13px] text-muted">
              Run analysis to pull recent activity and flag their claims against your ruleset.
            </div>
          )}
          {state?.error && <div className="m-4 text-[13px] text-risk bg-risk-soft rounded-lg p-3">{state.error}</div>}

          {state && !state.error && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-5">
              {/* Recent activity */}
              <div>
                <div className="font-mono text-[10px] tracking-widest text-muted mb-2.5">RECENT ACTIVITY</div>
                {state.loading ? (
                  <div className="text-[13px] text-muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Pulling recent activity…</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    {(state.content?.posts || []).map((p, i) => <Thumb key={i} post={p} />)}
                  </div>
                )}
              </div>

              {/* Claim analysis */}
              <div>
                <div className="font-mono text-[10px] tracking-widest text-muted mb-2.5">CLAIM ANALYSIS</div>
                {state.loading ? (
                  <div className="text-[13px] text-muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Flagging claims against your ruleset…</div>
                ) : flags.length === 0 ? (
                  <div className="rounded-xl border border-leaf/30 bg-leaf-soft px-3.5 py-3 text-[13px] text-leaf-dark">
                    No claims flagged. Their messaging stays within your approved language.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {flags.map((f, i) => {
                      const s = sevOf(f);
                      return (
                        <div key={i} className="rounded-xl border border-line overflow-hidden bg-white">
                          <div className="flex">
                            <div className={`w-1 shrink-0 ${s.bar}`} />
                            <div className="flex-1 min-w-0 p-3">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`font-mono text-[10px] tracking-wide px-1.5 py-0.5 rounded ${s.chip}`}>{s.label.toUpperCase()}</span>
                                <span className="text-[12.5px] font-semibold text-ink truncate">{f.issue}</span>
                              </div>
                              <div className="text-[12.5px] text-ink/80 italic leading-snug mb-2">"{f.quote}"</div>
                              <div className="flex items-start gap-1.5 font-mono text-[10.5px] text-muted bg-paper rounded-md px-2 py-1.5">
                                <Flag className="w-3 h-3 text-leaf-dark shrink-0 mt-0.5" />
                                <span className="leading-snug">{f.rule}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Positioning gap */}
                {!state.loading && state.positioningGap && (
                  <div className="mt-3 rounded-xl border border-line bg-paper px-3.5 py-3">
                    <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-muted mb-1.5">
                      <ArrowRightLeft className="w-3 h-3 text-leaf-dark" /> POSITIONING GAP
                    </div>
                    <p className="text-[12.5px] text-ink leading-snug">{state.positioningGap}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CompetitorsView({ ruleset, hasRules, onOpenRuleset, log }) {
  const [comps, setComps] = useState(SEED_COMPETITORS);
  const [expanded, setExpanded] = useState(SEED_COMPETITORS[0]?.id || null);
  const [analysis, setAnalysis] = useState({}); // id -> { loading, flags, content, insight, positioningGap, error }
  const [form, setForm] = useState({ name: "", linkedin: "", website: "" });

  async function runAnalysis(comp) {
    if (!hasRules) { onOpenRuleset(); return; }
    setExpanded(comp.id);
    setAnalysis((a) => ({ ...a, [comp.id]: { ...(a[comp.id] || {}), loading: true, error: "" } }));
    try {
      const content = await fetchCompetitorContent(comp);
      const out = await callClaude(CHECK_SYS, `APPROVED RULESET:\n${ruleset}\n\nCONTENT TO CHECK:\n${blobFromContent(content)}`);
      const flags = parseJSON(out).flags || [];
      setAnalysis((a) => ({ ...a, [comp.id]: { loading: false, flags, content, insight: content.insight, positioningGap: content.positioningGap } }));
      log(`competitor analysis run · ${comp.name}`);
    } catch (e) {
      setAnalysis((a) => ({ ...a, [comp.id]: { loading: false, error: "Analysis failed. Try again." } }));
    }
  }

  function addCompetitor(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const comp = { id: "c" + comps.length + "-" + form.name.trim().toLowerCase().replace(/\s+/g, "-"), name: form.name.trim(), linkedin: form.linkedin.trim(), website: form.website.trim(), lastRun: "just now" };
    setComps((c) => [...c, comp]);
    setForm({ name: "", linkedin: "", website: "" });
    runAnalysis(comp);
  }

  return (
    <div className="flex-1 w-full max-w-[1100px] mx-auto p-4 space-y-4">
      {/* Add competitor */}
      <form onSubmit={addCompetitor} className="bg-white rounded-2xl border border-line shadow-sm p-4">
        <div className="font-mono text-[10px] tracking-widest text-muted mb-3">ADD COMPETITOR</div>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name"
            className="flex-1 min-w-0 text-[13px] border border-line rounded-lg px-3 py-2 outline-none focus:border-leaf bg-white placeholder:text-muted/60" />
          <input value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} placeholder="LinkedIn URL"
            className="flex-1 min-w-0 text-[13px] border border-line rounded-lg px-3 py-2 outline-none focus:border-leaf bg-white placeholder:text-muted/60" />
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website URL"
            className="flex-1 min-w-0 text-[13px] border border-line rounded-lg px-3 py-2 outline-none focus:border-leaf bg-white placeholder:text-muted/60" />
          <button type="submit" disabled={!form.name.trim()}
            className="shrink-0 flex items-center justify-center gap-1.5 text-[13px] font-medium text-white bg-leaf hover:bg-leaf-dark disabled:opacity-40 rounded-lg px-4 py-2 transition-colors">
            <Plus className="w-4 h-4" /> Run analysis
          </button>
        </div>
        {!hasRules && (
          <p className="text-[12px] text-caution mt-2.5">
            Add an approved ruleset first — <button type="button" onClick={onOpenRuleset} className="font-medium underline">open ruleset</button> — so competitor claims can be flagged against it.
          </p>
        )}
      </form>

      {/* Competitor cards */}
      <div className="space-y-3">
        {comps.map((c) => (
          <CompetitorCard
            key={c.id}
            comp={c}
            expanded={expanded === c.id}
            onToggle={() => setExpanded(expanded === c.id ? null : c.id)}
            state={analysis[c.id]}
            onRun={() => runAnalysis(c)}
          />
        ))}
      </div>
    </div>
  );
}
