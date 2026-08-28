/**
 * 計算邏輯 — 對應原 App Screen6 / S188
 */
const CalcEngine = {
  /** 滅火效能值（第 31 條） */
  extinguisherUnits({ jiaWu = 0, yiBingDing = 0, daLiangHuoYuan = 0, dianQi = 0 }) {
    const ceil = (n) => Math.ceil(Math.max(0, Number(n) || 0));
    const u1 = ceil(jiaWu / 100);
    const u2 = ceil(yiBingDing / 200);
    const u3 = ceil(daLiangHuoYuan / 25);
    const u4 = ceil(dianQi / 100);
    return {
      units: { jiaWu: u1, yiBingDing: u2, daLiangHuoYuan: u3, dianQi: u4 },
      total: u1 + u2 + u3 + u4,
    };
  },

  /** 風量計算（第 188 條） Q = v_avg × 寬 × 高 × 60 */
  smokeAirflow({ v1, v2, v3, v4, v5, width, height }) {
    const n = (x) => Math.max(0, Number(x) || 0);
    const speeds = [v1, v2, v3, v4, v5].map(n);
    const avgWind = speeds.reduce((a, b) => a + b, 0) / 5;
    const w = n(width);
    const h = n(height);
    const airflow = avgWind * w * h * 60;
    return { avgWind, airflow, width: w, height: h };
  },

  /** 合格判定 */
  smokePass(airflow, threshold) {
    return Number(airflow) >= Number(threshold) ? '合格' : '不合格';
  },

  /** 依防煙區劃面積估算基準風量 */
  smokeThreshold(area, rate) {
    return (Number(area) || 0) * (Number(rate) || 1);
  },

  /** 開口計算（第 188 條第七款：2% 開口面積） */
  opening({ area }) {
    const A = Math.max(0, Number(area) || 0);
    const openingArea = A * 0.02;
    const openingLength = openingArea / 0.8;
    return { area: A, openingArea, openingLength };
  },
};

function numInput(id, label, unit, value = '0', hint = '') {
  return `
    <div class="calc-field">
      <label class="calc-label" for="${id}">${label}</label>
      <div class="calc-input-wrap">
        <input type="number" inputmode="decimal" min="0" step="any"
               class="calc-input" id="${id}" name="${id}" value="${value}"
               placeholder="0"${hint ? ` aria-describedby="${id}-hint"` : ''}>
        <span class="calc-unit">${unit}</span>
      </div>
      ${hint ? `<span class="calc-hint" id="${id}-hint">${hint}</span>` : ''}
    </div>
  `;
}

function resultBox(title, html, variant = '') {
  return `
    <div class="calc-result ${variant}" role="status" aria-live="polite">
      <span class="calc-result-label">${title}</span>
      <div class="calc-result-body">${html}</div>
    </div>
  `;
}

function renderExtinguisherCalc() {
  return `
    <section class="calc-panel fade-up" id="calc-extinguisher">
      <div class="calc-panel-head">
        <span class="calc-panel-badge">計算工具</span>
        <h3 class="calc-panel-title">滅火效能計算</h3>
        <p class="calc-panel-desc">依第 31 條核算最低滅火效能值（無條件進位）</p>
      </div>
      <form class="calc-form" id="form-extinguisher" novalidate>
        ${numInput('ex-jiawu', '甲戊', 'm²', '0', '每 100 m² 需 1 效能值')}
        ${numInput('ex-yibing', '乙丙丁', 'm²', '0', '每 200 m² 需 1 效能值')}
        ${numInput('ex-daliang', '大量火源', 'm²', '0', '每 25 m² 需 1 效能值（鍋爐房、廚房等）')}
        ${numInput('ex-dianqi', '電氣', 'm²', '0', '每 100 m² 需 1 效能值')}
        <ul class="calc-ref-list">
          <li>步行距離在二十公尺以下</li>
          <li>紅底白字滅火器標識 24 cm × 8 cm</li>
          <li>位置：上端距樓地板 1 m 以下（18 kg 以上）或 1.5 m 以下（18 kg 以下）</li>
        </ul>
        <button type="submit" class="calc-submit">滅火效能計算</button>
      </form>
      <div id="result-extinguisher"></div>
    </section>
  `;
}

function renderSmokeCalc() {
  return `
    <section class="calc-panel fade-up" id="calc-smoke-airflow">
      <div class="calc-panel-head">
        <span class="calc-panel-badge">計算工具</span>
        <h3 class="calc-panel-title">風量計算</h3>
        <p class="calc-panel-desc">Q = 平均風速 × 窗口寬 × 窗口高 × 60（m³/min）</p>
      </div>
      <form class="calc-form" id="form-smoke-airflow" novalidate>
        <p class="calc-group-label">測點風速</p>
        <div class="calc-grid-2">
          ${numInput('sm-v1', '1', 'm/s')}
          ${numInput('sm-v2', '2', 'm/s')}
          ${numInput('sm-v3', '3', 'm/s')}
          ${numInput('sm-v4', '4', 'm/s')}
          ${numInput('sm-v5', '5', 'm/s')}
        </div>
        <p class="calc-group-label">窗口尺寸</p>
        <div class="calc-grid-2 calc-grid-2--2col">
          ${numInput('sm-width', '寬', 'm')}
          ${numInput('sm-height', '高', 'm')}
        </div>
        <p class="calc-group-label">合格判定基準</p>
        ${numInput('sm-threshold', '基準風量', 'm³/min', '0', '單區：面積×1；多區：最大區劃面積×2')}
        <div class="calc-grid-2 calc-actions">
          <button type="submit" class="calc-submit">風量計算</button>
          <button type="button" class="calc-submit calc-submit--outline" id="btn-smoke-pass">合格與否</button>
        </div>
      </form>
      <div id="result-smoke-airflow"></div>
    </section>

    <section class="calc-panel fade-up" id="calc-smoke-opening">
      <div class="calc-panel-head">
        <span class="calc-panel-badge">計算工具</span>
        <h3 class="calc-panel-title">開口計算</h3>
        <p class="calc-panel-desc">排煙口開口面積 = 防煙區劃面積 × 2%；開口長度 = 面積 ÷ 0.8 m</p>
      </div>
      <form class="calc-form" id="form-smoke-opening" novalidate>
        ${numInput('sm-area', 'A　防煙區劃面積', 'm²', '0')}
        <button type="submit" class="calc-submit">開口計算</button>
      </form>
      <div id="result-smoke-opening"></div>
    </section>
  `;
}

function bindExtinguisherCalc() {
  const form = document.getElementById('form-extinguisher');
  const result = document.getElementById('result-extinguisher');
  if (!form || !result) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const r = CalcEngine.extinguisherUnits({
      jiaWu: fd.get('ex-jiawu'),
      yiBingDing: fd.get('ex-yibing'),
      daLiangHuoYuan: fd.get('ex-daliang'),
      dianQi: fd.get('ex-dianqi'),
    });
    result.innerHTML = resultBox(
      '計算結果',
      `<p class="calc-result-main">${r.total} <span class="calc-result-unit">效能值</span></p>
       <ul class="calc-breakdown">
         <li>甲戊：${r.units.jiaWu}</li>
         <li>乙丙丁：${r.units.yiBingDing}</li>
         <li>大量火源：${r.units.daLiangHuoYuan}</li>
         <li>電氣：${r.units.dianQi}</li>
       </ul>`
    );
  });
}

function bindSmokeCalc() {
  const formAir = document.getElementById('form-smoke-airflow');
  const formOpen = document.getElementById('form-smoke-opening');
  const resultAir = document.getElementById('result-smoke-airflow');
  const resultOpen = document.getElementById('result-smoke-opening');
  const btnPass = document.getElementById('btn-smoke-pass');

  function getAirflowInputs() {
    const fd = new FormData(formAir);
    return CalcEngine.smokeAirflow({
      v1: fd.get('sm-v1'), v2: fd.get('sm-v2'), v3: fd.get('sm-v3'),
      v4: fd.get('sm-v4'), v5: fd.get('sm-v5'),
      width: fd.get('sm-width'), height: fd.get('sm-height'),
    });
  }

  if (formAir) {
    formAir.addEventListener('submit', (e) => {
      e.preventDefault();
      const { avgWind, airflow } = getAirflowInputs();
      resultAir.innerHTML = resultBox(
        '風量',
        `<p class="calc-result-main">${airflow.toFixed(2)} <span class="calc-result-unit">m³/min</span></p>
         <p class="calc-result-sub">平均風速 ${avgWind.toFixed(3)} m/s</p>`
      );
    });
  }

  if (btnPass) {
    btnPass.addEventListener('click', () => {
      const { airflow } = getAirflowInputs();
      const threshold = Number(new FormData(formAir).get('sm-threshold')) || 0;
      const status = CalcEngine.smokePass(airflow, threshold);
      const variant = status === '合格' ? 'calc-result--pass' : 'calc-result--fail';
      resultAir.innerHTML = resultBox(
        '合格判定',
        `<p class="calc-result-main calc-result-status">${status}</p>
         <p class="calc-result-sub">風量 ${airflow.toFixed(2)} m³/min　／　基準 ${threshold} m³/min</p>`,
        variant
      );
    });
  }

  if (formOpen) {
    formOpen.addEventListener('submit', (e) => {
      e.preventDefault();
      const area = new FormData(formOpen).get('sm-area');
      const r = CalcEngine.opening({ area });
      resultOpen.innerHTML = resultBox(
        '開口面積',
        `<p class="calc-result-main">${r.openingArea.toFixed(4)} <span class="calc-result-unit">m²</span></p>
         <p class="calc-result-sub">開口長度 ${r.openingLength.toFixed(4)} m（寬 0.8 m）</p>`
      );
    });
  }
}

const CALC_RENDERERS = {
  extinguisher: { html: renderExtinguisherCalc, bind: bindExtinguisherCalc },
  smoke: { html: renderSmokeCalc, bind: bindSmokeCalc },
};

function renderCalculators(calcIds) {
  if (!calcIds || !calcIds.length) return '';
  return calcIds.map((id) => CALC_RENDERERS[id]?.html() || '').join('');
}

function bindCalculators(calcIds) {
  if (!calcIds) return;
  calcIds.forEach((id) => CALC_RENDERERS[id]?.bind());
}
