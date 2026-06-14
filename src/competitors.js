// Competitor intelligence fixtures for the demo.
//
// COST NOTE for the real version:
//   - Use Haiku for the bulk crawl-and-extract pass (LinkedIn posts + website scrape -> raw text).
//   - Escalate only the claim-flagging step to Sonnet (it needs the regulatory reasoning).
//   - Cache the ruleset across competitors so it is sent once, not per call.
//
// fetchCompetitorContent() is the ONLY seam to the data source. It returns fixtures today;
// a real backend crawl can replace the body later without touching any view code.

export const SEED_COMPETITORS = [
  {
    id: "comp-a",
    name: "FlowMedix",
    linkedin: "https://www.linkedin.com/company/flowmedix",
    website: "https://flowmedix.example.com",
    lastRun: "2026-06-12",
  },
  {
    id: "comp-b",
    name: "Steda Vascular",
    linkedin: "https://www.linkedin.com/company/steda-vascular",
    website: "https://steda.example.com",
    lastRun: "2026-06-11",
  },
];

// Hardcoded fixture posts + website snippets. Captions are what a thumbnail tile shows.
const FIXTURES = {
  // Competitor A: aggressive, off-claim. Should flag (superlative + figure over approved limit).
  "comp-a": {
    insight:
      "FlowMedix leans on speed and superlative claims you cannot make. Your edge is your cleared pediatric indication and the conservative 30% figure.",
    positioningGap:
      "They compete on raw speed (\"fastest\", \"50% reduction\"). You hold the only defensible regulatory position: cleared adult AND pediatric use.",
    posts: [
      { kind: "LinkedIn post", date: "2026-06-10", caption: "\"The fastest recovery on the market\" hero graphic", source: "https://www.linkedin.com/company/flowmedix/posts/1", text: "FlowMedix delivers the fastest recovery on the market. Nothing else comes close." },
      { kind: "LinkedIn post", date: "2026-06-06", caption: "Customer testimonial reel", source: "https://www.linkedin.com/company/flowmedix/posts/2", text: "Our customers call FlowMedix the #1 vascular monitor in their OR." },
      { kind: "LinkedIn post", date: "2026-05-30", caption: "Conference booth announcement", source: "https://www.linkedin.com/company/flowmedix/posts/3", text: "Visit booth 412 to see the leading vascular monitoring platform live." },
      { kind: "Website clip", date: "2026-06-12", caption: "Homepage hero band", source: "https://flowmedix.example.com", text: "Clinically proven 50% reduction in procedure time across all centers." },
    ],
    website: { caption: "Product page - efficacy section", source: "https://flowmedix.example.com/product", text: "FlowMedix is clinically proven to cut procedure time by 50% and is the category leader in vascular monitoring." },
  },

  // Competitor B: conservative, mostly on-claim. Used to show contrast (few or no flags).
  "comp-b": {
    insight:
      "Steda stays close to approved language. There is little to attack on compliance; differentiate on your pediatric clearance and outcomes within the cleared limit.",
    positioningGap:
      "Steda mirrors your conservative tone, so compliance is not the wedge here. Your pediatric indication is still a clean differentiator they lack.",
    posts: [
      { kind: "LinkedIn post", date: "2026-06-09", caption: "Clinical workflow explainer", source: "https://www.linkedin.com/company/steda-vascular/posts/1", text: "Steda supports accurate therapy decisions within cleared indications." },
      { kind: "LinkedIn post", date: "2026-06-02", caption: "Team at clinical symposium", source: "https://www.linkedin.com/company/steda-vascular/posts/2", text: "Trusted by clinical teams for real-time vascular monitoring." },
      { kind: "Website clip", date: "2026-06-11", caption: "Homepage value band", source: "https://steda.example.com", text: "A solution for vascular monitoring with clinical-grade accuracy." },
    ],
    website: { caption: "Product page - overview", source: "https://steda.example.com/product", text: "Steda Vascular provides clinical-grade accuracy for real-time vascular monitoring in clinical settings." },
  },
};

// Generic fallback so a freshly added competitor still renders something in the demo.
const DEFAULT_FIXTURE = {
  insight: "No crawl data wired for this competitor yet. The demo analyzed placeholder activity.",
  positioningGap: "Add a real crawl source to compare this competitor's messaging against your approved positioning.",
  posts: [
    { kind: "LinkedIn post", date: "recent", caption: "Recent announcement", source: "#", text: "Newly added competitor delivers the best results in the industry." },
    { kind: "Website clip", date: "recent", caption: "Homepage hero", source: "#", text: "The leading platform, clinically proven to outperform every alternative." },
  ],
  website: { caption: "Product page", source: "#", text: "The number one choice, clinically proven to reduce procedure time by 60%." },
};

export async function fetchCompetitorContent(competitor) {
  // DEMO: return fixtures. REAL: replace with a backend crawl of the competitor's
  // LinkedIn feed + website (Haiku extract pass), returning the same shape.
  return FIXTURES[competitor.id] || DEFAULT_FIXTURE;
}
