/* ============================================================
   SMART BRICK QUALITY EVALUATION SYSTEM — script.js
   Updated: Differentiated IS-code-based criteria per brick type,
            weighted scoring system, intelligent analysis messages.
   ============================================================

   HOW TO EDIT EVALUATION CONDITIONS
   -----------------------------------
   All thresholds are defined in SECTION A: BRICK_CRITERIA.
   Each brick type is a separate object. To update a limit,
   find the brick type key (e.g. "clay", "flyash") and change
   the numeric value (min / max / warnMax / criticalMin).

   The evaluation logic in SECTION B reads everything from
   BRICK_CRITERIA — you never need to touch the logic itself.

   SCORING SYSTEM (see SECTION B for details)
   -------------------------------------------
   Each parameter is assigned a weight (1-3) based on how
   critical it is for that brick type. Failures deduct
   weighted points from a total score of 100.

     Score >= 75  =>  GOOD
     Score 50-74  =>  AVERAGE
     Score < 50   =>  POOR

   A CRITICAL failure (crack or shape defect) immediately
   caps the score at 65 regardless of other results.
   Two or more CRITICAL failures force a POOR rating.
   ============================================================ */


/* ============================================================
   SECTION A: BRICK ACCEPTANCE CRITERIA
   ------------------------------------------------------------
   Each brick type defines:
     compressiveStrength  - min (MPa). criticalMin triggers POOR.
     waterAbsorption      - max (%). warnMax = soft warning zone.
     efflorescence        - list of acceptable visual grades.
     dimensionTolerance   - max allowable deviation (mm).
     weight               - typical min/max range (kg).
     crackPresence        - must be "no".
     shapeIrregularity    - must be "no".
     paramWeights         - scoring weight per parameter (1-3).
     IS_references        - code references shown in analysis.
     suitability          - per-rating recommendation strings.
   ============================================================ */

const BRICK_CRITERIA = {

  /* ----------------------------------------------------------
     CLAY BRICK
     IS 1077 : 1992 -- Common Burnt Clay Building Bricks
     IS 3495 : 1992 -- Methods of Tests of Burnt Clay Bricks
     ----------------------------------------------------------
     Most widely used brick in India. Moderate strength,
     higher water absorption tolerance than engineered bricks.
     Efflorescence is a common defect due to soluble salts.
  ---------------------------------------------------------- */
  clay: {
    label: "Clay Brick",
    IS_references: {
      main:       "IS 1077 : 1992",
      testMethod: "IS 3495 : 1992"
    },

    compressiveStrength: {
      min:         3.5,
      criticalMin: 2.0,
      unit: "MPa",
      note: "Min. 3.5 MPa — Class 35 (IS 1077 : 1992)"
    },
    waterAbsorption: {
      max:     20,
      warnMax: 16,
      unit: "%",
      note: "Max. 20% (IS 3495 : 1992, Part 2)"
    },
    efflorescence: {
      acceptable: ["nil", "slight"],
      warning:    ["moderate"],
      note: "Nil or Slight acceptable; Moderate triggers warning (IS 3495 Part 3)"
    },
    dimensionTolerance: {
      max:     8,
      warnMax: 5,
      unit: "mm",
      note: "Max. +-8 mm batch deviation (IS 1077 : 1992)"
    },
    weight: {
      min: 2.5,
      max: 4.5,
      unit: "kg",
      note: "Typical range 2.5-4.5 kg for standard 230x110x75 mm size"
    },
    crackPresence:     { note: "No cracks permitted — IS 1077 visual inspection" },
    shapeIrregularity: { note: "No warping or deformation — IS 1077 visual inspection" },

    paramWeights: {
      compressiveStrength: 3,
      waterAbsorption:     2,
      efflorescence:       2,
      dimensionTolerance:  1,
      weight:              1,
      crackPresence:       3,
      shapeIrregularity:   2
    },

    messages: {
      compressiveStrength: {
        pass: (v, min) => `Compressive strength of ${v} MPa meets the IS 1077 minimum of ${min} MPa for Class 35 burnt clay bricks, indicating adequate load-bearing capacity.`,
        warn: (v, min) => `Compressive strength of ${v} MPa is marginally above the minimum (${min} MPa) but close to the lower bound for burnt clay bricks — acceptable only for non-structural use.`,
        fail: (v, min) => `Compressive strength of ${v} MPa falls below the IS 1077 minimum of ${min} MPa for Class 35. Burnt clay bricks with low strength are prone to structural failure under load.`
      },
      waterAbsorption: {
        pass: (v, max) => `Water absorption of ${v}% is within the IS 3495 limit of ${max}%. This indicates adequate firing quality and low porosity for a burnt clay brick.`,
        warn: (v, max) => `Water absorption of ${v}% is approaching the IS 3495 limit (${max}%). Higher absorption in clay bricks accelerates salt crystallisation and reduces durability in wet conditions.`,
        fail: (v, max) => `Water absorption of ${v}% exceeds the IS 3495 maximum of ${max}%. Over-absorbed clay bricks are prone to efflorescence, frost damage, and mortar bond failure.`
      },
      efflorescence: {
        pass: (v)      => `Efflorescence is rated "${capitalise(v)}", within acceptable limits per IS 3495 Part 3. Soluble salt content is not a concern for this batch.`,
        warn: (v)      => `Efflorescence is rated "Moderate" — a borderline result under IS 3495 Part 3. Clay bricks commonly develop salt deposits; use in non-exposed locations and apply sealant.`,
        fail: (v)      => `Efflorescence rated "${capitalise(v)}" is unacceptable per IS 3495 Part 3. Heavy salt deposits in clay bricks indicate high soluble sulphate content, which causes surface disintegration over time.`
      },
      dimensionTolerance: {
        pass: (v, max) => `Dimensional deviation of ${v} mm is within the +-${max} mm batch tolerance. Consistent sizing ensures uniform mortar joints in brickwork.`,
        warn: (v, max) => `Dimensional deviation of ${v} mm is in the warning zone. Variability in clay brick dimensions — common due to uneven kiln shrinkage — affects coursing alignment.`,
        fail: (v, max) => `Dimensional deviation of ${v} mm exceeds the +-${max} mm limit. Oversized variation in clay bricks leads to uneven joints and structural instability in masonry walls.`
      },
      weight: {
        pass: (v, mn, mx) => `Weight of ${v} kg is within the typical range of ${mn}-${mx} kg for standard clay bricks (230x110x75 mm), indicating normal density and adequate burning.`,
        warn: (v, mn, mx) => `Weight of ${v} kg is outside the typical range (${mn}-${mx} kg). An unusually light clay brick may be under-fired or excessively porous; a very heavy one may have abnormal clay density.`
      },
      crackPresence: {
        pass: ()        => `No cracks detected on the brick surface or edges. Visual inspection confirms structural integrity of the unit.`,
        fail: ()        => `Cracks are present on the clay brick. This is a critical defect — cracks indicate breakage during handling, thermal stress during firing, or drying shrinkage. Such bricks must be rejected.`
      },
      shapeIrregularity: {
        pass: ()        => `Brick shape is regular with no visible warping, chipping, or deformation. Suitable for uniform coursing.`,
        fail: ()        => `Shape irregularity (warping or deformation) detected. Clay bricks can warp during kiln firing; irregular units cause misalignment in masonry and must be rejected.`
      }
    },

    suitability: {
      good:    "Suitable for load-bearing external and internal walls, exposed brickwork, and general masonry construction as per IS 1077 Class 35 specifications.",
      average: "Conditionally acceptable for non-load-bearing partition walls, internal filler walls, and low-stress applications. Not recommended for foundations or exposed external surfaces.",
      poor:    "Does not meet minimum IS 1077 quality requirements. Batch should be rejected or subjected to re-testing. Not suitable for any structural or non-structural construction."
    }
  },


  /* ----------------------------------------------------------
     FLY ASH BRICK
     IS 12894 : 2002 -- Pulverised Fuel Ash Lime Bricks
     ----------------------------------------------------------
     Made from fly ash (industrial waste) + lime + gypsum.
     Lighter, higher strength potential, good thermal insulation.
     Stricter water absorption limits than clay bricks.
  ---------------------------------------------------------- */
  flyash: {
    label: "Fly Ash Brick",
    IS_references: {
      main:       "IS 12894 : 2002",
      testMethod: "IS 3495 : 1992"
    },

    compressiveStrength: {
      min:         7.5,
      criticalMin: 4.0,
      unit: "MPa",
      note: "Min. 7.5 MPa (IS 12894 : 2002)"
    },
    waterAbsorption: {
      max:     12,
      warnMax:  9,
      unit: "%",
      note: "Max. 12% (IS 12894 : 2002)"
    },
    efflorescence: {
      acceptable: ["nil", "slight"],
      warning:    [],
      note: "Nil or Slight acceptable (IS 12894 : 2002)"
    },
    dimensionTolerance: {
      max:     5,
      warnMax: 3,
      unit: "mm",
      note: "Max. +-5 mm (IS 12894 : 2002)"
    },
    weight: {
      min: 2.6,
      max: 3.8,
      unit: "kg",
      note: "Typical range 2.6-3.8 kg (lighter than clay bricks)"
    },
    crackPresence:     { note: "No cracks — fly ash matrix is brittle; cracks indicate curing defects" },
    shapeIrregularity: { note: "Machine-moulded fly ash bricks require consistent shape (IS 12894)" },

    paramWeights: {
      compressiveStrength: 3,
      waterAbsorption:     3,
      efflorescence:       2,
      dimensionTolerance:  1,
      weight:              1,
      crackPresence:       3,
      shapeIrregularity:   2
    },

    messages: {
      compressiveStrength: {
        pass: (v, min) => `Compressive strength of ${v} MPa meets the IS 12894 requirement of ${min} MPa. Fly ash bricks achieve strength through lime-pozzolanic reaction, and this sample performs adequately.`,
        warn: (v, min) => `Compressive strength of ${v} MPa is above the IS 12894 minimum (${min} MPa) but limited. Higher strength is expected from proper steam curing — check curing process compliance.`,
        fail: (v, min) => `Compressive strength of ${v} MPa is below the IS 12894 minimum of ${min} MPa. This indicates incomplete lime-fly ash pozzolanic reaction, likely due to improper curing or incorrect lime proportion.`
      },
      waterAbsorption: {
        pass: (v, max) => `Water absorption of ${v}% is within the IS 12894 limit of ${max}%. Fly ash bricks generally require lower absorption for long-term durability, and this sample complies.`,
        warn: (v, max) => `Water absorption of ${v}% is approaching the IS 12894 limit (${max}%). Fly ash bricks are more susceptible to moisture-related degradation than clay bricks — this value warrants caution in wet environments.`,
        fail: (v, max) => `Water absorption of ${v}% exceeds the IS 12894 maximum of ${max}%. Fly ash bricks generally require lower water absorption for durability; excessive absorption weakens the lime-fly ash bond and promotes sulphate attack.`
      },
      efflorescence: {
        pass: (v)      => `Efflorescence rated "${capitalise(v)}" — no significant salt deposits detected. Fly ash bricks can carry residual sulphates from ash; this sample shows no concerning level.`,
        warn: (v)      => `Efflorescence rated "Moderate" is a concern for fly ash bricks. The fly ash raw material may contain elevated soluble calcium or sulphate compounds. Restrict use to interior walls.`,
        fail: (v)      => `Efflorescence rated "${capitalise(v)}" is unacceptable. Fly ash bricks with high efflorescence indicate elevated sulphate content in the ash feed material, causing surface damage and mortar deterioration over time.`
      },
      dimensionTolerance: {
        pass: (v, max) => `Dimensional deviation of ${v} mm is within +-${max} mm. Machine-pressed fly ash bricks are expected to have tight tolerances, and this batch complies.`,
        warn: (v, max) => `Dimensional deviation of ${v} mm is in the warning zone for fly ash bricks, which are machine-moulded and expected to have tighter consistency than handmade clay bricks.`,
        fail: (v, max) => `Dimensional deviation of ${v} mm exceeds +-${max} mm. Fly ash bricks are machine-pressed and should have precise dimensions; excessive variation suggests mould wear or inconsistent mix proportions.`
      },
      weight: {
        pass: (v, mn, mx) => `Weight of ${v} kg is within the expected range (${mn}-${mx} kg). Fly ash bricks are lighter than clay bricks due to lower raw material density, reducing structural dead load.`,
        warn: (v, mn, mx) => `Weight of ${v} kg is outside the expected range (${mn}-${mx} kg). An unusually heavy fly ash brick may have excess lime or high-density filler; a very light one may be under-compacted.`
      },
      crackPresence: {
        pass: ()        => `No cracks detected. The fly ash-lime matrix is intact, indicating proper curing and compaction during manufacturing.`,
        fail: ()        => `Cracks detected on the fly ash brick. This is a critical defect. Cracks in fly ash bricks commonly result from inadequate steam curing time, shrinkage stresses, or rough handling before sufficient strength gain.`
      },
      shapeIrregularity: {
        pass: ()        => `Shape is regular — consistent with machine-pressed fly ash brick manufacturing standards.`,
        fail: ()        => `Shape irregularity detected. Fly ash bricks are machine-moulded and should have uniform geometry; warping or deformation indicates defective pressing or mould release issues.`
      }
    },

    suitability: {
      good:    "Suitable for load-bearing and non-load-bearing walls, partition walls, and general masonry. Preferred for green construction due to industrial waste utilisation. Good thermal insulation properties.",
      average: "Conditionally acceptable for non-load-bearing partition walls and internal masonry. Avoid use in high-moisture zones, foundations, or external exposed surfaces.",
      poor:    "Does not meet IS 12894 : 2002 minimum requirements. Batch should be rejected. Strength or durability deficiencies make this unsafe for any construction application."
    }
  },


  /* ----------------------------------------------------------
     CONCRETE BRICK
     IS 2185 (Part 1) : 2005 -- Concrete Masonry Units
     ----------------------------------------------------------
     Dense aggregate concrete blocks/bricks.
     Higher strength, lower water absorption than clay.
     Heavier units; used for structural and pavement work.
  ---------------------------------------------------------- */
  concrete: {
    label: "Concrete Brick",
    IS_references: {
      main:       "IS 2185 (Part 1) : 2005",
      testMethod: "IS 2185 Part 1, Cl. 7"
    },

    compressiveStrength: {
      min:         5.0,
      criticalMin: 3.5,
      unit: "MPa",
      note: "Min. 5.0 MPa — Grade A (IS 2185 Part 1 : 2005)"
    },
    waterAbsorption: {
      max:     10,
      warnMax:  7,
      unit: "%",
      note: "Max. 10% (IS 2185 Part 1 : 2005)"
    },
    efflorescence: {
      acceptable: ["nil", "slight", "moderate"],
      warning:    ["heavy"],
      note: "Up to Moderate acceptable; Heavy triggers warning (IS 2185)"
    },
    dimensionTolerance: {
      max:     5,
      warnMax: 3,
      unit: "mm",
      note: "Max. +-5 mm (IS 2185 Part 1 : 2005)"
    },
    weight: {
      min: 3.5,
      max: 6.5,
      unit: "kg",
      note: "Typical range 3.5-6.5 kg (dense aggregate concrete)"
    },
    crackPresence:     { note: "No cracks — cracks indicate aggregate-cement bond failure (IS 2185)" },
    shapeIrregularity: { note: "Precision shape required for coursed masonry (IS 2185)" },

    paramWeights: {
      compressiveStrength: 3,
      waterAbsorption:     2,
      efflorescence:       1,
      dimensionTolerance:  2,
      weight:              1,
      crackPresence:       3,
      shapeIrregularity:   2
    },

    messages: {
      compressiveStrength: {
        pass: (v, min) => `Compressive strength of ${v} MPa meets the IS 2185 Grade A minimum of ${min} MPa. Concrete bricks rely on cement hydration for strength; this result confirms adequate cement content and curing.`,
        warn: (v, min) => `Compressive strength of ${v} MPa meets the minimum (${min} MPa) but is moderate for a concrete brick. Dense concrete units should ideally exceed 7.5 MPa for structural masonry applications.`,
        fail: (v, min) => `Compressive strength of ${v} MPa is below the IS 2185 Grade A minimum of ${min} MPa. This suggests low cement content, poor aggregate grading, or insufficient curing period for the concrete mix.`
      },
      waterAbsorption: {
        pass: (v, max) => `Water absorption of ${v}% is within the IS 2185 limit of ${max}%. Concrete bricks with low absorption have a dense matrix, resisting chloride and sulphate ingress effectively.`,
        warn: (v, max) => `Water absorption of ${v}% is in the warning zone. Concrete bricks should ideally have lower absorption than this; a porous concrete matrix reduces long-term durability, especially in coastal or wet environments.`,
        fail: (v, max) => `Water absorption of ${v}% exceeds the IS 2185 maximum of ${max}%. High absorption in concrete bricks indicates a porous mix — often caused by high water-cement ratio, coarse aggregate gaps, or inadequate compaction.`
      },
      efflorescence: {
        pass: (v)      => `Efflorescence rated "${capitalise(v)}" — within acceptable range. Concrete bricks can develop minor lime bloom as cement hydrates; this level is not structurally significant.`,
        warn: (v)      => `Efflorescence rated "${capitalise(v)}" is at the warning threshold for concrete bricks. Heavy calcium carbonate deposits suggest excess free lime from over-watered mix or poor curing conditions.`,
        fail: (v)      => `Efflorescence rated "${capitalise(v)}" is unacceptable. Serious salt deposits on concrete bricks indicate high soluble sulphate or chloride presence, which can degrade the cement paste matrix over time.`
      },
      dimensionTolerance: {
        pass: (v, max) => `Dimensional deviation of ${v} mm is within the +-${max} mm limit. Concrete bricks are machine-cast and maintain tight dimensional consistency for proper mortar joint uniformity.`,
        warn: (v, max) => `Dimensional deviation of ${v} mm is in the warning zone. Concrete masonry units should have consistent dimensions to maintain wall alignment and structural continuity.`,
        fail: (v, max) => `Dimensional deviation of ${v} mm exceeds +-${max} mm for concrete bricks, exceeding IS 2185 tolerance. Non-uniform mortar joints will result, reducing masonry structural efficiency.`
      },
      weight: {
        pass: (v, mn, mx) => `Weight of ${v} kg is within the expected range (${mn}-${mx} kg) for solid concrete bricks, consistent with normal aggregate density.`,
        warn: (v, mn, mx) => `Weight of ${v} kg is outside the typical range (${mn}-${mx} kg). Concrete bricks are denser than clay units; significant deviation may indicate mix proportion errors or void anomalies.`
      },
      crackPresence: {
        pass: ()        => `No cracks detected. The cement-aggregate matrix is intact, indicating adequate compaction and curing.`,
        fail: ()        => `Cracks detected on the concrete brick. In concrete masonry units, cracks typically result from premature demoulding, thermal shrinkage, or impact damage. Such units are structurally unsafe.`
      },
      shapeIrregularity: {
        pass: ()        => `Shape is regular. Concrete bricks are cast in steel moulds and this unit meets expected dimensional uniformity.`,
        fail: ()        => `Shape irregularity detected. Defective mould release, early stripping, or impact deformation during curing can cause shape distortion in concrete bricks, preventing even load transfer in walls.`
      }
    },

    suitability: {
      good:    "Suitable for structural masonry walls, foundations, boundary walls, pavements, and retaining structures. Recommended for high-load applications due to superior compressive strength.",
      average: "Acceptable for non-load-bearing internal partitions, compound walls, and garden structures. Not recommended for foundations, columns, or primary structural walls.",
      poor:    "Does not comply with IS 2185 Part 1 quality requirements. Not suitable for any structural purpose. Batch should be rejected and concrete mix design reviewed."
    }
  },


  /* ----------------------------------------------------------
     SAND LIME BRICK (Calcium Silicate Brick)
     IS 4139 : 1989 -- Calcium Silicate (Sand Lime) Bricks
     ----------------------------------------------------------
     Manufactured by autoclave curing of sand and hydrated lime.
     Highest dimensional accuracy among common brick types.
     High compressive strength; low moisture movement.
  ---------------------------------------------------------- */
  sandlime: {
    label: "Sand Lime Brick",
    IS_references: {
      main:       "IS 4139 : 1989",
      testMethod: "IS 4139 Part 1 & 2"
    },

    compressiveStrength: {
      min:         10.0,
      criticalMin:  6.0,
      unit: "MPa",
      note: "Min. 10.0 MPa — Class B (IS 4139 : 1989)"
    },
    waterAbsorption: {
      max:     16,
      warnMax: 12,
      unit: "%",
      note: "Max. 16% (IS 4139 : 1989)"
    },
    efflorescence: {
      acceptable: ["nil", "slight"],
      warning:    [],
      note: "Nil or Slight acceptable (IS 4139 : 1989)"
    },
    dimensionTolerance: {
      max:     4,
      warnMax: 2,
      unit: "mm",
      note: "Max. +-4 mm (IS 4139 : 1989) — autoclave precision expected"
    },
    weight: {
      min: 3.0,
      max: 4.8,
      unit: "kg",
      note: "Typical range 3.0-4.8 kg (denser than clay, lighter than concrete)"
    },
    crackPresence:     { note: "No cracks — autoclave-cured calcium silicate is brittle; cracks indicate pressure defects" },
    shapeIrregularity: { note: "Autoclave process produces high-precision shape; irregularity indicates press defects (IS 4139)" },

    paramWeights: {
      compressiveStrength: 3,
      waterAbsorption:     2,
      efflorescence:       2,
      dimensionTolerance:  3,
      weight:              1,
      crackPresence:       3,
      shapeIrregularity:   2
    },

    messages: {
      compressiveStrength: {
        pass: (v, min) => `Compressive strength of ${v} MPa meets the IS 4139 Class B minimum of ${min} MPa. Sand lime bricks achieve strength through calcium silicate crystal formation during autoclaving, and this value confirms adequate reaction completion.`,
        warn: (v, min) => `Compressive strength of ${v} MPa is above the IS 4139 minimum (${min} MPa) but on the lower side. Sand lime bricks should ideally achieve 15-20 MPa with proper autoclave pressure and curing time.`,
        fail: (v, min) => `Compressive strength of ${v} MPa falls below the IS 4139 Class B minimum of ${min} MPa. This indicates incomplete calcium silicate crystal formation — likely due to insufficient autoclave pressure, temperature, or inadequate lime-silica ratio.`
      },
      waterAbsorption: {
        pass: (v, max) => `Water absorption of ${v}% is within the IS 4139 limit of ${max}%. Sand lime bricks have moderate absorption due to their microcrystalline silicate matrix, and this result is acceptable.`,
        warn: (v, max) => `Water absorption of ${v}% is in the warning zone (limit: ${max}%). Higher-than-expected absorption in sand lime bricks may indicate incomplete autoclaving or inadequate compaction before curing.`,
        fail: (v, max) => `Water absorption of ${v}% exceeds the IS 4139 maximum of ${max}%. Excessive moisture uptake in sand lime bricks weakens the calcium silicate bond and accelerates carbonation under wet-dry cycling.`
      },
      efflorescence: {
        pass: (v)      => `Efflorescence rated "${capitalise(v)}" — acceptable per IS 4139. Sand lime bricks are not kiln-fired, so soluble salt content depends on raw material quality; this sample shows no concern.`,
        warn: (v)      => `Efflorescence rated "Moderate" is above the acceptable range for sand lime bricks. Unlike clay bricks, sand lime bricks do not undergo high-temperature firing to drive off soluble salts — restrict use to interior applications.`,
        fail: (v)      => `Efflorescence rated "${capitalise(v)}" is unacceptable. Sand lime bricks with heavy salt deposits have contaminated raw materials, leading to surface deterioration and bond weakness.`
      },
      dimensionTolerance: {
        pass: (v, max) => `Dimensional deviation of ${v} mm is within the +-${max} mm limit. Sand lime bricks are autoclave-pressed and should have the tightest dimensional tolerances among common brick types — this result confirms quality.`,
        warn: (v, max) => `Dimensional deviation of ${v} mm is above expected accuracy for an autoclave-cured sand lime brick. Dimensional precision is a key advantage of this type; variation may indicate press calibration issues.`,
        fail: (v, max) => `Dimensional deviation of ${v} mm exceeds the IS 4139 tolerance of +-${max} mm. Autoclave-pressed sand lime bricks should have the best dimensional accuracy; exceeding this limit compromises a key product advantage and affects coursing quality.`
      },
      weight: {
        pass: (v, mn, mx) => `Weight of ${v} kg is within the typical range (${mn}-${mx} kg) for sand lime bricks, consistent with standard silica-lime density.`,
        warn: (v, mn, mx) => `Weight of ${v} kg is outside the typical range (${mn}-${mx} kg). Sand lime bricks have consistent density from autoclave pressing; weight anomalies suggest variable compaction pressure or mix proportions.`
      },
      crackPresence: {
        pass: ()        => `No cracks detected. The calcium silicate matrix is intact, indicating successful autoclave curing and proper demoulding.`,
        fail: ()        => `Cracks detected on the sand lime brick. Calcium silicate bricks are brittle; cracks arise from autoclave pressure release shock, improper demoulding, or post-curing impact. Reject this batch immediately.`
      },
      shapeIrregularity: {
        pass: ()        => `Shape is regular, consistent with autoclave-pressed manufacturing precision. Sand lime bricks are known for superior dimensional consistency.`,
        fail: ()        => `Shape irregularity detected. Autoclave-pressed sand lime bricks should exhibit the highest shape precision of all common brick types — irregularity signals a press defect or damage during handling after autoclave release.`
      }
    },

    suitability: {
      good:    "Suitable for load-bearing walls, fair-face masonry, columns, and architectural brickwork requiring precise dimensions. Recommended for high-rise and precision masonry construction.",
      average: "Acceptable for non-load-bearing partition walls and internal masonry where precision fit is not critical. Avoid use in permanently damp or subterranean conditions.",
      poor:    "Does not meet IS 4139 : 1989 minimum requirements. Key properties of sand lime brick (precision, strength) are compromised. Batch must be rejected."
    }
  },


  /* ----------------------------------------------------------
     INTERLOCKING BRICK
     No dedicated IS code -- evaluated against IS 2185 (ref.)
     with tighter shape and tolerance criteria.
     ----------------------------------------------------------
     Engineered geometry for mortarless or thin-joint masonry.
     Shape precision is the MOST critical parameter.
     Used for pavements, low-cost housing, retaining walls.
  ---------------------------------------------------------- */
  interlocking: {
    label: "Interlocking Brick",
    IS_references: {
      main:       "IS 2185 (Ref.) + General Engineering Standards",
      testMethod: "ASTM C936 / BIS Pavement Block Guidelines"
    },

    compressiveStrength: {
      min:         5.0,
      criticalMin: 3.0,
      unit: "MPa",
      note: "Min. 5.0 MPa (ref. IS 2185 / ASTM C936 for pavement blocks)"
    },
    waterAbsorption: {
      max:     10,
      warnMax:  7,
      unit: "%",
      note: "Max. 10% (general standard for interlocking masonry units)"
    },
    efflorescence: {
      acceptable: ["nil", "slight"],
      warning:    ["moderate"],
      note: "Nil or Slight acceptable; Moderate triggers warning"
    },
    dimensionTolerance: {
      max:     3,
      warnMax: 1.5,
      unit: "mm",
      note: "Max. +-3 mm — CRITICAL for interlocking fit precision"
    },
    weight: {
      min: 2.0,
      max: 5.5,
      unit: "kg",
      note: "Typical range 2.0-5.5 kg (varies by design geometry)"
    },
    crackPresence:     { note: "No cracks — interlocking joint areas are stress concentration points" },
    shapeIrregularity: { note: "CRITICAL: precise shape is the fundamental requirement for interlocking systems" },

    paramWeights: {
      compressiveStrength: 2,
      waterAbsorption:     2,
      efflorescence:       1,
      dimensionTolerance:  3,
      weight:              1,
      crackPresence:       3,
      shapeIrregularity:   3
    },

    messages: {
      compressiveStrength: {
        pass: (v, min) => `Compressive strength of ${v} MPa meets the minimum of ${min} MPa. Interlocking bricks transfer loads through their interlocked geometry, so compressive strength requirements are moderate compared to conventional masonry.`,
        warn: (v, min) => `Compressive strength of ${v} MPa is above the minimum (${min} MPa) but limited. For vehicular pavement or retaining wall use, interlocking bricks should ideally exceed 8 MPa.`,
        fail: (v, min) => `Compressive strength of ${v} MPa falls below the minimum of ${min} MPa. Low-strength interlocking bricks are prone to crushing at joint contact points where stress concentrations occur during cyclic loading.`
      },
      waterAbsorption: {
        pass: (v, max) => `Water absorption of ${v}% is within acceptable limits (max ${max}%). Low absorption prevents joint slippage and maintains dimensional stability under moisture variation in interlocking systems.`,
        warn: (v, max) => `Water absorption of ${v}% is in the warning zone (max ${max}%). Interlocking systems rely on precise dimensions — moisture-induced swelling from higher absorption can disrupt the interlocking fit over time.`,
        fail: (v, max) => `Water absorption of ${v}% exceeds the ${max}% limit. High absorption in interlocking bricks causes moisture-induced dimensional changes, degrading the precision fit and reducing pavement or wall stability.`
      },
      efflorescence: {
        pass: (v)      => `Efflorescence rated "${capitalise(v)}" — acceptable. Minimal salt deposits will not affect the interlocking joint performance.`,
        warn: (v)      => `Efflorescence rated "Moderate" is borderline. For paving applications, surface salt deposits reduce skid resistance and aesthetics; restrict this batch to non-exposed applications.`,
        fail: (v)      => `Efflorescence rated "${capitalise(v)}" is unacceptable. Salt crystallisation around interlocking joints can physically wedge units apart over time, causing misalignment in the assembly.`
      },
      dimensionTolerance: {
        pass: (v, max) => `Dimensional deviation of ${v} mm is within the +-${max} mm limit. This level of precision is essential for interlocking bricks — it ensures proper engagement of the interlocking profiles and uniform load distribution.`,
        warn: (v, max) => `Dimensional deviation of ${v} mm is in the warning zone. Interlocking bricks require the tightest tolerances of all brick types — even small dimensional errors accumulate across a wall or pavement panel, causing progressive misalignment.`,
        fail: (v, max) => `Dimensional deviation of ${v} mm exceeds the +-${max} mm limit. This is a critical failure for interlocking bricks. The interlocking joint geometry demands the highest dimensional precision; excessive variation prevents proper brick engagement and load transfer.`
      },
      weight: {
        pass: (v, mn, mx) => `Weight of ${v} kg is within the expected range (${mn}-${mx} kg). Weight consistency across an interlocking batch ensures uniform compaction in pavement applications.`,
        warn: (v, mn, mx) => `Weight of ${v} kg is outside the expected range (${mn}-${mx} kg). Interlocking brick weight varies by geometry design — verify that this deviation does not indicate density inconsistency.`
      },
      crackPresence: {
        pass: ()        => `No cracks detected. The brick unit is structurally sound and the interlocking joint surfaces are intact.`,
        fail: ()        => `Cracks detected. This is a critical defect for interlocking bricks — the interlocking protrusions and recesses are stress concentration zones, and any crack initiating there will propagate rapidly under cyclic pavement or wall loading.`
      },
      shapeIrregularity: {
        pass: ()        => `Shape is regular. The interlocking geometry is intact and dimensionally consistent — the fundamental requirement for a functional interlocking brick system.`,
        fail: ()        => `Shape irregularity detected. This is the most critical defect for interlocking bricks. Warped, chipped, or deformed interlocking protrusions and recesses will prevent proper brick engagement, causing structural instability in the assembled system. Reject this batch entirely.`
      }
    },

    suitability: {
      good:    "Suitable for pedestrian and light vehicular pavements, retaining walls, low-cost housing construction, and landscape structures. Mortarless installation reduces construction time significantly.",
      average: "Acceptable for low-traffic pedestrian paths and garden landscaping only. Dimensional imprecision limits full interlocking engagement — use with thin mortar joints to compensate.",
      poor:    "Dimensional or structural deficiencies prevent safe interlocking. Not suitable for any load-bearing or pavement application. Reject entire batch — interlocking geometry integrity is compromised."
    }
  }

};


/* ============================================================
   SECTION B: SCORING ENGINE
   ------------------------------------------------------------
   Weighted deduction table:
     FAIL on weight-3 param  -> deduct 20 pts
     FAIL on weight-2 param  -> deduct 12 pts
     FAIL on weight-1 param  -> deduct  7 pts
     WARN on weight-3 param  -> deduct  8 pts
     WARN on weight-2 param  -> deduct  5 pts
     WARN on weight-1 param  -> deduct  3 pts

   CRITICAL overrides:
     1 critical fail   -> score capped at 65
     2+ critical fails -> forced POOR

   Final rating:
     score >= 75  ->  GOOD
     score >= 50  ->  AVERAGE
     score <  50  ->  POOR
   ============================================================ */

const SCORE_DEDUCTIONS = {
  fail: { 3: 20, 2: 12, 1: 7 },
  warn: { 3:  8, 2:  5, 1: 3 }
};

function computeScore(results, paramWeights) {
  let score = 100;
  results.forEach(r => {
    if (r.scoreStatus === "fail" || r.scoreStatus === "warn") {
      const w = paramWeights[r.paramKey] || 1;
      score -= (SCORE_DEDUCTIONS[r.scoreStatus][w] || 0);
    }
  });
  return Math.max(0, score);
}

function scoreToRating(score, criticalFailCount) {
  if (criticalFailCount >= 2)                   return "POOR";
  if (criticalFailCount === 1 && score < 70)    return "POOR";
  if (score >= 75)                              return "GOOD";
  if (score >= 50)                              return "AVERAGE";
  return "POOR";
}


/* ============================================================
   SECTION C: PARAMETER EVALUATORS
   Each function returns:
     { paramKey, scoreStatus, displayStatus, message,
       isCritical, paramRow }
   ============================================================ */

function evalCompressiveStrength(value, criteria) {
  const { min, criticalMin, note } = criteria.compressiveStrength;
  const msgs = criteria.messages.compressiveStrength;
  let scoreStatus, displayStatus, message;

  if (value < criticalMin) {
    scoreStatus = displayStatus = "fail";
    message = msgs.fail(value, min);
  } else if (value < min) {
    scoreStatus = displayStatus = "fail";
    message = msgs.fail(value, min);
  } else if (value < min * 1.15) {
    scoreStatus = displayStatus = "warn";
    message = msgs.warn(value, min);
  } else {
    scoreStatus = displayStatus = "pass";
    message = msgs.pass(value, min);
  }

  return {
    paramKey: "compressiveStrength",
    scoreStatus, displayStatus, message,
    isCritical: false,
    paramRow: { param: "Compressive Strength", value: `${value} MPa`, range: note, status: displayStatus }
  };
}

function evalWaterAbsorption(value, criteria) {
  const { max, warnMax, note } = criteria.waterAbsorption;
  const msgs = criteria.messages.waterAbsorption;
  let scoreStatus, displayStatus, message;

  if (value > max) {
    scoreStatus = displayStatus = "fail";
    message = msgs.fail(value, max);
  } else if (value > warnMax) {
    scoreStatus = displayStatus = "warn";
    message = msgs.warn(value, max);
  } else {
    scoreStatus = displayStatus = "pass";
    message = msgs.pass(value, max);
  }

  return {
    paramKey: "waterAbsorption",
    scoreStatus, displayStatus, message,
    isCritical: false,
    paramRow: { param: "Water Absorption", value: `${value}%`, range: note, status: displayStatus }
  };
}

function evalEfflorescence(value, criteria) {
  const { acceptable, warning, note } = criteria.efflorescence;
  const msgs = criteria.messages.efflorescence;
  let scoreStatus, displayStatus, message;

  if (acceptable.includes(value)) {
    scoreStatus = displayStatus = "pass";
    message = msgs.pass(value);
  } else if (warning.includes(value)) {
    scoreStatus = displayStatus = "warn";
    message = msgs.warn(value);
  } else {
    scoreStatus = displayStatus = "fail";
    message = msgs.fail(value);
  }

  return {
    paramKey: "efflorescence",
    scoreStatus, displayStatus, message,
    isCritical: false,
    paramRow: { param: "Efflorescence Level", value: capitalise(value), range: note, status: displayStatus }
  };
}

function evalDimensionTolerance(value, criteria) {
  const { max, warnMax, note } = criteria.dimensionTolerance;
  const msgs = criteria.messages.dimensionTolerance;
  let scoreStatus, displayStatus, message;

  if (value > max) {
    scoreStatus = displayStatus = "fail";
    message = msgs.fail(value, max);
  } else if (value > warnMax) {
    scoreStatus = displayStatus = "warn";
    message = msgs.warn(value, max);
  } else {
    scoreStatus = displayStatus = "pass";
    message = msgs.pass(value, max);
  }

  return {
    paramKey: "dimensionTolerance",
    scoreStatus, displayStatus, message,
    isCritical: false,
    paramRow: { param: "Dimension Tolerance", value: `${value} mm`, range: note, status: displayStatus }
  };
}

function evalWeight(value, criteria) {
  const { min, max, note } = criteria.weight;
  const msgs = criteria.messages.weight;
  let scoreStatus, displayStatus, message;

  if (value < min || value > max) {
    scoreStatus = displayStatus = "warn";
    message = msgs.warn(value, min, max);
  } else {
    scoreStatus = displayStatus = "pass";
    message = msgs.pass(value, min, max);
  }

  return {
    paramKey: "weight",
    scoreStatus, displayStatus, message,
    isCritical: false,
    paramRow: { param: "Weight", value: `${value} kg`, range: note, status: displayStatus }
  };
}

function evalCrackPresence(value, criteria) {
  const { note } = criteria.crackPresence;
  const msgs = criteria.messages.crackPresence;
  const hasCrack = (value === "yes");

  return {
    paramKey: "crackPresence",
    scoreStatus:   hasCrack ? "fail" : "pass",
    displayStatus: hasCrack ? "fail" : "pass",
    message:       hasCrack ? msgs.fail() : msgs.pass(),
    isCritical:    hasCrack,
    paramRow: { param: "Crack Presence", value: hasCrack ? "Yes" : "No", range: note, status: hasCrack ? "fail" : "pass" }
  };
}

function evalShapeIrregularity(value, criteria) {
  const { note } = criteria.shapeIrregularity;
  const msgs = criteria.messages.shapeIrregularity;
  const irregular = (value === "yes");

  return {
    paramKey: "shapeIrregularity",
    scoreStatus:   irregular ? "fail" : "pass",
    displayStatus: irregular ? "fail" : "pass",
    message:       irregular ? msgs.fail() : msgs.pass(),
    isCritical:    irregular,
    paramRow: { param: "Shape Irregularity", value: irregular ? "Yes" : "No", range: note, status: irregular ? "fail" : "pass" }
  };
}


/* ============================================================
   SECTION D: MAIN EVALUATION ENTRY POINT
   Called by onclick="evaluateBrick()" in index.html
   ============================================================ */

function evaluateBrick() {

  // 1. Read all form inputs
  const brickType           = document.getElementById("brickType").value;
  const compressiveStrength = parseFloat(document.getElementById("compressiveStrength").value);
  const waterAbsorption     = parseFloat(document.getElementById("waterAbsorption").value);
  const efflorescence       = document.getElementById("efflorescence").value;
  const dimensionTolerance  = parseFloat(document.getElementById("dimensionTolerance").value);
  const weight              = parseFloat(document.getElementById("weight").value);
  const crackPresence       = document.getElementById("crackPresence").value;
  const shapeIrregularity   = document.getElementById("shapeIrregularity").value;

  // 2. Validate all fields are filled
  clearValidation();
  let valid = true;
  if (!brickType)                 { markInvalid("brickType");           valid = false; }
  if (isNaN(compressiveStrength)) { markInvalid("compressiveStrength"); valid = false; }
  if (isNaN(waterAbsorption))     { markInvalid("waterAbsorption");     valid = false; }
  if (!efflorescence)             { markInvalid("efflorescence");       valid = false; }
  if (isNaN(dimensionTolerance))  { markInvalid("dimensionTolerance");  valid = false; }
  if (isNaN(weight))              { markInvalid("weight");              valid = false; }
  if (!crackPresence)             { markInvalid("crackPresence");       valid = false; }
  if (!shapeIrregularity)         { markInvalid("shapeIrregularity");   valid = false; }

  if (!valid) {
    alert("Please fill in all fields before evaluating.");
    return;
  }

  // 3. Load criteria for selected brick type
  const criteria = BRICK_CRITERIA[brickType];

  // 4. Evaluate each parameter independently
  const results = [
    evalCompressiveStrength(compressiveStrength, criteria),
    evalWaterAbsorption(waterAbsorption, criteria),
    evalEfflorescence(efflorescence, criteria),
    evalDimensionTolerance(dimensionTolerance, criteria),
    evalWeight(weight, criteria),
    evalCrackPresence(crackPresence, criteria),
    evalShapeIrregularity(shapeIrregularity, criteria)
  ];

  // 5. Count critical failures
  const criticalFailCount = results.filter(r => r.isCritical).length;

  // 6. Compute weighted score; cap on critical failures
  let score = computeScore(results, criteria.paramWeights);
  if (criticalFailCount >= 1) score = Math.min(score, 65);

  // 7. Determine final quality rating
  const quality = scoreToRating(score, criticalFailCount);

  // 8. Build suitability recommendation with actionable suggestions
  const recommendation = buildRecommendation(quality, criteria, results);

  // 9. Render to page
  renderResults({
    brickType:      criteria.label,
    isCode:         criteria.IS_references.main,
    quality,
    score,
    recommendation,
    reasons:   results.map(r => ({ text: r.message, status: r.displayStatus })),
    paramRows: results.map(r => r.paramRow)
  });
}


/* ============================================================
   SECTION E: RECOMMENDATION BUILDER
   ============================================================ */

function buildRecommendation(quality, criteria, results) {
  const failedParams = results.filter(r => r.scoreStatus === "fail").map(r => r.paramKey);
  const warnedParams = results.filter(r => r.scoreStatus === "warn").map(r => r.paramKey);
  let base = criteria.suitability[quality.toLowerCase()];

  const suggestions = [];
  if (failedParams.includes("compressiveStrength"))
    suggestions.push("Review curing process and raw material proportions to improve strength.");
  if (failedParams.includes("waterAbsorption") || warnedParams.includes("waterAbsorption"))
    suggestions.push("Improve compaction and reduce water-cement/lime ratio to lower porosity.");
  if (failedParams.includes("efflorescence"))
    suggestions.push("Use low-sulphate raw materials and apply anti-efflorescence surface treatment.");
  if (failedParams.includes("crackPresence"))
    suggestions.push("Inspect handling and curing procedures to prevent crack formation.");
  if (failedParams.includes("dimensionTolerance"))
    suggestions.push("Recalibrate moulds and verify pressing and firing process consistency.");
  if (failedParams.includes("shapeIrregularity"))
    suggestions.push("Review mould condition and demoulding process to prevent shape deformation.");

  if (suggestions.length > 0 && quality !== "GOOD") {
    base += "\n\nImprovement Actions: " + suggestions.join(" ");
  }
  return base;
}


/* ============================================================
   SECTION F: DOM RENDERER
   ============================================================ */

function renderResults({ brickType, isCode, quality, score, recommendation, reasons, paramRows }) {
  const card = document.getElementById("resultCard");
  card.style.display = "block";
  setTimeout(() => card.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

  document.getElementById("resBrickType").textContent = brickType;
  document.getElementById("resDate").textContent = getTodayString();

  const isEl = document.getElementById("resISCode");
  if (isEl) isEl.textContent = isCode;

  const scoreEl = document.getElementById("resScore");
  if (scoreEl) scoreEl.textContent = score + " / 100";

  const badge = document.getElementById("qualityBadge");
  badge.textContent = quality;
  badge.className = "quality-badge " + quality.toLowerCase();

  document.getElementById("recommendationText").textContent = recommendation;

  const list = document.getElementById("reasonsList");
  list.innerHTML = "";
  reasons.forEach(r => {
    const li = document.createElement("li");
    li.textContent = r.text;
    li.className = r.status;
    list.appendChild(li);
  });

  const tbody = document.getElementById("paramTableBody");
  tbody.innerHTML = "";
  paramRows.forEach(row => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.param}</td>
      <td style="font-family:var(--font-mono);font-size:13px;">${row.value}</td>
      <td style="color:var(--text-secondary);font-size:12.5px;">${row.range}</td>
      <td><span class="status-${row.status}">${row.status.toUpperCase()}</span></td>
    `;
    tbody.appendChild(tr);
  });
}


/* ============================================================
   SECTION G: UTILITIES
   ============================================================ */

function capitalise(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function getTodayString() {
  return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function markInvalid(id) {
  document.getElementById(id).classList.add("invalid");
}

function clearValidation() {
  document.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid"));
}

function resetForm() {
  clearValidation();
  ["brickType","compressiveStrength","waterAbsorption","efflorescence",
   "dimensionTolerance","weight","crackPresence","shapeIrregularity"]
    .forEach(id => { document.getElementById(id).value = ""; });
  document.getElementById("resultCard").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}