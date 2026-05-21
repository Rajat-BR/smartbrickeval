/* ================================================================
   REINFORCEMENT BAR EVALUATION MODULE — steel.js
   Smart C&D Material Quality Evaluation System
   Standards: IS 1786, IS 432
   Parameters: Yield Strength, Tensile Strength, Elongation %,
               Diameter Tolerance, Weight per Meter
   ================================================================ */

/* ----------------------------------------------------------------
   SECTION 1: GRADE DEFINITIONS
   IS 1786 minimum requirements per grade.
   Used in grade classification (Section 5) and table display.
   ---------------------------------------------------------------- */
const STEEL_GRADES = {
  Fe550: {
    label:          'Fe550',
    yieldStrength:  550,   /* MPa minimum */
    tensileStrength:585,   /* MPa minimum */
    elongation:     10,    /* % minimum */
    tensileYieldRatio: 1.08
  },
  Fe500: {
    label:          'Fe500',
    yieldStrength:  500,
    tensileStrength:545,
    elongation:     12,
    tensileYieldRatio: 1.08
  },
  Fe415: {
    label:          'Fe415',
    yieldStrength:  415,
    tensileStrength:485,
    elongation:     14.5,
    tensileYieldRatio: 1.08
  }
};

/* ----------------------------------------------------------------
   SECTION 2: EVALUATION CRITERIA
   Same schema as AGGREGATE_CRITERIA — each parameter defines
   weight, thresholds, standard reference, direction, and hint.
   ---------------------------------------------------------------- */
const STEEL_CRITERIA = {
  yieldStrength: {
    label:          'Yield Strength (0.2% Proof)',
    unit:           'MPa',
    weight:         30,
    good:           500,   /* ≥ Fe500 threshold */
    avg:            415,   /* ≥ Fe415 threshold */
    standard:       'IS 1786: Fe415 ≥ 415 | Fe500 ≥ 500 | Fe550 ≥ 550 MPa',
    higherIsBetter: true,
    max:            700,
    hint:           'Minimum proof stress; governs structural design load capacity'
  },
  tensileStrength: {
    label:          'Ultimate Tensile Strength',
    unit:           'MPa',
    weight:         25,
    good:           545,   /* ≥ Fe500 UTS */
    avg:            485,   /* ≥ Fe415 UTS */
    standard:       'IS 1786: Fe415 ≥ 485 | Fe500 ≥ 545 | Fe550 ≥ 585 MPa',
    higherIsBetter: true,
    max:            800,
    hint:           'Must exceed yield strength by IS 1786 ratio (≥ 1.08×)'
  },
  elongation: {
    label:          'Elongation at Fracture',
    unit:           '%',
    weight:         20,
    good:           12,    /* ≥ Fe500 minimum */
    avg:            10,    /* ≥ Fe550 minimum (lower grade floor) */
    standard:       'IS 1786: Fe415 ≥ 14.5% | Fe500 ≥ 12% | Fe550 ≥ 10%',
    higherIsBetter: true,
    max:            35,
    hint:           'Ductility indicator — critical for seismic & dynamic loading'
  },
  diameterTolerance: {
    label:          'Diameter Tolerance',
    unit:           'mm',
    weight:         15,
    good:           0.5,   /* ≤ 0.5 mm deviation: PASS */
    avg:            1.0,   /* ≤ 1.0 mm: WARN */
    standard:       'IS 1786: ± 0.5 mm (Good), ± 1.0 mm (Marginal)',
    higherIsBetter: false,
    max:            5,
    hint:           'Absolute deviation from nominal diameter; affects bond strength'
  },
  weightPerMeter: {
    label:          'Weight per Metre',
    unit:           'kg/m',
    weight:         10,
    good:           0.06,  /* within ±3% of theoretical: enter actual abs deviation fraction */
    avg:            0.10,  /* within ±5% */
    standard:       'IS 1786: Tolerance ± 3% (Good), ± 5% (Marginal) of theoretical',
    higherIsBetter: false,
    max:            1.0,
    hint:           'Enter absolute % deviation from theoretical weight (e.g. 2.5 for 2.5% under/over)'
  }
};

/* ----------------------------------------------------------------
   SECTION 3: FORM HTML RENDERER
   Dynamically builds the Step 02 form card for steel evaluation
   ---------------------------------------------------------------- */
function renderSteelForm() {
  const formArea = document.getElementById('formArea');
  if (!formArea) return;

  formArea.style.display = 'block';

  formArea.innerHTML = `
    <div class="form-card" id="steelFormCard">

      <div class="form-section-head">
        <div class="step-pill">Step 02</div>
        <h2>Reinforcement Bar Quality Parameters</h2>
      </div>

      <p style="font-size:13.5px; color:var(--text-secondary); margin-bottom:22px; max-width:540px;">
        Enter test values for the rebar sample. The system will classify the bar
        against Fe415 / Fe500 / Fe550 grades per IS 1786 &amp; IS 432.
      </p>

      <!-- Bar type + nominal diameter selectors -->
      <div class="fields-grid">
        <div class="field-group">
          <label for="steel_barType">Bar Origin <span class="required">*</span></label>
          <select id="steel_barType">
            <option value="">— Select origin —</option>
            <option value="New Production Bar">New Production Bar</option>
            <option value="Recycled Rebar (C&D Recovery)">Recycled Rebar (C&amp;D Recovery)</option>
            <option value="Reclaimed Structural Steel Bar">Reclaimed Structural Steel Bar</option>
            <option value="Secondary Market Rebar">Secondary Market Rebar</option>
          </select>
        </div>
        <div class="field-group">
          <label for="steel_nomDia">Nominal Diameter <span class="unit">(mm)</span> <span class="required">*</span></label>
          <select id="steel_nomDia">
            <option value="">— Select size —</option>
            <option value="8">8 mm</option>
            <option value="10">10 mm</option>
            <option value="12">12 mm</option>
            <option value="16">16 mm</option>
            <option value="20">20 mm</option>
            <option value="25">25 mm</option>
            <option value="32">32 mm</option>
          </select>
        </div>
      </div>

      <hr class="divider" />

      <!-- Parameter input grid -->
      <div class="fields-grid">

        ${Object.entries(STEEL_CRITERIA).map(([key, cfg]) => `
        <div class="field-group">
          <label for="steel_${key}">
            ${cfg.label}
            <span class="unit">(${cfg.unit})</span>
            <span class="required">*</span>
          </label>
          <input
            type="number"
            id="steel_${key}"
            step="0.01"
            min="0"
            max="${cfg.max}"
            placeholder="e.g. ${_steelPlaceholder(key)}"
          />
          <span class="field-hint">${cfg.hint}</span>
        </div>
        `).join('')}

      </div>

      <div class="btn-row">
        <button class="btn-primary" onclick="evaluateSteel()">
          ▶ &nbsp; Evaluate Quality
        </button>
        <button class="btn-secondary" onclick="resetSteelForm()">
          ✕ &nbsp; Clear
        </button>
      </div>

    </div>
  `;
}

/* Helper: representative placeholder values per parameter */
function _steelPlaceholder(key) {
  const defaults = {
    yieldStrength:     '520',
    tensileStrength:   '580',
    elongation:        '13',
    diameterTolerance: '0.3',
    weightPerMeter:    '2.0'
  };
  return defaults[key] || '0';
}

/* ----------------------------------------------------------------
   SECTION 4: INPUT READER & VALIDATOR
   Same pattern as readAggregateInputs() — marks .invalid on error
   ---------------------------------------------------------------- */
function readSteelInputs() {
  const errors = [];
  const values = {};

  /* Bar origin */
  const barTypeEl = document.getElementById('steel_barType');
  if (!barTypeEl || !barTypeEl.value) {
    barTypeEl && barTypeEl.classList.add('invalid');
    errors.push('Bar origin is required.');
  } else {
    barTypeEl.classList.remove('invalid');
    values.barType = barTypeEl.value;
  }

  /* Nominal diameter */
  const nomDiaEl = document.getElementById('steel_nomDia');
  if (!nomDiaEl || !nomDiaEl.value) {
    nomDiaEl && nomDiaEl.classList.add('invalid');
    errors.push('Nominal diameter is required.');
  } else {
    nomDiaEl.classList.remove('invalid');
    values.nominalDiameter = parseFloat(nomDiaEl.value);
  }

  /* Numeric parameters */
  Object.keys(STEEL_CRITERIA).forEach(key => {
    const el  = document.getElementById(`steel_${key}`);
    const raw = el ? el.value.trim() : '';
    if (raw === '' || isNaN(parseFloat(raw))) {
      el && el.classList.add('invalid');
      errors.push(`${STEEL_CRITERIA[key].label} is required.`);
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
   SECTION 5: GRADE CLASSIFIER
   Determines the highest IS 1786 grade the sample qualifies for,
   based on yield strength, tensile strength, and elongation.
   Returns the grade label string or 'Sub-standard' if none met.
   ---------------------------------------------------------------- */
function classifySteelGrade(values) {
  const { yieldStrength, tensileStrength, elongation } = values;
  const ratio = tensileStrength / yieldStrength;

  /* Check grades from highest to lowest */
  const gradeOrder = ['Fe550', 'Fe500', 'Fe415'];
  for (const gradeKey of gradeOrder) {
    const g = STEEL_GRADES[gradeKey];
    if (
      yieldStrength  >= g.yieldStrength   &&
      tensileStrength >= g.tensileStrength &&
      elongation     >= g.elongation      &&
      ratio          >= g.tensileYieldRatio
    ) {
      return gradeKey;
    }
  }
  return 'Sub-standard';
}

/* ----------------------------------------------------------------
   SECTION 6: PARAMETER EVALUATOR
   Same structure as evaluateAggregateParameter() — returns
   { key, label, unit, value, status, points, note, cfg }
   ---------------------------------------------------------------- */
function evaluateSteelParameter(key, value) {
  const cfg = STEEL_CRITERIA[key];
  let status, points, note;

  if (cfg.higherIsBetter) {
    if (value >= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = `${cfg.label} of ${value} ${cfg.unit} meets the good threshold (≥ ${cfg.good} ${cfg.unit}).`;
    } else if (value >= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = `${cfg.label} of ${value} ${cfg.unit} meets only Fe415 level — borderline for structural use (${cfg.avg}–${cfg.good} ${cfg.unit}).`;
    } else {
      status = 'fail';
      points = 0;
      note   = `${cfg.label} of ${value} ${cfg.unit} is below minimum Fe415 requirement (< ${cfg.avg} ${cfg.unit}). Structurally inadequate.`;
    }
  } else {
    /* Lower deviation = better (Diameter Tolerance, Weight deviation) */
    if (value <= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = `${cfg.label} deviation of ${value} ${cfg.unit} is within tight tolerance (≤ ${cfg.good} ${cfg.unit}).`;
    } else if (value <= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = `${cfg.label} deviation of ${value} ${cfg.unit} is marginal — within permissible limits but may affect bond and design (${cfg.good}–${cfg.avg} ${cfg.unit}).`;
    } else {
      status = 'fail';
      points = 0;
      note   = `${cfg.label} deviation of ${value} ${cfg.unit} exceeds IS 1786 tolerance (> ${cfg.avg} ${cfg.unit}). Reject this batch.`;
    }
  }

  return { key, label: cfg.label, unit: cfg.unit, value, status, points, note, cfg };
}

/* ----------------------------------------------------------------
   SECTION 7: SCORING ENGINE
   Weighted sum → 0–100 score → GOOD / AVERAGE / POOR grade
   Same thresholds as aggregate module for system consistency
   ---------------------------------------------------------------- */
function computeSteelScore(paramResults) {
  const totalPoints = paramResults.reduce((sum, r) => sum + r.points, 0);
  const maxPoints   = Object.values(STEEL_CRITERIA).reduce((s, c) => s + c.weight, 0);
  const score       = Math.round((totalPoints / maxPoints) * 100);

  let quality;
  if      (score >= 70) quality = 'GOOD';
  else if (score >= 45) quality = 'AVERAGE';
  else                  quality = 'POOR';

  return { score, quality };
}

/* ----------------------------------------------------------------
   SECTION 8: RECOMMENDATION GENERATOR
   Context-aware text based on quality grade, IS grade classification,
   specific failures, and whether the bar is a recycled/C&D source
   ---------------------------------------------------------------- */
function generateSteelRecommendation(quality, paramResults, values, steelGrade) {
  const isRecycled = values.barType.toLowerCase().includes('recycled') ||
                     values.barType.toLowerCase().includes('c&d')      ||
                     values.barType.toLowerCase().includes('reclaimed');

  const failKeys = paramResults.filter(r => r.status === 'fail').map(r => r.key);
  const warnKeys = paramResults.filter(r => r.status === 'warn').map(r => r.key);
  const diaLabel = `${values.nominalDiameter} mm`;

  let lines = [];

  if (quality === 'GOOD') {
    lines.push(`✔ This ${diaLabel} ${values.barType.toLowerCase()} qualifies as ${steelGrade} per IS 1786.`);
    lines.push('');
    lines.push('Recommended uses:');

    if (steelGrade === 'Fe550') {
      lines.push('  • High-rise RCC structures and long-span beams');
      lines.push('  • Pre-stressed and post-tensioned concrete members');
      lines.push('  • Heavy-load industrial slabs and foundations');
    } else if (steelGrade === 'Fe500') {
      lines.push('  • General RCC structural members — columns, beams, slabs');
      lines.push('  • Residential and commercial building reinforcement');
      lines.push('  • Bridge decks and retaining walls');
    } else {
      lines.push('  • RCC construction — footings, lintels, stirrups');
      lines.push('  • Medium-load residential structures');
      lines.push('  • Distribution bars and secondary reinforcement');
    }

    if (isRecycled) {
      lines.push('');
      lines.push('⚑ Recycled / C&D rebar: Verify heat number traceability if available.');
      lines.push('  Consider weldability tests before lap splices in seismic zones.');
    }

  } else if (quality === 'AVERAGE') {
    lines.push(`⚠ This ${diaLabel} bar meets partial IS 1786 requirements — classified as ${steelGrade}.`);
    lines.push('');
    lines.push('Conditionally recommended uses:');
    lines.push('  • Non-critical secondary reinforcement (ties, stirrups, spacers)');
    lines.push('  • Fencing, gate frames, and temporary formwork supports');
    lines.push('  • Medium-load construction with engineer sign-off');

    if (failKeys.includes('yieldStrength') || failKeys.includes('tensileStrength')) {
      lines.push('');
      lines.push('⛔ Do NOT use as primary structural reinforcement — strength is below IS minimum.');
    }
    if (failKeys.includes('elongation')) {
      lines.push('⛔ Low elongation indicates brittle behaviour — avoid in seismic or impact zones.');
    }
    if (warnKeys.length > 0) {
      lines.push('');
      lines.push('⚑ Marginal parameters must be re-tested on a minimum of 3 samples before acceptance.');
    }

  } else {
    /* POOR */
    lines.push(`✘ This ${diaLabel} ${values.barType.toLowerCase()} does NOT meet IS 1786 requirements for any standard grade.`);
    lines.push('');
    lines.push('Not suitable for:');
    lines.push('  • Any structural reinforcement (RCC, PCC, pre-stress)');
    lines.push('  • Load-bearing elements — columns, beams, slabs, foundations');
    lines.push('');

    if (failKeys.includes('yieldStrength') && failKeys.includes('tensileStrength')) {
      lines.push('⛔ Both yield and tensile strength values are critically low — material is mechanically unsafe for structural applications.');
    }
    if (failKeys.includes('diameterTolerance')) {
      lines.push('⛔ Excessive diameter deviation compromises bond with concrete and design section assumptions.');
    }
    if (failKeys.includes('elongation')) {
      lines.push('⛔ Critically low ductility — high risk of sudden brittle fracture under load.');
    }

    lines.push('');
    lines.push('Recommendation: Reject this batch. Do not use in any load-bearing application.');
    if (isRecycled) {
      lines.push('  Recycled / C&D rebar failing these thresholds should be sent for scrap remelting per CPCB C&D Waste Rules 2016.');
    }
  }

  return lines.join('\n');
}

/* ----------------------------------------------------------------
   SECTION 9: DOM RENDERER
   Populates the shared result card — same approach as renderAggregateResult()
   ---------------------------------------------------------------- */
function renderSteelResult(values, paramResults, scoreData, recommendation, steelGrade) {
  const { score, quality } = scoreData;

  const resultCard = document.getElementById('resultCard');
  if (!resultCard) return;
  resultCard.style.display = 'block';

  setTimeout(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  /* — Meta row — */
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  document.getElementById('resultMeta').innerHTML = `
    <div class="meta-item">
      <div class="meta-label">Material</div>
      <div class="meta-value">Reinforcement Bar</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Bar Origin</div>
      <div class="meta-value">${values.barType}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">IS Grade</div>
      <div class="meta-value">${steelGrade}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Nominal Dia.</div>
      <div class="meta-value">${values.nominalDiameter} mm</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Standards</div>
      <div class="meta-value">IS 1786 · IS 432</div>
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

  /* — Score ring — */
  const scoreNumEl    = document.getElementById('scoreNum');
  const scoreArc      = document.getElementById('scoreArc');
  const circumference = 201;

  scoreNumEl.textContent = score;

  const arcColor = quality === 'GOOD'    ? 'var(--good)'
                 : quality === 'AVERAGE' ? 'var(--avg)'
                 :                         'var(--poor)';
  scoreArc.setAttribute('stroke', arcColor);

  const offset = circumference - (score / 100) * circumference;
  scoreArc.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)';
  requestAnimationFrame(() => {
    scoreArc.setAttribute('stroke-dashoffset', circumference);
    requestAnimationFrame(() => {
      scoreArc.setAttribute('stroke-dashoffset', offset);
    });
  });

  /* — Recommendation box — */
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
        <td style="font-family:var(--font-mono); font-size:13px;">${r.value} ${r.unit}</td>
        <td style="font-size:12.5px; color:var(--text-muted);">${r.cfg.standard}</td>
        <td><span class="${statusClass}">${statusLabel}</span></td>
      </tr>
    `;
  }).join('');
}

/* ----------------------------------------------------------------
   SECTION 10: MAIN EVALUATION ORCHESTRATOR
   Called by "Evaluate Quality" button in the steel form
   ---------------------------------------------------------------- */
function evaluateSteel() {
  /* Step 1: Read & validate */
  const values = readSteelInputs();
  if (!values) return;

  /* Step 2: Evaluate each parameter */
  const paramResults = Object.keys(STEEL_CRITERIA).map(key =>
    evaluateSteelParameter(key, values[key])
  );

  /* Step 3: Classify IS grade */
  const steelGrade = classifySteelGrade(values);

  /* Step 4: Compute score and quality */
  const scoreData = computeSteelScore(paramResults);

  /* Step 5: Generate recommendation */
  const recommendation = generateSteelRecommendation(
    scoreData.quality,
    paramResults,
    values,
    steelGrade
  );

  /* Step 6: Render to DOM */
  renderSteelResult(values, paramResults, scoreData, recommendation, steelGrade);
}

/* ----------------------------------------------------------------
   SECTION 11: UTILITY / RESET FUNCTIONS
   ---------------------------------------------------------------- */

/* Clear steel form fields and validation states */
function resetSteelForm() {
  ['steel_barType', 'steel_nomDia'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('invalid'); }
  });

  Object.keys(STEEL_CRITERIA).forEach(key => {
    const el = document.getElementById(`steel_${key}`);
    if (el) { el.value = ''; el.classList.remove('invalid'); }
  });

  const resultCard = document.getElementById('resultCard');
  if (resultCard) resultCard.style.display = 'none';

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
}

/* Called by main.js dispatcher when 'steel' module is selected */
function loadSteelModule() {
  renderSteelForm();
}