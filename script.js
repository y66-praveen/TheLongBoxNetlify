// The Long Box — app logic
const THEME_KEY = "archive616_theme";
const READ_KEY = "archive616_read";
const SITE_ORIGIN = window.location.origin;

const IMPORTANCE_ORDER = ["Essential", "Major", "Recommended", "Semi Optional", "Optional", "Reference Only"];
const STOPWORDS = new Set(["a", "an", "the", "of", "and", "in", "on", "for", "issue", "issues", "no", "number", "#"]);
// Common fan shorthand -> expands to the real series-name words before matching,
// so "asm 5" behaves like "amazing spider man 5". No new data required --
// this is purely a query-time expansion over the existing series names.
const ABBREVIATIONS = {
  "asm": ["amazing", "spider", "man"],
  "ff": ["fantastic", "four"],
  "cap": ["captain", "america"],
  "dd": ["daredevil"],
  "gr": ["ghost", "rider"],
};

const seriesNames = Object.keys(DATA); // preserved debut-order from data.js
const ENRICH = (typeof ENRICHMENT !== "undefined") ? ENRICHMENT : {};

// ---------- Slugs (series name <-> URL segment) ----------
const slugToSeries = {};
const seriesToSlug = {};
seriesNames.forEach(name => {
  const slug = name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  seriesToSlug[name] = slug;
  slugToSeries[slug] = name;
});
function slugify(name) { return seriesToSlug[name] || encodeURIComponent(name); }
function unslug(slug) { return slugToSeries[slug] || null; }

// ---------- Enrichment lookup ----------
function getEnrichment(series, issue) {
  const exact = ENRICH[series + "||" + issue];
  if (exact) return exact;
  const runWriter = (typeof lookupWriterRun === "function") ? lookupWriterRun(series, issue) : null;
  return runWriter ? { w: runWriter, s: null } : null;
}

// ---------- Normalization for search ----------
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[-_/]+/g, " ")     // hyphens -> spaces
    .replace(/[^a-z0-9 ]+/g, "") // strip punctuation
    .replace(/\s+/g, " ")
    .trim();
}
function noSpace(str) { return str.replace(/\s+/g, ""); }

// Precompute a search-friendly record for every issue once at load time.
function adjacentCompounds(words) {
  const set = new Set();
  for (let i = 0; i < words.length - 1; i++) set.add(words[i] + words[i + 1]);
  if (words.length) set.add(words.join(""));
  return set;
}

const SEARCH_INDEX = [];
seriesNames.forEach(name => {
  DATA[name].forEach(it => {
    const enr = getEnrichment(name, it.i);
    const writer = enr ? enr.w : "";
    const summary = enr ? enr.s : "";
    const hayParts = [it.d, it.y, it.sy, it.v, it.imp, it.tags, summary];
    const hay = normalize(hayParts.join(" "));
    const haySeries = normalize(name);
    const haySeriesWords = haySeries.split(" ");
    const hayWriterWords = normalize(writer).split(" ").filter(Boolean);
    SEARCH_INDEX.push({
      series: name, i: it.i, d: it.d, y: it.y, m: it.m, sy: it.sy, v: it.v, imp: it.imp, tags: it.tags,
      writer, summary,
      hayWords: hay.split(" ").filter(Boolean),
      hayCompounds: adjacentCompounds(hay.split(" ").filter(Boolean)),
      haySeries, haySeriesWords,
      haySeriesCompounds: adjacentCompounds(haySeriesWords),
      hayWriterWords,
      hayWriterCompounds: adjacentCompounds(hayWriterWords),
    });
  });
});

// Word-boundary match: token must equal or prefix an entire word in the haystack.
// (Plain substring matching would let "man" false-match inside "woman" — this avoids that.)
function wordMatch(words, tok) {
  return words.some(w => w === tok || w.startsWith(tok));
}
// Compound match: token equals a concatenation of adjacent words (handles
// "spiderman" == "spider man", "xmen" == "x men") without loosely substring-
// matching against an entire blob of unrelated text.
function compoundMatch(compoundSet, tok) {
  if (compoundSet.has(tok)) return true;
  for (const c of compoundSet) if (c.startsWith(tok) && tok.length >= 4) return true;
  return false;
}

function searchItems(query, scopeSeriesName) {
  const scope = scopeSeriesName ? SEARCH_INDEX.filter(r => r.series === scopeSeriesName) : SEARCH_INDEX;
  const q = normalize(query);
  if (!q) return scope.map(r => ({ r, score: 0 }));
  let tokens = q.split(" ").filter(t => t && !STOPWORDS.has(t));
  if (tokens.length === 0) tokens = q.split(" ").filter(Boolean);
  // Expand any recognized shorthand token (e.g. "asm") into its full-name tokens.
  tokens = tokens.reduce((acc, t) => acc.concat(ABBREVIATIONS[t] || [t]), []);

  const results = [];
  scope.forEach(r => {
    let score = 0;
    let allMatch = true;
    for (const tok of tokens) {
      const isNumeric = /^\d+$/.test(tok);
      let matched = false;
      if (isNumeric) {
        // Numeric tokens must match an exact issue number or exact year --
        // no loose substring fallback, or "1" would match almost every row
        // (most dates/years contain the digit "1" somewhere).
        if (r.i === tok) { matched = true; score += 4; }
        else if (String(r.y) === tok) { matched = true; score += 3; }
      } else {
        if (wordMatch(r.haySeriesWords, tok) || compoundMatch(r.haySeriesCompounds, tok)) { matched = true; score += 3; }
        else if (wordMatch(r.hayWriterWords, tok) || compoundMatch(r.hayWriterCompounds, tok)) { matched = true; score += 3; }
        else if (wordMatch(r.hayWords, tok) || compoundMatch(r.hayCompounds, tok)) { matched = true; score += 1; }
      }
      if (!matched) { allMatch = false; break; }
    }
    if (allMatch) {
      const qCompact = noSpace(q);
      if (r.haySeries === q || noSpace(r.haySeries) === qCompact) score += 5;
      results.push({ r, score });
    }
  });
  return results;
}

// ---------- Theme ----------
const themeToggle = document.getElementById("themeToggle");
function applyTheme(theme) {
  if (theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}
themeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const next = isDark ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
});

// ---------- Read/progress tracking ----------
function getRead() {
  try { return JSON.parse(localStorage.getItem(READ_KEY) || "{}"); } catch (e) { return {}; }
}
function setRead(key, val) {
  const r = getRead();
  if (val) r[key] = true; else delete r[key];
  try { localStorage.setItem(READ_KEY, JSON.stringify(r)); } catch (e) {}
}
function issueKey(series, issue) { return series + "#" + issue; }

// ---------- Mobile nav ----------
const seriesNavEl = document.getElementById("seriesNav");
const menuToggle = document.getElementById("menuToggle");
function closeMobileNav() {
  seriesNavEl.classList.remove("mobile-open");
  menuToggle.classList.remove("active");
}
menuToggle.addEventListener("click", () => {
  seriesNavEl.classList.toggle("mobile-open");
  menuToggle.classList.toggle("active");
});

// ---------- Nav series list ----------
const navSeriesListEl = document.getElementById("navSeriesList");
const navSearchEl = document.getElementById("navSearch");

function renderNavList(filterText) {
  navSeriesListEl.innerHTML = "";
  const q = (filterText || "").toLowerCase().trim();
  seriesNames.forEach(name => {
    if (q && !name.toLowerCase().includes(q)) return;
    const a = document.createElement("a");
    a.href = "/series/" + slugify(name);
    a.setAttribute("data-link", "");
    a.className = "nav-series-item";
    a.innerHTML = `<span>${name}</span><span class="nav-series-count">${DATA[name].length}</span>`;
    navSeriesListEl.appendChild(a);
  });
}
navSearchEl.addEventListener("input", (e) => renderNavList(e.target.value));

function updateNavActive(routeInfo) {
  document.querySelectorAll(".nav-link, .nav-series-item").forEach(el => el.classList.remove("active"));
  if (routeInfo.name === "home") document.getElementById("navHome").classList.add("active");
  else if (routeInfo.name === "all") document.getElementById("navChrono").classList.add("active");
  else if (routeInfo.name === "explore") document.getElementById("navExplore").classList.add("active");
  else if (routeInfo.name === "series") {
    document.querySelectorAll(".nav-series-item").forEach(el => {
      if (el.getAttribute("href") === "/series/" + slugify(routeInfo.seriesName)) el.classList.add("active");
    });
  }
}

// ---------- SEO helpers ----------
// Phase 2: the actual work now lives in seo.js (kept separate so SEO logic
// never mixes with UI/routing logic). setSEO's signature and every call
// site below are unchanged -- this is a thin wrapper, not a refactor.
const canonicalLink = document.getElementById("canonicalLink");
function setSEO({ title, description, path }) {
  if (typeof applySEO === "function") {
    applySEO({ title, description, path });
  } else {
    // Defensive fallback if seo.js failed to load for any reason.
    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", description);
    if (canonicalLink) canonicalLink.setAttribute("href", SITE_ORIGIN + path);
  }
}

// ---------- Formatting helpers ----------
function tagList(tags) {
  return (tags || "").split(";").map(t => t.trim()).filter(Boolean);
}
function impClass(imp) { return "imp-" + (imp || "").replace(/\s+/g, ""); }

// ---------- URL-driven router ----------
// Route shapes:
//   /                                  -> home
//   /all                               -> chronological, + query params
//   /about                             -> about page
//   /series/<slug>                     -> series page, + query params
//   /series/<slug>/<issue>             -> series page with modal open on <issue>
// Query params (where applicable): sort, imp, era, year, q
function parseRoute() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(window.location.search);
  let segs = path.split("/").filter(Boolean);
  // Tolerate being opened as .../index.html (direct file open, or a host
  // that doesn't rewrite cleanly) -- treat a trailing index.html as "/".
  if (segs.length && /^index\.html?$/i.test(segs[segs.length - 1])) {
    segs = segs.slice(0, -1);
  }

  if (segs.length === 0) return { name: "explore", params };
  if (segs[0] === "browse") return { name: "home", params };
  if (segs[0] === "all") return { name: "all", params };
  if (segs[0] === "about") return { name: "about", params };
  if (segs[0] === "explore") return { name: "explore", params };
  if (segs[0] === "series" && segs[1]) {
    const seriesName = unslug(segs[1]);
    if (!seriesName) return { name: "notfound", params }; // a real series link that doesn't resolve
    const modalIssue = segs[2] ? decodeURIComponent(segs[2]) : null;
    return { name: "series", seriesName, modalIssue, params };
  }
  // Any other unrecognized path (stray file-system segments, an unexpected
  // hosting subfolder, etc.) -- fall back to the landing page rather than
  // "not found", since that's almost always a hosting/opening quirk.
  return { name: "explore", params };
}

function buildPath(name, opts) {
  opts = opts || {};
  if (name === "explore") return "/";
  if (name === "home") return "/browse";
  if (name === "all") return "/all";
  if (name === "about") return "/about";
  if (name === "series") {
    let p = "/series/" + slugify(opts.seriesName);
    if (opts.issue != null) p += "/" + encodeURIComponent(opts.issue);
    return p;
  }
  return "/";
}

function navigate(path, opts) {
  opts = opts || {};
  const method = opts.replace ? "replaceState" : "pushState";
  history[method](null, "", path);
  route();
}

// Intercept internal link clicks for pushState navigation
document.addEventListener("click", (e) => {
  const a = e.target.closest("a[data-link]");
  if (!a) return;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== SITE_ORIGIN) return;
  e.preventDefault();
  navigate(url.pathname + url.search);
});
window.addEventListener("popstate", route);

// ---------- Modal ----------
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const modalSeries = document.getElementById("modalSeries");
const modalTitle = document.getElementById("modalTitle");
const modalSummary = document.getElementById("modalSummary");
const modalMetaGrid = document.getElementById("modalMetaGrid");
const modalTags = document.getElementById("modalTags");
const modalPrev = document.getElementById("modalPrev");
const modalNext = document.getElementById("modalNext");

let modalList = [];
let modalIndex = -1;
let modalReturnPath = "/"; // path to fall back to on close, without the modal segment

function openModalAt(list, idx, basePathForModal) {
  modalList = list;
  modalIndex = idx;
  const item = list[idx];
  renderModal();
  modalOverlay.classList.add("open");
  const path = basePathForModal(item);
  history.pushState(null, "", path + window.location.search);
}
function renderModal() {
  const item = modalList[modalIndex];
  if (!item) return;
  const enr = getEnrichment(item.series, item.i);
  modalSeries.textContent = item.series;
  modalTitle.textContent = "#" + item.i;

  if (enr && enr.s) {
    modalSummary.style.display = "";
    modalSummary.innerHTML = `<p>${enr.s}</p>`;
  } else {
    modalSummary.style.display = "none";
    modalSummary.innerHTML = "";
  }

  const writerRow = enr && enr.w
    ? `<div class="modal-meta-item"><span class="modal-meta-label">Writer</span>${enr.w}</div>`
    : `<div class="modal-meta-item"><span class="modal-meta-label">Writer</span><span class="meta-unknown">Not yet catalogued</span></div>`;

  modalMetaGrid.innerHTML = `
    ${writerRow}
    <div class="modal-meta-item"><span class="modal-meta-label">Release Date</span>${item.d}</div>
    <div class="modal-meta-item"><span class="modal-meta-label">Story Year</span>${item.sy}</div>
    <div class="modal-meta-item"><span class="modal-meta-label">Era</span>${item.v}</div>
    <div class="modal-meta-item"><span class="modal-meta-label">Importance</span>${item.imp}</div>
  `;
  const tags = tagList(item.tags);
  modalTags.innerHTML = tags.length
    ? tags.map(t => `<span class="tag-pill">${t}</span>`).join("")
    : `<span class="tag-pill">No special tags</span>`;
  modalPrev.disabled = modalIndex <= 0;
  modalNext.disabled = modalIndex >= modalList.length - 1;

  setSEO({
    title: `${item.series} #${item.i} — The Long Box`,
    description: (enr && enr.s) ? enr.s : `${item.series} #${item.i}, released ${item.d}. Part of The Long Box's Marvel Earth-616 reading order.`,
    path: window.location.pathname,
  });
}
function closeModalToBase() {
  modalOverlay.classList.remove("open");
  history.replaceState(null, "", modalReturnPath + window.location.search);
}
modalPrev.addEventListener("click", () => {
  if (modalIndex > 0) {
    modalIndex--;
    renderModal();
    const item = modalList[modalIndex];
    const path = window.location.pathname.startsWith("/series/")
      ? buildPath("series", { seriesName: item.series, issue: item.i })
      : window.location.pathname.replace(/\/[^/]*$/, "");
    history.replaceState(null, "", path + window.location.search);
  }
});
modalNext.addEventListener("click", () => {
  if (modalIndex < modalList.length - 1) {
    modalIndex++;
    renderModal();
    const item = modalList[modalIndex];
    const path = window.location.pathname.startsWith("/series/")
      ? buildPath("series", { seriesName: item.series, issue: item.i })
      : window.location.pathname;
    history.replaceState(null, "", path + window.location.search);
  }
});
modalClose.addEventListener("click", closeModalToBase);
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) closeModalToBase(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (modalOverlay.classList.contains("open")) closeModalToBase(); closeMobileNav(); }
  if (modalOverlay.classList.contains("open")) {
    if (e.key === "ArrowLeft") modalPrev.click();
    if (e.key === "ArrowRight") modalNext.click();
  }
});

// ---------- Scroll to top ----------
const scrollTopBtn = document.getElementById("scrollTopBtn");
window.addEventListener("scroll", () => scrollTopBtn.classList.toggle("visible", window.scrollY > 500));
scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ---------- Page area ----------
const pageArea = document.getElementById("pageArea");
const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none"><path d="M4 12.5L9.5 18L20 6" stroke="white" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function buildIssueCard(item, listRefForModal, idxInList, showSeries, basePathForModal) {
  const key = issueKey(item.series, item.i);
  const isRead = !!getRead()[key];
  const enr = getEnrichment(item.series, item.i);
  const card = document.createElement("div");
  card.className = "issue-card" + (isRead ? " watched" : "");
  const showBurst = item.imp === "Essential";

  card.innerHTML = `
    ${showBurst ? '<span class="burst">KEY ISSUE</span>' : ""}
    <span class="issue-num">#${item.i}</span>
    <div class="issue-main">
      <span class="issue-series-tag">${showSeries ? item.series : ""}</span>
      <span class="issue-date">${item.d}${showSeries ? "" : " · " + item.v}</span>
      ${enr && enr.s ? `<div class="issue-summary">${enr.s}</div>` : ""}
      <div class="issue-tags">
        <span class="tag-pill">Story yr ${item.sy}</span>
        ${enr && enr.w ? `<span class="tag-pill tag-writer">${enr.w}</span>` : ""}
        ${tagList(item.tags).map(t => `<span class="tag-pill">${t}</span>`).join("")}
      </div>
    </div>
    <span class="imp-badge ${impClass(item.imp)}">${item.imp}</span>
    <div class="watch-checkbox ${isRead ? "checked" : ""}">${CHECK_SVG}</div>
  `;

  card.querySelector(".watch-checkbox").addEventListener("click", (e) => {
    e.stopPropagation();
    const nowRead = !card.classList.contains("watched");
    setRead(key, nowRead);
    card.classList.toggle("watched", nowRead);
    e.currentTarget.classList.toggle("checked", nowRead);
    refreshProgressUI();
  });

  card.addEventListener("click", () => openModalAt(listRefForModal, idxInList, basePathForModal));
  return card;
}

let currentProgressEls = null;
function refreshProgressUI() {
  if (!currentProgressEls) return;
  const { items, fillEl, labelEl } = currentProgressEls;
  const read = getRead();
  const total = items.length;
  const done = items.filter(it => read[issueKey(it.series, it.i)]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  fillEl.style.width = pct + "%";
  labelEl.textContent = `${done}/${total} read`;
}

// ---------- Toolbar (reads/writes URL query params directly) ----------
function parseMulti(param) {
  return param ? param.split(",").filter(Boolean) : [];
}
function readStateFromParams(params) {
  return {
    sort: params.get("sort") === "desc" ? "desc" : "asc",
    imp: parseMulti(params.get("imp")),
    era: parseMulti(params.get("era")),
    year: params.get("year") || "all",
    writer: params.get("writer") || "all",
    q: params.get("q") || "",
  };
}

// Distinct writers currently catalogued (only the enriched "Essential" issues
// have a writer yet -- see enrichment.js).
const RUN_WRITERS = (typeof WRITER_RUNS !== "undefined")
  ? Object.values(WRITER_RUNS).flatMap(runs => runs.map(r => r.writer))
  : [];
const ALL_WRITERS = Array.from(new Set(
  Object.values(ENRICH).map(e => e.w).filter(Boolean).concat(RUN_WRITERS)
)).sort();

// Lightweight checkbox-popover multi-select control. Returns the wrapper
// element; calls onChange(selectedArray) whenever the selection changes.
function makeMultiSelect(idBase, placeholderLabel, options, selected, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "multi-select";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tb-select multi-select-btn";
  wrap.appendChild(btn);
  const panel = document.createElement("div");
  panel.className = "multi-select-panel";
  options.forEach(opt => {
    const row = document.createElement("label");
    row.className = "multi-select-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = opt;
    cb.checked = selected.includes(opt);
    cb.addEventListener("change", () => {
      const next = Array.from(panel.querySelectorAll("input:checked")).map(i => i.value);
      updateLabel(next);
      onChange(next);
    });
    row.appendChild(cb);
    row.appendChild(document.createTextNode(" " + opt));
    panel.appendChild(row);
  });
  wrap.appendChild(panel);

  function updateLabel(sel) {
    btn.textContent = sel.length === 0 ? placeholderLabel
      : sel.length === 1 ? sel[0]
      : sel.length + " selected";
    btn.classList.toggle("active", sel.length > 0);
  }
  updateLabel(selected);

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".multi-select-panel.open").forEach(p => { if (p !== panel) p.classList.remove("open"); });
    panel.classList.toggle("open");
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) panel.classList.remove("open");
  });

  return wrap;
}

function makeToolbar(items, params, showSeriesYearFilter, onChange) {
  let state = readStateFromParams(params);
  const years = Array.from(new Set(items.map(i => i.y))).sort((a, b) => a - b);

  const bar = document.createElement("div");
  bar.className = "toolbar";
  bar.innerHTML = `
    <div class="tb-group">
      <button class="tb-btn sort-btn" id="tbSort">${state.sort === "asc" ? "Oldest first ↓" : "Newest first ↑"}</button>
    </div>
    <div class="tb-group" id="tbFilterGroup"></div>
    <div class="tb-spacer"></div>
    <div class="tb-group tb-search">
      <input type="text" id="tbSearch" placeholder="Search series, issue #, year, writer..." value="${state.q.replace(/"/g, "&quot;")}">
    </div>
    <div class="tb-progress">
      <div class="tb-progress-track"><div class="tb-progress-fill" id="tbProgressFill"></div></div>
      <span id="tbProgressLabel"></span>
    </div>
  `;

  // Commit a state patch: reflect it in the URL (no full re-render/navigation,
  // so an open multi-select panel or the search input's focus is never
  // disturbed) and let the caller re-render just the list.
  function commit(patch) {
    state = { ...state, ...patch };
    const url = new URL(window.location.href);
    const setOrDel = (k, v) => {
      const empty = v === null || v === undefined || v === "" || v === "all" || v === "asc" || (Array.isArray(v) && v.length === 0);
      if (empty) url.searchParams.delete(k);
      else url.searchParams.set(k, Array.isArray(v) ? v.join(",") : v);
    };
    setOrDel("sort", state.sort);
    setOrDel("imp", state.imp);
    setOrDel("era", state.era);
    setOrDel("year", state.year);
    setOrDel("writer", state.writer);
    setOrDel("q", state.q);
    history.replaceState(null, "", url.pathname + url.search);
    onChange(state);
  }

  const filterGroup = bar.querySelector("#tbFilterGroup");
  filterGroup.appendChild(makeMultiSelect("tbImp", "All importance", IMPORTANCE_ORDER, state.imp,
    (sel) => commit({ imp: sel })));
  filterGroup.appendChild(makeMultiSelect("tbEra", "All eras",
    ["Vol. 1 — Silver Age", "Vol. 2 — Bronze Age"], state.era,
    (sel) => commit({ era: sel })));

  if (showSeriesYearFilter) {
    const yearSel = document.createElement("select");
    yearSel.className = "tb-select";
    yearSel.id = "tbYear";
    yearSel.innerHTML = `<option value="all">All years</option>` +
      years.map(y => `<option value="${y}" ${String(state.year) === String(y) ? "selected" : ""}>${y}</option>`).join("");
    yearSel.addEventListener("change", (e) => commit({ year: e.target.value }));
    filterGroup.appendChild(yearSel);

    if (ALL_WRITERS.length) {
      const writerSel = document.createElement("select");
      writerSel.className = "tb-select";
      writerSel.id = "tbWriter";
      writerSel.innerHTML = `<option value="all">All writers</option>` +
        ALL_WRITERS.map(w => `<option value="${w}" ${state.writer === w ? "selected" : ""}>${w}</option>`).join("");
      writerSel.addEventListener("change", (e) => commit({ writer: e.target.value }));
      filterGroup.appendChild(writerSel);
    }
  }

  currentProgressEls = { items, fillEl: bar.querySelector("#tbProgressFill"), labelEl: bar.querySelector("#tbProgressLabel") };
  refreshProgressUI();

  bar.querySelector("#tbSort").addEventListener("click", (e) => {
    const next = state.sort === "asc" ? "desc" : "asc";
    e.target.textContent = next === "asc" ? "Oldest first ↓" : "Newest first ↑";
    commit({ sort: next });
  });
  let debounceTimer;
  bar.querySelector("#tbSearch").addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    const val = e.target.value;
    debounceTimer = setTimeout(() => commit({ q: val }), 220);
  });

  return { bar, state };
}

function matchesFilters(i, state) {
  if (state.imp.length && !state.imp.includes(i.imp)) return false;
  if (state.era.length && !state.era.includes(i.v)) return false;
  if (state.year !== "all" && String(i.y) !== String(state.year)) return false;
  if (state.writer !== "all") {
    const enr = getEnrichment(i.series, i.i);
    if (!enr || enr.w !== state.writer) return false;
  }
  return true;
}

function applyFiltersAndSort(items, state, scopeSeriesName) {
  let out = items;
  if (state.q && state.q.trim()) {
    const results = searchItems(state.q, scopeSeriesName);
    const scoreMap = new Map();
    results.forEach(({ r, score }) => scoreMap.set(r.series + "#" + r.i, score));
    out = items.filter(i => scoreMap.has(i.series + "#" + i.i) && matchesFilters(i, state));
    out = out.slice().sort((a, b) => {
      const sa = scoreMap.get(a.series + "#" + a.i), sb = scoreMap.get(b.series + "#" + b.i);
      if (sb !== sa) return sb - sa;
      const av = a.y * 100 + a.m, bv = b.y * 100 + b.m;
      return state.sort === "asc" ? av - bv : bv - av;
    });
    return out;
  }
  out = items.filter(i => matchesFilters(i, state));
  out = out.slice().sort((a, b) => {
    const av = a.y * 100 + a.m, bv = b.y * 100 + b.m;
    return state.sort === "asc" ? av - bv : bv - av;
  });
  return out;
}

const PAGE_SIZE = 150;

function renderIssueListWithPaging(container, allFiltered, showSeries, basePathForModal, deepLinkIssue) {
  container.innerHTML = "";
  let renderCount = Math.min(PAGE_SIZE, allFiltered.length);

  // If a deep-linked issue is beyond the first page, expand render count to include it.
  if (deepLinkIssue) {
    const idx = allFiltered.findIndex(it => it.i === deepLinkIssue);
    if (idx >= renderCount) renderCount = idx + 20;
  }

  function draw() {
    container.innerHTML = "";
    const listEl = document.createElement("div");
    listEl.className = "issue-list";
    let lastYear = null;
    const visible = allFiltered.slice(0, renderCount);
    if (visible.length === 0) {
      container.innerHTML = `<div class="empty-msg">No issues match your filters.</div>`;
      return;
    }
    visible.forEach((item, idx) => {
      item.showSeries = showSeries;
      if (item.y !== lastYear) {
        const div = document.createElement("div");
        div.className = "year-divider";
        div.textContent = item.y;
        listEl.appendChild(div);
        lastYear = item.y;
      }
      const card = buildIssueCard(item, allFiltered, idx, showSeries, basePathForModal);
      if (deepLinkIssue && item.i === deepLinkIssue) card.id = "deepLinkTarget";
      listEl.appendChild(card);
    });
    container.appendChild(listEl);

    if (renderCount < allFiltered.length) {
      const btn = document.createElement("button");
      btn.className = "load-more-btn";
      btn.textContent = `Load ${Math.min(PAGE_SIZE, allFiltered.length - renderCount)} more (${allFiltered.length - renderCount} remaining)`;
      btn.addEventListener("click", () => { renderCount += PAGE_SIZE; draw(); });
      container.appendChild(btn);
    }
  }
  draw();

  if (deepLinkIssue) {
    const target = document.getElementById("deepLinkTarget");
    if (target) {
      const idx = allFiltered.findIndex(it => it.i === deepLinkIssue);
      openModalAt(allFiltered, idx, basePathForModal);
      target.scrollIntoView({ block: "center" });
    }
  }
}

// ---------- Views ----------
function renderHome() {
  modalReturnPath = "/browse";
  setSEO({
    title: "Browse All Series — The Long Box (Marvel Comics Reading Order)",
    description: "Browse every Marvel Comics series in publication order, from Fantastic Four #1 (1961) through Secret Wars (1985), organized as a shelf of series.",
    path: "/browse",
  });
  const totalIssues = seriesNames.reduce((s, n) => s + DATA[n].length, 0);
  pageArea.innerHTML = `
    <div class="page-title-row"><h1 class="page-title">THE LONG BOX</h1></div>
    <p class="page-subtitle">${seriesNames.length} series &middot; ${totalIssues} issues &middot; November 1961 &ndash; April 1985</p>
    <div class="series-grid" id="seriesGrid"></div>
  `;
  const grid = document.getElementById("seriesGrid");
  const read = getRead();
  const spineColors = ["var(--red)", "var(--blue)", "var(--gold)"];
  seriesNames.forEach((name, idx) => {
    const items = DATA[name];
    const done = items.filter(it => read[issueKey(name, it.i)]).length;
    const pct = items.length ? Math.round((done / items.length) * 100) : 0;
    const first = items[0], last = items[items.length - 1];
    const a = document.createElement("a");
    a.href = "/series/" + slugify(name);
    a.setAttribute("data-link", "");
    a.className = "spine-card";
    a.style.setProperty("--spine-color", spineColors[idx % spineColors.length]);
    a.innerHTML = `
      <h3 class="spine-title">${name}</h3>
      <div class="spine-meta">
        <span>${items.length} issues &middot; ${first.y}&ndash;${last.y}</span>
        <span class="spine-progress-ring" style="--pct:${pct}"></span>
      </div>
    `;
    grid.appendChild(a);
  });
}

function renderSeries(name, modalIssue, params) {
  if (!DATA[name]) { renderNotFound(); return; }
  modalReturnPath = buildPath("series", { seriesName: name });
  const items = DATA[name].map(it => ({ ...it, series: name }));
  const enr0 = getEnrichment(name, items[0].i);
  setSEO({
    title: `${name} Reading Order (#${items[0].i}–#${items[items.length - 1].i}) — The Long Box`,
    description: `Every issue of ${name} in publication order, ${items[0].y}–${items[items.length - 1].y}. Part of The Long Box's complete Marvel Earth-616 reading guide.`,
    path: buildPath("series", { seriesName: name }),
  });
  pageArea.innerHTML = `
    <div class="page-title-row"><h1 class="page-title">${name}</h1></div>
    <p class="page-subtitle">${items.length} issues &middot; ${items[0].y}&ndash;${items[items.length - 1].y}</p>
  `;
  const listContainer = document.createElement("div");
  const basePathForModal = (item) => buildPath("series", { seriesName: name, issue: item.i });
  const { bar, state } = makeToolbar(items, params, true, (newState) => {
    renderIssueListWithPaging(listContainer, applyFiltersAndSort(items, newState, name), false, basePathForModal, null);
  });
  pageArea.appendChild(bar);
  pageArea.appendChild(listContainer);
  const filtered = applyFiltersAndSort(items, state, name);
  renderIssueListWithPaging(listContainer, filtered, false, basePathForModal, modalIssue);
}

function renderAll(params) {
  modalReturnPath = "/all";
  setSEO({
    title: "Full Chronological Order — The Long Box",
    description: "Every Marvel Comics issue in real publication order, all series interleaved month by month, from Fantastic Four #1 to Secret Wars.",
    path: "/all",
  });
  const items = [];
  seriesNames.forEach(name => DATA[name].forEach(it => items.push({ ...it, series: name })));
  pageArea.innerHTML = `
    <div class="page-title-row"><h1 class="page-title">FULL CHRONOLOGICAL ORDER</h1></div>
    <p class="page-subtitle">Every issue across every series, in real publication order &middot; ${items.length} issues</p>
  `;
  const listContainer = document.createElement("div");
  const basePathForModal = (item) => "/all/" + slugify(item.series) + "/" + encodeURIComponent(item.i);
  const { bar, state } = makeToolbar(items, params, true, (newState) => {
    renderIssueListWithPaging(listContainer, applyFiltersAndSort(items, newState, null), true, basePathForModal, null);
  });
  pageArea.appendChild(bar);
  pageArea.appendChild(listContainer);
  const filtered = applyFiltersAndSort(items, state, null);
  renderIssueListWithPaging(listContainer, filtered, true, basePathForModal, null);

  if (params.get("focus") === "search") {
    const input = bar.querySelector("#tbSearch");
    if (input) setTimeout(() => input.focus(), 50);
  }
}

function renderAbout() {
  modalReturnPath = "/about";
  setSEO({
    title: "About — The Long Box (Marvel Comics Reading Order)",
    description: "The Long Box is a fan-made Marvel Comics reading order guide, currently covering Earth-616's Silver and Bronze Ages, with the Ultimate Universe, What If, and beyond planned as it grows.",
    path: "/about",
  });

  const impRows = [
    ["Essential", "Core to Marvel Universe continuity &mdash; origin stories, major first appearances, foundational events."],
    ["Major", "Significant continuity impact &mdash; key villain debuts, major status-quo shifts, crossover chapters."],
    ["Recommended", "Enjoyable and continuity-relevant, not strictly required."],
    ["Semi Optional", "Minor continuity relevance; safe to skip without losing the throughline."],
    ["Optional", "Standalone or minor stories with little lasting impact."],
    ["Reference Only", "Included for completeness; largely irrelevant to ongoing continuity."],
  ];
  const tagRows = [
    ["Origin", "The character's origin story is told or retold."],
    ["First Appearance", "A character, team, or concept appears for the first time."],
    ["Major Villain Debut", "A recurring antagonist's first appearance."],
    ["Team Formation", "A team is formed, reformed, or its roster changes significantly."],
    ["Crossover", "Story spans multiple series or issues."],
    ["Major Event", "Part of a line-wide crossover event."],
    ["Character Death", "A named character dies."],
    ["Character Return", "A previously absent character reappears."],
    ["Costume Change", "A significant costume or identity change."],
    ["Status Quo Change", "A lasting change to a character's or team's situation."],
    ["Final Issue", "The last issue of a volume/series before cancellation, retitling, or renumbering."],
    ["Series Rename", "A title is renamed or relaunched."],
    ["Annual", "An Annual-format issue."],
    ["Tie In", "A tie-in issue necessary to follow a crossover event."],
    ["Number One Issue", "A #1 issue (new series, relaunch, or renumbering)."],
  ];

  pageArea.innerHTML = `
    <div class="page-title-row"><h1 class="page-title">ABOUT THE LONG BOX</h1></div>
    <p class="page-subtitle">A hand-curated Marvel Comics reading order guide, growing one era at a time.</p>

    <div class="about-box">
      <h2>What is The Long Box?</h2>
      <p>The Long Box is a complete, publication-order <strong>Marvel Comics reading guide</strong>. The goal is a single, unambiguous <strong>comic book reading order</strong> for the whole of Marvel's published history — not just one corner of it. Right now that means <strong>Earth-616</strong>, the primary continuity where nearly every classic Marvel story unfolds: from <em>Fantastic Four</em> #1 in November 1961 through the end of <em>Secret Wars</em> in April 1985, every issue of every ongoing series is catalogued here, alongside its era, key issues, writers, and tags. Earth-616 is the starting point, not the ceiling — see "A Note on Scope" below for where this is headed.</p>
    </div>

    <div class="about-box">
      <h2>Why This Guide Exists</h2>
      <p>Marvel's shared universe is one of the great achievements of modern storytelling — and also one of the most intimidating to approach. Between crossovers, tie-ins, character debuts, and status-quo shifts, the natural question "where do I start?" often has no obvious answer. The Long Box exists to make that answer plain: read every issue in the order it was originally published, and let Marvel's <strong>publication order</strong> reveal the shared world as its readers first experienced it.</p>
      <p>This site is a fan-made project. It exists to celebrate the writers, artists, and editors who built these universes, and to help readers navigate a <strong>comic book timeline</strong> without needing spreadsheets, forum threads, or half-broken wiki pages.</p>
    </div>

    <div class="about-box">
      <h2>How To Use The Long Box</h2>
      <ul>
        <li><strong>Browse by series.</strong> Every series currently catalogued has its own page with a full <strong>comic chronology</strong>, writer runs, and key-issue markers.</li>
        <li><strong>Read in publication order.</strong> The <em>Full Chronological Order</em> view interleaves every series month by month — the closest thing to reading Marvel the way its earliest fans did.</li>
        <li><strong>Search universally.</strong> The search box understands series names, issue numbers, years, eras, writers, keywords, and even partial phrases or shorthand. Try "Stan Lee", "x men 1963", "asm", or "doom".</li>
        <li><strong>Filter by importance and writer.</strong> Every issue is tagged Essential, Major, Recommended, Semi Optional, Optional, or Reference Only, and you can select several tiers or eras at once — so you can plan the <strong>reading path</strong> that fits your time.</li>
        <li><strong>Track your progress.</strong> Tap the circular marker on any issue to record it as read. Your progress lives in this browser and never leaves it.</li>
      </ul>
    </div>

    <div class="about-box">
      <h2>What Do The Importance Tiers Mean?</h2>
      <p>Every issue is rated on how important it is to the overall storyline, so you can choose how deep to go:</p>
      <table class="about-table">
        ${impRows.map(([k, v]) => `<tr><td class="about-table-key">${k}</td><td>${v}</td></tr>`).join("")}
      </table>
    </div>

    <div class="about-box">
      <h2>What Do The Event Tags Mean?</h2>
      <p>Issues can carry one or more tags marking what kind of moment they are:</p>
      <table class="about-table">
        ${tagRows.map(([k, v]) => `<tr><td class="about-table-key">${k}</td><td>${v}</td></tr>`).join("")}
      </table>
    </div>

    <div class="about-box">
      <h2>Eras Covered So Far</h2>
      <p>The archive currently covers two publication eras of Earth-616:</p>
      <ul>
        <li><strong>Vol. 1 &mdash; Silver Age Marvel (1961&ndash;1969).</strong> The founding decade: Fantastic Four, Spider-Man, X-Men, Avengers, Thor, Iron Man, Doctor Strange, the Galactus Trilogy, the Kree-Skrull War's foundations, and the birth of the modern superhero.</li>
        <li><strong>Vol. 2 &mdash; Bronze Age Marvel (1970&ndash;1985).</strong> The maturing years: the all-new X-Men, the Dark Phoenix Saga, Days of Future Past, Frank Miller's Daredevil, Luke Cage, the New Mutants and Alpha Flight, and Marvel Super Heroes Secret Wars.</li>
      </ul>
    </div>

    <div class="about-box">
      <h2>What a Good Reading Path Looks Like</h2>
      <p>There is no single correct <strong>Marvel reading path</strong>, but a common approach is to start with <em>Fantastic Four</em> and <em>Amazing Spider-Man</em>, then let the crossovers pull you outward. Follow the "Essential" badge to hit every landmark first appearance, origin, and <strong>Marvel event</strong>; return later for the Recommended and Semi Optional issues that fill in the texture. For a purist experience, use <em>Full Chronological Order</em> and read one month at a time.</p>
    </div>

    <div class="about-box">
      <h2>A Note on Scope</h2>
      <p>The Long Box is being built one era at a time, in order, rather than all at once — depth and accuracy first, breadth after. Silver and Bronze Age Earth-616 come first because they're the foundation everything later Marvel continuity builds on. The plan from here runs forward through the Copper and Modern Ages, and then outward: the <strong>Ultimate Universe</strong>, <strong>What If</strong> and other alternate realities, and eventually — further down the road — other publishers and comic universes beyond Marvel. Earth-616 is where this guide starts, not where the idea of it ends.</p>
      <p>This site is not affiliated with Marvel Entertainment or any publisher. All character names, series titles, and trademarks belong to their respective owners. The Long Box is a fan-made educational and archival resource created out of love for comics.</p>
    </div>
  `;
}

function renderExplore() {
  modalReturnPath = "/";
  setSEO({
    title: "Explore the Marvel Archive — The Long Box",
    description: "Discover comics by era, series, and year. Browse the complete publication order — currently Marvel's Earth-616 — jump into a reading path, or find a random classic issue.",
    path: "/",
  });

  // ---- Derive everything from existing data only ----
  const allItems = [];
  seriesNames.forEach(n => DATA[n].forEach(it => allItems.push({ ...it, series: n })));

  const eraOrder = [];
  allItems.forEach(it => { if (!eraOrder.includes(it.v)) eraOrder.push(it.v); });

  const years = Array.from(new Set(allItems.map(i => i.y))).sort((a, b) => a - b);

  const totalComics = allItems.length;
  const totalSeries = seriesNames.length;

  const FLAGSHIP = ["Fantastic Four", "Amazing Spider-Man", "Avengers", "Thor", "Iron Man",
    "X-Men", "Captain America", "Incredible Hulk", "Daredevil"].filter(n => DATA[n]);

  const READING_PATHS = [
    { label: "Start With Fantastic Four", series: "Fantastic Four" },
    { label: "Start With Amazing Spider-Man", series: "Amazing Spider-Man" },
    { label: "Start With X-Men", series: "X-Men" },
    { label: "Start With Avengers", series: "Avengers" },
  ].filter(p => DATA[p.series]);

  pageArea.innerHTML = `
    <section class="explore-hero">
      <h1 class="page-title explore-hero-title">EXPLORE THE MARVEL ARCHIVE</h1>
      <p class="page-subtitle explore-hero-subtitle">Discover comics, series, and reading paths across the complete publication order — currently Earth-616, with more universes on the way.</p>
      <div class="explore-hero-search" id="exploreHeroSearch">
        <input type="text" id="exploreSearchInput" placeholder="Search series, issue #, year, writer...">
      </div>
    </section>

    <section class="explore-section" aria-labelledby="continueExploringH">
      <h2 id="continueExploringH" class="explore-section-title">Continue Exploring</h2>
      <div class="explore-card-grid explore-card-grid-lg" id="continueExploringGrid"></div>
    </section>

    <section class="explore-section" id="browse-era" aria-labelledby="browseEraH">
      <h2 id="browseEraH" class="explore-section-title">Browse By Era</h2>
      <div class="explore-card-grid" id="browseEraGrid"></div>
    </section>

    <section class="explore-section" id="browse-series" aria-labelledby="browseSeriesH">
      <h2 id="browseSeriesH" class="explore-section-title">Browse By Series</h2>
      <div class="explore-card-grid" id="browseSeriesGrid"></div>
    </section>

    <section class="explore-section" id="browse-year" aria-labelledby="browseYearH">
      <h2 id="browseYearH" class="explore-section-title">Browse By Year</h2>
      <div class="explore-year-grid" id="browseYearGrid"></div>
    </section>

    <section class="explore-section" aria-labelledby="readingPathsH">
      <h2 id="readingPathsH" class="explore-section-title">Reading Paths</h2>
      <div class="explore-card-grid" id="readingPathsGrid"></div>
    </section>

    <section class="explore-section" aria-labelledby="randomH">
      <h2 id="randomH" class="explore-section-title">Random Discovery</h2>
      <div id="randomDiscoveryBox"></div>
    </section>

    <section class="explore-section" aria-labelledby="statsH">
      <h2 id="statsH" class="explore-section-title">Archive Statistics</h2>
      <div class="explore-stats-grid">
        <div class="stat-block"><span class="stat-number">${totalComics}</span><span class="stat-label">Total Comics</span></div>
        <div class="stat-block"><span class="stat-number">${totalSeries}</span><span class="stat-label">Total Series</span></div>
        <div class="stat-block"><span class="stat-number">${years[0]}&ndash;${years[years.length - 1]}</span><span class="stat-label">Years Covered</span></div>
        <div class="stat-block"><span class="stat-number">${eraOrder.length}</span><span class="stat-label">Total Eras</span></div>
      </div>
    </section>

    <section class="explore-section" aria-labelledby="quickAccessH">
      <h2 id="quickAccessH" class="explore-section-title">Quick Access</h2>
      <div class="explore-quick-grid" id="quickAccessGrid"></div>
    </section>
  `;

  // ---- Continue Exploring ----
  const continueCards = [
    { title: "Browse All Comics", desc: "Every issue, every series, one list.", href: "/all", link: true },
    { title: "Browse Series", desc: "Jump straight to a series page.", href: "/browse", link: true },
    { title: "Browse By Era", desc: "Silver Age vs. Bronze Age.", href: "#browse-era", link: false },
    { title: "Browse By Year", desc: "Pick a year, see what shipped.", href: "#browse-year", link: false },
    { title: "Full Reading Order", desc: "The entire archive, chronologically.", href: "/all", link: true },
  ];
  const ceGrid = document.getElementById("continueExploringGrid");
  continueCards.forEach(c => ceGrid.appendChild(makeBrowseCard(c.title, c.desc, c.href, c.link)));

  // ---- Browse By Era ----
  const eraGrid = document.getElementById("browseEraGrid");
  eraOrder.forEach(era => {
    const count = allItems.filter(i => i.v === era).length;
    eraGrid.appendChild(makeBrowseCard(era, `${count} issues`, "/all?era=" + encodeURIComponent(era), true));
  });

  // ---- Browse By Series ----
  const seriesGrid = document.getElementById("browseSeriesGrid");
  FLAGSHIP.forEach(name => {
    const items = DATA[name];
    seriesGrid.appendChild(makeBrowseCard(name, `${items.length} issues &middot; ${items[0].y}&ndash;${items[items.length - 1].y}`,
      buildPath("series", { seriesName: name }), true));
  });

  // ---- Browse By Year ----
  const yearGrid = document.getElementById("browseYearGrid");
  years.forEach(y => {
    const a = document.createElement("a");
    a.href = "/all?year=" + y;
    a.setAttribute("data-link", "");
    a.className = "year-chip";
    a.textContent = y;
    yearGrid.appendChild(a);
  });

  // ---- Reading Paths ----
  const rpGrid = document.getElementById("readingPathsGrid");
  READING_PATHS.forEach(p => {
    const first = DATA[p.series][0];
    rpGrid.appendChild(makeBrowseCard(p.label, `Begin at ${p.series} #${first.i} (${first.d})`,
      buildPath("series", { seriesName: p.series, issue: first.i }), true));
  });
  rpGrid.appendChild(makeBrowseCard("Classic Marvel", "Every \u201cEssential\u201d key issue, all eras.", "/all?imp=Essential", true));
  const lastGlobal = { series: "Marvel Super Heroes Secret Wars", issue: "12" };
  rpGrid.appendChild(makeBrowseCard("Latest Added", "The most recent issue in the archive.",
    "/all/" + slugify(lastGlobal.series) + "/" + lastGlobal.issue, true));

  // ---- Random Discovery ----
  const randomBox = document.getElementById("randomDiscoveryBox");
  function drawRandom() {
    const pick = allItems[Math.floor(Math.random() * allItems.length)];
    const enr = getEnrichment(pick.series, pick.i);
    randomBox.innerHTML = `
      <div class="issue-card random-card" id="randomCard">
        <span class="issue-num">#${pick.i}</span>
        <div class="issue-main">
          <span class="issue-series-tag">${pick.series}</span>
          <span class="issue-date">${pick.d} &middot; ${pick.v}</span>
          ${enr && enr.s ? `<div class="issue-summary">${enr.s}</div>` : ""}
          <div class="issue-tags">
            <span class="tag-pill">Story yr ${pick.sy}</span>
            ${enr && enr.w ? `<span class="tag-pill tag-writer">${enr.w}</span>` : ""}
            ${tagList(pick.tags).map(t => `<span class="tag-pill">${t}</span>`).join("")}
          </div>
        </div>
        <span class="imp-badge ${impClass(pick.imp)}">${pick.imp}</span>
      </div>
      <button class="load-more-btn shuffle-btn" id="shuffleBtn">Shuffle Again</button>
    `;
    document.getElementById("randomCard").addEventListener("click", () => {
      openModalAt([pick], 0, (item) => "/all/" + slugify(item.series) + "/" + encodeURIComponent(item.i));
    });
    document.getElementById("shuffleBtn").addEventListener("click", drawRandom);
  }
  drawRandom();

  // ---- Quick Access ----
  const qaGrid = document.getElementById("quickAccessGrid");
  const firstComic = { series: "Fantastic Four", issue: "1" };
  const QUICK = [
    { label: "Latest Added", href: "/all/" + slugify(lastGlobal.series) + "/" + lastGlobal.issue },
    { label: "First Comic", href: "/series/" + slugify(firstComic.series) + "/" + firstComic.issue },
    { label: "Latest Comic", href: "/all/" + slugify(lastGlobal.series) + "/" + lastGlobal.issue },
    { label: "Full Reading Order", href: "/all" },
    { label: "Search", href: "/all?focus=search" },
    { label: "Series", href: "/browse" },
    { label: "Timeline", href: "/all" },
  ];
  QUICK.forEach(q => {
    const a = document.createElement("a");
    a.href = q.href;
    a.setAttribute("data-link", "");
    a.className = "quick-access-btn";
    a.textContent = q.label;
    qaGrid.appendChild(a);
  });

  // Hero search: mirrors the universal search (no redesign) -- typing here
  // jumps to the Full Chronological Order view with that query applied.
  const heroInput = document.getElementById("exploreSearchInput");
  let heroDebounce;
  heroInput.addEventListener("input", (e) => {
    clearTimeout(heroDebounce);
    const val = e.target.value;
    heroDebounce = setTimeout(() => {
      if (val.trim()) navigate("/all?q=" + encodeURIComponent(val));
    }, 350);
  });
  heroInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && heroInput.value.trim()) navigate("/all?q=" + encodeURIComponent(heroInput.value));
  });
}

function makeBrowseCard(title, desc, href, isLink) {
  const a = document.createElement("a");
  a.href = href;
  if (isLink) a.setAttribute("data-link", "");
  a.className = "browse-card";
  a.innerHTML = `<h3>${title}</h3><p>${desc}</p>`;
  return a;
}


function renderNotFound() {
  setSEO({ title: "Page Not Found — The Long Box", description: "This page could not be found.", path: "/" });
  pageArea.innerHTML = `
    <div class="page-title-row"><h1 class="page-title">NOT FOUND</h1></div>
    <p class="page-subtitle">That series or page doesn't exist. <a href="/" data-link>Back to The Long Box.</a></p>
  `;
}

// ---------- Router ----------
function route() {
  closeMobileNav();
  modalOverlay.classList.remove("open");
  const r = parseRoute();

  if (r.name === "home") renderHome();
  else if (r.name === "all") renderAllOrModal(r.params);
  else if (r.name === "about") renderAbout();
  else if (r.name === "explore") renderExplore();
  else if (r.name === "series") renderSeries(r.seriesName, r.modalIssue, r.params);
  else renderNotFound();

  updateNavActive(r);
  if (r.name !== "series" || !r.modalIssue) window.scrollTo({ top: 0 });
}

// The "All" page supports a 3-segment deep link: /all/<series-slug>/<issue>
function renderAllOrModal(params) {
  const path = window.location.pathname.replace(/\/+$/, "");
  const segs = path.split("/").filter(Boolean); // ["all", slug?, issue?]
  renderAll(params);
  if (segs.length >= 3) {
    const seriesName = unslug(segs[1]);
    const issue = decodeURIComponent(segs[2]);
    if (seriesName) {
      const items = [];
      seriesNames.forEach(n => DATA[n].forEach(it => items.push({ ...it, series: n })));
      const state = readStateFromParams(params);
      const filtered = applyFiltersAndSort(items, state, null);
      const idx = filtered.findIndex(it => it.series === seriesName && it.i === issue);
      if (idx >= 0) {
        const basePathForModal = (item) => "/all/" + slugify(item.series) + "/" + encodeURIComponent(item.i);
        openModalAt(filtered, idx, basePathForModal);
      }
    }
  }
}

renderNavList("");
route();