// Market Pulse fixtures for the demo.
//
// COST NOTE for the real version:
//   - Use Haiku to summarize raw forum/Reddit chatter into themes + sentiment (high volume, cheap).
//   - Use Sonnet ONLY for the positioning-risk reasoning (it ties market talk to specific claims).
//   - Cache theme summaries per source so a weekly refresh only re-summarizes new posts.
//
// Intended REAL sources: Reddit r/lymphedema, LymphNet and similar patient forums,
// public condition-specific groups. Facebook groups are harder to access (auth/ToS) and
// are out of scope for the first version.
//
// fetchMarketChatter() is the ONLY seam to the data source. Fixtures today; real crawl later.

export const PULSE_TOPIC = "lymphedema";

// Source label -> public URL, so each rendered theme quote can link back.
export const SOURCE_LINKS = {
  "r/lymphedema": "https://www.reddit.com/r/lymphedema/",
  "LymphNet forum": "https://www.lymphnet.org/",
};

// Hardcoded fixture chatter. Each line is tagged so the model can copy the source label.
const FIXTURES = {
  lymphedema: [
    { source: "r/lymphedema", text: "Compression garments are so uncomfortable for my severe lymphedema, I can barely keep them on all day." },
    { source: "r/lymphedema", text: "Honestly the big 40% swelling reduction claims do not hold up for severe cases like mine." },
    { source: "LymphNet forum", text: "Early-stage folks seem to do fine, but severe cases need a lot more than a single sleeve." },
    { source: "LymphNet forum", text: "Real-time monitoring during my therapy actually helped my clinician adjust treatment on the spot." },
    { source: "r/lymphedema", text: "Pediatric options are basically nonexistent. I wish there were cleared devices for kids." },
    { source: "LymphNet forum", text: "I trust my clinical team far more than any product marketing page I have read." },
  ],
};

export async function fetchMarketChatter(topic) {
  // DEMO: return fixtures. REAL: replace with a crawl of the sources noted above
  // (Haiku summarization pass), returning the same { source, text } shape.
  return FIXTURES[topic] || [];
}
