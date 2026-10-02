// ── JP's Classification of Drugs — PWA App Logic ──────────────────────────
// Adapted from popup.js for full-screen PWA / Microsoft Store layout
// State
let currentChapterId = null;
let currentSubclassId = null;
let expandedDrugs = new Set();
let expandedSubgroups = new Set();
let searchDebounce = null;

// DOM references
const mainContent  = document.getElementById('mainContent');
const chapterList  = document.getElementById('chapterList');
const searchInput  = document.getElementById('searchInput');
const contentPanel = document.getElementById('contentPanel');

// ── Build merged chapter list (base DRUG_DATA + expansion subclasses) ───────
function getMergedChapters() {
  const expansions = [
    typeof CVS_EXPANSION          !== 'undefined' ? CVS_EXPANSION          : null,
    typeof CNS_EXPANSION          !== 'undefined' ? CNS_EXPANSION          : null,
    typeof BLOOD_EXPANSION        !== 'undefined' ? BLOOD_EXPANSION        : null,
    typeof ANTIBACTERIAL_EXPANSION!== 'undefined' ? ANTIBACTERIAL_EXPANSION: null,
    typeof ENDOCRINE_EXPANSION    !== 'undefined' ? ENDOCRINE_EXPANSION    : null,
    typeof GI_EXPANSION           !== 'undefined' ? GI_EXPANSION           : null,
    typeof RESPIRATORY_EXPANSION  !== 'undefined' ? RESPIRATORY_EXPANSION  : null,
    typeof RENAL_EXPANSION        !== 'undefined' ? RENAL_EXPANSION        : null,
  ].filter(Boolean);

  const merged = DRUG_DATA.map(ch => ({
    ...ch,
    subclasses: [...ch.subclasses]
  }));

  expansions.forEach(exp => {
    const chapter = merged.find(c => c.id === exp.id);
    if (chapter && exp.additionalSubclasses) {
      chapter.subclasses = [...chapter.subclasses, ...exp.additionalSubclasses];
    }
  });
  return merged;
}

const MERGED_CHAPTERS = getMergedChapters();

function getChapter(id) {
  return MERGED_CHAPTERS.find(c => c.id === id);
}

// ── Render sidebar chapter list ──────────────────────────────────────────────
function renderSidebar() {
  chapterList.innerHTML = MERGED_CHAPTERS.map(ch => `
    <div class="chapter-item${currentChapterId === ch.id ? ' active' : ''}"
         data-cid="${ch.id}">
      <div class="chapter-num">${ch.id}</div>
      <div class="chapter-title-text">${ch.title}</div>
    </div>
  `).join('');

  chapterList.querySelectorAll('.chapter-item').forEach(item => {
    item.addEventListener('click', () => {
      currentChapterId = parseInt(item.dataset.cid);
      currentSubclassId = null;
      expandedSubgroups.clear();
      searchInput.value = '';
      render();
    });
  });
}

// ── Main render router ────────────────────────────────────────────────────────
function render() {
  renderSidebar();
  contentPanel.scrollTop = 0;

  const q = searchInput.value.trim();
  if (q.length >= 2) {
    renderSearch(q);
  } else if (currentSubclassId) {
    renderSubclass();
  } else if (currentChapterId) {
    renderChapter();
  } else {
    renderHome();
  }
}

// ── HOME — chapter card grid ─────────────────────────────────────────────────
function renderHome() {
  const html = `
    <div class="home-grid">
      ${MERGED_CHAPTERS.map(ch => {
        const count = ch.subclasses.reduce((n, sc) =>
          n + (sc.subgroups||[]).reduce((m, sg) => m + (sg.drugs||[]).length, 0), 0);
        const chips = ch.subclasses.slice(0, 3).map(s =>
          `<span class="chip-sm">${s.name.length > 28 ? s.name.substring(0,28)+'…' : s.name}</span>`
        ).join('');
        return `
          <div class="home-card" data-cid="${ch.id}">
            <h3>${ch.id}. ${ch.title}</h3>
            <p>${ch.description.substring(0, 90)}…</p>
            <div class="chip-row">
              ${chips}
              <span class="chip-sm" style="background:#F0F9F9;color:var(--teal-dark);border-color:#B3DEDE">
                ${count} drugs
              </span>
            </div>
          </div>`;
      }).join('')}
    </div>`;
  mainContent.innerHTML = html;

  mainContent.querySelectorAll('.home-card').forEach(card => {
    card.addEventListener('click', () => {
      currentChapterId = parseInt(card.dataset.cid);
      currentSubclassId = null;
      expandedSubgroups.clear();
      render();
    });
  });
}

// ── CHAPTER OVERVIEW ─────────────────────────────────────────────────────────
function renderChapter() {
  const chapter = getChapter(currentChapterId);
  if (!chapter) return renderHome();

  const totalDrugs = chapter.subclasses.reduce((n, sc) =>
    n + (sc.subgroups||[]).reduce((m, sg) => m + (sg.drugs||[]).length, 0), 0);

  let html = `
    <div class="breadcrumb">
      <span class="bc-item" id="bcHome">Home</span>
      <span class="bc-sep">›</span>
      <span style="color:var(--text)">${chapter.title}</span>
    </div>
    <div class="chapter-overview">
      <h2>${chapter.title}</h2>
      <p>${chapter.description}</p>
      <div class="subclass-chips">
        ${chapter.subclasses.map(s =>
          `<span class="chip" data-sid="${s.id}">${s.name}</span>`
        ).join('')}
      </div>
    </div>`;

  mainContent.innerHTML = html;

  document.getElementById('bcHome').addEventListener('click', () => {
    currentChapterId = null; currentSubclassId = null; render();
  });
  mainContent.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentSubclassId = chip.dataset.sid;
      expandedSubgroups.clear();
      render();
    });
  });
}

// ── SUBCLASS DETAIL ──────────────────────────────────────────────────────────
function renderSubclass() {
  const chapter = getChapter(currentChapterId);
  if (!chapter) return renderHome();
  const subclass = chapter.subclasses.find(s => s.id === currentSubclassId);
  if (!subclass) return renderChapter();

  let html = `
    <div class="breadcrumb">
      <span class="bc-item" id="bcHome">Home</span>
      <span class="bc-sep">›</span>
      <span class="bc-item" id="bcChapter">${chapter.id}. ${chapter.title.length > 32 ? chapter.title.substring(0,32)+'…' : chapter.title}</span>
      <span class="bc-sep">›</span>
      <span style="color:var(--text)">${subclass.name}</span>
    </div>
    <div class="subclass-chips" style="margin-bottom:12px">
      ${chapter.subclasses.map(s =>
        `<span class="chip${s.id === currentSubclassId ? ' active' : ''}" data-sid="${s.id}">${s.name}</span>`
      ).join('')}
    </div>
    <div class="subclass-header">
      <h3>${subclass.name}</h3>
      ${subclass.synonyms && subclass.synonyms.length
        ? `<div class="synonyms">Also: ${subclass.synonyms.join(' · ')}</div>` : ''}
      <p>${subclass.description || ''}</p>
    </div>`;

  (subclass.subgroups || []).forEach((sg, si) => {
    const sgKey = `${currentSubclassId}-${si}`;
    const isOpen = expandedSubgroups.has(sgKey) || (subclass.subgroups||[]).length === 1;
    const drugs = sg.drugs || [];

    html += `
      <div class="subgroup">
        <div class="subgroup-header${isOpen ? ' open' : ''}" data-key="${sgKey}">
          ${sg.name}
          <span class="count-badge">${drugs.length}</span>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
        <div class="subgroup-body${isOpen ? ' open' : ''}">
          ${drugs.map((drug, di) => {
            if (!drug.name) return '';
            const dKey = `${sgKey}-${di}`;
            const hasDose   = !!(drug.dose && drug.dose.trim());
            const hasSyn    = !!(drug.synonyms && drug.synonyms.length > 0);
            const hasBrands = !!(drug.brands && drug.brands.length > 0);
            const showDetail = hasDose || hasSyn || hasBrands;
            const isExp = expandedDrugs.has(dKey);

            const brandStr = hasBrands
              ? `<div class="brands-row">${drug.brands.slice(0,5).map(b =>
                  `<span class="brand-tag">${b}</span>`).join('')}
                 ${drug.brands.length > 5 ? `<span class="brand-tag">+${drug.brands.length-5} more</span>` : ''}
                 </div>` : '';
            const synStr = hasSyn
              ? `<div class="syn-row">Synonyms: ${drug.synonyms.join(', ')}</div>` : '';

            return `
              <div class="drug-item${isExp ? ' expanded' : ''}"
                   data-dkey="${dKey}" data-has-detail="${showDetail}">
                <div class="drug-name">
                  ${drug.name}
                  ${drug.synonyms && drug.synonyms[0]
                    ? `<span class="syn-badge">${drug.synonyms[0]}</span>` : ''}
                  ${!hasDose ? '<span class="no-dose-badge">Dose TBC</span>' : ''}
                </div>
                ${showDetail ? `
                  <div class="drug-detail${isExp ? ' open' : ''}">
                    ${hasDose ? `<div class="dose-row"><strong>Dose:</strong> ${drug.dose}</div>` : ''}
                    ${synStr}
                    ${brandStr}
                  </div>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  mainContent.innerHTML = html;

  // Breadcrumbs
  document.getElementById('bcHome').addEventListener('click', () => {
    currentChapterId = null; currentSubclassId = null; render();
  });
  document.getElementById('bcChapter').addEventListener('click', () => {
    currentSubclassId = null; render();
  });

  // Subclass chips
  mainContent.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentSubclassId = chip.dataset.sid;
      expandedSubgroups.clear();
      render();
    });
  });

  // Subgroup toggle
  mainContent.querySelectorAll('.subgroup-header').forEach(hdr => {
    hdr.addEventListener('click', () => {
      const key = hdr.dataset.key;
      if (expandedSubgroups.has(key)) {
        expandedSubgroups.delete(key);
        hdr.classList.remove('open');
        hdr.nextElementSibling.classList.remove('open');
      } else {
        expandedSubgroups.add(key);
        hdr.classList.add('open');
        hdr.nextElementSibling.classList.add('open');
      }
    });
  });

  // Drug expand (fix: !! ensures boolean)
  mainContent.querySelectorAll('.drug-item').forEach(item => {
    if (item.dataset.hasDetail !== 'true') return;
    item.addEventListener('click', () => {
      const key = item.dataset.dkey;
      const detail = item.querySelector('.drug-detail');
      if (!detail) return;
      if (expandedDrugs.has(key)) {
        expandedDrugs.delete(key);
        item.classList.remove('expanded');
        detail.classList.remove('open');
      } else {
        expandedDrugs.add(key);
        item.classList.add('expanded');
        detail.classList.add('open');
      }
    });
  });
}

// ── SEARCH ───────────────────────────────────────────────────────────────────
function highlight(text, query) {
  if (!text || !query) return text || '';
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function renderSearch(q) {
  const qLow = q.toLowerCase().trim();

  const results = SEARCH_INDEX
    .map(item => {
      let score = 0;
      const name = (item.drugName || '').toLowerCase();
      if (name === qLow) score += 200;
      else if (name.startsWith(qLow)) score += 100;
      else if (name.includes(qLow)) score += 60;
      (item.synonyms || []).forEach(s => {
        const sl = s.toLowerCase();
        if (sl === qLow) score += 150;
        else if (sl.startsWith(qLow)) score += 80;
        else if (sl.includes(qLow)) score += 40;
      });
      (item.brands || []).forEach(b => {
        if (b.toLowerCase().includes(qLow)) score += 30;
      });
      if ((item.subclassName || '').toLowerCase().includes(qLow)) score += 20;
      if ((item.chapterTitle || '').toLowerCase().includes(qLow)) score += 10;
      return { ...item, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  let html = `
    <div class="search-results-header">
      Results for "<em>${q}</em>"
      <span class="results-count">${results.length}</span>
    </div>`;

  if (!results.length) {
    html += `<div class="no-results">No drugs found for "<strong>${q}</strong>"</div>`;
  } else {
    results.forEach(r => {
      const matchSyn   = (r.synonyms||[]).filter(s => s.toLowerCase().includes(qLow));
      const matchBrand = (r.brands||[]).filter(b => b.toLowerCase().includes(qLow));
      const chTitle = (r.chapterTitle||'').length > 35
        ? (r.chapterTitle||'').substring(0,35)+'…' : (r.chapterTitle||'');
      const brandStr = matchBrand.length
        ? `<div class="sr-brands">${matchBrand.slice(0,4).map(b =>
            `<span class="brand-tag">${highlight(b, q)}</span>`).join('')}</div>` : '';

      html += `
        <div class="search-result-item" data-cid="${r.chapterId}" data-sid="${r.subclassId}">
          <div class="sr-drug">${highlight(r.drugName, q)}</div>
          <div class="sr-path">
            <span>${chTitle}</span> › ${r.subclassName} › ${r.subgroupName}
          </div>
          ${matchSyn.length
            ? `<div class="dose-row" style="margin-top:3px">Also: ${matchSyn.slice(0,4).map(s => highlight(s, q)).join(', ')}</div>` : ''}
          ${r.dose ? `<div class="sr-dose">${r.dose.length > 100 ? r.dose.substring(0,100)+'…' : r.dose}</div>` : ''}
          ${brandStr}
        </div>`;
    });
  }

  mainContent.innerHTML = html;

  mainContent.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      currentChapterId = parseInt(item.dataset.cid);
      currentSubclassId = item.dataset.sid;
      searchInput.value = '';
      expandedSubgroups.clear();
      render();
    });
  });
}

// ── SEARCH INPUT ─────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const q = searchInput.value.trim();
    if (q.length < 2) {
      if (currentSubclassId) renderSubclass();
      else if (currentChapterId) renderChapter();
      else renderHome();
    } else {
      renderSearch(q);
    }
  }, 160);
});

searchInput.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    searchInput.value = '';
    if (currentSubclassId) renderSubclass();
    else if (currentChapterId) renderChapter();
    else renderHome();
  }
});

// ── INIT ─────────────────────────────────────────────────────────────────────
render();
