/* ================================================================
   BRICK EVALUATION MODULE — brick.js
   Smart C&D Material Quality Evaluation System
   Standards: IS 1077, IS 12894, IS 2185, IS 4139
   Parameters: Compressive Strength, Water Absorption, Efflorescence,
               Dimensional Tolerance, Hardness (Scratch Test)
   ================================================================ */

/* ----------------------------------------------------------------
   SECTION 1: BRICK TYPE DEFINITIONS
   IS code reference per brick sub-type — shown in the meta row
   of the result card and used for recommendation context.
   ---------------------------------------------------------------- */
const BRICK_TYPE_STANDARDS = {
  'Clay Brick (First Class)':       'IS 1077 — Class 1 (≥ 10 MPa)',
  'Clay Brick (Second Class)':      'IS 1077 — Class 2 (≥ 7.5 MPa)',
  'Clay Brick (Third Class)':       'IS 1077 — Class 3 (≥ 3.5 MPa)',
  'Fly Ash Brick':                  'IS 12894 — (≥ 7.5 MPa)',
  'Concrete Brick / Block':         'IS 2185 — (≥ 5 MPa)',
  'Sand Lime Brick':                'IS 4139 — (≥ 7 MPa)',
  'Recycled / Reclaimed Brick':     'IS 1077 (reference) — C&D Recovery'
};

/* ----------------------------------------------------------------
   SECTION 2: EVALUATION CRITERIA
   Same schema as AGGREGATE_CRITERIA and STEEL_CRITERIA.
   Each parameter:
     label          — display name
     unit           — measurement unit
     weight         — scoring weight (all weights sum to 100)
     good / avg     — pass/warn thresholds
     standard       — IS code reference string for the table
     higherIsBetter — true = higher is better, false = lower is better
     max            — input max attribute
     hint           — helper text under the field
   ---------------------------------------------------------------- */
const BRICK_CRITERIA = {
  compressiveStrength: {
    label:          'Compressive Strength',
    unit:           'MPa',
    weight:         35,
    good:           10.0,   /* IS 1077 Class 1 minimum */
    avg:            3.5,    /* IS 1077 Class 3 floor */
    standard:       'IS 1077: Class 1 ≥ 10 MPa | Class 2 ≥ 7.5 MPa | Class 3 ≥ 3.5 MPa',
    codeRef:        'IS 1077 (Compressive Strength Test)',
    higherIsBetter: true,
    max:            50,
    hint:           'Obtain by capping brick bed faces with mortar, curing, and crushing in a Compression Testing Machine flat-wise.'
  },
  waterAbsorption: {
    label:          'Water Absorption',
    unit:           '%',
    weight:         25,
    good:           15.0,   /* ≤ 15% for Class 1 / FA bricks */
    avg:            20.0,   /* ≤ 20% general permissible */
    standard:       'IS 1077: ≤ 15% (Class 1), ≤ 20% (Class 2 & 3)',
    codeRef:        'IS 1077 (Water Absorption Test)',
    higherIsBetter: false,
    max:            40,
    hint:           'Obtain by drying brick in an oven, weighing it, immersing in cold water for 24 hours, and calculating weight gain percentage.'
  },
  efflorescence: {
    label:          'Efflorescence Rating',
    unit:           '(0–4)',
    weight:         15,
    good:           1,      /* 0 = Nil, 1 = Slight — both acceptable */
    avg:            2,      /* 2 = Moderate — use with caution */
    standard:       'IS 1077: Nil (0) or Slight (1) — Pass; Moderate (2) — Marginal; Heavy/Serious (3–4) — Fail',
    codeRef:        'IS 1077 (Efflorescence Test)',
    higherIsBetter: false,
    max:            4,
    hint:           'Obtain by placing brick end-up in a shallow water dish, letting water evaporate, and observing salt deposits. Scale: 0 = Nil · 1 = Slight · 2 = Moderate · 3 = Heavy · 4 = Serious'
  },
  dimensionalTolerance: {
    label:          'Dimensional Tolerance',
    unit:           'mm',
    weight:         15,
    good:           3.0,    /* ≤ 3 mm max deviation from nominal */
    avg:            6.0,    /* ≤ 6 mm marginal */
    standard:       'IS 1077: ± 3 mm (Good), ± 6 mm (Marginal)',
    codeRef:        'IS 1077 (Measurement of Dimensions)',
    higherIsBetter: false,
    max:            20,
    hint:           'Obtain by aligning 20 brick samples in a straight line, measuring overall length, width, and height, and dividing deviation from nominal.'
  },
  hardness: {
    label:          'Hardness (Scratch Test)',
    unit:           '(1–5)',
    weight:         10,
    good:           4,      /* 4–5 = finger-nail cannot scratch = good */
    avg:            3,      /* 3 = scratched with effort */
    standard:       'IS 1077: 5 = Very Hard · 4 = Hard · 3 = Medium · 2 = Soft · 1 = Very Soft',
    codeRef:        'IS 1077 (Hardness / Scratch Test)',
    higherIsBetter: true,
    max:            5,
    hint:           'Obtain by attempting to scratch the brick surface with a fingernail, coin, or steel tool. Scale: 5 = Very Hard (no scratch) · 4 = Hard · 3 = Medium · 2 = Soft · 1 = Very Soft (powders)'
  }
};

/* ----------------------------------------------------------------
   SECTION 3: FORM HTML RENDERER
   Builds the Step 02 form card and injects it into #formArea.
   Follows the exact same pattern as renderAggregateForm() and
   renderSteelForm() for architectural consistency.
   ---------------------------------------------------------------- */
function renderBrickForm() {
  const formArea = document.getElementById('formArea');
  if (!formArea) return;

  formArea.style.display = 'block';

  formArea.innerHTML = `
    <div class="form-card" id="brickFormCard">

      <div class="form-section-head">
        <div class="step-pill">Step 02</div>
        <h2>Brick Quality Parameters</h2>
      </div>

      <p style="font-size:13.5px; color:var(--text-secondary); margin-bottom:22px; max-width:540px;">
        Enter test results for the brick sample recovered from demolition
        or recycled sources. Values are evaluated against IS 1077, IS 12894,
        IS 2185, and IS 4139 thresholds.
      </p>

      <!-- Brick sub-type selector -->
      <div class="fields-grid">
        <div class="field-group field-wide">
          <label for="brick_type">Brick Type</label>
          <select id="brick_type">
            <option value="">— Select brick type —</option>
            <option value="Clay Brick (First Class)">Clay Brick — First Class</option>
            <option value="Clay Brick (Second Class)">Clay Brick — Second Class</option>
            <option value="Clay Brick (Third Class)">Clay Brick — Third Class</option>
            <option value="Fly Ash Brick">Fly Ash Brick</option>
            <option value="Concrete Brick / Block">Concrete Brick / Block</option>
            <option value="Sand Lime Brick">Sand Lime Brick</option>
            <option value="Recycled / Reclaimed Brick">Recycled / Reclaimed Brick (C&amp;D Recovery)</option>
          </select>
        </div>
      </div>

      <hr class="divider" />

      <!-- Parameter input grid — auto-generated from BRICK_CRITERIA -->
      <div class="fields-grid">

        ${Object.entries(BRICK_CRITERIA).map(([key, cfg]) => `
        <div class="field-group">
          <label for="brick_${key}">
            ${cfg.label}
            <span class="unit">(${cfg.unit})</span>
            <span class="info-icon-tooltip" data-tooltip="${cfg.hint}">ⓘ</span>
          </label>
          <input
            type="number"
            id="brick_${key}"
            step="${key === 'compressiveStrength' || key === 'waterAbsorption' ? '0.1' : '1'}"
            min="0"
            max="${cfg.max}"
            placeholder="e.g. ${_brickPlaceholder(key)}"
          />
          <span class="field-hint">${cfg.codeRef}</span>
        </div>
        `).join('')}
          <div class="upload-zone">
            <label>Sample Photo <span style="font-weight:400; text-transform:none; letter-spacing:0; color:var(--text-muted);">(optional)</span></label>
            <input
              class="upload-input"
              type="file"
              id="brick_sampleImage"
              accept="image/*"
            />
            <div class="upload-preview" id="brick_imagePreview">
              <img id="brick_previewImg" src="" alt="Sample preview" />
              <div class="upload-filename" id="brick_fileName"></div>
            </div>
          </div>
      </div>

      <div class="btn-row">
        <button class="btn-primary" onclick="evaluateBrick()">
          ▶ &nbsp; Evaluate Quality
        </button>
        <button class="btn-secondary" onclick="resetBrickForm()">
          ✕ &nbsp; Clear
        </button>
      </div>

    </div>
  `;
  setupImageUpload('brick_');
}

/* Helper: sensible placeholder values per parameter */
function _brickPlaceholder(key) {
  const defaults = {
    compressiveStrength:  '10.5',
    waterAbsorption:      '12',
    efflorescence:        '1',
    dimensionalTolerance: '2',
    hardness:             '4'
  };
  return defaults[key] || '0';
}

/* ----------------------------------------------------------------
   SECTION 4: INPUT READER & VALIDATOR
   Reads all field values, validates presence and numeric types,
   marks .invalid on offending fields, returns structured object
   or null on failure. Consistent with readAggregateInputs() pattern.
   ---------------------------------------------------------------- */
function readBrickInputs() {
  const errors = [];
  const values = {};

  /* Brick type / sub-type */
  const typeEl = document.getElementById('brick_type');
  if (!typeEl || !typeEl.value) {
    typeEl && typeEl.classList.add('invalid');
    errors.push('Brick type is required.');
  } else {
    typeEl.classList.remove('invalid');
    values.brickType = typeEl.value;
  }

  /* Numeric parameters */
  Object.keys(BRICK_CRITERIA).forEach(key => {
    const el  = document.getElementById(`brick_${key}`);
    const raw = el ? el.value.trim() : '';

    if (raw === '' || isNaN(parseFloat(raw))) {
      el && el.classList.add('invalid');
      errors.push(`${BRICK_CRITERIA[key].label} is required.`);
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
   SECTION 5: IS CLASS CLASSIFIER
   Determines the highest IS 1077 class the brick sample qualifies
   for based solely on compressive strength and water absorption —
   the two primary IS 1077 classification parameters.
   Returns a descriptive class label string.
   ---------------------------------------------------------------- */
function classifyBrickGrade(values) {
  const { compressiveStrength, waterAbsorption } = values;

  if (compressiveStrength >= 10.0 && waterAbsorption <= 15) {
    return 'IS Class 1 (First Class)';
  } else if (compressiveStrength >= 7.5 && waterAbsorption <= 20) {
    return 'IS Class 2 (Second Class)';
  } else if (compressiveStrength >= 3.5 && waterAbsorption <= 20) {
    return 'IS Class 3 (Third Class)';
  } else {
    return 'Below IS Minimum';
  }
}

/* ----------------------------------------------------------------
   SECTION 6: PARAMETER EVALUATOR
   Evaluates each parameter individually against BRICK_CRITERIA.
   Returns { key, label, unit, value, status, points, note, cfg }.
   Mirrors evaluateAggregateParameter() and evaluateSteelParameter().
   ---------------------------------------------------------------- */
function evaluateBrickParameter(key, value) {
  const cfg = BRICK_CRITERIA[key];
  let status, points, note;

  if (cfg.higherIsBetter) {
    /* Higher is better: Compressive Strength, Hardness */
    if (value >= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = `${cfg.label} of ${value} ${cfg.unit} meets the good threshold (≥ ${cfg.good} ${cfg.unit}).`;
    } else if (value >= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = `${cfg.label} of ${value} ${cfg.unit} is borderline — meets lower IS class only (${cfg.avg}–${cfg.good} ${cfg.unit}).`;
    } else {
      status = 'fail';
      points = 0;
      note   = `${cfg.label} of ${value} ${cfg.unit} is below minimum IS threshold (< ${cfg.avg} ${cfg.unit}). Structurally inadequate.`;
    }
  } else {
    /* Lower is better: Water Absorption, Efflorescence, Dimensional Tolerance */
    if (value <= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = `${cfg.label} of ${value} ${cfg.unit} is within the good range (≤ ${cfg.good} ${cfg.unit}).`;
    } else if (value <= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = `${cfg.label} of ${value} ${cfg.unit} is marginal — above ideal but within permissible IS limit (${cfg.good}–${cfg.avg} ${cfg.unit}).`;
    } else {
      status = 'fail';
      points = 0;
      note   = `${cfg.label} of ${value} ${cfg.unit} exceeds IS permissible limit (> ${cfg.avg} ${cfg.unit}). Quality concern.`;
    }
  }

  return { key, label: cfg.label, unit: cfg.unit, value, status, points, note, cfg };
}

/* ----------------------------------------------------------------
   SECTION 7: SCORING ENGINE
   Weighted sum → 0–100 score → GOOD / AVERAGE / POOR classification.
   Identical threshold bands as aggregate and steel for consistency.
   ---------------------------------------------------------------- */
function computeBrickScore(paramResults) {
  const totalPoints = paramResults.reduce((sum, r) => sum + r.points, 0);
  const maxPoints   = Object.values(BRICK_CRITERIA).reduce((s, c) => s + c.weight, 0);
  const score       = Math.round((totalPoints / maxPoints) * 100);

  let quality;
  if      (score >= 70) quality = 'GOOD';
  else if (score >= 45) quality = 'AVERAGE';
  else                  quality = 'POOR';

  return { score, quality };
}

/* ----------------------------------------------------------------
   SECTION 8: RECOMMENDATION GENERATOR
   Context-aware text built from:
     - Overall quality classification (GOOD / AVERAGE / POOR)
     - IS brick class derived from classifyBrickGrade()
     - Specific parameter failure flags
     - Whether the brick is a recycled / C&D recovery source
   ---------------------------------------------------------------- */
function generateBrickRecommendation(quality, paramResults, values, brickClass) {
  const isRecycled = values.brickType.toLowerCase().includes('recycled') ||
                     values.brickType.toLowerCase().includes('reclaimed') ||
                     values.brickType.toLowerCase().includes('c&d');

  const failKeys = paramResults.filter(r => r.status === 'fail').map(r => r.key);
  const warnKeys = paramResults.filter(r => r.status === 'warn').map(r => r.key);

  let lines = [];

  if (quality === 'GOOD') {
    lines.push(`✔ This ${values.brickType} qualifies as ${brickClass} per IS standards.`);
    lines.push('');
    lines.push('Recommended uses:');
    lines.push('  • Load-bearing masonry walls in residential and commercial structures');
    lines.push('  • External and exposed brick facades');
    lines.push('  • RCC infill panels and partition walls');
    lines.push('  • Flooring and paving (brick-on-edge applications)');

    if (isRecycled) {
      lines.push('');
      lines.push('⚑ Reclaimed / C&D brick: Clean mortar residue from all faces before reuse.');
      lines.push('  Test an additional 5-brick sample batch to confirm consistency across the lot.');
    }

  } else if (quality === 'AVERAGE') {
    lines.push(`⚠ This ${values.brickType} is suitable for non-critical and low-load applications only.`);
    lines.push('  It qualifies as ${brickClass} under IS parameters.'.replace('${brickClass}', brickClass));
    lines.push('');
    lines.push('Conditionally recommended uses:');
    lines.push('  • Non-load-bearing partition walls and internal dividers');
    lines.push('  • Boundary walls, compound walls, and garden edging');
    lines.push('  • Filling and backing in composite wall sections');

    if (failKeys.includes('compressiveStrength')) {
      lines.push('');
      lines.push('⛔ Do NOT use in load-bearing walls — compressive strength is below IS Class 1 minimum.');
    }
    if (failKeys.includes('waterAbsorption')) {
      lines.push('⛔ High water absorption — avoid use in exposed, damp, or below-DPC zones.');
    }
    if (failKeys.includes('efflorescence')) {
      lines.push('⛔ Heavy or serious efflorescence detected — soluble salts risk structural staining and surface damage.');
    }
    if (warnKeys.length > 0) {
      lines.push('');
      lines.push('⚑ Marginal parameters: conduct additional batch testing before full use acceptance.');
    }

  } else {
    /* POOR */
    lines.push(`✘ This ${values.brickType} does NOT meet minimum IS code requirements.`);
    lines.push('  Classification: ${brickClass}'.replace('${brickClass}', brickClass));
    lines.push('');
    lines.push('Not suitable for:');
    lines.push('  • Any structural or load-bearing masonry');
    lines.push('  • Exposed facades or weathering zones');
    lines.push('  • Below-DPC or sub-foundation courses');
    lines.push('');

    if (failKeys.includes('compressiveStrength') && failKeys.includes('waterAbsorption')) {
      lines.push('⛔ Both strength and water absorption have failed — brick is mechanically weak and porous. Full batch rejection advised.');
    } else {
      if (failKeys.includes('compressiveStrength')) {
        lines.push('⛔ Critically low compressive strength — will fracture under masonry wall loads.');
      }
      if (failKeys.includes('waterAbsorption')) {
        lines.push('⛔ Excessive water absorption degrades mortar bond and accelerates deterioration in wet conditions.');
      }
    }
    if (failKeys.includes('efflorescence')) {
      lines.push('⛔ Serious efflorescence — high soluble salt content will cause progressive masonry decay.');
    }
    if (failKeys.includes('dimensionalTolerance')) {
      lines.push('⛔ Dimensional variation exceeds IS limits — uneven courses, increased mortar consumption, and weak bonding.');
    }

    lines.push('');
    lines.push('Recommendation: Reject batch. If recovered from C&D waste, segregate for granule aggregate or landfill per CPCB C&D Waste Rules 2016.');
  }

  return lines.join('\n');
}

/* ----------------------------------------------------------------
   SECTION 9: DOM RENDERER
   Populates the shared result card with brick evaluation output.
   Follows the exact same rendering pattern as renderAggregateResult()
   and renderSteelResult() — only meta row content differs.
   ---------------------------------------------------------------- */
function renderBrickResult(values, paramResults, scoreData, recommendation, brickClass) {
  const { score, quality } = scoreData;

  const resultCard = document.getElementById('resultCard');
  if (!resultCard) return;
  resultCard.style.display = 'block';

  setTimeout(() => resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  /* — Meta row — */
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const stdRef  = BRICK_TYPE_STANDARDS[values.brickType] || 'IS 1077';

  document.getElementById('resultMeta').innerHTML = `
    <div class="meta-item">
      <div class="meta-label">Material</div>
      <div class="meta-value">Brick</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Brick Type</div>
      <div class="meta-value">${values.brickType}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">IS Class</div>
      <div class="meta-value">${brickClass}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Standard</div>
      <div class="meta-value">${stdRef}</div>
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
  const scoreNumEl    = document.getElementById('scoreNum');
  const scoreArc      = document.getElementById('scoreArc');
  const circumference = 201; /* 2π × 32 ≈ 201 */

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
   Called by the "Evaluate Quality" button inside the brick form.
   Steps mirror evaluateAggregate() and evaluateSteel() exactly.
   ---------------------------------------------------------------- */
function evaluateBrick() {
  /* Step 1: Read & validate inputs */
  const values = readBrickInputs();
  if (!values) return;

  /* Step 2: Evaluate each parameter individually */
  const paramResults = Object.keys(BRICK_CRITERIA).map(key =>
    evaluateBrickParameter(key, values[key])
  );

  /* Step 3: Classify IS brick grade */
  const brickClass = classifyBrickGrade(values);

  /* Step 4: Compute weighted score and quality band */
  const scoreData = computeBrickScore(paramResults);

  /* Step 5: Generate context-aware recommendation */
  const recommendation = generateBrickRecommendation(
    scoreData.quality,
    paramResults,
    values,
    brickClass
  );

  /* Step 6: Render all results into the shared result card */
  renderBrickResult(values, paramResults, scoreData, recommendation, brickClass);
  renderSamplePhoto('brick_');

  captureEvalPayload(
    { score: scoreData.score, quality: scoreData.quality, paramResults },
    'Brick',
    values.brickType,
    'brick_'
  );
}

/* ----------------------------------------------------------------
   SECTION 11: UTILITY / RESET FUNCTIONS
   ---------------------------------------------------------------- */

/* Clear brick form fields and strip validation states */
function resetBrickForm() {
  const typeEl = document.getElementById('brick_type');
  if (typeEl) { typeEl.value = ''; typeEl.classList.remove('invalid'); }

  Object.keys(BRICK_CRITERIA).forEach(key => {
    const el = document.getElementById(`brick_${key}`);
    if (el) { el.value = ''; el.classList.remove('invalid'); }
  });

  /* Hide result card */
  const resultCard = document.getElementById('resultCard');
  if (resultCard) resultCard.style.display = 'none';

  /* Reset score ring to neutral state */
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
  clearImageUpload('brick_');
  const rp = document.getElementById('resultPhotoContent');
  if (rp) rp.innerHTML = '';
}

/* Called by main.js MODULE_REGISTRY dispatcher when 'brick' is selected */
function loadBrickModule() {
  renderBrickForm();
}