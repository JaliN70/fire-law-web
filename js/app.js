(function () {
  'use strict';

  const app = document.getElementById('app');
  const backBtn = document.getElementById('backBtn');
  const pageTitle = document.getElementById('pageTitle');
  const pageSub = document.getElementById('pageSub');
  const headerMojLink = document.getElementById('headerMojLink');
  const toast = document.getElementById('toast');

  const lawDateEl = document.getElementById('lawDate');
  const footerNote = document.getElementById('footerNote');

  document.getElementById('sysDate').textContent = LAW.updated;
  document.getElementById('sysAuthor').textContent = LAW.author;
  lawDateEl.textContent = LAW.amended;

  let toastTimer;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function formatArticleNum(art) {
    return art.includes('-') ? art : art;
  }

  function articleDisplayTitle(art) {
    if (art.includes('-')) return `第 ${art} 條`;
    return `第 ${art} 條`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function wrapNums(text) {
    return escapeHtml(text).replace(/(\d+)/g, '<span class="num">$1</span>');
  }

  function isPackagedApp() {
    return location.protocol === 'file:';
  }

  function externalLinkAttrs() {
    return isPackagedApp() ? '' : ' target="_blank" rel="noopener"';
  }

  function openExternal(url) {
    if (window.Android && typeof Android.openExternal === 'function') {
      Android.openExternal(url);
      return;
    }
    window.location.href = url;
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

  function setStandardChrome() {
    app.classList.remove('compilation-view');
    lawDateEl.innerHTML = wrapNums(LAW.amended);
    footerNote.innerHTML = '法條內容連結至 <a href="https://law.moj.gov.tw/" target="_blank" rel="noopener">全國法規資料庫</a>，以司法院最新公布為準。';
    bindExternalLinks(document.querySelector('.site-footer'));
  }

  function renderHub() {
    backBtn.hidden = true;
    setStandardChrome();
    pageTitle.textContent = '消防設備法規';
    pageSub.innerHTML = '設置標準 · <span class="num">108</span>年版彙編';
    headerMojLink.href = LAW.fullUrl;
    headerMojLink.setAttribute('aria-label', '全國法規資料庫');

    app.innerHTML = `
      <section class="hero fade-up">
        <span class="hero-eyebrow">Fire Safety Code</span>
        <h2 class="hero-title">消防設備法規</h2>
        <p class="hero-desc">第一大項為現行設置標準，第二大項為 <span class="num">108</span> 年版消防法令彙編</p>
      </section>
      <ul class="cat-grid hub-grid">
        <li class="fade-up">
          <button type="button" class="cat-card hub-card" data-hub="standard" aria-label="各類場所消防安全設備設置標準">
            <span class="cat-icon" aria-hidden="true">🧯</span>
            <h2 class="cat-title">各類場所消防安全設備設置標準</h2>
            <p class="cat-sub">${wrapNums(LAW.amended)}</p>
            <span class="cat-count">全國法規資料庫 · 設備分類與計算工具</span>
          </button>
        </li>
        <li class="fade-up" style="animation-delay:0.04s">
          <button type="button" class="cat-card hub-card" data-hub="compilation" aria-label="108年版消防法令彙編">
            <span class="cat-icon" aria-hidden="true">📚</span>
            <h2 class="cat-title"><span class="num">108</span>年版消防法令彙編</h2>
            <p class="cat-sub">民國 <span class="num">108</span> 年 11 月</p>
            <span class="cat-count">消防法、細則、函釋與 PDF 原文</span>
          </button>
        </li>
      </ul>
    `;
    bindExternalLinks(app);
  }

  function renderHome() {
    backBtn.hidden = false;
    setStandardChrome();
    pageTitle.textContent = '設置標準';
    pageSub.textContent = LAW.name;
    headerMojLink.href = LAW.fullUrl;
    headerMojLink.setAttribute('aria-label', '全國法規資料庫');

    const cards = CATEGORIES.map((cat, i) => `
      <li class="fade-up" style="animation-delay:${i * 0.03}s">
        <button type="button" class="cat-card" data-cat="${cat.id}" aria-label="${escapeHtml(cat.title)}">
          <span class="cat-icon" aria-hidden="true">${cat.icon}</span>
          <h2 class="cat-title">${escapeHtml(cat.title)}</h2>
          <p class="cat-sub">${escapeHtml(cat.subtitle)}</p>
          <span class="cat-count">${cat.calculators ? '含計算工具 · ' : ''}${cat.articles.length} 項法條</span>
        </button>
      </li>
    `).join('');

    app.innerHTML = `
      <section class="hero fade-up">
        <span class="hero-eyebrow">第一大項</span>
        <h2 class="hero-title">${escapeHtml(LAW.name)}</h2>
        <p class="hero-desc">依設備分類快速查詢法條，內建滅火器與排煙計算工具</p>
        <a class="hero-cta" href="${LAW.fullUrl}"${externalLinkAttrs()}>
          完整法規
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </section>
      <p class="section-label">設備分類</p>
      <ul class="cat-grid">${cards}</ul>
    `;

    bindExternalLinks(app);
  }

  function renderCategory(catId) {
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (!cat) {
      navigate('#/');
      return;
    }

    backBtn.hidden = false;
    setStandardChrome();
    pageTitle.textContent = cat.title;
    pageSub.textContent = cat.subtitle;
    headerMojLink.href = LAW.fullUrl;

    const notesHtml = cat.notes
      ? `<div class="notes-box">${cat.notes.map((n) => `<p>${escapeHtml(n)}</p>`).join('')}</div>`
      : '';

    const articlesHtml = cat.articles
      .map(
        (item, i) => `
        <li class="fade-up" style="animation-delay:${i * 0.025}s">
          <a class="art-btn" href="${mojArticleUrl(item.art)}"${externalLinkAttrs()}
             data-art="${escapeHtml(item.art)}" data-label="${escapeHtml(item.label)}">
            <span class="art-num">${escapeHtml(formatArticleNum(item.art))}</span>
            <span class="art-label">
              ${escapeHtml(item.label)}
              ${item.note ? `<span class="art-note">${escapeHtml(item.note)}</span>` : ''}
            </span>
            <svg class="art-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </li>
      `
      )
      .join('');

    const calcHtml = cat.calculators ? renderCalculators(cat.calculators) : '';

    app.innerHTML = `
      <header class="cat-header fade-up">
        <div class="cat-header-icon" aria-hidden="true">${cat.icon}</div>
        <h2 class="cat-header-title">${escapeHtml(cat.title)}</h2>
        <p class="cat-header-sub">${escapeHtml(cat.subtitle)}</p>
        <p class="cat-header-desc">${escapeHtml(cat.desc)}</p>
      </header>
      ${notesHtml}
      ${calcHtml}
      <p class="section-label">法條連結 · 全國法規資料庫</p>
      <ul class="art-list">${articlesHtml}</ul>
    `;

    bindCalculators(cat.calculators);

    app.querySelectorAll('.art-btn').forEach((link) => {
      link.addEventListener('click', () => {
        const art = link.dataset.art;
        showToast(`開啟 ${articleDisplayTitle(art)}`);
      });
    });
    bindExternalLinks(app);
  }

  function navigate(hash) {
    if (location.hash !== hash) {
      location.hash = hash;
    } else {
      route();
    }
  }

  function parseParts() {
    const hash = location.hash.replace(/^#\/?/, '') || '';
    return hash.split('/').map((p) => decodeURIComponent(p)).filter(Boolean);
  }

  function route() {
    const parts = parseParts();

    if (parts.length === 0) {
      renderHub();
      return;
    }

    if (parts[0] === 'compilation') {
      if (window.CompilationApp) {
        CompilationApp.route(parts.slice(1));
      }
      return;
    }

    if (parts[0] === 'standard') {
      if (parts.length === 1) {
        renderHome();
        return;
      }
      renderCategory(parts[1]);
      return;
    }

    const legacyCat = CATEGORIES.find((c) => c.id === parts[0]);
    if (legacyCat) {
      navigate(`#/standard/${encodeURIComponent(parts[0])}`);
      return;
    }

    renderHub();
  }

  function goBack() {
    const parts = parseParts();
    if (parts[0] === 'compilation') {
      if (window.CompilationApp) CompilationApp.goBack();
      return;
    }
    if (parts[0] === 'standard' && parts.length >= 2) {
      navigate('#/standard');
      return;
    }
    navigate('#/');
  }

  app.addEventListener('click', (e) => {
    const hubBtn = e.target.closest('[data-hub]');
    if (hubBtn) {
      e.preventDefault();
      navigate(`#/${hubBtn.dataset.hub}`);
      return;
    }

    const catBtn = e.target.closest('[data-cat]');
    if (catBtn) {
      e.preventDefault();
      navigate(`#/standard/${encodeURIComponent(catBtn.dataset.cat)}`);
    }
  });

  backBtn.addEventListener('click', goBack);
  window.addEventListener('hashchange', route);
  window.addEventListener('popstate', route);
  bindExternalLinks(document);

  route();
})();
