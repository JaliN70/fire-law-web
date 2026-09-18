(function () {
  'use strict';

  const PREFIX = 'compilation';
  const LAWS = FIRE_CODE_COMPILATION_LAWS;
  const app = document.getElementById('app');
  const backBtn = document.getElementById('backBtn');
  const pageTitle = document.getElementById('pageTitle');
  const pageSub = document.getElementById('pageSub');
  const headerMojLink = document.getElementById('headerMojLink');
  const toast = document.getElementById('toast');
  const lawDateEl = document.getElementById('lawDate');
  const footerNote = document.getElementById('footerNote');

  let toastTimer;
  let currentLaw = null;

  function normalizeText(s) {
    return String(s ?? '').normalize('NFKC');
  }

  function walkCats(cats, fn, parent) {
    for (const cat of cats || []) {
      fn(cat, parent);
      walkCats(cat.children, fn, cat);
    }
  }

  for (const law of LAWS) {
    walkCats(law.categories, (cat) => {
      for (const item of cat.articles || []) {
        if (item.label) item.label = normalizeText(item.label);
        if (item.body) item.body = normalizeText(item.body);
      }
    });
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function isPackagedApp() {
    return location.protocol === 'file:';
  }

  function openExternal(url) {
    if (window.Android && typeof Android.openExternal === 'function') {
      Android.openExternal(url);
      return;
    }
    if (isPackagedApp()) {
      location.href = url;
      return;
    }
    window.open(url, '_blank', 'noopener');
  }

  function bindExternalLinks(root) {
    if (!root) return;
    root.querySelectorAll('a[href^="http"]').forEach((link) => {
      link.removeAttribute('target');
      if (!isPackagedApp()) return;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        openExternal(link.href);
      });
    });
  }

  function primaryPdfPage(item) {
    if (item.pages && item.pages.length) return item.pages[0];
    return 2;
  }

  function pdfUrl(law, page) {
    if (!law || !law.pdfFile) return 'assets/fire-code-108.pdf';
    const q = new URLSearchParams({ file: law.pdfFile });
    if (law.pageCount) q.set('pages', String(law.pageCount));
    if (law.pageDir) q.set('pageDir', law.pageDir);
    if (page && page > 0) q.set('page', String(page));
    if (isPackagedApp()) q.set('mode', 'png');
    return `pdf-view.html?${q.toString()}`;
  }

  function escapeHtml(s) {
    return normalizeText(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatBody(text) {
    return escapeHtml(text).replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
  }

  function pageImageUrl(law, page) {
    const dir = (law && law.pageDir) || 'assets/fire-code-108/pages';
    return `${dir}/page-${String(page).padStart(3, '0')}.png`;
  }

  function renderMediaBlock(law, media) {
    const kind = media.type === 'table' ? '表格' : '圖';
    const page = media.page || 2;
    const href = pdfUrl(law, page);
    const caption = media.caption || kind;
    return `
      <figure class="spec-media spec-media--${escapeHtml(media.type)}" id="media-${escapeHtml(media.ref || caption)}">
        <figcaption>
          <span class="spec-media-tag">${kind}</span>
          <span class="spec-media-caption">${escapeHtml(caption)}</span>
        </figcaption>
        <a class="spec-media-shot" href="${escapeHtml(href)}" target="_blank" rel="noopener">
          <img class="spec-media-img" src="${escapeHtml(pageImageUrl(law, page))}" alt="${escapeHtml(caption)}">
          <span class="spec-media-action">詳內文連結
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </span>
        </a>
      </figure>`;
  }

  function isTableOcrParagraph(text, media) {
    if (!media.some((m) => m.type === 'table')) return false;
    if (/表$/.test(text) && text.length <= 48) return false;
    if (/依下表|如下表|依左表|下表規定/.test(text)) return false;
    if (/^[一二三四五六七八九十]、/.test(text)) return false;
    if (/^（[一二三四五六七八九十]）/.test(text)) return false;
    if (/^前項|^但|^註[:：]|^說明[:：]/.test(text)) return false;
    if (text.includes('。')) return false;
    if (text.length <= 80 && /\d/.test(text)) return true;
    if (text.length <= 48 && text.split(/\s+/).length >= 3 && !text.includes('，')) return true;
    return false;
  }

  function renderArticleContent(item, law) {
    const media = item.media || [];
    const shown = new Set();
    const parts = [];

    if (item.body) {
      item.body.split('\n\n').filter(Boolean).forEach((para) => {
        const trimmed = para.trim();
        if (isTableOcrParagraph(trimmed, media)) return;
        parts.push(`<p>${formatBody(trimmed)}</p>`);
        media.forEach((m) => {
          if (shown.has(m.ref || m.caption)) return;
          const hit = trimmed.includes('依下表') || trimmed.includes('如下表') || trimmed.includes('依左表')
            || trimmed.includes('下表') || trimmed.includes('附圖') || trimmed.includes('如圖')
            || trimmed === m.caption || trimmed.endsWith('表');
          const typeOk = m.type === 'table'
            ? /表|依下表|如下表|依左表/.test(trimmed)
            : /圖/.test(trimmed);
          if (hit && typeOk) {
            shown.add(m.ref || m.caption);
            parts.push(renderMediaBlock(law, m));
          }
        });
      });
    }

    media.forEach((m) => {
      if (!shown.has(m.ref || m.caption)) {
        shown.add(m.ref || m.caption);
        parts.push(renderMediaBlock(law, m));
      }
    });

    return parts.join('');
  }

  function getLaw(lawId) {
    return LAWS.find((l) => l.id === lawId);
  }

  function findCategoryPath(law, chapterId) {
    const path = [];
    function dfs(cats, ancestors) {
      for (const cat of cats || []) {
        const next = ancestors.concat(cat);
        if (cat.id === chapterId) {
          path.push(...next);
          return true;
        }
        if (dfs(cat.children, next)) return true;
      }
      return false;
    }
    dfs(law && law.categories, []);
    return path;
  }

  function getCategory(law, chapterId) {
    const path = findCategoryPath(law, chapterId);
    return path[path.length - 1] || null;
  }

  function parentCategory(law, chapterId) {
    const path = findCategoryPath(law, chapterId);
    return path.length >= 2 ? path[path.length - 2] : null;
  }

  function hasChildCats(cat) {
    return !!(cat && cat.children && cat.children.length);
  }

  function childKindLabel(cat) {
    const kinds = (cat.children || []).map((c) => c.kind);
    if (kinds.includes('chapter')) return '章';
    if (kinds.includes('section')) return '節';
    return '項';
  }

  function catCountLabel(cat) {
    if (hasChildCats(cat)) return `${cat.children.length} ${childKindLabel(cat)}`;
    return `${chapterArticles(cat).length} 條`;
  }

  function countArticlesDeep(cat) {
    let n = chapterArticles(cat).length;
    for (const ch of cat.children || []) n += countArticlesDeep(ch);
    return n;
  }

  function countLawArticles(law) {
    return (law.categories || []).reduce((n, c) => n + countArticlesDeep(c), 0);
  }

  function topLevelLabel(law) {
    const kinds = (law.categories || []).map((c) => c.kind);
    if (kinds.includes('bian')) return '編';
    if (kinds.includes('section')) return '節';
    return '章';
  }

  function sectionListLabel(cat) {
    if (!hasChildCats(cat)) return '條文目錄';
    const label = childKindLabel(cat);
    if (label === '章') return '章目錄';
    if (label === '節') return '節目錄';
    return '目錄';
  }

  function getArticle(law, chapterId, artId) {
    const cat = getCategory(law, chapterId);
    return cat && cat.articles.find((a) => a.art === artId);
  }

  function chapterArticles(cat) {
    return (cat.articles || []).filter((item) => {
      if (item.art === 'pdf' || item.art === 'sec-pdf') return true;
      if (/^QA-/.test(item.art)) return (item.body || '').trim().length > 20;
      return true;
    });
  }

  function isDateLabel(text) {
    const t = normalizeText(text);
    if (!t || /[\u4e00-\u9fff]/.test(t)) return false;
    return /^\d{6,8}~(\d{6,8})?$/.test(t) || /^\d{6,8}~$/.test(t);
  }

  function articleListNum(art) {
    if (/^QA-/.test(art)) return '函釋';
    if (art === 'pdf' || art === 'sec-pdf') return 'PDF';
    if (/^\d/.test(art) || art.includes('-')) return `第 ${art} 條`;
    return art;
  }

  function isWeakExcerpt(text) {
    const t = normalizeText(text).replace(/\s+/g, '');
    if (!t) return true;
    if (isDateLabel(t)) return true;
    if (/^[一二三四五六七八九十第編章節各類場所消防安全設備設置標準行細則]+$/.test(t)) return true;
    if (/^\d{1,8}$/.test(t)) return true;
    if (/^[（(].+[)）]$/.test(t) && t.length >= 4) return false;
    return t.length < 8;
  }

  function articleExcerpt(item) {
    const chunks = [item.label, ...(String(item.body || '').split(/\n\n+/))];
    for (const chunk of chunks) {
      const text = normalizeText(chunk || '').replace(/\s+/g, ' ').trim();
      if (isWeakExcerpt(text)) continue;
      return text.length > 72 ? `${text.slice(0, 72)}…` : text;
    }
    return '';
  }

  function displayPdfPage(item) {
    if (item.bookPage && item.bookPage > 0) return item.bookPage;
    return primaryPdfPage(item);
  }

  function articleListLabel(item) {
    return articleExcerpt(item) || item.art;
  }

  function articleDisplayTitle(art, item) {
    if (art === 'pdf' || art === 'sec-pdf') return item.label || 'PDF 全文';
    if (/^QA-/.test(art)) return item.label || '函釋';
    if (/^\d/.test(art)) return `第 ${art} 條`;
    return art;
  }

  function formatTitleWithNums(text) {
    return escapeHtml(text).replace(/(\d+)/g, '<span class="num">$1</span>');
  }

  function setPageTitle(html) {
    pageTitle.innerHTML = html;
  }

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    if (!raw) return [];
    const all = raw.split('/').map((p) => decodeURIComponent(p)).filter(Boolean);
    if (all[0] === PREFIX) return all.slice(1);
    return [];
  }

  function buildHash(parts) {
    return '#/' + [PREFIX, ...parts].map((p) => encodeURIComponent(p)).join('/');
  }

  function navigate(parts) {
    const hash = buildHash(parts);
    if (location.hash !== hash) {
      location.hash = hash;
    } else {
      route();
    }
  }

  function setHeaderLink(law, page) {
    if (law && law.pdfFile) {
      headerMojLink.href = pdfUrl(law, page);
      headerMojLink.setAttribute('aria-label', page ? `PDF 原文第 ${page} 頁` : 'PDF 原文');
    } else {
      headerMojLink.href = 'assets/fire-code-108.pdf';
      headerMojLink.setAttribute('aria-label', 'PDF 原文');
    }
  }

  function setCompilationChrome() {
    app.classList.add('compilation-view');
    if (lawDateEl) lawDateEl.textContent = '民國 108 年 11 月';
    if (footerNote) {
      footerNote.innerHTML = '條文與函釋收錄於 App 內，表格與圖示附說明與截圖，並提供 PDF 詳內文連結。';
    }
  }

  function renderHome() {
    currentLaw = null;
    backBtn.hidden = false;
    setCompilationChrome();
    setPageTitle('<span class="brand-title-year">108</span>消防法令彙編');
    pageSub.textContent = '消防設備法規 · 第二大項';
    setHeaderLink(null);

    const totalArts = LAWS.reduce((n, law) => n + countLawArticles(law), 0);

    const cards = LAWS.map((law, i) => {
      const arts = countLawArticles(law);
      return `
      <li class="fade-up" style="animation-delay:${i * 0.04}s">
        <button type="button" class="cat-card cat-card--chapter" data-law="${escapeHtml(law.id)}" aria-label="${escapeHtml(law.name)}">
          <span class="cat-icon" aria-hidden="true">${law.icon}</span>
          <h2 class="cat-title">${escapeHtml(law.shortName)}</h2>
          <p class="cat-sub">${escapeHtml(law.name)}</p>
          <span class="cat-count">${law.categories.length} ${topLevelLabel(law)} · ${arts} 條</span>
        </button>
      </li>`;
    }).join('');

    app.innerHTML = `
      <section class="hero fade-up">
        <span class="hero-eyebrow">Fire Code Compilation 108</span>
        <h2 class="hero-title"><span class="hero-title-year">108</span>年版消防法令彙編</h2>
        <p class="hero-desc">${LAWS.length} 部法規 · 共 ${totalArts} 條，選擇法規後依編、章、節查詢</p>
        <a class="hero-cta" href="assets/fire-code-108.pdf" target="_blank" rel="noopener">
          PDF 原文
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      </section>
      <p class="section-label">法規選擇</p>
      <ul class="cat-grid cat-grid--chapters">${cards}</ul>
    `;
    bindExternalLinks(app);
  }

  function renderLaw(lawId) {
    const law = getLaw(lawId);
    if (!law) {
      navigate([]);
      return;
    }

    currentLaw = law;
    backBtn.hidden = false;
    setCompilationChrome();
    pageTitle.textContent = law.shortName;
    pageSub.textContent = law.name;
    setHeaderLink(law);

    const totalArts = countLawArticles(law);

    const cards = (law.categories || []).map((cat, i) => categoryCardHtml(cat, i)).join('');

    app.innerHTML = `
      <section class="hero fade-up">
        <span class="hero-eyebrow">${escapeHtml(law.shortName)}</span>
        <h2 class="hero-title">${escapeHtml(law.name)}</h2>
        <p class="hero-desc">${law.categories.length} ${topLevelLabel(law)} · ${totalArts} 條 · ${escapeHtml(law.amended)}</p>
        <a class="hero-cta" href="${escapeHtml(law.pdfFile)}" target="_blank" rel="noopener">
          PDF 原文
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      </section>
      <p class="section-label">${topLevelLabel(law)}目錄</p>
      <ul class="cat-grid cat-grid--chapters">${cards}</ul>
    `;
    bindExternalLinks(app);
  }

  function categoryCardHtml(cat, i) {
    return `
      <li class="fade-up" style="animation-delay:${i * 0.04}s">
        <button type="button" class="cat-card cat-card--chapter" data-chapter="${escapeHtml(cat.id)}" aria-label="${escapeHtml(cat.subtitle)}">
          <span class="cat-icon" aria-hidden="true">${cat.icon}</span>
          <h2 class="cat-title">${escapeHtml(cat.title)}</h2>
          <p class="cat-sub">${escapeHtml(cat.subtitle)}</p>
          <span class="cat-count">${catCountLabel(cat)}</span>
        </button>
      </li>`;
  }

  function renderChapter(lawId, chapterId) {
    const law = getLaw(lawId);
    const cat = getCategory(law, chapterId);
    if (!cat) {
      navigate(lawId ? [lawId] : []);
      return;
    }

    currentLaw = law;
    backBtn.hidden = false;
    setCompilationChrome();
    pageTitle.textContent = cat.title;
    pageSub.textContent = law.shortName;
    setHeaderLink(law);

    if (hasChildCats(cat)) {
      const cards = cat.children.map((child, i) => categoryCardHtml(child, i)).join('');
      app.innerHTML = `
      <header class="cat-header fade-up">
        <div class="cat-header-icon" aria-hidden="true">${cat.icon}</div>
        <h2 class="cat-header-title">${escapeHtml(cat.subtitle)}</h2>
        <p class="cat-header-sub">${escapeHtml(law.name)}</p>
        <p class="cat-header-desc">${cat.children.length} ${childKindLabel(cat)} · ${countArticlesDeep(cat)} 條</p>
      </header>
      <p class="section-label">${sectionListLabel(cat)}</p>
      <ul class="cat-grid cat-grid--chapters">${cards}</ul>
    `;
      bindExternalLinks(app);
      return;
    }

    const articles = chapterArticles(cat);

    const articlesHtml = articles.map((item, i) => {
      const listLabel = articleListLabel(item);
      const isPdfOnly = item.art === 'pdf' || item.art === 'sec-pdf';
      const mediaPage = isPdfOnly ? primaryPdfPage(item) : 0;
      const inner = `
                <span class="art-num">${escapeHtml(articleListNum(item.art))}</span>
                <span class="art-label">${escapeHtml(listLabel)}${isPdfOnly ? '<span class="art-note art-note--link">PDF 原文</span>' : ''}</span>
                <svg class="art-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  ${isPdfOnly
                    ? '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'
                    : '<polyline points="9 18 15 12 9 6"/>'}
                </svg>`;
      return `
        <li class="fade-up" style="animation-delay:${Math.min(i, 12) * 0.02}s">
          ${isPdfOnly
            ? `<a class="art-btn" href="${escapeHtml(pdfUrl(law, mediaPage))}" target="_blank" rel="noopener"
                 data-art="${escapeHtml(item.art)}" aria-label="${escapeHtml(listLabel)}">${inner}</a>`
            : `<button type="button" class="art-btn" data-art="${escapeHtml(item.art)}" aria-label="${escapeHtml(articleDisplayTitle(item.art, item))}">${inner}</button>`}
        </li>`;
    }).join('');

    app.innerHTML = `
      <header class="cat-header fade-up">
        <div class="cat-header-icon" aria-hidden="true">${cat.icon}</div>
        <h2 class="cat-header-title">${escapeHtml(cat.subtitle)}</h2>
        <p class="cat-header-sub">${escapeHtml(law.name)}</p>
        <p class="cat-header-desc">${articles.length} 條 · App 內閱讀</p>
      </header>
      <p class="section-label">條文目錄</p>
      <ul class="art-list">${articlesHtml}</ul>
    `;
    bindExternalLinks(app);
  }

  function renderArticle(lawId, chapterId, artId) {
    const law = getLaw(lawId);
    const cat = getCategory(law, chapterId);
    const item = getArticle(law, chapterId, artId);
    if (!item) {
      navigate([lawId, chapterId]);
      return;
    }

    currentLaw = law;
    backBtn.hidden = false;
    setCompilationChrome();
    const detailTitle = articleDisplayTitle(artId, item);
    const headerTitle = detailTitle.length > 18 ? `${detailTitle.slice(0, 18)}…` : detailTitle;
    setPageTitle(formatTitleWithNums(headerTitle));
    pageSub.textContent = cat.title;
    setHeaderLink(law, primaryPdfPage(item));

    app.innerHTML = `
      <article class="art-detail fade-up">
        <header class="art-detail-head">
          <p class="art-detail-breadcrumb">${escapeHtml(law.shortName)} · ${escapeHtml(cat.subtitle)}</p>
          <h2 class="art-detail-title">${formatTitleWithNums(detailTitle)}</h2>
        </header>
        <div class="art-detail-body">${renderArticleContent(item, law)}</div>
        <a class="hero-cta art-detail-pdf" href="${escapeHtml(pdfUrl(law, primaryPdfPage(item)))}" target="_blank" rel="noopener">
          PDF 原文（第 ${displayPdfPage(item)} 頁）
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </a>
      </article>
    `;
    bindExternalLinks(app);
  }

  function route(parts) {
    const segs = Array.isArray(parts) ? parts : parseHash();
    if (segs.length === 0) {
      renderHome();
      return;
    }
    if (segs.length === 1) {
      renderLaw(segs[0]);
      return;
    }
    if (segs.length === 2) {
      renderChapter(segs[0], segs[1]);
      return;
    }
    renderArticle(segs[0], segs[1], segs[2]);
  }

  function goBack() {
    const parts = parseHash();
    if (parts.length >= 3) {
      navigate([parts[0], parts[1]]);
    } else if (parts.length === 2) {
      const law = getLaw(parts[0]);
      const parent = parentCategory(law, parts[1]);
      if (parent) navigate([parts[0], parent.id]);
      else navigate([parts[0]]);
    } else if (parts.length === 1) {
      navigate([]);
    } else {
      location.hash = '#/';
    }
  }

  app.addEventListener('click', (e) => {
    if (!/^#\/?compilation\b/.test(location.hash || '#/')) return;
    const lawBtn = e.target.closest('[data-law]');
    if (lawBtn) {
      e.preventDefault();
      navigate([lawBtn.dataset.law]);
      return;
    }

    const chapterBtn = e.target.closest('[data-chapter]');
    if (chapterBtn) {
      e.preventDefault();
      const parts = parseHash();
      const lawId = parts[0] || (currentLaw && currentLaw.id);
      if (lawId) navigate([lawId, chapterBtn.dataset.chapter]);
      return;
    }

    const artBtn = e.target.closest('.art-btn[data-art]');
    if (artBtn && artBtn.tagName === 'BUTTON') {
      e.preventDefault();
      const parts = parseHash();
      if (parts.length >= 2) {
        navigate([parts[0], parts[1], artBtn.dataset.art]);
      }
    }
  });

  window.CompilationApp = { route, goBack };
})();
