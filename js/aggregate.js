/* ================================================================
   AGGREGATE EVALUATION MODULE — aggregate.js
   Smart C&D Material Quality Evaluation System
   Standards: IS 383, IS 2386
   Parameters: Specific Gravity, Water Absorption, Crushing Value,
               Impact Value, Flakiness Index, Bulk Density
   ================================================================ */

/* ----------------------------------------------------------------
   SECTION 1: EVALUATION CRITERIA
   Each parameter defines:
     - label        : display name
     - unit         : measurement unit
     - weight       : scoring weight (all weights sum to 100)
     - good / avg   : threshold ranges (PASS ≥ good, WARN ≥ avg, else FAIL)
     - standard     : IS code reference string shown in the table
     - higherIsBetter: true  → higher value is better (e.g. specific gravity)
                       false → lower value is better (e.g. water absorption)
     - hint         : helper text shown below the input field
   ---------------------------------------------------------------- */
const AGGREGATE_CRITERIA = {
  specificGravity: {
    label:          'Specific Gravity',
    unit:           '',
    weight:         15,
    good:           2.6,
    avg:            2.5,
    standard:       'IS 2386 (Pt III): 2.5 – 3.0',
    codeRef:        'IS 2386 Part III (Specific Gravity Test)',
    higherIsBetter: true,
    max:            3.2,
    hint:           'Obtain by dividing dry weight of aggregate by the volume of water displaced by the saturated surface-dry aggregate.'
  },
  waterAbsorption: {
    label:          'Water Absorption',
    unit:           '%',
    weight:         15,
    good:           2.0,
    avg:            5.0,
    standard:       'IS 2386 (Pt III): < 2% (Good), < 5% (Avg)',
    codeRef:        'IS 2386 Part III (Water Absorption Test)',
    higherIsBetter: false,
    max:            15,
    hint:           'Obtain by oven-drying the saturated aggregate sample and measuring the weight change percentage after immersion.'
  },
  crushingValue: {
    label:          'Aggregate Crushing Value',
    unit:           '%',
    weight:         20,
    good:           30,
    avg:            45,
    standard:       'IS 2386 (Pt IV): < 30% (Good), < 45% (Avg)',
    codeRef:        'IS 2386 Part IV (Aggregate Crushing Test)',
    higherIsBetter: false,
    max:            60,
    hint:           'Obtain by compressing aggregate in a cylinder at a standard load rate, then measuring the percentage of crushed fines passing a 2.36mm sieve.'
  },
  impactValue: {
    label:          'Aggregate Impact Value',
    unit:           '%',
    weight:         15,
    good:           25,
    avg:            35,
    standard:       'IS 2386 (Pt IV): < 25% (Good), < 35% (Avg)',
    codeRef:        'IS 2386 Part IV (Aggregate Impact Test)',
    higherIsBetter: false,
    max:            60,
    hint:           'Obtain by subjecting aggregate to 15 blows from a standard falling hammer, then measuring the percentage of crushed fines passing a 2.36mm sieve.'
  },
  flakinessIndex: {
    label:          'Flakiness Index',
    unit:           '%',
    weight:         10,
    good:           20,
    avg:            25,
    standard:       'IS 2386 (Pt I): < 20% (Good), < 25% (Avg)',
    codeRef:        'IS 2386 Part I (Flakiness Index Test)',
    higherIsBetter: false,
    max:            60,
    hint:           'Obtain by passing aggregate through a standard thickness gauge to measure the percentage weight of flat/thin particles.'
  },
  elongationIndex: {
    label:          'Elongation Index',
    unit:           '%',
    weight:         10,
    good:           25,
    avg:            35,
    standard:       'IS 2386 (Pt I): < 25% (Good), < 35% (Avg)',
    codeRef:        'IS 2386 Part I (Elongation Index Test)',
    higherIsBetter: false,
    max:            60,
    hint:           'Obtain by passing aggregate through a standard length gauge to measure the percentage weight of elongated particles.'
  },
  angularityNumber: {
    label:          'Angularity Number',
    unit:           '',
    weight:         15,
    good:           7,
    avg:            5,
    standard:       'IS 2386 (Pt I): 7–10 (Good), 5–7 (Avg)',
    codeRef:        'IS 2386 Part I (Angularity Number Test)',
    higherIsBetter: true,
    max:            11,
    hint:           'Obtain by measuring the percentage voids in aggregate packed in a cylinder; angularity number = (67 - % solid volume). Higher indicates more angular particles.'
  }
};

/* ----------------------------------------------------------------
   SECTION 2: FORM HTML RENDERER
   Builds the Step 02 form card dynamically and injects into #formArea
   ---------------------------------------------------------------- */
function renderAggregateForm() {
  const formArea = document.getElementById('formArea');
  if (!formArea) return;

  formArea.style.display = 'block';

  formArea.innerHTML = `
    <div class="form-card" id="aggregateFormCard">

      <!-- Form header -->
      <div class="form-section-head">
        <div class="step-pill">Step 02</div>
        <h2>Aggregate Quality Parameters</h2>
      </div>

      <p style="font-size:13.5px; color:var(--text-secondary); margin-bottom:22px; max-width:520px;">
        Enter test results for the recovered aggregate sample.
        Values are evaluated against IS 383 &amp; IS 2386 thresholds.
      </p>

      <!-- Sub-type selector -->
      <div class="fields-grid">
        <div class="field-group field-wide">
          <label for="agg_type">Aggregate Type</label>
          <select id="agg_type">
            <option value="">— Select type —</option>
            <option value="Coarse Aggregate (Natural)">Coarse Aggregate (Natural)</option>
            <option value="Coarse Aggregate (Recycled)">Coarse Aggregate (Recycled / C&amp;D)</option>
            <option value="Fine Aggregate (Natural)">Fine Aggregate (Natural)</option>
            <option value="Fine Aggregate (Recycled)">Fine Aggregate (Recycled / C&amp;D)</option>
            <option value="Crushed Stone">Crushed Stone</option>
          </select>
        </div>
      </div>

      <hr class="divider" />

      <!-- Parameter input grid -->
      <div class="fields-grid">

        ${Object.entries(AGGREGATE_CRITERIA).map(([key, cfg]) => `
        <div class="field-group">
          <label for="agg_${key}">
            ${cfg.label}
            <span class="unit">(${cfg.unit})</span>
            <span class="info-icon-tooltip" data-tooltip="${cfg.hint}">ⓘ</span>
          </label>
          <input
            type="number"
            id="agg_${key}"
            step="0.01"
            min="0"
            max="${cfg.max}"
            placeholder="e.g. ${_aggPlaceholder(key)}"
          />
          <span class="field-hint">${cfg.codeRef}</span>
        </div>
        `).join('')}
          <div class="upload-zone">
            <label>Sample Photo <span style="font-weight:400; text-transform:none; letter-spacing:0; color:var(--text-muted);">(optional)</span></label>
            <input
              class="upload-input"
              type="file"
              id="agg_sampleImage"
              accept="image/*"
            />
            <div class="upload-preview" id="agg_imagePreview">
              <img id="agg_previewImg" src="" alt="Sample preview" />
              <div class="upload-filename" id="agg_fileName"></div>
            </div>
          </div>
      </div>

      <!-- Action buttons -->
      <div class="btn-row">
        <button class="btn-primary" onclick="evaluateAggregate()">
          ▶ &nbsp; Evaluate Quality
        </button>
        <button class="btn-secondary" onclick="resetAggregateForm()">
          ✕ &nbsp; Clear
        </button>
      </div>

    </div>
  `;
  setupImageUpload('agg_');
}

/* Helper: sensible placeholder values per parameter */
function _aggPlaceholder(key) {
  const defaults = {
    specificGravity:  '2.65',
    waterAbsorption:  '1.5',
    crushingValue:    '25',
    impactValue:      '22',
    flakinessIndex:   '20',
    elongationIndex:  '22',
    angularityNumber: '7'
  };
  return defaults[key] || '0';
}

/* ----------------------------------------------------------------
   SECTION 3: INPUT READER & VALIDATOR
   Reads all field values, validates presence, returns structured data
   Returns null if any required field is missing
   ---------------------------------------------------------------- */
function readAggregateInputs() {
  const errors   = [];
  const values   = {};

  /* Read aggregate type */
  const typeEl = document.getElementById('agg_type');
  if (!typeEl || !typeEl.value) {
    typeEl && typeEl.classList.add('invalid');
    errors.push('Aggregate type is required.');
  } else {
    typeEl.classList.remove('invalid');
    values.aggregateType = typeEl.value;
  }

  /* Read each numeric parameter */
  Object.keys(AGGREGATE_CRITERIA).forEach(key => {
    const el  = document.getElementById(`agg_${key}`);
    const raw = el ? el.value.trim() : '';

    if (raw === '' || isNaN(parseFloat(raw))) {
      el && el.classList.add('invalid');
      errors.push(`${AGGREGATE_CRITERIA[key].label} is required.`);
    } else {
      el.classList.remove('invalid');
      values[key] = parseFloat(raw);
    }
  });

  if (errors.length > 0) {
    alert('Please fill in all required fields:\n\n• ' + errors.join('\n• '));
    return null;
  }

  return values;
}

/* ----------------------------------------------------------------
   SECTION 4: PARAMETER EVALUATOR
   Evaluates each parameter individually:
     - status : 'pass' | 'warn' | 'fail'
     - points : score contribution for this parameter (0 – weight)
     - note   : human-readable explanation
   ---------------------------------------------------------------- */
function evaluateAggregateParameter(key, value) {
  const cfg = AGGREGATE_CRITERIA[key];
  let status, points, note;

  if (cfg.higherIsBetter) {
    /* Higher value = better (Specific Gravity, Bulk Density) */
    if (value >= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = `${cfg.label} of ${value} ${cfg.unit} meets the good threshold (≥ ${cfg.good} ${cfg.unit}).`;
    } else if (value >= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = `${cfg.label} of ${value} ${cfg.unit} is borderline — acceptable but below ideal (${cfg.avg}–${cfg.good} ${cfg.unit}).`;
    } else {
      status = 'fail';
      points = 0;
      note   = `${cfg.label} of ${value} ${cfg.unit} is below acceptable threshold (< ${cfg.avg} ${cfg.unit}). Quality concern.`;
    }
  } else {
    /* Lower value = better (Water Absorption, Crushing, Impact, Flakiness) */
    if (value <= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = `${cfg.label} of ${value}${cfg.unit} is within good limits (≤ ${cfg.good}${cfg.unit}).`;
    } else if (value <= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = `${cfg.label} of ${value}${cfg.unit} is average — usable but higher than ideal (${cfg.good}–${cfg.avg}${cfg.unit}).`;
    } else {
      status = 'fail';
      points = 0;
      note   = `${cfg.label} of ${value}${cfg.unit} exceeds acceptable limit (> ${cfg.avg}${cfg.unit}). Reject or restrict use.`;
    }
  }

  return { key, label: cfg.label, unit: cfg.unit, value, status, points, note, cfg };
}

/* ----------------------------------------------------------------
   SECTION 5: SCORING ENGINE
   Aggregates individual parameter results into a total score (0–100),
   then classifies overall quality: GOOD / AVERAGE / POOR
   ---------------------------------------------------------------- */
function computeAggregateScore(paramResults) {
  const totalPoints = paramResults.reduce((sum, r) => sum + r.points, 0);
  const maxPoints   = Object.values(AGGREGATE_CRITERIA).reduce((s, c) => s + c.weight, 0);
  const score       = Math.round((totalPoints / maxPoints) * 100);

  let quality;
  if      (score >= 70) quality = 'GOOD';
  else if (score >= 45) quality = 'AVERAGE';
  else                  quality = 'POOR';

  return { score, quality };
}

/* ----------------------------------------------------------------
   SECTION 6: RECOMMENDATION GENERATOR
   Produces a context-aware suitability recommendation based on:
     - Overall quality grade
     - Specific parameter failures / warnings
     - Aggregate type selected
   ---------------------------------------------------------------- */
function generateAggregateRecommendation(quality, paramResults, aggregateType) {
  const isRecycled = aggregateType.toLowerCase().includes('recycled') ||
                     aggregateType.toLowerCase().includes('c&d');

  const failKeys = paramResults.filter(r => r.status === 'fail').map(r => r.key);
  const warnKeys = paramResults.filter(r => r.status === 'warn').map(r => r.key);

  let lines = [];

  if (quality === 'GOOD') {
    lines.push(`✔ This ${aggregateType.toLowerCase()} sample meets IS quality standards for structural applications.`);
    lines.push('');
    lines.push('Recommended uses:');
    lines.push('  • Reinforced Cement Concrete (RCC) — structural members');
    lines.push('  • Plain Cement Concrete (PCC) — foundations and substructures');
    lines.push('  • High-strength concrete mixes (M25 and above)');
    lines.push('  • Road base and wearing course aggregates');
    if (isRecycled) {
      lines.push('');
      lines.push('⚑ Note: As a recycled/C&D aggregate, monitor for alkali-silica reactivity.');
      lines.push('  Conduct additional tests (soundness, petrographic) before critical structural use.');
    }

  } else if (quality === 'AVERAGE') {
    lines.push(`⚠ This ${aggregateType.toLowerCase()} is suitable for limited structural applications only.`);
    lines.push('');
    lines.push('Conditionally recommended uses:');
    lines.push('  • Plain Cement Concrete (PCC) — non-structural fills and levelling');
    lines.push('  • Sub-base and base course in road construction');
    lines.push('  • Masonry bedding and backfill compaction');

    if (failKeys.includes('crushingValue') || failKeys.includes('impactValue')) {
      lines.push('');
      lines.push('⛔ Do NOT use in load-bearing or high-impact zones (Crushing/Impact values are high).');
    }
    if (failKeys.includes('waterAbsorption')) {
      lines.push('⛔ High water absorption — avoid use in exposed or freeze-thaw environments.');
    }
    if (warnKeys.length > 0) {
      lines.push('');
      lines.push('⚑ Borderline parameters should be re-tested on a fresh sample batch before use.');
    }

  } else {
    /* POOR */
    lines.push(`✘ This ${aggregateType.toLowerCase()} does NOT meet minimum IS code requirements.`);
    lines.push('');
    lines.push('Not suitable for:');
    lines.push('  • Any structural concrete (RCC or PCC)');
    lines.push('  • Load-bearing applications or pavement wearing courses');
    lines.push('');
    lines.push('Possible uses (non-structural only):');
    lines.push('  • Granular fill or earthwork embankments (with engineer approval)');
    lines.push('  • Temporary roads / haul roads during construction phase');
    lines.push('');

    if (failKeys.includes('specificGravity')) {
      lines.push('⛔ Low specific gravity indicates lightweight / porous material — structurally unreliable.');
    }
    if (failKeys.includes('crushingValue') && failKeys.includes('impactValue')) {
      lines.push('⛔ Both crushing and impact values are critically high — material is too weak for any load-bearing use.');
    }

    lines.push('');
    lines.push('Recommendation: Source a new batch. If from C&D waste, segregate and reprocess or dispose per CPCB C&D Waste Rules 2016.');
  }

  return lines.join('\n');
}

/* ----------------------------------------------------------------
   SECTION 7: DOM RENDERER
   Populates the result card with computed data
   ---------------------------------------------------------------- */
function renderAggregateResult(values, paramResults, scoreData, recommendation) {
  const { score, quality } = scoreData;

  /* — Result card visibility — */
  const resultCard = document.getElementById('resultCard');
  if (!resultCard) return;
  resultCard.style.display = 'block';

  /* Scroll to result */
  setTimeout(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  /* — Meta row — */
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('resultMeta').innerHTML = `
    <div class="meta-item">
      <div class="meta-label">Material</div>
      <div class="meta-value">Aggregate</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Sub-type</div>
      <div class="meta-value">${values.aggregateType}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Standards</div>
      <div class="meta-value">IS 383 · IS 2386</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Evaluated On</div>
      <div class="meta-value">${dateStr}</div>
    </div>
  `;

  /* — Quality badge — */
  const badge = document.getElementById('qualityBadge');
  badge.textContent = quality;
  badge.className   = 'quality-badge ' + quality.toLowerCase();

  /* — Score ring animation — */
  const scoreNumEl = document.getElementById('scoreNum');
  const scoreArc   = document.getElementById('scoreArc');
  const circumference = 201; /* 2 * π * 32 ≈ 201 */

  scoreNumEl.textContent = score;

  /* Arc color by grade */
  const arcColor = quality === 'GOOD'    ? 'var(--good)'
                 : quality === 'AVERAGE' ? 'var(--avg)'
                 :                         'var(--poor)';
  scoreArc.setAttribute('stroke', arcColor);

  /* Animate dash offset from full to target */
  const offset = circumference - (score / 100) * circumference;
  scoreArc.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)';
  requestAnimationFrame(() => {
    scoreArc.setAttribute('stroke-dashoffset', circumference); /* reset */
    requestAnimationFrame(() => {
      scoreArc.setAttribute('stroke-dashoffset', offset);
    });
  });

  /* — Recommendation — */
  document.getElementById('recommendationText').textContent = recommendation;
  const recBox = document.getElementById('recommendationBox');
  recBox.style.borderColor = quality === 'GOOD'    ? 'var(--good-border)'
                           : quality === 'AVERAGE' ? 'var(--avg-border)'
                           :                         'var(--poor-border)';
  recBox.style.background  = quality === 'GOOD'    ? 'var(--good-bg)'
                           : quality === 'AVERAGE' ? 'var(--avg-bg)'
                           :                         'var(--poor-bg)';

  /* — Reasons list — */
  const reasonsList = document.getElementById('reasonsList');
  reasonsList.innerHTML = paramResults.map(r => `
    <li class="${r.status}">
      <strong>${r.label}:</strong> ${r.note}
    </li>
  `).join('');

  /* — Parameter summary table — */
  const tbody = document.getElementById('paramTableBody');
  tbody.innerHTML = paramResults.map(r => {
    const statusClass = r.status === 'pass' ? 'status-pass'
                      : r.status === 'warn' ? 'status-warn'
                      :                       'status-fail';
    const statusLabel = r.status === 'pass' ? 'PASS'
                      : r.status === 'warn' ? 'MARGINAL'
                      :                       'FAIL';
    return `
      <tr>
        <td><strong>${r.label}</strong></td>
        <td style="font-family:var(--font-mono); font-size:13px;">
          ${r.value} ${r.unit}
        </td>
        <td style="font-size:12.5px; color:var(--text-muted);">${r.cfg.standard}</td>
        <td><span class="${statusClass}">${statusLabel}</span></td>
      </tr>
    `;
  }).join('');
}

/* ----------------------------------------------------------------
   SECTION 8: MAIN EVALUATION ORCHESTRATOR
   Called by the "Evaluate Quality" button click
   ---------------------------------------------------------------- */
function evaluateAggregate() {
  /* Step 1: Read & validate inputs */
  const values = readAggregateInputs();
  if (!values) return; /* validation failed — errors already shown */

  /* Step 2: Evaluate each parameter */
  const paramResults = Object.keys(AGGREGATE_CRITERIA).map(key =>
    evaluateAggregateParameter(key, values[key])
  );

  /* Step 3: Compute overall score and quality grade */
  const scoreData = computeAggregateScore(paramResults);

  /* Step 4: Generate recommendation text */
  const recommendation = generateAggregateRecommendation(
    scoreData.quality,
    paramResults,
    values.aggregateType
  );

  /* Step 5: Render results to DOM */
  renderAggregateResult(values, paramResults, scoreData, recommendation);
  renderSamplePhoto('agg_');

  captureEvalPayload(
    { score: scoreData.score, quality: scoreData.quality, paramResults },
    'Aggregate',
    values.aggregateType,
    'agg_'
  );
}

/* ----------------------------------------------------------------
   SECTION 9: UTILITY / RESET FUNCTIONS
   ---------------------------------------------------------------- */

/* Clear aggregate form fields and validation states */
function resetAggregateForm() {
  const typeEl = document.getElementById('agg_type');
  if (typeEl) { typeEl.value = ''; typeEl.classList.remove('invalid'); }

  Object.keys(AGGREGATE_CRITERIA).forEach(key => {
    const el = document.getElementById(`agg_${key}`);
    if (el) { el.value = ''; el.classList.remove('invalid'); }
  });

  /* Hide result card */
  const resultCard = document.getElementById('resultCard');
  if (resultCard) resultCard.style.display = 'none';

  /* Reset score arc */
  const scoreArc = document.getElementById('scoreArc');
  if (scoreArc) {
    scoreArc.style.transition = 'none';
    scoreArc.setAttribute('stroke-dashoffset', '201');
    scoreArc.setAttribute('stroke', 'var(--accent)');
  }

  const scoreNum = document.getElementById('scoreNum');
  if (scoreNum) scoreNum.textContent = '—';

  const badge = document.getElementById('qualityBadge');
  if (badge) { badge.textContent = '—'; badge.className = 'quality-badge'; }
  clearImageUpload('agg_');
  const rp = document.getElementById('resultPhotoContent');
  if (rp) rp.innerHTML = '';
}

/* Called by main.js when this module is selected */
function loadAggregateModule() {
  renderAggregateForm();
}