/* ============================================================
   SMART BRICK QUALITY EVALUATION SYSTEM — script.js
   ============================================================
   HOW TO EDIT EVALUATION CONDITIONS:
   ----------------------------------
   All acceptance criteria are stored in the `BRICK_CRITERIA`
   object at the top of this file. Each brick type has its own
   set of threshold values. Simply change the numbers to update
   the acceptable ranges without touching any other code.

   For example, to change the minimum compressive strength for
   Clay Brick, find:
       clay: { compressiveStrength: { min: 3.5, ... } }
   and update the `min` value.
   ============================================================ */


/* ============================================================
   SECTION A: BRICK ACCEPTANCE CRITERIA
   Edit values here to update evaluation conditions.
   All values are based on IS code standards (reference only).
   ============================================================ */

const BRICK_CRITERIA = {

  clay: {
    label: "Clay Brick",
    compressiveStrength: { min: 3.5,  max: null,  unit: "MPa",  note: "Min. 3.5 MPa (IS 1077)" },
    waterAbsorption:     { min: null, max: 20,    unit: "%",    note: "Max. 20% (IS 3495)" },
    efflorescence:       { allowed: ["nil", "slight"],          note: "Nil or Slight acceptable" },
    dimensionTolerance:  { min: null, max: 8,     unit: "mm",   note: "Max. ±8 mm deviation" },
    weight:              { min: 2.5,  max: 4.5,   unit: "kg",   note: "Typical range 2.5–4.5 kg" },
    crackPresence:       { allowed: "no",                       note: "No cracks permitted" },
    shapeIrregularity:   { allowed: "no",                       note: "Regular shape required" },
    suitability: {
      good:    "Suitable for load-bearing walls, exposed brickwork, and general construction.",
      average: "Suitable for non-load-bearing partition walls and internal use.",
      poor:    "Not recommended for structural use. Reject the batch for quality re-check."
    }
  },

  flyash: {
    label: "Fly Ash Brick",
    compressiveStrength: { min: 7.5,  max: null,  unit: "MPa",  note: "Min. 7.5 MPa (IS 12894)" },
    waterAbsorption:     { min: null, max: 15,    unit: "%",    note: "Max. 15% (IS 12894)" },
    efflorescence:       { allowed: ["nil", "slight"],          note: "Nil or Slight acceptable" },
    dimensionTolerance:  { min: null, max: 5,     unit: "mm",   note: "Max. ±5 mm deviation" },
    weight:              { min: 2.8,  max: 4.2,   unit: "kg",   note: "Typical range 2.8–4.2 kg" },
    crackPresence:       { allowed: "no",                       note: "No cracks permitted" },
    shapeIrregularity:   { allowed: "no",                       note: "Regular shape required" },
    suitability: {
      good:    "Suitable for load-bearing and non-load-bearing walls. Good thermal insulation.",
      average: "Acceptable for internal walls and non-critical applications only.",
      poor:    "Below acceptable standard. Do not use for structural applications."
    }
  },

  concrete: {
    label: "Concrete Brick",
    compressiveStrength: { min: 5.0,  max: null,  unit: "MPa",  note: "Min. 5.0 MPa (IS 2185)" },
    waterAbsorption:     { min: null, max: 10,    unit: "%",    note: "Max. 10% (IS 2185)" },
    efflorescence:       { allowed: ["nil", "slight", "moderate"], note: "Up to Moderate acceptable" },
    dimensionTolerance:  { min: null, max: 5,     unit: "mm",   note: "Max. ±5 mm deviation" },
    weight:              { min: 3.5,  max: 6.0,   unit: "kg",   note: "Typical range 3.5–6.0 kg" },
    crackPresence:       { allowed: "no",                       note: "No cracks permitted" },
    shapeIrregularity:   { allowed: "no",                       note: "Regular shape required" },
    suitability: {
      good:    "Suitable for foundations, pavements, and structural masonry work.",
      average: "Can be used for non-structural garden walls and fencing.",
      poor:    "Structurally compromised. Not suitable for any construction use."
    }
  },

  sandlime: {
    label: "Sand Lime Brick",
    compressiveStrength: { min: 10.0, max: null,  unit: "MPa",  note: "Min. 10.0 MPa (IS 4139)" },
    waterAbsorption:     { min: null, max: 16,    unit: "%",    note: "Max. 16% (IS 4139)" },
    efflorescence:       { allowed: ["nil", "slight"],          note: "Nil or Slight acceptable" },
    dimensionTolerance:  { min: null, max: 4,     unit: "mm",   note: "Max. ±4 mm deviation" },
    weight:              { min: 3.0,  max: 4.5,   unit: "kg",   note: "Typical range 3.0–4.5 kg" },
    crackPresence:       { allowed: "no",                       note: "No cracks permitted" },
    shapeIrregularity:   { allowed: "no",                       note: "Regular shape required" },
    suitability: {
      good:    "Suitable for load-bearing walls, columns, and architectural finishes.",
      average: "Suitable for non-load-bearing applications and filler walls.",
      poor:    "Does not meet minimum quality standards. Reject entire batch."
    }
  },

  interlocking: {
    label: "Interlocking Brick",
    compressiveStrength: { min: 6.0,  max: null,  unit: "MPa",  note: "Min. 6.0 MPa (general standard)" },
    waterAbsorption:     { min: null, max: 12,    unit: "%",    note: "Max. 12%" },
    efflorescence:       { allowed: ["nil", "slight"],          note: "Nil or Slight acceptable" },
    dimensionTolerance:  { min: null, max: 3,     unit: "mm",   note: "Max. ±3 mm (tight fit required)" },
    weight:              { min: 2.0,  max: 5.0,   unit: "kg",   note: "Typical range 2.0–5.0 kg" },
    crackPresence:       { allowed: "no",                       note: "No cracks — interlocking joints critical" },
    shapeIrregularity:   { allowed: "no",                       note: "Precise shape essential for interlocking" },
    suitability: {
      good:    "Suitable for pavements, retaining walls, and low-cost housing construction.",
      average: "May be used for low-traffic pavements with careful joint alignment.",
      poor:    "Shape or strength deficiencies prevent proper interlocking. Reject the batch."
    }
  }

};


/* ============================================================
   SECTION B: MAIN EVALUATION FUNCTION
   Called when "Evaluate Brick" button is clicked.
   ============================================================ */

function evaluateBrick() {

  // 1. Collect inputs
  const brickType          = document.getElementById("brickType").value;
  const compressiveStrength = parseFloat(document.getElementById("compressiveStrength").value);
  const waterAbsorption    = parseFloat(document.getElementById("waterAbsorption").value);
  const efflorescence      = document.getElementById("efflorescence").value;
  const dimensionTolerance = parseFloat(document.getElementById("dimensionTolerance").value);
  const weight             = parseFloat(document.getElementById("weight").value);
  const crackPresence      = document.getElementById("crackPresence").value;
  const shapeIrregularity  = document.getElementById("shapeIrregularity").value;

  // 2. Validate: all fields must be filled
  clearValidation();
  let isValid = true;

  if (!brickType)                      { markInvalid("brickType"); isValid = false; }
  if (isNaN(compressiveStrength))      { markInvalid("compressiveStrength"); isValid = false; }
  if (isNaN(waterAbsorption))          { markInvalid("waterAbsorption"); isValid = false; }
  if (!efflorescence)                  { markInvalid("efflorescence"); isValid = false; }
  if (isNaN(dimensionTolerance))       { markInvalid("dimensionTolerance"); isValid = false; }
  if (isNaN(weight))                   { markInvalid("weight"); isValid = false; }
  if (!crackPresence)                  { markInvalid("crackPresence"); isValid = false; }
  if (!shapeIrregularity)              { markInvalid("shapeIrregularity"); isValid = false; }

  if (!isValid) {
    alert("Please fill in all fields before evaluating.");
    return;
  }

  // 3. Run evaluation against criteria
  const criteria = BRICK_CRITERIA[brickType];
  const reasons  = [];  // each entry: { text, status: "pass" | "fail" | "warn" }
  let failCount  = 0;
  let warnCount  = 0;
  const paramRows = [];

  // --- Compressive Strength ---
  const csMin = criteria.compressiveStrength.min;
  if (csMin !== null && compressiveStrength < csMin) {
    reasons.push({ text: `Compressive strength (${compressiveStrength} MPa) is below the minimum required (${csMin} MPa).`, status: "fail" });
    failCount++;
    paramRows.push({ param: "Compressive Strength", value: `${compressiveStrength} MPa`, range: criteria.compressiveStrength.note, status: "fail" });
  } else {
    reasons.push({ text: `Compressive strength (${compressiveStrength} MPa) meets the minimum requirement (${csMin} MPa).`, status: "pass" });
    paramRows.push({ param: "Compressive Strength", value: `${compressiveStrength} MPa`, range: criteria.compressiveStrength.note, status: "pass" });
  }

  // --- Water Absorption ---
  const waMax = criteria.waterAbsorption.max;
  if (waMax !== null && waterAbsorption > waMax) {
    reasons.push({ text: `Water absorption (${waterAbsorption}%) exceeds the acceptable limit (${waMax}%).`, status: "fail" });
    failCount++;
    paramRows.push({ param: "Water Absorption", value: `${waterAbsorption}%`, range: criteria.waterAbsorption.note, status: "fail" });
  } else {
    reasons.push({ text: `Water absorption (${waterAbsorption}%) is within acceptable limits (max ${waMax}%).`, status: "pass" });
    paramRows.push({ param: "Water Absorption", value: `${waterAbsorption}%`, range: criteria.waterAbsorption.note, status: "pass" });
  }

  // --- Efflorescence ---
  if (!criteria.efflorescence.allowed.includes(efflorescence)) {
    const level = capitalise(efflorescence);
    if (efflorescence === "moderate") {
      reasons.push({ text: `Efflorescence level is Moderate — marginally acceptable for some uses.`, status: "warn" });
      warnCount++;
      paramRows.push({ param: "Efflorescence", value: level, range: criteria.efflorescence.note, status: "warn" });
    } else {
      reasons.push({ text: `Efflorescence level (${level}) exceeds acceptable range.`, status: "fail" });
      failCount++;
      paramRows.push({ param: "Efflorescence", value: level, range: criteria.efflorescence.note, status: "fail" });
    }
  } else {
    reasons.push({ text: `Efflorescence level (${capitalise(efflorescence)}) is within acceptable range.`, status: "pass" });
    paramRows.push({ param: "Efflorescence", value: capitalise(efflorescence), range: criteria.efflorescence.note, status: "pass" });
  }

  // --- Dimension Tolerance ---
  const dtMax = criteria.dimensionTolerance.max;
  if (dtMax !== null && dimensionTolerance > dtMax) {
    reasons.push({ text: `Dimension tolerance (${dimensionTolerance} mm) exceeds acceptable limit (${dtMax} mm).`, status: "fail" });
    failCount++;
    paramRows.push({ param: "Dimension Tolerance", value: `${dimensionTolerance} mm`, range: criteria.dimensionTolerance.note, status: "fail" });
  } else {
    reasons.push({ text: `Dimension tolerance (${dimensionTolerance} mm) is within acceptable range (max ${dtMax} mm).`, status: "pass" });
    paramRows.push({ param: "Dimension Tolerance", value: `${dimensionTolerance} mm`, range: criteria.dimensionTolerance.note, status: "pass" });
  }

  // --- Weight ---
  const wMin = criteria.weight.min;
  const wMax = criteria.weight.max;
  if (weight < wMin || weight > wMax) {
    const dir = weight < wMin ? "below" : "above";
    reasons.push({ text: `Weight (${weight} kg) is ${dir} the typical range (${wMin}–${wMax} kg).`, status: "warn" });
    warnCount++;
    paramRows.push({ param: "Weight", value: `${weight} kg`, range: criteria.weight.note, status: "warn" });
  } else {
    reasons.push({ text: `Weight (${weight} kg) is within the typical range (${wMin}–${wMax} kg).`, status: "pass" });
    paramRows.push({ param: "Weight", value: `${weight} kg`, range: criteria.weight.note, status: "pass" });
  }

  // --- Crack Presence ---
  if (crackPresence !== criteria.crackPresence.allowed) {
    reasons.push({ text: `Cracks are present on the brick. This is a critical defect.`, status: "fail" });
    failCount++;
    paramRows.push({ param: "Crack Presence", value: "Yes", range: criteria.crackPresence.note, status: "fail" });
  } else {
    reasons.push({ text: `No cracks detected. Brick surface integrity is acceptable.`, status: "pass" });
    paramRows.push({ param: "Crack Presence", value: "No", range: criteria.crackPresence.note, status: "pass" });
  }

  // --- Shape Irregularity ---
  if (shapeIrregularity !== criteria.shapeIrregularity.allowed) {
    reasons.push({ text: `Shape irregularity (warping or deformation) detected.`, status: "fail" });
    failCount++;
    paramRows.push({ param: "Shape Irregularity", value: "Yes", range: criteria.shapeIrregularity.note, status: "fail" });
  } else {
    reasons.push({ text: `Shape is regular with no warping or deformation.`, status: "pass" });
    paramRows.push({ param: "Shape Irregularity", value: "No", range: criteria.shapeIrregularity.note, status: "pass" });
  }

  // 4. Determine overall quality rating
  let quality;
  if (failCount === 0 && warnCount === 0) {
    quality = "GOOD";
  } else if (failCount === 0 && warnCount > 0) {
    quality = "AVERAGE";
  } else if (failCount <= 2) {
    quality = "AVERAGE";
  } else {
    quality = "POOR";
  }

  // Bump to POOR if critical parameters fail
  if (crackPresence === "yes" || shapeIrregularity === "yes") {
    if (failCount >= 2) quality = "POOR";
  }

  const suitabilityText = criteria.suitability[quality.toLowerCase()];

  // 5. Render results
  renderResults({
    brickType:     criteria.label,
    quality,
    suitability:   suitabilityText,
    reasons,
    paramRows
  });
}


/* ============================================================
   SECTION C: RENDER RESULTS TO DOM
   ============================================================ */

function renderResults({ brickType, quality, suitability, reasons, paramRows }) {

  // Show result card
  const card = document.getElementById("resultCard");
  card.style.display = "block";

  // Scroll into view
  setTimeout(() => {
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);

  // Meta
  document.getElementById("resBrickType").textContent = brickType;
  document.getElementById("resDate").textContent = getTodayString();

  // Quality badge
  const badge = document.getElementById("qualityBadge");
  badge.textContent = quality;
  badge.className = "quality-badge " + quality.toLowerCase();

  // Suitability
  document.getElementById("recommendationText").textContent = suitability;

  // Style recommendation box
  const recBox = document.getElementById("recommendationBox");
  recBox.className = "recommendation-box " + quality.toLowerCase() + "-rec";

  // Reasons list
  const list = document.getElementById("reasonsList");
  list.innerHTML = "";
  reasons.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r.text;
    li.className = r.status;
    list.appendChild(li);
  });

  // Parameter table
  const tbody = document.getElementById("paramTableBody");
  tbody.innerHTML = "";
  paramRows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.param}</td>
      <td style="font-family: var(--font-mono); font-size: 13px;">${row.value}</td>
      <td style="color: var(--text-secondary); font-size: 13px;">${row.range}</td>
      <td><span class="status-${row.status}">${row.status.toUpperCase()}</span></td>
    `;
    tbody.appendChild(tr);
  });
}


/* ============================================================
   SECTION D: HELPER FUNCTIONS
   ============================================================ */

function capitalise(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTodayString() {
  const d = new Date();
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return d.toLocaleDateString("en-IN", options);
}

function markInvalid(id) {
  document.getElementById(id).classList.add("invalid");
}

function clearValidation() {
  document.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
}

function resetForm() {
  clearValidation();
  document.getElementById("brickType").value = "";
  document.getElementById("compressiveStrength").value = "";
  document.getElementById("waterAbsorption").value = "";
  document.getElementById("efflorescence").value = "";
  document.getElementById("dimensionTolerance").value = "";
  document.getElementById("weight").value = "";
  document.getElementById("crackPresence").value = "";
  document.getElementById("shapeIrregularity").value = "";

  const card = document.getElementById("resultCard");
  card.style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}