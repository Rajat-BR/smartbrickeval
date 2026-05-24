/* ================================================================
   SAMPLE HISTORY & EXCEL EXPORT — history.js
   Smart C&D Material Quality Evaluation System

   Responsibilities:
     - In-memory sample log (sampleHistory array)
     - saveCurrentSample()  — called after each evaluation
     - renderHistoryTable() — refreshes the history panel UI
     - exportToExcel()      — downloads .xlsx via SheetJS
     - clearHistory()       — wipes the log

   Dependencies:
     - SheetJS (XLSX) loaded via CDN before this file
     - globals from utils.js: getEl, getTodayFormatted
   ================================================================ */


/* ----------------------------------------------------------------
   SECTION 1: IN-MEMORY SAMPLE LOG
   ---------------------------------------------------------------- */

/*
 * sampleHistory
 * Array of saved evaluation records. Each record:
 * {
 *   sampleNumber : number   — 1-based index
 *   date         : string   — formatted date string
 *   material     : string   — 'Aggregate' | 'Brick' | 'Steel'
 *   subtype      : string   — e.g. 'Coarse Aggregate (Recycled)'
 *   score        : number   — 0–100
 *   quality      : string   — 'GOOD' | 'AVERAGE' | 'POOR'
 *   photoDataUrl : string   — base64 image string or '' if none
 *   photoName    : string   — original filename or ''
 *   paramResults : Array    — full parameter results array
 * }
 */
const sampleHistory = [];

/* Tracks the last evaluated payload so saveCurrentSample() can access it */
let _lastEvalPayload = null;


/* ----------------------------------------------------------------
   SECTION 2: PAYLOAD CAPTURE
   Called at the end of each evaluateXxx() function in the modules.
   Stores the current result so the Save button can access it.
   ---------------------------------------------------------------- */

/**
 * captureEvalPayload(payload, material, subtype, prefix)
 * Stores the latest evaluation result for saving.
 * Called inside evaluateAggregate(), evaluateBrick(), evaluateSteel()
 * right after renderSamplePhoto().
 *
 * @param {Object} payload    — the full result payload
 * @param {string} material   — 'Aggregate' | 'Brick' | 'Steel'
 * @param {string} subtype    — sub-type string
 * @param {string} prefix     — field prefix e.g. 'agg_'
 */
function captureEvalPayload(payload, material, subtype, prefix) {
  _lastEvalPayload = { payload, material, subtype, prefix };
}


/* ----------------------------------------------------------------
   SECTION 3: SAVE CURRENT SAMPLE
   Called by the "Save Sample" button in the result card.
   ---------------------------------------------------------------- */

/**
 * saveCurrentSample()
 * Reads _lastEvalPayload, grabs the photo if any,
 * builds a record and pushes it to sampleHistory.
 * Then refreshes the history table and shows the panel.
 */
function saveCurrentSample() {
  if (!_lastEvalPayload) {
    alert('No evaluation to save yet. Run an evaluation first.');
    return;
  }

  const { payload, material, subtype, prefix } = _lastEvalPayload;
  const { score, quality, paramResults } = payload;

  /* Get photo if available */
  const input = document.getElementById(prefix + 'sampleImage');
  const file  = input && input.files && input.files[0];

  if (file && file.type.startsWith('image/')) {
    /* Read photo as base64 then save */
    const reader = new FileReader();
    reader.onload = function (e) {
      _pushRecord(material, subtype, score, quality, paramResults, e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  } else {
    /* Save without photo */
    _pushRecord(material, subtype, score, quality, paramResults, '', '');
  }
}

/**
 * _pushRecord(...)
 * Builds the record object, pushes to sampleHistory,
 * refreshes UI, and shows the history panel.
 */
function _pushRecord(material, subtype, score, quality, paramResults, photoDataUrl, photoName) {
  const record = {
    sampleNumber: sampleHistory.length + 1,
    date:         getTodayFormatted(),
    material,
    subtype,
    score,
    quality,
    photoDataUrl,
    photoName,
    paramResults
  };

  sampleHistory.push(record);
  renderHistoryTable();

  /* Show history panel */
  const panel = document.getElementById('historyPanel');
  if (panel) panel.style.display = 'block';

  /* Scroll to history panel */
  setTimeout(() => {
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);

  alert(`Sample #${record.sampleNumber} saved to history.`);
}


/* ----------------------------------------------------------------
   SECTION 4: HISTORY TABLE RENDERER
   Rebuilds the #historyTableBody from sampleHistory array.
   ---------------------------------------------------------------- */

/**
 * renderHistoryTable()
 * Rebuilds the history table rows and updates the summary line.
 */
function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  if (sampleHistory.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; color:var(--text-muted); font-style:italic; padding:24px;">
          No samples saved yet.
        </td>
      </tr>
    `;
    _updateSummaryText();
    return;
  }

  tbody.innerHTML = sampleHistory.map(r => {

    /* Quality badge colour inline */
    const qColor = r.quality === 'GOOD'    ? 'var(--good)'
                 : r.quality === 'AVERAGE' ? 'var(--avg)'
                 :                           'var(--poor)';
    const qBg    = r.quality === 'GOOD'    ? 'var(--good-bg)'
                 : r.quality === 'AVERAGE' ? 'var(--avg-bg)'
                 :                           'var(--poor-bg)';
    const qBorder = r.quality === 'GOOD'    ? 'var(--good-border)'
                  : r.quality === 'AVERAGE' ? 'var(--avg-border)'
                  :                           'var(--poor-border)';

    /* Photo cell */
    const photoCell = r.photoDataUrl
      ? `<img class="history-thumb" src="${r.photoDataUrl}" alt="${r.photoName}" title="${r.photoName}" />`
      : `<span class="history-no-photo">No photo</span>`;

    return `
      <tr>
        <td style="font-family:var(--font-mono); color:var(--text-muted);">${r.sampleNumber}</td>
        <td style="font-family:var(--font-mono); font-size:12px;">${r.date}</td>
        <td><strong>${r.material}</strong></td>
        <td style="font-size:13px; color:var(--text-secondary);">${r.subtype}</td>
        <td style="font-family:var(--font-mono); font-weight:600;">${r.score}</td>
        <td>
          <span style="
            font-family:var(--font-mono);
            font-size:10px;
            font-weight:700;
            letter-spacing:0.06em;
            padding:2px 9px;
            border-radius:2px;
            border:1px solid ${qBorder};
            background:${qBg};
            color:${qColor};
          ">${r.quality}</span>
        </td>
        <td>${photoCell}</td>
      </tr>
    `;
  }).join('');

  _updateSummaryText();
}

/**
 * _updateSummaryText()
 * Updates the summary line above the table.
 */
function _updateSummaryText() {
  const el = document.getElementById('historySummaryText');
  if (!el) return;

  if (sampleHistory.length === 0) {
    el.textContent = 'No samples saved yet.';
    return;
  }

  const good    = sampleHistory.filter(r => r.quality === 'GOOD').length;
  const average = sampleHistory.filter(r => r.quality === 'AVERAGE').length;
  const poor    = sampleHistory.filter(r => r.quality === 'POOR').length;
  const avgScore = Math.round(
    sampleHistory.reduce((s, r) => s + r.score, 0) / sampleHistory.length
  );

  el.textContent =
    `${sampleHistory.length} sample${sampleHistory.length > 1 ? 's' : ''} saved · ` +
    `Avg score: ${avgScore}/100 · ` +
    `Good: ${good} · Average: ${average} · Poor: ${poor}`;
}


/* ----------------------------------------------------------------
   SECTION 5: CLEAR HISTORY
   ---------------------------------------------------------------- */

/**
 * clearHistory()
 * Wipes the sampleHistory array and hides the panel.
 */
function clearHistory() {
  if (sampleHistory.length === 0) return;
  if (!confirm(`Delete all ${sampleHistory.length} saved samples? This cannot be undone.`)) return;

  sampleHistory.length = 0;
  _lastEvalPayload     = null;

  renderHistoryTable();

  const panel = document.getElementById('historyPanel');
  if (panel) panel.style.display = 'none';
}


/* ----------------------------------------------------------------
   SECTION 6: EXCEL EXPORT
   Uses SheetJS (XLSX) loaded via CDN.
   Produces a two-sheet workbook:
     Sheet 1 — Sample Log    (one row per sample)
     Sheet 2 — Analysis      (summary statistics)
   Photos are NOT embedded in Excel (base64 would make huge files)
   — instead the filename is written in the Photo column.
   ---------------------------------------------------------------- */

/**
 * exportToExcel()
 * Builds and downloads a .xlsx workbook from sampleHistory.
 */
function exportToExcel() {
  if (sampleHistory.length === 0) {
    alert('No samples to export. Save at least one evaluation first.');
    return;
  }

  /* ---- SHEET 1: Sample Log ---- */
  const logRows = _buildLogRows();

  /* ---- SHEET 2: Analysis ---- */
  const analysisRows = _buildAnalysisRows();

  /* ---- Build workbook ---- */
  const wb = XLSX.utils.book_new();

  const ws1 = XLSX.utils.aoa_to_sheet(logRows);
  _styleColumnWidths(ws1, [6, 14, 16, 28, 8, 10, 24]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Sample Log');

  const ws2 = XLSX.utils.aoa_to_sheet(analysisRows);
  _styleColumnWidths(ws2, [32, 20]);
  XLSX.utils.book_append_sheet(wb, ws2, 'Analysis');

  /* ---- Download ---- */
  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `CnD_Evaluation_Log_${dateStamp}.xlsx`);
}

/**
 * _buildLogRows()
 * Builds the 2D array for Sheet 1 — one row per sample.
 * Columns: #, Date, Material, Sub-type, Score, Quality,
 *          then one column per unique parameter label, then Photo Filename.
 */
function _buildLogRows() {
  /* Collect all unique parameter labels across all samples */
  const paramLabels = [];
  sampleHistory.forEach(r => {
    r.paramResults.forEach(p => {
      if (!paramLabels.includes(p.label)) paramLabels.push(p.label);
    });
  });

  /* Header row */
  const header = [
    '#', 'Date', 'Material', 'Sub-type', 'Score', 'Quality',
    ...paramLabels.map(l => l + ' (Value)'),
    ...paramLabels.map(l => l + ' (Status)'),
    'Photo Filename'
  ];

  /* Data rows */
  const dataRows = sampleHistory.map(r => {
    const valuesByLabel  = {};
    const statusByLabel  = {};
    r.paramResults.forEach(p => {
      valuesByLabel[p.label]  = p.value;
      statusByLabel[p.label]  = p.status.toUpperCase();
    });

    return [
      r.sampleNumber,
      r.date,
      r.material,
      r.subtype,
      r.score,
      r.quality,
      ...paramLabels.map(l => valuesByLabel[l] !== undefined ? valuesByLabel[l] : '—'),
      ...paramLabels.map(l => statusByLabel[l] || '—'),
      r.photoName || 'No photo'
    ];
  });

  return [header, ...dataRows];
}

/**
 * _buildAnalysisRows()
 * Builds the 2D array for Sheet 2 — summary statistics.
 */
function _buildAnalysisRows() {
  const total   = sampleHistory.length;
  const good    = sampleHistory.filter(r => r.quality === 'GOOD').length;
  const average = sampleHistory.filter(r => r.quality === 'AVERAGE').length;
  const poor    = sampleHistory.filter(r => r.quality === 'POOR').length;
  const avgScore = (sampleHistory.reduce((s, r) => s + r.score, 0) / total).toFixed(1);
  const maxScore = Math.max(...sampleHistory.map(r => r.score));
  const minScore = Math.min(...sampleHistory.map(r => r.score));

  /* Per-material breakdown */
  const materials = ['Aggregate', 'Brick', 'Steel'];
  const materialRows = materials.map(m => {
    const subset = sampleHistory.filter(r => r.material === m);
    if (subset.length === 0) return null;
    const avg = (subset.reduce((s, r) => s + r.score, 0) / subset.length).toFixed(1);
    return [`  ${m} (${subset.length} samples)`, `Avg score: ${avg}`];
  }).filter(Boolean);

  /* Parameter pass rates across all samples */
  const paramStats = {};
  sampleHistory.forEach(r => {
    r.paramResults.forEach(p => {
      if (!paramStats[p.label]) paramStats[p.label] = { pass: 0, warn: 0, fail: 0, total: 0 };
      paramStats[p.label][p.status]++;
      paramStats[p.label].total++;
    });
  });

  const paramRows = Object.entries(paramStats).map(([label, s]) => {
    const passRate = Math.round((s.pass / s.total) * 100);
    return [`  ${label}`, `${passRate}% PASS · ${s.warn} MARGINAL · ${s.fail} FAIL`];
  });

  return [
    ['C&D MATERIAL EVALUATION — ANALYSIS SUMMARY', ''],
    ['Generated on', getTodayFormatted()],
    ['Total Samples Evaluated', total],
    ['', ''],
    ['QUALITY DISTRIBUTION', ''],
    ['  GOOD',    `${good} samples (${Math.round((good/total)*100)}%)`],
    ['  AVERAGE', `${average} samples (${Math.round((average/total)*100)}%)`],
    ['  POOR',    `${poor} samples (${Math.round((poor/total)*100)}%)`],
    ['', ''],
    ['SCORE STATISTICS', ''],
    ['  Average Score', avgScore + ' / 100'],
    ['  Highest Score', maxScore + ' / 100'],
    ['  Lowest Score',  minScore + ' / 100'],
    ['', ''],
    ['BREAKDOWN BY MATERIAL', ''],
    ...materialRows,
    ['', ''],
    ['PARAMETER PASS RATES', ''],
    ...paramRows
  ];
}

/**
 * _styleColumnWidths(ws, widths)
 * Sets column widths on a SheetJS worksheet.
 *
 * @param {Object}   ws     — SheetJS worksheet object
 * @param {number[]} widths — array of character widths per column
 */
function _styleColumnWidths(ws, widths) {
  ws['!cols'] = widths.map(w => ({ wch: w }));
}