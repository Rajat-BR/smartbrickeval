/* ================================================================
   SCORING ENGINE — scoring.js
   Smart C&D Material Quality Evaluation System

   Responsibilities:
     - Centralised weighted score calculation
     - Score-to-quality band mapping
     - Generic parameter evaluator (replaces per-module duplicates)
     - Module-context-aware note formatter
     - Score ring animation (replaces per-module duplicates)
     - Result card population (replaces per-module duplicates)
     - Recommendation box theming helper
     - Parameter table row builder

   Architectural contract:
     This file is loaded after utils.js and before any module file.
     It assumes the following globals from utils.js are available:
       getEl, setHTML, setText, showEl, hideEl, scrollToEl,
       fmtNum, capitalise, getTodayFormatted,
       QUALITY_THRESHOLDS, scoreToQuality,
       qualityToArcColor, qualityToBorderColor, qualityToBgColor,
       statusToClass, statusToLabel,
       animateScoreRing, resetScoreRing, resetResultCard

     Module files (brick.js, aggregate.js, steel.js) call the
     functions in this file instead of implementing scoring
     and rendering locally.

   Load order in index.html:
     utils.js → scoring.js → renderer.js → brick.js → aggregate.js
               → steel.js → main.js
   ================================================================ */


/* ================================================================
   SECTION 1: WEIGHTED SCORE CALCULATOR
   ----------------------------------------------------------------
   Single implementation shared by all three material modules.
   Replaces:
     computeAggregateScore()  in aggregate.js   (Section 5)
     computeSteelScore()      in steel.js        (Section 7)
     (and the equivalent forthcoming brick scorer)

   Input contract:
     paramResults  — Array of result objects, each with:
                       { points: number }
     criteriaObj   — The module's CRITERIA constant (e.g. AGGREGATE_CRITERIA),
                     where each entry has:
                       { weight: number }

   Returns:
     { score: number, quality: 'GOOD'|'AVERAGE'|'POOR' }
       score   — integer in [0, 100]
       quality — band derived from QUALITY_THRESHOLDS in utils.js
   ================================================================ */

/**
 * computeScore(paramResults, criteriaObj)
 * Calculates the weighted percentage score from evaluated parameter
 * results and returns both the numeric score and quality band.
 *
 * @param  {Array<{points: number}>} paramResults
 * @param  {Object}                  criteriaObj   — CRITERIA constant
 * @returns {{ score: number, quality: string }}
 */
function computeScore(paramResults, criteriaObj) {
  const totalEarned = paramResults.reduce((sum, r) => sum + r.points, 0);
  const maxPossible = Object.values(criteriaObj).reduce((s, c) => s + c.weight, 0);

  /* Guard against zero-weight criteria objects */
  const score = maxPossible > 0
    ? Math.round((totalEarned / maxPossible) * 100)
    : 0;

  return {
    score,
    quality: scoreToQuality(score)   /* delegates to utils.js QUALITY_THRESHOLDS */
  };
}


/* ================================================================
   SECTION 2: GENERIC PARAMETER EVALUATOR
   ----------------------------------------------------------------
   Single implementation that replaces three near-identical functions:
     evaluateAggregateParameter()  in aggregate.js  (Section 4)
     evaluateSteelParameter()      in steel.js       (Section 6)
     (and the equivalent forthcoming brick parameter evaluator)

   Each module called identical branching logic differing only in
   the wording of the `note` string. This function centralises the
   branching; modules that need custom note wording pass an optional
   `noteOverrides` object (see Section 3 below).

   Parameter cfg schema (identical across all three modules):
     cfg.label          — display name string
     cfg.unit           — measurement unit string
     cfg.weight         — scoring weight (integer)
     cfg.good           — threshold for PASS (numeric)
     cfg.avg            — threshold for WARN / marginal (numeric)
     cfg.higherIsBetter — true  → higher value is better
                          false → lower value is better

   Returns the standard result object consumed by all downstream
   renderers and recommendation generators:
     { key, label, unit, value, status, points, note, cfg }
   ================================================================ */

/**
 * evaluateParam(key, value, cfg, noteOverrides)
 * Evaluates a single numeric parameter against its criteria thresholds
 * and returns a standardised result object.
 *
 * @param  {string}  key           — criteria key (e.g. 'crushingValue')
 * @param  {number}  value         — validated numeric input
 * @param  {Object}  cfg           — single parameter entry from a CRITERIA object
 * @param  {Object}  [noteOverrides] — optional { pass, warn, fail } functions
 *                                    each receiving (value, cfg) → string
 *                                    Override only the notes you need; omitted
 *                                    levels fall back to default phrasing.
 * @returns {{ key, label, unit, value, status, points, note, cfg }}
 */
function evaluateParam(key, value, cfg, noteOverrides) {
  let status, points, note;
  const no = noteOverrides || {};

  if (cfg.higherIsBetter) {
    /* ---- Higher value = better (strength, elongation, bulk density) ---- */
    if (value >= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = no.pass
        ? no.pass(value, cfg)
        : `${cfg.label} of ${fmtNum(value)} ${cfg.unit} meets the good threshold (≥ ${cfg.good} ${cfg.unit}).`;

    } else if (value >= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = no.warn
        ? no.warn(value, cfg)
        : `${cfg.label} of ${fmtNum(value)} ${cfg.unit} is borderline — acceptable but below ideal (${cfg.avg}–${cfg.good} ${cfg.unit}).`;

    } else {
      status = 'fail';
      points = 0;
      note   = no.fail
        ? no.fail(value, cfg)
        : `${cfg.label} of ${fmtNum(value)} ${cfg.unit} is below the minimum acceptable threshold (< ${cfg.avg} ${cfg.unit}).`;
    }

  } else {
    /* ---- Lower value = better (absorption, tolerance, crushing value) ---- */
    if (value <= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = no.pass
        ? no.pass(value, cfg)
        : `${cfg.label} of ${fmtNum(value)} ${cfg.unit} is within the good range (≤ ${cfg.good} ${cfg.unit}).`;

    } else if (value <= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = no.warn
        ? no.warn(value, cfg)
        : `${cfg.label} of ${fmtNum(value)} ${cfg.unit} is marginal — usable but above ideal (${cfg.good}–${cfg.avg} ${cfg.unit}).`;

    } else {
      status = 'fail';
      points = 0;
      note   = no.fail
        ? no.fail(value, cfg)
        : `${cfg.label} of ${fmtNum(value)} ${cfg.unit} exceeds the permissible limit (> ${cfg.avg} ${cfg.unit}).`;
    }
  }

  return { key, label: cfg.label, unit: cfg.unit, value, status, points, note, cfg };
}


/* ================================================================
   SECTION 3: BATCH EVALUATOR
   ----------------------------------------------------------------
   Convenience wrapper: evaluates all parameters in a CRITERIA
   object in one call. Replaces the repeated pattern:

     Object.keys(SOME_CRITERIA).map(key =>
       evaluateSomeMaterialParameter(key, values[key])
     );

   Usage:
     const paramResults = evaluateAllParams(AGGREGATE_CRITERIA, values);
     const paramResults = evaluateAllParams(STEEL_CRITERIA, values, STEEL_NOTE_OVERRIDES);
   ================================================================ */

/**
 * evaluateAllParams(criteriaObj, values, noteOverrides)
 * Evaluates every parameter in criteriaObj against the corresponding
 * value in the values map and returns the full results array.
 *
 * @param  {Object} criteriaObj    — a full CRITERIA constant (AGGREGATE_CRITERIA etc.)
 * @param  {Object} values         — map of key → parsed numeric value
 * @param  {Object} [noteOverrides] — map of key → { pass?, warn?, fail? } overrides
 *                                    e.g. { yieldStrength: { warn: (v,c) => '...' } }
 * @returns {Array<{key, label, unit, value, status, points, note, cfg}>}
 */
function evaluateAllParams(criteriaObj, values, noteOverrides) {
  const overrides = noteOverrides || {};
  return Object.keys(criteriaObj).map(key =>
    evaluateParam(key, values[key], criteriaObj[key], overrides[key])
  );
}


/* ================================================================
   SECTION 4: RESULT EXTRACTION HELPERS
   ----------------------------------------------------------------
   Small utilities consumed by both the scoring engine above and
   the recommendation generators in each module.

   All three modules contained identical patterns like:
     const failKeys = paramResults.filter(r => r.status === 'fail').map(r => r.key);
     const warnKeys = paramResults.filter(r => r.status === 'warn').map(r => r.key);
   which are now replaced by the functions below.
   ================================================================ */

/**
 * getFailKeys(paramResults)
 * Returns an array of parameter keys whose status is 'fail'.
 *
 * @param  {Array} paramResults
 * @returns {string[]}
 */
function getFailKeys(paramResults) {
  return paramResults.filter(r => r.status === 'fail').map(r => r.key);
}

/**
 * getWarnKeys(paramResults)
 * Returns an array of parameter keys whose status is 'warn'.
 *
 * @param  {Array} paramResults
 * @returns {string[]}
 */
function getWarnKeys(paramResults) {
  return paramResults.filter(r => r.status === 'warn').map(r => r.key);
}

/**
 * getPassKeys(paramResults)
 * Returns an array of parameter keys whose status is 'pass'.
 *
 * @param  {Array} paramResults
 * @returns {string[]}
 */
function getPassKeys(paramResults) {
  return paramResults.filter(r => r.status === 'pass').map(r => r.key);
}

/**
 * hasFailKey(paramResults, key)
 * Returns true if the given key has a 'fail' status in paramResults.
 * Convenience predicate used by recommendation generators.
 *
 * @param  {Array}  paramResults
 * @param  {string} key
 * @returns {boolean}
 */
function hasFailKey(paramResults, key) {
  return paramResults.some(r => r.key === key && r.status === 'fail');
}

/**
 * hasWarnKey(paramResults, key)
 * Returns true if the given key has a 'warn' status in paramResults.
 *
 * @param  {Array}  paramResults
 * @param  {string} key
 * @returns {boolean}
 */
function hasWarnKey(paramResults, key) {
  return paramResults.some(r => r.key === key && r.status === 'warn');
}


/* ================================================================
   SECTION 5: RESULT CARD RENDERER
   ----------------------------------------------------------------
   Populates the shared #resultCard in index.html from a normalised
   result payload. Replaces three near-identical render functions:
     renderAggregateResult()  in aggregate.js  (Section 7)
     renderSteelResult()      in steel.js       (Section 9)
     (and the equivalent forthcoming brick renderer)

   Each module now calls renderResult(payload) after building its
   payload object, rather than repeating 80+ lines of DOM manipulation.

   Payload schema:
   {
     metaItems:      Array<{ label: string, value: string }>
     quality:        'GOOD' | 'AVERAGE' | 'POOR'
     score:          number  (integer 0–100)
     recommendation: string  (multi-line text)
     paramResults:   Array of evaluateParam() result objects
   }
   ================================================================ */

/**
 * renderResult(payload)
 * Populates the shared result card from a standardised payload object
 * and makes the card visible. Animates the score ring on reveal.
 *
 * @param {Object} payload — see schema above
 */
function renderResult(payload) {
  const { metaItems, quality, score, recommendation, paramResults } = payload;

  /* 1. Show the result card */
  showEl('resultCard');
  scrollToEl('resultCard', 100);

  /* 2. Meta row */
  setHTML('resultMeta', _buildMetaRowHTML(metaItems));

  /* 3. Quality badge */
  const badge = getEl('qualityBadge');
  if (badge) {
    badge.textContent = quality;
    badge.className   = 'quality-badge ' + quality.toLowerCase();
  }

  /* 4. Score ring animation — delegates to utils.js */
  animateScoreRing(score, quality);

  /* 5. Recommendation box */
  setText('recommendationText', recommendation);
  _styleRecommendationBox(quality);

  /* 6. Parameter analysis list */
  setHTML('reasonsList', _buildReasonsHTML(paramResults));

  /* 7. Parameter summary table */
  setHTML('paramTableBody', _buildTableBodyHTML(paramResults));
}


/* ================================================================
   SECTION 6: PRIVATE RENDERING HELPERS
   ----------------------------------------------------------------
   Internal helpers used only by renderResult(). Prefixed with _
   to signal they are not part of the public API.
   ================================================================ */

/**
 * _buildMetaRowHTML(metaItems)
 * Converts an array of { label, value } pairs into the HTML for
 * the result card meta strip.
 *
 * @param  {Array<{label: string, value: string}>} metaItems
 * @returns {string}
 */
function _buildMetaRowHTML(metaItems) {
  return metaItems.map(item => `
    <div class="meta-item">
      <div class="meta-label">${item.label}</div>
      <div class="meta-value">${item.value}</div>
    </div>
  `).join('');
}

/**
 * _styleRecommendationBox(quality)
 * Applies quality-band border and background colours to the
 * recommendation box via inline styles.
 *
 * @param {'GOOD'|'AVERAGE'|'POOR'} quality
 */
function _styleRecommendationBox(quality) {
  const recBox = getEl('recommendationBox');
  if (!recBox) return;
  recBox.style.borderColor = qualityToBorderColor(quality);
  recBox.style.background  = qualityToBgColor(quality);
}

/**
 * _buildReasonsHTML(paramResults)
 * Builds the <li> items for the detailed analysis reasons list.
 * Each item is coloured by its status class.
 *
 * @param  {Array} paramResults
 * @returns {string}
 */
function _buildReasonsHTML(paramResults) {
  return paramResults.map(r => `
    <li class="${r.status}">
      <strong>${r.label}:</strong> ${r.note}
    </li>
  `).join('');
}

/**
 * _buildTableBodyHTML(paramResults)
 * Builds the <tr> rows for the parameter summary table.
 * Uses statusToClass() and statusToLabel() from utils.js for
 * consistent badge styling.
 *
 * @param  {Array} paramResults
 * @returns {string}
 */
function _buildTableBodyHTML(paramResults) {
  return paramResults.map(r => `
    <tr>
      <td><strong>${r.label}</strong></td>
      <td style="font-family:var(--font-mono); font-size:13px;">
        ${fmtNum(r.value)} ${r.unit}
      </td>
      <td style="font-size:12.5px; color:var(--text-muted);">
        ${r.cfg.standard}
      </td>
      <td>
        <span class="${statusToClass(r.status)}">${statusToLabel(r.status)}</span>
      </td>
    </tr>
  `).join('');
}


/* ================================================================
   SECTION 7: MODULE RESET HELPER
   ----------------------------------------------------------------
   Centralises the reset pattern repeated in resetAggregateForm()
   and resetSteelForm(). Modules call this instead of manually
   clearing each DOM element.

   Replaces the identical blocks at the bottom of both modules:
     resultCard.style.display = 'none';
     scoreArc style / dashoffset reset;
     scoreNum.textContent = '—';
     badge reset;
   ================================================================ */

/**
 * resetModuleResult(fieldIds)
 * Hides the result card, resets the score ring, badge, and clears
 * invalid styling from a list of field element IDs.
 * Called by each module's own resetXxxForm() function.
 *
 * @param {string[]} fieldIds — IDs of all form fields to clear and
 *                              un-mark-as-invalid in the current module
 */
function resetModuleResult(fieldIds) {
  /* Hide result card and reset all its dynamic content */
  resetResultCard();   /* defined in utils.js — covers badge, ring, text, table */

  /* Clear field values and remove validation error states */
  if (Array.isArray(fieldIds) && fieldIds.length > 0) {
    fieldIds.forEach(id => {
      const el = getEl(id);
      if (!el) return;
      el.value = '';
      el.classList.remove('invalid');
    });
  }
}


/* ================================================================
   SECTION 8: STANDARD NOTE OVERRIDES
   ----------------------------------------------------------------
   Pre-built note override sets for steel.js parameters whose note
   wording differs from the generic phrasing in evaluateParam().

   The generic evaluateParam() produces neutral, unit-agnostic notes.
   These overrides re-introduce the domain-specific language present
   in the original evaluateSteelParameter() without duplicating the
   branching logic that surrounded it.

   Usage in steel.js:
     const paramResults = evaluateAllParams(
       STEEL_CRITERIA, values, STEEL_NOTE_OVERRIDES
     );

   To add overrides for aggregate or brick, follow the same pattern:
   create a MATERIAL_NOTE_OVERRIDES object and pass it as the third
   argument to evaluateAllParams().
   ================================================================ */

/**
 * STEEL_NOTE_OVERRIDES
 * Per-key note override functions for steel parameters.
 * Only keys where the wording meaningfully differs from the generic
 * template are included — unspecified keys use the generic notes.
 *
 * @type {Object.<string, { pass?: Function, warn?: Function, fail?: Function }>}
 */
const STEEL_NOTE_OVERRIDES = {

  yieldStrength: {
    warn: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)} ${cfg.unit} meets only Fe415 level — borderline for structural use (${cfg.avg}–${cfg.good} ${cfg.unit}).`,
    fail: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)} ${cfg.unit} is below the minimum Fe415 requirement (< ${cfg.avg} ${cfg.unit}). Structurally inadequate.`
  },

  tensileStrength: {
    warn: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)} ${cfg.unit} satisfies Fe415 UTS but falls short of Fe500 (${cfg.avg}–${cfg.good} ${cfg.unit}). Verify tensile-to-yield ratio.`,
    fail: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)} ${cfg.unit} is below the Fe415 minimum UTS of ${cfg.avg} ${cfg.unit}. Reject — inadequate fracture resistance.`
  },

  elongation: {
    warn: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is within Fe550 minimum but below Fe500 target. Ductility is marginal — caution in seismic zones (${cfg.avg}–${cfg.good}${cfg.unit}).`,
    fail: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is below the minimum Fe550 elongation floor of ${cfg.avg}${cfg.unit}. Brittle fracture risk — do not use in any structural application.`
  },

  diameterTolerance: {
    pass: (v, cfg) =>
      `${cfg.label} deviation of ${fmtNum(v)} ${cfg.unit} is within the tight IS 1786 tolerance (≤ ${cfg.good} ${cfg.unit}). Bond strength with concrete will be adequate.`,
    warn: (v, cfg) =>
      `${cfg.label} deviation of ${fmtNum(v)} ${cfg.unit} is marginal — within permissible limits but may affect bond and design section assumptions (${cfg.good}–${cfg.avg} ${cfg.unit}).`,
    fail: (v, cfg) =>
      `${cfg.label} deviation of ${fmtNum(v)} ${cfg.unit} exceeds the IS 1786 tolerance of ${cfg.avg} ${cfg.unit}. Excessive deviation compromises bond with concrete. Reject this batch.`
  },

  weightPerMeter: {
    pass: (v, cfg) =>
      `Weight-per-metre deviation of ${fmtNum(v)}% is within the IS 1786 ±3% tolerance, confirming consistent cross-section along the bar length.`,
    warn: (v, cfg) =>
      `Weight-per-metre deviation of ${fmtNum(v)}% is marginal — within ±5% permissible range but indicates minor cross-section inconsistency (${cfg.good}–${cfg.avg}%).`,
    fail: (v, cfg) =>
      `Weight-per-metre deviation of ${fmtNum(v)}% exceeds the IS 1786 ±5% limit. Significant cross-sectional variation detected — structural capacity assumptions are unreliable.`
  }

};


/* ================================================================
   SECTION 9: AGGREGATE NOTE OVERRIDES
   ----------------------------------------------------------------
   Pre-built note overrides for aggregate.js parameters where the
   original evaluateAggregateParameter() used slightly different
   phrasing from the generic template — specifically the unit
   spacing in 'lower is better' notes (no space before unit)
   and the 'Quality concern.' / 'Reject or restrict use.' suffixes.

   Usage in aggregate.js:
     const paramResults = evaluateAllParams(
       AGGREGATE_CRITERIA, values, AGGREGATE_NOTE_OVERRIDES
     );
   ================================================================ */

/**
 * AGGREGATE_NOTE_OVERRIDES
 * Per-key note override functions for aggregate parameters.
 *
 * @type {Object.<string, { pass?: Function, warn?: Function, fail?: Function }>}
 */
const AGGREGATE_NOTE_OVERRIDES = {

  specificGravity: {
    fail: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)} ${cfg.unit} is below the acceptable threshold (< ${cfg.avg} ${cfg.unit}). Quality concern — material may be too porous or lightweight for structural use.`
  },

  waterAbsorption: {
    pass: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is within good limits (≤ ${cfg.good}${cfg.unit}).`,
    warn: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is average — usable but higher than ideal (${cfg.good}–${cfg.avg}${cfg.unit}).`,
    fail: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} exceeds the acceptable limit (> ${cfg.avg}${cfg.unit}). Reject or restrict use.`
  },

  crushingValue: {
    pass: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is within good limits (≤ ${cfg.good}${cfg.unit}).`,
    warn: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is average — usable but higher than ideal (${cfg.good}–${cfg.avg}${cfg.unit}).`,
    fail: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} exceeds the acceptable limit (> ${cfg.avg}${cfg.unit}). Reject or restrict use.`
  },

  impactValue: {
    pass: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is within good limits (≤ ${cfg.good}${cfg.unit}).`,
    warn: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is average — usable but higher than ideal (${cfg.good}–${cfg.avg}${cfg.unit}).`,
    fail: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} exceeds the acceptable limit (> ${cfg.avg}${cfg.unit}). Reject or restrict use.`
  },

  flakinessIndex: {
    pass: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is within good limits (≤ ${cfg.good}${cfg.unit}).`,
    warn: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} is average — usable but higher than ideal (${cfg.good}–${cfg.avg}${cfg.unit}).`,
    fail: (v, cfg) =>
      `${cfg.label} of ${fmtNum(v)}${cfg.unit} exceeds the acceptable limit (> ${cfg.avg}${cfg.unit}). Reject or restrict use.`
  }

  /* bulkDensity uses the generic higherIsBetter notes — no override needed */

};


/* ================================================================
   SECTION 10: PUBLIC API SUMMARY
   ----------------------------------------------------------------
   All symbols exported to the global scope (plain globals —
   no module system used, matching the rest of the codebase).

   Core scoring:
     computeScore(paramResults, criteriaObj)
       → { score: number, quality: string }

   Parameter evaluation:
     evaluateParam(key, value, cfg, noteOverrides?)
       → { key, label, unit, value, status, points, note, cfg }

     evaluateAllParams(criteriaObj, values, noteOverrides?)
       → Array of evaluateParam() result objects

   Result extraction:
     getFailKeys(paramResults)   → string[]
     getWarnKeys(paramResults)   → string[]
     getPassKeys(paramResults)   → string[]
     hasFailKey(paramResults, key) → boolean
     hasWarnKey(paramResults, key) → boolean

   Result card rendering:
     renderResult(payload)
       payload: { metaItems, quality, score, recommendation, paramResults }

   Module reset:
     resetModuleResult(fieldIds)

   Note override sets (pass to evaluateAllParams as 3rd argument):
     STEEL_NOTE_OVERRIDES
     AGGREGATE_NOTE_OVERRIDES

   Private (not for direct use outside this file):
     _buildMetaRowHTML(metaItems)
     _styleRecommendationBox(quality)
     _buildReasonsHTML(paramResults)
     _buildTableBodyHTML(paramResults)
   ================================================================ */