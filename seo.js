// ===========================================================================
// seo.js — SEO / structured-data layer for The Long Box.
//
// Deliberately kept separate from script.js's routing/filtering/rendering
// logic. This file only reads the current URL (already the single source
// of truth for app state) and the existing DATA/ENRICHMENT globals, then
// writes to <head> meta/link/JSON-LD tags. It never touches routing,
// filtering, search, or rendering -- script.js calls into this module's
// one entry point (applySEO) from its existing setSEO() function, so no
// call site anywhere else needed to change.
//
// Future-compatibility note (req #17): every builder below reads its
// subject matter (series names, filter values, URL params) dynamically
// from the existing globals/URL rather than hardcoding today's dataset,
// so adding future volumes, universes, or filters needs no changes here.
// ===========================================================================

const SEO_CONFIG = {
  siteName: "The Long Box",
  baseUrl: "https://thelongboxgo.netlify.app",
  defaultTitle: "The Long Box — Complete Marvel Comics Reading Order Guide",
  defaultDescription: "The Long Box is a free, publication-order comic book reading guide. Currently covering Marvel's Earth-616 — every issue of every series from Fantastic Four #1 (1961) through Secret Wars (1985) — with more universes and eras planned.",
  defaultImage: "/social-preview.png",
  language: "en-US",
  publisher: "The LongBox"
};

// Prefer the real runtime origin (script.js's SITE_ORIGIN) when available,
// falling back to the configured baseUrl (e.g. if this file is ever loaded
// standalone, or before script.js has defined SITE_ORIGIN).
function seoOrigin() {
  try {
    if (typeof SITE_ORIGIN !== "undefined" && SITE_ORIGIN) return SITE_ORIGIN;
  } catch (e) {}
  return SEO_CONFIG.baseUrl.replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Generic upsert helpers -- update a tag in place if it already exists,
// only create one if it doesn't. This is what keeps repeated navigation
// from ever duplicating a <meta> or <script type="application/ld+json">.
// ---------------------------------------------------------------------------
function upsertMeta(attr, value, content) {
  let el = document.querySelector(`meta[${attr}="${value}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
function upsertJsonLd(id, data) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}
function removeJsonLd(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ---------------------------------------------------------------------------
// Contextual title/description for filtered views (req #12). Reads the
// existing q/imp/year/writer params directly -- doesn't require render
// functions to pass anything new.
// ---------------------------------------------------------------------------
function prettify(raw) {
  return raw.replace(/_+/g, " ").trim().split(/\s+/).filter(Boolean)
    .map(word => word.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("-"))
    .join(" ");
}

function buildContextualMeta(params, fallbackTitle, fallbackDescription) {
  const q = (params.get("q") || "").trim();
  const year = params.get("year");
  const writer = params.get("writer");
  const imp = params.get("imp");
  const hasFilter = q || (year && year !== "all") || (writer && writer !== "all") || (imp && imp !== "all");
  if (!hasFilter) return { title: fallbackTitle, description: fallbackDescription };

  const subject = q ? prettify(q) : (writer && writer !== "all" ? writer : "Marvel");
  let titleSubject = `${subject} Comics`;
  if (year && year !== "all") titleSubject += ` (${year})`;
  const title = `${titleSubject} | ${SEO_CONFIG.siteName}`;

  const descBits = [`Browse ${subject} comics`];
  if (year && year !== "all") descBits.push(`from ${year}`);
  if (imp && imp !== "all") descBits.push(`tagged ${imp.split(",").join(", ")}`);
  const description = `${descBits.join(" ")} in real publication order on ${SEO_CONFIG.siteName}, a complete comic book reading guide.`;

  return { title, description };
}

// ---------------------------------------------------------------------------
// BreadcrumbList (req #6) -- search engines only, no visible UI.
// ---------------------------------------------------------------------------
function buildBreadcrumbs(path) {
  const origin = seoOrigin();
  const items = [{ "@type": "ListItem", position: 1, name: "Home", item: origin + "/" }];
  const segs = path.split("/").filter(Boolean);

  if (segs[0] === "browse") {
    items.push({ "@type": "ListItem", position: 2, name: "All Series", item: origin + "/browse" });
  } else if (segs[0] === "all") {
    items.push({ "@type": "ListItem", position: 2, name: "Full Chronological Order", item: origin + "/all" });
  } else if (segs[0] === "about") {
    items.push({ "@type": "ListItem", position: 2, name: "About", item: origin + "/about" });
  } else if (segs[0] === "series" && segs[1]) {
    items.push({ "@type": "ListItem", position: 2, name: "All Series", item: origin + "/browse" });
    const seriesName = (typeof unslug === "function") ? unslug(segs[1]) : null;
    if (seriesName) {
      items.push({ "@type": "ListItem", position: 3, name: seriesName, item: origin + "/series/" + segs[1] });
    }
  }
  return { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: items };
}

// ---------------------------------------------------------------------------
// WebSite + SearchAction (req #2 + #3). Reuses the existing q-param search
// exactly as-is -- SearchAction just documents that URL shape for crawlers.
// ---------------------------------------------------------------------------
function renderWebsiteSchema() {
  const origin = seoOrigin();
  upsertJsonLd("jsonld-website", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SEO_CONFIG.siteName,
    url: origin + "/",
    description: SEO_CONFIG.defaultDescription,
    inLanguage: SEO_CONFIG.language,
    publisher: { "@type": "Organization", name: SEO_CONFIG.publisher },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: origin + "/all?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  });
}

// ---------------------------------------------------------------------------
// Organization (req #4). Social links left as an empty placeholder array
// until real profiles exist.
// ---------------------------------------------------------------------------
function renderOrganizationSchema() {
  const origin = seoOrigin();
  upsertJsonLd("jsonld-organization", {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SEO_CONFIG.siteName,
    url: origin + "/",
    logo: origin + "/favicon.png",
    description: SEO_CONFIG.defaultDescription,
    sameAs: [],
  });
}

// ---------------------------------------------------------------------------
// CollectionPage (req #5) -- only present on series pages; removed again
// if the user navigates elsewhere so stale structured data never lingers.
// ---------------------------------------------------------------------------
function renderCollectionSchema(path, title, description) {
  const segs = path.split("/").filter(Boolean);
  if (segs[0] !== "series" || !segs[1]) {
    removeJsonLd("jsonld-collection");
    return;
  }
  const origin = seoOrigin();
  const seriesName = (typeof unslug === "function") ? unslug(segs[1]) : null;
  upsertJsonLd("jsonld-collection", {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: seriesName ? `${seriesName} — Reading Order` : title,
    description,
    url: origin + "/series/" + segs[1],
  });
}

// ---------------------------------------------------------------------------
// Article schema (Phase 2.5, req #1-4) -- one comic issue = one Article.
// An "individual issue" is whenever the URL is a 3-segment issue-detail
// path: /series/<slug>/<issue> or /all/<slug>/<issue> (both already used
// by the existing modal deep-linking -- no new path shape introduced).
// ---------------------------------------------------------------------------
function parseIssuePath(path) {
  const segs = path.split("/").filter(Boolean);
  if ((segs[0] === "series" || segs[0] === "all") && segs[1] && segs[2]) {
    const seriesName = (typeof unslug === "function") ? unslug(segs[1]) : null;
    if (seriesName) return { seriesName, issueNum: decodeURIComponent(segs[2]) };
  }
  return null;
}

function renderArticleSchema(path) {
  const info = parseIssuePath(path);
  if (!info) { removeJsonLd("jsonld-article"); return; }

  const items = (typeof DATA !== "undefined") ? DATA[info.seriesName] : null;
  const item = items ? items.find(it => it.i === info.issueNum) : null;
  if (!item) { removeJsonLd("jsonld-article"); return; } // graceful fallback: no match, no schema

  const enr = (typeof getEnrichment === "function") ? getEnrichment(info.seriesName, info.issueNum) : null;
  const origin = seoOrigin();

  // Build incrementally so any field with no real data is simply never set
  // (req #4 -- never emit an empty/invalid property).
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${info.seriesName} #${info.issueNum}`,
    mainEntityOfPage: origin + path,
    publisher: { "@type": "Organization", name: SEO_CONFIG.siteName },
    inLanguage: SEO_CONFIG.language,
    image: origin + SEO_CONFIG.defaultImage,
  };
  if (enr && enr.s) article.description = enr.s;
  if (enr && enr.w) article.author = { "@type": "Person", name: enr.w };
  if (item.y) article.datePublished = item.m ? `${item.y}-${String(item.m).padStart(2, "0")}` : String(item.y);
  if (item.sy) article.dateCreated = String(item.sy);

  upsertJsonLd("jsonld-article", article);
}

// Safety net for the one case applySEO() alone can't catch: closing the
// modal intentionally doesn't re-trigger setSEO (an earlier perf choice --
// see script.js), so Article schema would otherwise linger describing an
// issue that's no longer on screen. Watching the modal's own open/closed
// class needs no changes to script.js or the routing system.
(function watchModalClose() {
  const overlay = document.getElementById("modalOverlay");
  if (!overlay || typeof MutationObserver === "undefined") return;
  const observer = new MutationObserver(() => {
    if (!overlay.classList.contains("open")) removeJsonLd("jsonld-article");
  });
  observer.observe(overlay, { attributes: true, attributeFilter: ["class"] });
})();

// ---------------------------------------------------------------------------
// Master entry point. Called from script.js's existing setSEO({title,
// description, path}) on every navigation -- same call sites, same
// signature, nothing else in script.js needs to change.
//
// Deferred by one tick (setTimeout 0): script.js's modal Next/Prev handlers
// call setSEO() *before* their own history.replaceState() runs (an existing,
// unrelated call-order detail we're not touching). Reading the URL
// synchronously here would occasionally pick up the URL from the issue the
// user just navigated away from. Deferring one tick means replaceState has
// always already run by the time we read window.location -- fixes canonical/
// OG/Article-schema staleness with no changes to script.js or routing.
// ---------------------------------------------------------------------------
function applySEO({ title, description, path }) {
  setTimeout(() => {
    const origin = seoOrigin();
    const params = new URLSearchParams(window.location.search);
    const currentPath = window.location.pathname;
    const { title: finalTitle, description: finalDescription } = buildContextualMeta(params, title, description);
    const canonicalUrl = origin + currentPath + window.location.search;
    const image = origin + SEO_CONFIG.defaultImage;

    document.title = finalTitle;
    upsertMeta("name", "description", finalDescription);

    const canonical = document.getElementById("canonicalLink");
    if (canonical) canonical.setAttribute("href", canonicalUrl);

    upsertMeta("property", "og:title", finalTitle);
    upsertMeta("property", "og:description", finalDescription);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:image", image);

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", finalTitle);
    upsertMeta("name", "twitter:description", finalDescription);
    upsertMeta("name", "twitter:image", image);

    renderWebsiteSchema();
    renderOrganizationSchema();
    upsertJsonLd("jsonld-breadcrumb", buildBreadcrumbs(currentPath));
    renderCollectionSchema(currentPath, finalTitle, finalDescription);
    renderArticleSchema(currentPath);
  }, 0);
}