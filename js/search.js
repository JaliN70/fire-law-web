(function () {
  'use strict';

  function normalizeText(s) {
    return String(s ?? '').normalize('NFKC').toLowerCase().trim();
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(s, max) {
    const t = String(s ?? '').trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  }

  function buildHash(parts) {
    if (!parts.length) return '#/';
    return `#/${parts.map((p) => encodeURIComponent(p)).join('/')}`;
  }

  function makeItem(fields) {
    const title = fields.title || '';
    const meta = fields.meta || '';
    const detail = fields.detail || '';
    const extra = fields.extra || '';
    return {
      title,
      meta,
      detail: truncate(detail, 120),
      text: normalizeText(`${title} ${meta} ${detail} ${extra}`),
      titleNorm: normalizeText(title),
      metaNorm: normalizeText(meta),
      detailNorm: normalizeText(detail),
      action: fields.action,
      hash: fields.hash,
      url: fields.url,
      href: fields.href,
    };
  }

  function buildIndex() {
    const items = [];
    CATEGORIES.forEach((cat) => {
      items.push(makeItem({
        title: cat.title,
        meta: cat.subtitle,
        detail: cat.desc,
        extra: cat.title,
        action: 'hash',
        hash: buildHash([cat.id]),
      }));
      (cat.articles || []).forEach((item) => {
        items.push(makeItem({
          title: `第 ${item.art} 條 · ${item.label}`,
          meta: cat.title,
          detail: item.note || '',
          extra: `${item.art} ${cat.subtitle}`,
          action: 'url',
          url: mojArticleUrl(item.art),
        }));
      });
    });
    return items;
  }

  function openItem(item) {
    if (item.action === 'hash' && item.hash) {
      location.hash = item.hash;
      return;
    }
    if (item.action === 'url' && item.url) {
      if (window.Android && typeof Android.openExternal === 'function') {
        Android.openExternal(item.url);
      } else if (location.protocol === 'file:') {
        location.href = item.url;
      } else {
        window.open(item.url, '_blank', 'noopener');
      }
      return;
    }
    if (item.action === 'href' && item.href) {
      location.href = item.href;
    }
  }

  function initSearch(index) {
    const input = document.getElementById('siteSearch');
    const panel = document.getElementById('searchPanel');
    const resultsEl = document.getElementById('searchResults');
    const emptyEl = document.getElementById('searchEmpty');
    if (!input || !panel || !resultsEl) return;

    let timer;

    function hidePanel() {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }

    function showPanel() {
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function scoreItem(item, tokens) {
      let score = 0;
      for (const token of tokens) {
        if (!item.text.includes(token)) return -1;
        if (item.titleNorm.includes(token)) score += 4;
        if (item.metaNorm.includes(token)) score += 2;
        if (item.detailNorm.includes(token)) score += 1;
        score += 1;
      }
      return score;
    }

    function render(query) {
      const q = normalizeText(query);
      if (!q) {
        hidePanel();
        resultsEl.innerHTML = '';
        emptyEl.hidden = true;
        return;
      }

      const tokens = q.split(/\s+/).filter(Boolean);
      const matches = index
        .map((item) => ({ item, score: scoreItem(item, tokens) }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 40)
        .map((x) => x.item);

      showPanel();
      if (!matches.length) {
        resultsEl.innerHTML = '';
        emptyEl.hidden = false;
        return;
      }

      emptyEl.hidden = true;
      resultsEl.innerHTML = matches.map((item) => `
        <li>
          <button type="button" class="search-result" role="option">
            <span class="search-result-title">${escapeHtml(item.title)}</span>
            <span class="search-result-meta">${escapeHtml(item.meta)}</span>
            ${item.detail ? `<span class="search-result-detail">${escapeHtml(item.detail)}</span>` : ''}
          </button>
        </li>
      `).join('');

      resultsEl.querySelectorAll('.search-result').forEach((btn, i) => {
        btn.addEventListener('click', () => {
          openItem(matches[i]);
          input.value = '';
          hidePanel();
        });
      });
    }

    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => render(input.value), 120);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.value = '';
        hidePanel();
        input.blur();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('.header-search') || e.target.closest('.search-panel')) return;
      hidePanel();
    });
  }

  initSearch(buildIndex());
})();
