/* ================================================================
   UTILITIES — utils.js
   Smart C&D Material Quality Evaluation System

   Responsibilities:
     - DOM query helpers
     - Field validation helpers
     - String / number formatting
     - Date formatting
     - Status / quality badge helpers
     - Score colour mapping
     - Module-agnostic shared constants

   Usage:
     All functions are plain globals — accessible by every module
     and by renderer.js without any import/export syntax.
     Load order in HTML: utils.js → scoring.js → renderer.js → modules
   ================================================================ */


/* ================================================================
   SECTION 1: DOM HELPERS
   Thin wrappers around getElementById for consistent null-safety.
   ================================================================ */

/**
 * getEl(id)
 * Returns the element with the given id, or null if absent.
 * Prefer this over raw getElementById for one-liner safety.
 *
 * @param  {string} id
 * @returns {HTMLElement|null}
 */
function getEl(id) {
  return document.getElementById(id) || null;
}

/**
 * setHTML(id, html)
 * Sets innerHTML on an element by id. No-ops silently if absent.
 *
 * @param {string} id
 * @param {string} html
 */
function setHTML(id, html) {
  const el = getEl(id);
  if (el) el.innerHTML = html;
}

/**
 * setText(id, text)
 * Sets textContent on an element by id. No-ops silently if absent.
 *
 * @param {string} id
 * @param {string} text
 */
function setText(id, text) {
  const el = getEl(id);
  if (el) el.textContent = text;
}

/**
 * showEl(id)
 * Sets display to 'block' for element with given id.
 *
 * @param {string} id
 */
function showEl(id) {
  const el = getEl(id);
  if (el) el.style.display = 'block';
}

/**
 * hideEl(id)
 * Sets display to 'none' for element with given id.
 *
 * @param {string} id
 */
function hideEl(id) {
  const el = getEl(id);
  if (el) el.style.display = 'none';
}

/**
 * scrollToEl(id, delay)
 * Smooth-scrolls to the top of an element.
 * Optional delay (ms) defers the scroll by one render cycle.
 *
 * @param {string} id
 * @param {number} [delay=100]
 */
function scrollToEl(id, delay) {
  const el = getEl(id);
  if (!el) return;
  setTimeout(
    () => el.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    delay !== undefined ? delay : 100
  );
}

/**
 * setStyle(id, prop, value)
 * Sets a single inline style property on an element by id.
 *
 * @param {string} id
 * @param {string} prop   — camelCase CSS property name
 * @param {string} value
 */
function setStyle(id, prop, value) {
  const el = getEl(id);
  if (el) el.style[prop] = value;
}


/* ================================================================
   SECTION 2: FIELD VALIDATION HELPERS
   Work directly on HTMLElement references (not IDs) so modules
   can pass elements they've already queried.
   ================================================================ */

/**
 * markInvalid(el)
 * Adds the CSS 'invalid' class to a form element.
 *
 * @param {HTMLElement} el
 */
function markInvalid(el) {
  if (el) el.classList.add('invalid');
}

/**
 * clearInvalid(el)
 * Removes the CSS 'invalid' class from a form element.
 *
 * @param {HTMLElement} el
 */
function clearInvalid(el) {
  if (el) el.classList.remove('invalid');
}

/**
 * validateSelectField(id, labelText, errorsArray)
 * Validates that a <select> element has a non-empty value.
 * Marks the element invalid and pushes to errorsArray on failure.
 * Returns the string value on success, null on failure.
 *
 * @param {string}   id          — element id
 * @param {string}   labelText   — human-readable label for error message
 * @param {string[]} errorsArray — array to push error strings into
 * @returns {string|null}
 */
function validateSelectField(id, labelText, errorsArray) {
  const el = getEl(id);
  if (!el || !el.value.trim()) {
    markInvalid(el);
    errorsArray.push(`${labelText} is required.`);
    return null;
  }
  clearInvalid(el);
  return el.value.trim();
}

/**
 * validateNumberField(id, labelText, errorsArray)
 * Validates that a number <input> has a parseable numeric value.
 * Marks the element invalid and pushes to errorsArray on failure.
 * Returns the parsed float on success, null on failure.
 *
 * @param {string}   id
 * @param {string}   labelText
 * @param {string[]} errorsArray
 * @returns {number|null}
 */
function validateNumberField(id, labelText, errorsArray) {
  const el  = getEl(id);
  const raw = el ? el.value.trim() : '';
  if (raw === '' || isNaN(parseFloat(raw))) {
    markInvalid(el);
    errorsArray.push(`${labelText} is required.`);
    return null;
  }
  clearInvalid(el);
  return parseFloat(raw);
}

/**
 * showValidationAlert(errorsArray)
 * If errorsArray is non-empty, shows a formatted alert and returns true.
 * Returns false if no errors (caller may proceed).
 *
 * @param {string[]} errorsArray
 * @returns {boolean}  true = errors present (block execution)
 */
function showValidationAlert(errorsArray) {
  if (errorsArray.length === 0) return false;
  alert('Please fill in all required fields:\n\n• ' + errorsArray.join('\n• '));
  return true;
}

/**
 * clearFormFields(idList)
 * Resets the value of each element in idList and removes 'invalid' class.
 * Safe to call with IDs that may not exist in the current DOM.
 *
 * @param {string[]} idList
 */
function clearFormFields(idList) {
  idList.forEach(id => {
    const el = getEl(id);
    if (!el) return;
    el.value = '';
    clearInvalid(el);
  });
}


/* ================================================================
   SECTION 3: NUMBER & STRING FORMATTING
   ================================================================ */

/**
 * fmtNum(value, decimals)
 * Formats a number to a fixed decimal count, stripping trailing zeros.
 * e.g. fmtNum(2.50, 2) → '2.5'   fmtNum(2.00, 2) → '2'
 *
 * @param {number} value
 * @param {number} [decimals=2]
 * @returns {string}
 */
function fmtNum(value, decimals) {
  const d = decimals !== undefined ? decimals : 2;
  return parseFloat(value.toFixed(d)).toString();
}

/**
 * fmtValue(value, unit)
 * Combines a formatted value with its unit string.
 * e.g. fmtValue(2.65, 'g/cm³') → '2.65 g/cm³'
 *
 * @param {number} value
 * @param {string} unit
 * @returns {string}
 */
function fmtValue(value, unit) {
  return `${fmtNum(value)} ${unit}`.trim();
}

/**
 * capitalise(str)
 * Capitalises the first character of a string.
 *
 * @param {string} str
 * @returns {string}
 */
function capitalise(str) {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * truncate(str, maxLen)
 * Truncates a string to maxLen characters, appending '…' if clipped.
 *
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}


/* ================================================================
   SECTION 4: DATE FORMATTING
   ================================================================ */

/**
 * getTodayFormatted()
 * Returns today's date formatted as '05 Jan 2025' in the en-IN locale.
 * Used in the result card meta row by all modules.
 *
 * @returns {string}
 */
function getTodayFormatted() {
  return new Date().toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric'
  });
}


/* ================================================================
   SECTION 5: QUALITY / STATUS CONSTANTS & HELPERS
   ================================================================ */

/**
 * QUALITY_THRESHOLDS
 * Shared score-to-quality band definitions used by all scoring engines.
 * Modules reference these instead of hardcoding magic numbers.
 *
 *   score >= GOOD  → 'GOOD'
 *   score >= AVERAGE → 'AVERAGE'
 *   else           → 'POOR'
 */
const QUALITY_THRESHOLDS = {
  GOOD:    70,
  AVERAGE: 45
};

/**
 * scoreToQuality(score)
 * Maps a numeric score (0–100) to a quality band string.
 *
 * @param  {number} score
 * @returns {'GOOD'|'AVERAGE'|'POOR'}
 */
function scoreToQuality(score) {
  if (score >= QUALITY_THRESHOLDS.GOOD)    return 'GOOD';
  if (score >= QUALITY_THRESHOLDS.AVERAGE) return 'AVERAGE';
  return 'POOR';
}

/**
 * qualityToArcColor(quality)
 * Maps a quality band string to the matching CSS variable for the
 * score ring arc stroke — used by renderer.js and any module that
 * draws the ring directly.
 *
 * @param  {'GOOD'|'AVERAGE'|'POOR'} quality
 * @returns {string}  CSS variable reference string
 */
function qualityToArcColor(quality) {
  if (quality === 'GOOD')    return 'var(--good)';
  if (quality === 'AVERAGE') return 'var(--avg)';
  return 'var(--poor)';
}

/**
 * qualityToBorderColor(quality)
 * Maps quality band to the matching CSS border-color variable.
 *
 * @param  {'GOOD'|'AVERAGE'|'POOR'} quality
 * @returns {string}
 */
function qualityToBorderColor(quality) {
  if (quality === 'GOOD')    return 'var(--good-border)';
  if (quality === 'AVERAGE') return 'var(--avg-border)';
  return 'var(--poor-border)';
}

/**
 * qualityToBgColor(quality)
 * Maps quality band to the matching CSS background-color variable.
 *
 * @param  {'GOOD'|'AVERAGE'|'POOR'} quality
 * @returns {string}
 */
function qualityToBgColor(quality) {
  if (quality === 'GOOD')    return 'var(--good-bg)';
  if (quality === 'AVERAGE') return 'var(--avg-bg)';
  return 'var(--poor-bg)';
}

/**
 * statusToClass(status)
 * Maps a parameter result status to the corresponding CSS class name
 * used in the parameter summary table status column.
 * Matches the .status-pass / .status-warn / .status-fail class names
 * defined in style.css.
 *
 * @param  {'pass'|'warn'|'fail'} status
 * @returns {string}
 */
function statusToClass(status) {
  if (status === 'pass') return 'status-pass';
  if (status === 'warn') return 'status-warn';
  return 'status-fail';
}

/**
 * statusToLabel(status)
 * Maps a parameter result status to the display label shown inside
 * the status badge in the parameter summary table.
 *
 * @param  {'pass'|'warn'|'fail'} status
 * @returns {string}
 */
function statusToLabel(status) {
  if (status === 'pass') return 'PASS';
  if (status === 'warn') return 'MARGINAL';
  return 'FAIL';
}


/* ================================================================
   SECTION 6: WEIGHTED SCORING ENGINE
   Generic weighted-sum scorer shared by all material modules.
   Each module passes its criteria object and evaluated results.
   ================================================================ */

/**
 * computeWeightedScore(paramResults, criteriaObj)
 * Calculates a 0–100 quality score from parameter results and
 * the criteria object that provided the weights.
 *
 * paramResults must be an array of objects each having:
 *   { points: number }   — points earned (0 to weight maximum)
 *
 * criteriaObj must be a map of key → { weight: number }
 *
 * @param {Array<{points: number}>} paramResults
 * @param {Object}                  criteriaObj
 * @returns {number}  Integer score in range [0, 100]
 */
function computeWeightedScore(paramResults, criteriaObj) {
  const totalEarned = paramResults.reduce((sum, r) => sum + r.points, 0);
  const maxPossible = Object.values(criteriaObj).reduce((s, c) => s + c.weight, 0);
  if (maxPossible === 0) return 0;
  return Math.round((totalEarned / maxPossible) * 100);
}

/**
 * evaluateParamGeneric(key, value, cfg)
 * Generic parameter evaluator shared by all three modules.
 * Handles both higherIsBetter: true and higherIsBetter: false criteria.
 *
 * Returns a standardised result object:
 *   { key, label, unit, value, status, points, note, cfg }
 *
 * This is the exact same logic that previously appeared identically
 * in evaluateAggregateParameter(), evaluateSteelParameter(), and
 * evaluateBrickParameter() — now centralised here.
 *
 * @param {string} key   — criteria key (e.g. 'compressiveStrength')
 * @param {number} value — parsed numeric input value
 * @param {Object} cfg   — single parameter config from a CRITERIA object
 * @returns {Object}
 */
function evaluateParamGeneric(key, value, cfg) {
  let status, points, note;

  if (cfg.higherIsBetter) {
    /* Higher value is better — e.g. strength, elongation, bulk density */
    if (value >= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = `${cfg.label} of ${fmtNum(value)} ${cfg.unit} meets the good threshold (≥ ${cfg.good} ${cfg.unit}).`;
    } else if (value >= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = `${cfg.label} of ${fmtNum(value)} ${cfg.unit} is borderline — acceptable but below ideal (${cfg.avg}–${cfg.good} ${cfg.unit}).`;
    } else {
      status = 'fail';
      points = 0;
      note   = `${cfg.label} of ${fmtNum(value)} ${cfg.unit} is below minimum acceptable threshold (< ${cfg.avg} ${cfg.unit}).`;
    }
  } else {
    /* Lower value is better — e.g. water absorption, tolerance, crushing value */
    if (value <= cfg.good) {
      status = 'pass';
      points = cfg.weight;
      note   = `${cfg.label} of ${fmtNum(value)} ${cfg.unit} is within the good range (≤ ${cfg.good} ${cfg.unit}).`;
    } else if (value <= cfg.avg) {
      status = 'warn';
      points = Math.round(cfg.weight * 0.55);
      note   = `${cfg.label} of ${fmtNum(value)} ${cfg.unit} is marginal — usable but above ideal (${cfg.good}–${cfg.avg} ${cfg.unit}).`;
    } else {
      status = 'fail';
      points = 0;
      note   = `${cfg.label} of ${fmtNum(value)} ${cfg.unit} exceeds permissible limit (> ${cfg.avg} ${cfg.unit}).`;
    }
  }

  return { key, label: cfg.label, unit: cfg.unit, value, status, points, note, cfg };
}


/* ================================================================
   SECTION 7: SCORE RING ANIMATION
   Centralised animation for the SVG score donut shared across
   all result renders. Previously duplicated in every module.
   ================================================================ */

/**
 * SCORE_RING_CIRCUMFERENCE
 * 2 × π × r where r = 32 (as defined in the SVG viewBox).
 * ≈ 201.06 — truncated to 201 to match the stroke-dasharray in HTML.
 *
 * @type {number}
 */
const SCORE_RING_CIRCUMFERENCE = 201;

/**
 * animateScoreRing(score, quality)
 * Animates the SVG arc in #scoreArc from empty to the score percentage,
 * colours the arc by quality band, and sets the #scoreNum text.
 * Must be called after the result card is visible in the DOM.
 *
 * @param {number}                  score   — integer 0–100
 * @param {'GOOD'|'AVERAGE'|'POOR'} quality
 */
function animateScoreRing(score, quality) {
  const scoreNumEl = getEl('scoreNum');
  const scoreArc   = getEl('scoreArc');
  if (!scoreNumEl || !scoreArc) return;

  /* Set display number */
  scoreNumEl.textContent = score;

  /* Stroke colour by quality */
  scoreArc.setAttribute('stroke', qualityToArcColor(quality));

  /* Calculate target dashoffset */
  const targetOffset = SCORE_RING_CIRCUMFERENCE - (score / 100) * SCORE_RING_CIRCUMFERENCE;

  /* Reset to empty, then animate to target on next two frames */
  scoreArc.style.transition = 'none';
  scoreArc.setAttribute('stroke-dashoffset', SCORE_RING_CIRCUMFERENCE);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scoreArc.style.transition = 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)';
      scoreArc.setAttribute('stroke-dashoffset', targetOffset);
    });
  });
}

/**
 * resetScoreRing()
 * Returns the score ring to its neutral (empty) state — used by
 * resetAll() in main.js and each module's individual reset function.
 */
function resetScoreRing() {
  const scoreArc = getEl('scoreArc');
  if (scoreArc) {
    scoreArc.style.transition = 'none';
    scoreArc.setAttribute('stroke-dashoffset', SCORE_RING_CIRCUMFERENCE);
    scoreArc.setAttribute('stroke', 'var(--accent)');
  }

  const scoreNum = getEl('scoreNum');
  if (scoreNum) scoreNum.textContent = '—';
}


/* ================================================================
   SECTION 8: RESULT CARD STATE HELPERS
   Shared reset utilities for the result card — used by main.js
   and every module's local reset function.
   ================================================================ */

/**
 * resetResultCard()
 * Hides the result card and wipes all its dynamic content back to
 * the neutral '—' state. Covers: badge, score ring, recommendation,
 * reasons list, parameter table, and meta strip.
 */
function resetResultCard() {
  hideEl('resultCard');

  /* Quality badge */
  const badge = getEl('qualityBadge');
  if (badge) { badge.textContent = '—'; badge.className = 'quality-badge'; }

  /* Score ring */
  resetScoreRing();

  /* Recommendation text */
  const recText = getEl('recommendationText');
  if (recText) recText.textContent = '—';

  /* Recommendation box inline styles */
  const recBox = getEl('recommendationBox');
  if (recBox) {
    recBox.style.borderColor = '';
    recBox.style.background  = '';
  }

  /* Reasons list */
  setHTML('reasonsList', '');

  /* Parameter table body */
  setHTML('paramTableBody', '');

  /* Meta strip */
  setHTML('resultMeta', '');
}


/* ================================================================
   SECTION 9: MISC / EXPORT AUDIT
   ================================================================ */

/*
 * Public surface summary — all functions available to module scripts:
 *
 * DOM Helpers:
 *   getEl(id), setHTML(id, html), setText(id, text)
 *   showEl(id), hideEl(id), scrollToEl(id, delay), setStyle(id, prop, val)
 *
 * Validation:
 *   markInvalid(el), clearInvalid(el)
 *   validateSelectField(id, label, errors)
 *   validateNumberField(id, label, errors)
 *   showValidationAlert(errors) → bool
 *   clearFormFields(idList)
 *
 * Formatting:
 *   fmtNum(value, decimals), fmtValue(value, unit)
 *   capitalise(str), truncate(str, maxLen)
 *   getTodayFormatted()
 *
 * Quality / Status Helpers:
 *   QUALITY_THRESHOLDS  { GOOD: 70, AVERAGE: 45 }
 *   scoreToQuality(score) → 'GOOD'|'AVERAGE'|'POOR'
 *   qualityToArcColor(quality), qualityToBorderColor(quality)
 *   qualityToBgColor(quality)
 *   statusToClass(status), statusToLabel(status)
 *
 * Scoring Engine:
 *   computeWeightedScore(paramResults, criteriaObj)
 *   evaluateParamGeneric(key, value, cfg)
 *
 * Score Ring:
 *   SCORE_RING_CIRCUMFERENCE  (201)
 *   animateScoreRing(score, quality)
 *   resetScoreRing()
 *
 * Result Card State:
 *   resetResultCard()
 */