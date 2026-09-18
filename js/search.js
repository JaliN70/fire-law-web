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
    const detail = truncate(fields.detail || '', 180);
    const extra = fields.extra || '';
    return {
      title,
      meta,
      detail: truncate(detail, 120),
      text: normalizeText(`${title} ${meta} ${detail} ${extra}`),
      titleNorm: normalizeText(title),
      metaNorm: normalizeText(meta),
      detailNorm: normalizeText(detail),
      group: fields.group || '',
      action: fields.action,
      hash: fields.hash,
      url: fields.url,
      href: fields.href,
    };
  }

  function buildBaseIndex() {
    const items = [];
    (typeof CATEGORIES !== 'undefined' ? CATEGORIES : []).forEach((cat) => {
      items.push(makeItem({
        title: cat.title,
        meta: `第一大項 · ${cat.subtitle}`,
        detail: cat.desc,
        extra: cat.title,
        group: 'standard',
        action: 'hash',
        hash: buildHash(['standard', cat.id]),
      }));
      (cat.articles || []).forEach((item) => {
        items.push(makeItem({
          title: `第 ${item.art} 條 · ${item.label}`,
          meta: `第一大項 · ${cat.title}`,
          detail: item.note || '',
          extra: `${item.art} ${cat.subtitle}`,
          group: 'standard',
          action: 'url',
          url: mojArticleUrl(item.art),
        }));
      });
    });

    items.push(makeItem({
      title: '各類場所消防安全設備設置標準',
      meta: '第一大項',
      detail: typeof LAW !== 'undefined' ? LAW.amended : '',
      extra: '設置標準 消防設備',
      group: 'standard',
      action: 'hash',
      hash: buildHash(['standard']),
    }));

    items.push(makeItem({
      title: '108年版消防法令彙編',
      meta: '第二大項',
      detail: '民國 108 年 11 月',
      extra: '108 108年版 消防法令彙編 法令彙編 第二大項 PDF',
      group: 'compilation',
      action: 'hash',
      hash: buildHash(['compilation']),
    }));

    return items;
  }

  function addCompilationIndex(items) {
    if (typeof FIRE_CODE_COMPILATION_LAWS === 'undefined' || !Array.isArray(FIRE_CODE_COMPILATION_LAWS)) {
      return;
    }
    try {
      FIRE_CODE_COMPILATION_LAWS.forEach((law) => {
        items.push(makeItem({
          title: law.shortName,
          meta: `第二大項 · ${law.name}`,
          detail: law.amended,
          extra: `${law.name} 108年版消防法令彙編 法令彙編`,
          group: 'compilation',
          action: 'hash',
          hash: buildHash(['compilation', law.id]),
        }));

        (law.categories || []).forEach(function start(cat) {
          (function visit(node) {
            items.push(makeItem({
              title: node.title,
              meta: `第二大項 · ${law.shortName} · ${node.subtitle}`,
              detail: node.desc,
              extra: `${node.title} ${law.shortName} 108年版消防法令彙編`,
              group: 'compilation',
              action: 'hash',
              hash: buildHash(['compilation', law.id, node.id]),
            }));

            (node.articles || []).forEach((item) => {
              if (item.art === 'pdf' || item.art === 'sec-pdf') return;
              const title = /^QA-/.test(item.art)
                ? `函釋 · ${item.label || ''}`
                : /^\d/.test(item.art)
                  ? `第 ${item.art} 條 · ${item.label || ''}`
                  : `${item.art} · ${item.label || ''}`;
              items.push(makeItem({
                title,
                meta: `第二大項 · ${law.shortName} · ${node.title}`,
                detail: item.label || item.body || '',
                extra: `${item.art} ${item.label || ''} ${law.shortName} ${law.name} 彙編 ${truncate(item.body || '', 240)}`,
                group: 'compilation',
                action: 'hash',
                hash: buildHash(['compilation', law.id, node.id, item.art]),
              }));
            });

            (node.children || []).forEach(visit);
          })(cat);
        });
      });
    } catch (err) {
      console.error('compilation search index failed', err);
    }
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
    let composing = false;

    function hidePanel() {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }

    function showPanel() {
      panel.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function scoreItem(item, tokens, preferCompilation, query) {
      let score = 0;
      for (const token of tokens) {
        if (!item.text.includes(token)) return -1;
        if (item.titleNorm.includes(token)) score += 4;
        if (item.metaNorm.includes(token)) score += 2;
        if (item.detailNorm.includes(token)) score += 1;
        score += 1;
      }
      if (item.group === 'compilation') score += preferCompilation ? 8 : 1;
      if (item.titleNorm.includes('108年版消防法令彙編')) score += 12;
      if (item.titleNorm === tokens.join(' ') || item.titleNorm === query) score += 16;
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
      const preferCompilation = /108|彙編|消防法令|函釋/.test(q);
      const matches = index
        .map((item) => ({ item, score: scoreItem(item, tokens, preferCompilation, q) }))
        .filter((x) => x.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 80)
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
            <span class="search-result-title">${escapeHtml(item.title).replace(/(\d+)/g, '<span class="num">$1</span>')}</span>
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
      if (composing) return;
      clearTimeout(timer);
      timer = setTimeout(() => render(input.value), 120);
    });
    input.addEventListener('compositionstart', () => {
      composing = true;
    });
    input.addEventListener('compositionend', () => {
      composing = false;
      render(input.value);
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

  const searchIndex = buildBaseIndex();
  initSearch(searchIndex);
  window.setTimeout(() => addCompilationIndex(searchIndex), 0);
})();
