/* ================================================================
   MAIN CONTROLLER — main.js
   Smart C&D Material Quality Evaluation System
   Responsibilities:
     - Material module selection & dispatching
     - Active card state management
     - Form area / result card lifecycle
     - evalAgain() and resetAll() global actions
     - Clean architecture for brick / aggregate / steel modules
   ================================================================ */

/* ----------------------------------------------------------------
   SECTION 1: MODULE REGISTRY
   Maps each material key to its card element ID and loader function.
   Adding a new module in future = one entry here, nothing else in main.js.
   ---------------------------------------------------------------- */
const MODULE_REGISTRY = {
  brick:     { cardId: 'cardBrick',     loader: () => loadBrickModule()     },
  aggregate: { cardId: 'cardAggregate', loader: () => loadAggregateModule() },
  steel:     { cardId: 'cardSteel',     loader: () => loadSteelModule()     }
};

/* ----------------------------------------------------------------
   SECTION 2: APPLICATION STATE
   Single source of truth for what is currently active.
   ---------------------------------------------------------------- */
const AppState = {
  activeModule: null   /* 'brick' | 'aggregate' | 'steel' | null */
};

/* ----------------------------------------------------------------
   SECTION 3: MODULE LOADER — loadModule(key)
   Called by each material card's onclick="loadModule('...')" in HTML.
   Orchestrates: card highlight → form clear → module render → scroll.
   ---------------------------------------------------------------- */
function loadModule(key) {
  const module = MODULE_REGISTRY[key];
  if (!module) {
    console.warn(`[main.js] Unknown module key: "${key}"`);
    return;
  }

  /* 1. Update application state */
  AppState.activeModule = key;

  /* 2. Update card active styles */
  _setActiveCard(module.cardId);

  /* 3. Hide and clear any existing result */
  _clearResult();

  /* 4. Clear the form area before injecting new module */
  _clearFormArea();

  /* 5. Delegate to module-specific loader */
  module.loader();

  /* 6. Smooth scroll to form area after short paint delay */
  setTimeout(() => {
    const formArea = document.getElementById('formArea');
    if (formArea) formArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 80);
}

/* ----------------------------------------------------------------
   SECTION 4: CARD HIGHLIGHT MANAGER
   Removes .active from all cards, applies it to the selected one.
   ---------------------------------------------------------------- */
function _setActiveCard(activeCardId) {
  Object.values(MODULE_REGISTRY).forEach(mod => {
    const card = document.getElementById(mod.cardId);
    if (card) card.classList.remove('active');
  });

  const activeCard = document.getElementById(activeCardId);
  if (activeCard) activeCard.classList.add('active');
}

/* ----------------------------------------------------------------
   SECTION 5: FORM AREA LIFECYCLE HELPERS
   ---------------------------------------------------------------- */

/* Wipe the form area DOM and hide it */
function _clearFormArea() {
  const formArea = document.getElementById('formArea');
  if (!formArea) return;
  formArea.innerHTML  = '';
  formArea.style.display = 'none';
}

/* Hide the result card and reset all its dynamic content */
function _clearResult() {
  const resultCard = document.getElementById('resultCard');
  if (!resultCard) return;
  resultCard.style.display = 'none';

  /* Reset quality badge */
  const badge = document.getElementById('qualityBadge');
  if (badge) { badge.textContent = '—'; badge.className = 'quality-badge'; }

  /* Reset score ring */
  const scoreArc = document.getElementById('scoreArc');
  if (scoreArc) {
    scoreArc.style.transition = 'none';
    scoreArc.setAttribute('stroke-dashoffset', '201');
    scoreArc.setAttribute('stroke', 'var(--accent)');
  }

  const scoreNum = document.getElementById('scoreNum');
  if (scoreNum) scoreNum.textContent = '—';

  /* Reset recommendation, reasons, and table */
  const recText = document.getElementById('recommendationText');
  if (recText) recText.textContent = '—';

  const reasonsList = document.getElementById('reasonsList');
  if (reasonsList) reasonsList.innerHTML = '';

  const paramTableBody = document.getElementById('paramTableBody');
  if (paramTableBody) paramTableBody.innerHTML = '';

  const resultMeta = document.getElementById('resultMeta');
  if (resultMeta) resultMeta.innerHTML = '';

  /* Reset recommendation box styling to neutral */
  const recBox = document.getElementById('recommendationBox');
  if (recBox) {
    recBox.style.borderColor = '';
    recBox.style.background  = '';
  }
}

/* ----------------------------------------------------------------
   SECTION 6: GLOBAL ACTION HANDLERS
   Called by result card buttons: evalAgain() and resetAll()
   Referenced in HTML as onclick="evalAgain()" and onclick="resetAll()"
   ---------------------------------------------------------------- */

/*
 * evalAgain()
 * Keeps the current module form visible, hides the result card,
 * and scrolls back to the form so the user can adjust inputs.
 */
function evalAgain() {
  _clearResult();

  /* Scroll back to form area */
  const formArea = document.getElementById('formArea');
  if (formArea && formArea.style.display !== 'none') {
    setTimeout(() => formArea.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
}

/*
 * resetAll()
 * Full reset: clears form area, result card, and all card active states.
 * Returns the UI to Step 01 (material selection).
 */
function resetAll() {
  /* Clear module state */
  AppState.activeModule = null;

  /* Remove active highlight from all cards */
  Object.values(MODULE_REGISTRY).forEach(mod => {
    const card = document.getElementById(mod.cardId);
    if (card) card.classList.remove('active');
  });

  /* Wipe form and result */
  _clearFormArea();
  _clearResult();

  /* Scroll back to material selector */
  const selector = document.getElementById('materialSelector');
  if (selector) {
    setTimeout(() => selector.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  }
}

/* ----------------------------------------------------------------
   SECTION 7: DOM READY INITIALISER
   Runs once on page load — sets up any global baseline state.
   ---------------------------------------------------------------- */
(function init() {
  /* Ensure form area and result card start hidden (belt + suspenders) */
  const formArea   = document.getElementById('formArea');
  const resultCard = document.getElementById('resultCard');

  if (formArea)   formArea.style.display   = 'none';
  if (resultCard) resultCard.style.display = 'none';

  /* Log module registry for debug visibility in DevTools */
  console.info(
    '[C&D Eval] System ready. Registered modules:',
    Object.keys(MODULE_REGISTRY).join(', ')
  );
})();