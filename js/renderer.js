/* ================================================================
   RENDERER — renderer.js
   Smart C&D Material Quality Evaluation System

   Responsibilities:
     - Result card orchestration  (renderResult)
     - Meta strip rendering       (_renderMeta)
     - Quality badge rendering    (_renderQualityBadge)
     - Score ring animation       (_renderScoreRing)
     - Recommendation box         (_renderRecommendation)
     - Parameter reasons list     (_renderReasonsList)
     - Parameter summary table    (_renderParamTable)
     - Status badge HTML builder  (buildStatusBadgeHTML)
     - Form area lifecycle helper (showFormArea, clearFormArea)
     - Module-level result reset  (resetModuleUI)

   Architectural contract:
     Loaded after utils.js and scoring.js, before any module file.
     Assumes the following globals are already defined:
       From utils.js:
         getEl, setHTML, setText, showEl, hideEl, scrollToEl,
         fmtNum, getTodayFormatted,
         qualityToArcColor, qualityToBorderColor, qualityToBgColor,
         statusToClass, statusToLabel,
         SCORE_RING_CIRCUMFERENCE,
         animateScoreRing, resetScoreRing, resetResultCard
       From scoring.js:
         (no direct dependency — scoring.js calls renderResult from here)

   Load order in index.html:
     utils.js → scoring.js → renderer.js → brick.js
              → aggregate.js → steel.js → main.js

   Public API surface (no import/export — plain globals):
     renderResult(payload)
     buildStatusBadgeHTML(status)
     showFormArea()
     clearFormArea()
     resetModuleUI(fieldIds)

   Private helpers (prefixed _):
     _renderMeta(metaItems)
     _renderQualityBadge(quality)
     _renderScoreRing(score, quality)
     _renderRecommendation(recommendation, quality)
     _renderReasonsList(paramResults)
     _renderParamTable(paramResults)
   ================================================================ */


/* ================================================================
   SECTION 1: RESULT CARD ORCHESTRATOR
   ----------------------------------------------------------------
   renderResult(payload) is the single entry point called by every
   material module after evaluation is complete.

   It sequences all sub-renders in the correct DOM order, reveals
   the result card, and triggers the score ring animation.

   Payload schema — identical contract for brick, aggregate, steel:
   {
     metaItems:      Array<{ label: string, value: string }>
                     Ordered list of key/value pairs for the meta strip.
                     All three modules build this locally and pass it in,
                     so renderer.js never needs to know about material types.

     quality:        'GOOD' | 'AVERAGE' | 'POOR'
                     Derived from the weighted score via scoreToQuality()
                     in utils.js. Drives badge class, arc colour, and
                     recommendation box theming.

     score:          number  — integer in [0, 100]
                     The computed weighted quality score.

     recommendation: string
                     Pre-built multi-line recommendation text from the
                     module's own generator (generateXxxRecommendation).
                     Renderer never generates or transforms this text.

     paramResults:   Array of evaluateParam() result objects
                     Schema per item:
                       { key, label, unit, value, status, points, note, cfg }
                     Used to build both the reasons list and summary table.
   }
   ================================================================ */

/**
 * renderResult(payload)
 * Orchestrates the full result card render from a normalised payload.
 * Called by evaluateAggregate(), evaluateBrick(), evaluateSteel().
 *
 * @param {Object} payload — see schema above
 */
function renderResult(payload) {
  const { metaItems, quality, score, recommendation, paramResults } = payload;

  /* ---- 1. Reveal the result card first ---- */
  /* showEl() sets display:'block'; scrollToEl() smooth-scrolls after paint */
  showEl('resultCard');
  scrollToEl('resultCard', 100);

  /* ---- 2. Meta strip — material/date/standard context ---- */
  _renderMeta(metaItems);

  /* ---- 3. Quality badge — GOOD / AVERAGE / POOR ---- */
  _renderQualityBadge(quality);

  /* ---- 4. Score ring — animated SVG arc ---- */
  /* Deferred by one rAF cycle inside animateScoreRing (utils.js) */
  _renderScoreRing(score, quality);

  /* ---- 5. Recommendation box — text + quality-band theming ---- */
  _renderRecommendation(recommendation, quality);

  /* ---- 6. Parameter analysis reasons list ---- */
  _renderReasonsList(paramResults);

  /* ---- 7. Parameter summary table ---- */
  _renderParamTable(paramResults);
}


/* ================================================================
   SECTION 2: META STRIP RENDERER
   ----------------------------------------------------------------
   Populates #resultMeta with a row of labelled key/value chips.

   Each metaItem maps to a .meta-item div containing:
     .meta-label  — the field name (e.g. 'Material', 'Evaluated On')
     .meta-value  — the field content (e.g. 'Aggregate', '05 Jan 2025')

   Modules are responsible for building their metaItems array with
   the correct labels and values — renderer.js just stamps them out.
   This keeps material-specific knowledge (e.g. IS grade labels,
   nominal diameter) in the module that owns it.
   ================================================================ */

/**
 * _renderMeta(metaItems)
 * Injects the meta strip HTML into #resultMeta.
 *
 * @param {Array<{label: string, value: string}>} metaItems
 */
function _renderMeta(metaItems) {
  if (!Array.isArray(metaItems) || metaItems.length === 0) {
    setHTML('resultMeta', '');
    return;
  }

  const html = metaItems.map(item => `
    <div class="meta-item">
      <div class="meta-label">${item.label}</div>
      <div class="meta-value">${item.value}</div>
    </div>
  `).join('');

  setHTML('resultMeta', html);
}


/* ================================================================
   SECTION 3: QUALITY BADGE RENDERER
   ----------------------------------------------------------------
   Updates the #qualityBadge element with:
     - textContent set to the quality band string ('GOOD' etc.)
     - className rebuilt as 'quality-badge <quality.toLowerCase()>'
       which maps to .quality-badge.good / .average / .poor in CSS.

   The className is rebuilt from scratch (not appended) to prevent
   stale band classes from a previous evaluation persisting after
   a module switch.
   ================================================================ */

/**
 * _renderQualityBadge(quality)
 * Sets the quality badge text and CSS band class.
 *
 * @param {'GOOD'|'AVERAGE'|'POOR'} quality
 */
function _renderQualityBadge(quality) {
  const badge = getEl('qualityBadge');
  if (!badge) return;

  badge.textContent = quality;
  badge.className   = 'quality-badge ' + quality.toLowerCase();
}


/* ================================================================
   SECTION 4: SCORE RING RENDERER
   ----------------------------------------------------------------
   The score ring is an SVG circle in index.html:
     <circle id="scoreArc" … stroke-dasharray="201 201"
       stroke-dashoffset="201" transform="rotate(-90 40 40)"/>

   Circumference ≈ 2π × 32 ≈ 201 (truncated to match HTML attribute).
   A dashoffset of 201 = fully empty arc.
   A dashoffset of 0   = fully filled arc.

   Animation:
     1. Snap to 'none' transition + full dashoffset (empty).
     2. On the next two animation frames, apply the eased transition
        and set the target offset = 201 − (score/100 × 201).
   This double-rAF approach ensures the CSS transition fires even if
   the element was just inserted or was already at the target value.

   Arc stroke colour is set from qualityToArcColor() (utils.js).
   Score number (#scoreNum) is set via animateScoreRing() (utils.js),
   which this function delegates to — keeping the animation logic
   in one place as documented in utils.js Section 7.
   ================================================================ */

/**
 * _renderScoreRing(score, quality)
 * Updates #scoreNum and animates the #scoreArc SVG donut.
 * Delegates entirely to animateScoreRing() from utils.js.
 *
 * @param {number}                  score   — integer 0–100
 * @param {'GOOD'|'AVERAGE'|'POOR'} quality
 */
function _renderScoreRing(score, quality) {
  /* animateScoreRing() handles: arc colour, dashoffset animation,
     scoreNum textContent, double-rAF sequencing.
     Defined in utils.js Section 7. */
  animateScoreRing(score, quality);
}


/* ================================================================
   SECTION 5: RECOMMENDATION BOX RENDERER
   ----------------------------------------------------------------
   The recommendation box (#recommendationBox) displays:
     1. Static title: 'Suitability Recommendation' (in HTML, not JS)
     2. Dynamic text: the pre-built recommendation string
     3. Quality-band theming: border-color and background via inline
        styles set from qualityToBorderColor() / qualityToBgColor()
        (both in utils.js Section 5).

   Inline styles are used (not class toggling) to match the existing
   pattern established in aggregate.js and steel.js Section 9 — where
   the recBox styles were always set as inline properties. Changing to
   class toggling would require CSS changes outside the scope of this
   renderer and could affect specificity.

   The recommendation text is set via setText() to avoid XSS risk —
   recommendation strings may include user-derived subtype names.
   ================================================================ */

/**
 * _renderRecommendation(recommendation, quality)
 * Sets recommendation text content and applies quality-band theming.
 *
 * @param {string}                  recommendation — multi-line text
 * @param {'GOOD'|'AVERAGE'|'POOR'} quality
 */
function _renderRecommendation(recommendation, quality) {
  /* Set text — uses textContent, not innerHTML, for XSS safety */
  setText('recommendationText', recommendation);

  /* Apply quality-band border and background to the container box */
  const recBox = getEl('recommendationBox');
  if (!recBox) return;

  recBox.style.borderColor = qualityToBorderColor(quality);
  recBox.style.background  = qualityToBgColor(quality);
}


/* ================================================================
   SECTION 6: REASONS LIST RENDERER
   ----------------------------------------------------------------
   The reasons list (#reasonsList) is a <ul> whose <li> items are
   generated one-per-parameter, coloured by status class:
     .pass  — green (parameter met the good threshold)
     .warn  — amber (parameter is marginal / borderline)
     .fail  — red   (parameter failed)

   Each <li> shows:
     <strong>[label]:</strong> [note]

   The note strings come from evaluateParam() / evaluateParamGeneric()
   in scoring.js / utils.js respectively — they are already fully
   formed at this point and are injected as innerHTML.

   Note: notes are generated entirely from cfg data and numeric values
   via template literals in the scoring layer — no raw user string
   from the DOM is ever interpolated here, so innerHTML is safe.
   ================================================================ */

/**
 * _renderReasonsList(paramResults)
 * Rebuilds the #reasonsList <ul> with one <li> per parameter.
 *
 * @param {Array} paramResults — array of evaluateParam() result objects
 */
function _renderReasonsList(paramResults) {
  if (!Array.isArray(paramResults) || paramResults.length === 0) {
    setHTML('reasonsList', '');
    return;
  }

  const html = paramResults.map(r => `
    <li class="${r.status}">
      <strong>${r.label}:</strong> ${r.note}
    </li>
  `).join('');

  setHTML('reasonsList', html);
}


/* ================================================================
   SECTION 7: PARAMETER SUMMARY TABLE RENDERER
   ----------------------------------------------------------------
   The parameter table (#paramTable > #paramTableBody) has four
   columns defined statically in index.html:
     Parameter | Entered Value | Standard / Range | Status

   Each <tr> maps to one paramResult object:
     col 1 — r.label     (bold)
     col 2 — r.value + r.unit  (monospace, 13px)
     col 3 — r.cfg.standard    (muted, 12.5px)
     col 4 — status badge span  via buildStatusBadgeHTML()

   Value formatting uses fmtNum() (utils.js Section 3) to strip
   trailing zeros, matching the original behaviour in aggregate.js
   and steel.js Section 9 (both called r.value directly — but the
   rendering centralisation here adds fmtNum for consistency with
   the reasons list and to keep decimal display uniform).

   Status badge CSS class and label come from statusToClass() and
   statusToLabel() (utils.js Section 5), which map:
     'pass' → 'status-pass' / 'PASS'
     'warn' → 'status-warn' / 'MARGINAL'
     'fail' → 'status-fail' / 'FAIL'
   ================================================================ */

/**
 * _renderParamTable(paramResults)
 * Rebuilds #paramTableBody <tbody> with one <tr> per parameter.
 *
 * @param {Array} paramResults — array of evaluateParam() result objects
 */
function _renderParamTable(paramResults) {
  if (!Array.isArray(paramResults) || paramResults.length === 0) {
    setHTML('paramTableBody', '');
    return;
  }

  const html = paramResults.map(r => `
    <tr>
      <td><strong>${r.label}</strong></td>
      <td style="font-family:var(--font-mono); font-size:13px;">
        ${fmtNum(r.value)} ${r.unit}
      </td>
      <td style="font-size:12.5px; color:var(--text-muted);">
        ${r.cfg.standard}
      </td>
      <td>${buildStatusBadgeHTML(r.status)}</td>
    </tr>
  `).join('');

  setHTML('paramTableBody', html);
}


/* ================================================================
   SECTION 8: STATUS BADGE HTML BUILDER
   ----------------------------------------------------------------
   Builds the inline <span> HTML for a status badge, reusable
   anywhere a status indicator is needed outside the table.

   Uses statusToClass() and statusToLabel() from utils.js Section 5
   for CSS class names and display text.

   This is the only renderer function exposed as public API beyond
   renderResult() — modules or future UI additions may call it when
   composing their own HTML fragments that include status indicators.
   ================================================================ */

/**
 * buildStatusBadgeHTML(status)
 * Returns an HTML string for a single status badge <span>.
 *
 * @param  {'pass'|'warn'|'fail'} status
 * @returns {string}
 *
 * @example
 *   buildStatusBadgeHTML('pass')  // → '<span class="status-pass">PASS</span>'
 *   buildStatusBadgeHTML('warn')  // → '<span class="status-warn">MARGINAL</span>'
 *   buildStatusBadgeHTML('fail')  // → '<span class="status-fail">FAIL</span>'
 */
function buildStatusBadgeHTML(status) {
  return `<span class="${statusToClass(status)}">${statusToLabel(status)}</span>`;
}


/* ================================================================
   SECTION 9: FORM AREA LIFECYCLE HELPERS
   ----------------------------------------------------------------
   showFormArea() and clearFormArea() centralise the two operations
   that main.js's _clearFormArea() and each module's loadXxxModule()
   perform on #formArea, eliminating repeated direct DOM access.

   showFormArea():
     Sets #formArea display to 'block' before a module injects its
     form HTML. Called inside each module's renderXxxForm() after
     setting formArea.innerHTML, or alternatively called by the
     module loader before doing so — either pattern is valid.

   clearFormArea():
     Wipes #formArea innerHTML and hides it. Called by main.js
     _clearFormArea() when switching modules or resetting the app.
     Kept in renderer.js because clearing the form area is a UI
     rendering concern, not a controller concern.
   ================================================================ */

/**
 * showFormArea()
 * Makes #formArea visible (display: block).
 * Call after injecting module form HTML into #formArea.innerHTML.
 */
function showFormArea() {
  showEl('formArea');
}

/**
 * clearFormArea()
 * Empties #formArea innerHTML and hides it.
 * Called by main.js when switching modules or on full reset.
 */
function clearFormArea() {
  const formArea = getEl('formArea');
  if (!formArea) return;
  formArea.innerHTML     = '';
  formArea.style.display = 'none';
}


/* ================================================================
   SECTION 10: MODULE RESULT RESET
   ----------------------------------------------------------------
   resetModuleUI(fieldIds) provides a single-call reset for any
   material module's "Clear" button handler.

   It performs four operations in sequence:
     1. Hides and resets the full result card via resetResultCard()
        (defined in utils.js Section 8) — covers badge, score ring,
        recommendation text, reasons list, table, and meta strip.
     2. Iterates fieldIds to clear each form field value.
     3. Removes the .invalid validation class from each field.

   Rationale for keeping this here (not in scoring.js):
     The scoring.js file also defines resetModuleResult(), which does
     the same thing. renderer.js provides its own version so that the
     module files can choose their dependency: modules that depend only
     on renderer.js (not scoring.js directly) can use resetModuleUI()
     without importing scoring.js. The two functions are functionally
     equivalent — modules should use whichever matches their load
     dependency. If scoring.js is loaded, resetModuleResult() from
     there is equally valid; this version adds no new behaviour.
   ================================================================ */

/**
 * resetModuleUI(fieldIds)
 * Resets the result card to neutral state and clears all listed
 * form fields. Called by each module's resetXxxForm() function.
 *
 * @param {string[]} fieldIds — IDs of all form elements in the
 *                              current module's form to clear and
 *                              un-mark-as-invalid.
 */
function resetModuleUI(fieldIds) {
  /* 1. Full result card reset — hides card, zeroes all dynamic content */
  resetResultCard();   /* utils.js Section 8 */

  /* 2. Clear form field values and validation states */
  if (!Array.isArray(fieldIds) || fieldIds.length === 0) return;

  fieldIds.forEach(id => {
    const el = getEl(id);
    if (!el) return;
    el.value = '';
    el.classList.remove('invalid');
  });
}


/* ================================================================
   SECTION 11: META ITEM BUILDER UTILITIES
   ----------------------------------------------------------------
   Convenience factories for the most common metaItems entries
   shared across all three modules:
     - buildDateMetaItem()    — the 'Evaluated On' date chip
     - buildMetaItem(l, v)   — generic label/value pair factory

   All three module renderers end their metaItems array with the
   current date. buildDateMetaItem() centralises that pattern and
   uses getTodayFormatted() (utils.js Section 4) for consistent
   locale formatting (en-IN, '05 Jan 2025' style).

   Modules build metaItems like:
     const metaItems = [
       buildMetaItem('Material',    'Aggregate'),
       buildMetaItem('Sub-type',    values.aggregateType),
       buildMetaItem('Standards',   'IS 383 · IS 2386'),
       buildDateMetaItem()
     ];

   This eliminates the repeated date-formatting block that appeared
   in renderAggregateResult(), renderSteelResult(), and
   renderBrickResult() — each had its own `new Date().toLocaleDateString(…)`.
   ================================================================ */

/**
 * buildMetaItem(label, value)
 * Creates a single { label, value } object for the metaItems array.
 * A thin factory to encourage consistent object shapes across modules.
 *
 * @param  {string} label — field name shown in the meta strip
 * @param  {string} value — field content shown in the meta strip
 * @returns {{ label: string, value: string }}
 */
function buildMetaItem(label, value) {
  return { label: label, value: value };
}

/**
 * buildDateMetaItem()
 * Creates the standard 'Evaluated On' meta item with today's date
 * formatted via getTodayFormatted() (utils.js Section 4).
 *
 * @returns {{ label: string, value: string }}
 */
function buildDateMetaItem() {
  return buildMetaItem('Evaluated On', getTodayFormatted());
}

/* ----------------------------------------------------------------
   IMAGE UPLOAD — shared across all three modules
   ---------------------------------------------------------------- */

function setupImageUpload(prefix) {
  const input   = document.getElementById(prefix + 'sampleImage');
  const preview = document.getElementById(prefix + 'imagePreview');
  const img     = document.getElementById(prefix + 'previewImg');
  const name    = document.getElementById(prefix + 'fileName');
  if (!input || !preview || !img || !name) return;

  input.addEventListener('change', function () {
    const file = this.files[0];
    if (!file || !file.type.startsWith('image/')) {
      preview.style.display = 'none';
      img.src = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      img.src           = e.target.result;
      name.textContent  = file.name;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
}

function clearImageUpload(prefix) {
  const input   = document.getElementById(prefix + 'sampleImage');
  const preview = document.getElementById(prefix + 'imagePreview');
  const img     = document.getElementById(prefix + 'previewImg');
  if (input)   input.value      = '';
  if (preview) preview.style.display = 'none';
  if (img)     img.src          = '';
}

/* ----------------------------------------------------------------
   RESULT CARD SAMPLE PHOTO RENDERER
   Called by renderResult() in each module after evaluation.
   prefix — the module's field prefix e.g. 'steel_', 'agg_', 'brick_'
   ---------------------------------------------------------------- */
function renderSamplePhoto(prefix) {
  const photoContent = document.getElementById('resultPhotoContent');
  if (!photoContent) return;

  const input = document.getElementById(prefix + 'sampleImage');
  const file  = input && input.files && input.files[0];

  if (file && file.type.startsWith('image/')) {
    /* Image was uploaded — show it */
    const reader = new FileReader();
    reader.onload = function (e) {
      photoContent.innerHTML = `
        <img
          class="result-photo-img"
          src="${e.target.result}"
          alt="Sample: ${file.name}"
        />
        <div class="result-photo-filename">${file.name}</div>
      `;
    };
    reader.readAsDataURL(file);
  } else {
    /* No image — show placeholder */
    photoContent.innerHTML = `
      <div class="result-photo-placeholder">
        <span>⬜</span>
        <span>No image provided for this sample</span>
      </div>
    `;
  }
}

/* ================================================================
   SECTION 12: PUBLIC API SUMMARY
   ----------------------------------------------------------------
   All symbols exposed to the global scope — no import/export syntax,
   matching the load-order architecture of this project.

   Primary entry point:
     renderResult(payload)
       payload: { metaItems, quality, score, recommendation, paramResults }
       Called by evaluateAggregate(), evaluateBrick(), evaluateSteel()
       after their respective scoring and recommendation steps.

   HTML fragment builders:
     buildStatusBadgeHTML(status)
       → '<span class="status-{pass|warn|fail}">{PASS|MARGINAL|FAIL}</span>'

   Meta item factories:
     buildMetaItem(label, value)   → { label, value }
     buildDateMetaItem()           → { label: 'Evaluated On', value: '<today>' }

   Form area lifecycle:
     showFormArea()    — sets #formArea display to 'block'
     clearFormArea()   — empties #formArea and hides it

   Module reset:
     resetModuleUI(fieldIds)
       — resets result card + clears listed form fields
       — wraps resetResultCard() from utils.js

   Private (not for external use):
     _renderMeta(metaItems)
     _renderQualityBadge(quality)
     _renderScoreRing(score, quality)
     _renderRecommendation(recommendation, quality)
     _renderReasonsList(paramResults)
     _renderParamTable(paramResults)
   ================================================================ */