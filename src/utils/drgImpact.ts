export type DrgImpactTier = 'MCC' | 'CC' | 'MINOR' | 'NON_CC';

export interface DrgImpactInfo {
  tier: DrgImpactTier;
  code: string;
  badgeLabel: string;
  shortLabel: string;
  titleTh: string;
  descriptionTh: string;
  ccl: number; // 0, 1, 2, 3, 4 (Complication & Comorbidity Level)
  priorityLevel: 1 | 2 | 3 | 4; // 1 = highest audit review priority (MCC)
  priorityLabelTh: string;
  rwImpactEstimateTh: string;
  auditScrutinyTh: string;
  style: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotBg: string;
    hoverRing: string;
    darkBadgeBg: string;
    darkBadgeText: string;
    darkBadgeBorder: string;
  };
}

export interface PdxDrgBaseInfo {
  code: string;
  baseTier: 'HIGH_BASE' | 'MODERATE_BASE' | 'STANDARD_BASE';
  badgeLabelTh: string;
  baseRwEstimateTh: string;
  descriptionTh: string;
  style: {
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotBg: string;
  };
}

/**
 * Clean ICD-10 code (removes dots and trims uppercase)
 */
function cleanCode(code: string): string {
  return (code || '').trim().toUpperCase().replace(/\./g, '');
}

/**
 * Determine the DRG Impact and Complication & Comorbidity Level (CCL) for a secondary ICD-10 diagnosis
 */
export function getDrgImpactForIcd10(code: string): DrgImpactInfo {
  const c = cleanCode(code);

  // 1. Major Complication & Comorbidity (MCC) - CCL 3 to 4
  // Direct driver of highest DRG split; primary audit target for clawbacks
  const isMcc =
    // Septic / Cardiogenic / Hypovolemic Shock
    c.startsWith('R57') ||
    // Acute Respiratory Failure & ARDS
    c.startsWith('J960') ||
    c.startsWith('J962') ||
    c === 'J9600' ||
    c === 'J9601' ||
    c === 'J9609' ||
    c === 'J80' ||
    c === 'J9582' ||
    // Acute Kidney Failure / AKI
    c.startsWith('N17') ||
    // Acute Hepatic Failure
    c.startsWith('K720') ||
    c.startsWith('K729') ||
    // Coagulation defect / DIC
    c === 'D65' ||
    // Cardiac Arrest & Ventricular Fibrillation
    c.startsWith('I46') ||
    c === 'I490' ||
    // Acute Myocardial Infarction
    c.startsWith('I21') ||
    // Sepsis (when recorded as Complication)
    c.startsWith('A41') ||
    c.startsWith('A40') ||
    c === 'A392' ||
    c === 'A394' ||
    c === 'B377' ||
    // Acidosis (Severe metabolic/lactic acidosis)
    c === 'E872' ||
    // Necrotizing Fasciitis & Gas Gangrene
    c === 'M726' ||
    c === 'A480' ||
    // Massive GI Bleeding & Bleeding Varices
    c === 'I850' ||
    c === 'I859' ||
    c === 'K920' ||
    c === 'K922' ||
    c.startsWith('K250') ||
    c.startsWith('K260') ||
    // Acute Peritonitis
    c.startsWith('K650') ||
    // Acute Stroke / Intracranial Hemorrhage
    c.startsWith('I60') ||
    c.startsWith('I61') ||
    c.startsWith('I62') ||
    c.startsWith('I63') ||
    // Coma
    c === 'R402';

  if (isMcc) {
    return {
      tier: 'MCC',
      code: c,
      badgeLabel: 'MCC',
      shortLabel: '+High RW',
      titleTh: 'โรคร่วมรุนแรงสูงสุด (Major CC)',
      descriptionTh: 'ยกระดับค่าน้ำหนักสัมพัทธ์ (AdjRW) สูงสุด — มีผลต่อยอดเงินชดเชย DRG มากที่สุด',
      ccl: 4,
      priorityLevel: 1,
      priorityLabelTh: 'ทบทวนอันดับ 1 (จุดเพ่งเล็ง สปสช.)',
      rwImpactEstimateTh: '+1.5 ถึง +3.5+ AdjRW (~฿15,000 - ฿40,000+)',
      auditScrutinyTh: 'ผู้ตรวจ สปสช. จะสุ่มตรวจชาร์ตกลุ่มนี้ก่อน หากหลักฐานไม่พอจะถูกตัดรหัสและลดเงินทันที',
      style: {
        badgeBg: 'bg-rose-50 hover:bg-rose-100',
        badgeText: 'text-rose-700',
        badgeBorder: 'border-rose-200',
        dotBg: 'bg-rose-500',
        hoverRing: 'ring-rose-400',
        darkBadgeBg: 'dark:bg-rose-950/50 dark:hover:bg-rose-950/70',
        darkBadgeText: 'dark:text-rose-300',
        darkBadgeBorder: 'dark:border-rose-800/80',
      },
    };
  }

  // 2. Complication & Comorbidity (CC) - CCL 2
  // Significant upward shift on DRG weight
  const isCc =
    // Thrombocytopenia
    c.startsWith('D696') ||
    c.startsWith('D695') ||
    // Acute blood loss anemia
    c === 'D62' ||
    // Volume depletion / Dehydration
    c === 'E86' ||
    // Electrolyte & Osmolality disorders
    c.startsWith('E870') ||
    c.startsWith('E871') ||
    c.startsWith('E875') ||
    c.startsWith('E876') ||
    c.startsWith('E878') ||
    c.startsWith('E833') ||
    c.startsWith('E834') ||
    c.startsWith('E835') ||
    // Severe / Moderate Malnutrition
    c === 'E43' ||
    c.startsWith('E44') ||
    c === 'E46' ||
    // Advanced CKD (Stage 4, 5, ESRD)
    c === 'N184' ||
    c === 'N185' ||
    c === 'N186' ||
    // Heart Failure / AFib
    c.startsWith('I50') ||
    c.startsWith('I48') ||
    c === 'I200' ||
    // Pneumonia
    c.startsWith('J18') ||
    c.startsWith('J15') ||
    c.startsWith('J12') ||
    c === 'J13' ||
    c === 'J14' ||
    // COPD acute exacerbation / Pulmonary edema
    c.startsWith('J440') ||
    c.startsWith('J441') ||
    c === 'J81' ||
    // Urinary tract infection / Pyelonephritis
    c === 'N390' ||
    c.startsWith('N10') ||
    // Cellulitis / Decubitus ulcer
    c.startsWith('L03') ||
    c.startsWith('L89') ||
    // Liver Cirrhosis / Acute Pancreatitis / Ileus
    c.startsWith('K703') ||
    c.startsWith('K746') ||
    c.startsWith('K85') ||
    c.startsWith('K566') ||
    // DM with DKA / Hyperosmolar state
    c.startsWith('E100') ||
    c.startsWith('E101') ||
    c.startsWith('E110') ||
    c.startsWith('E111') ||
    c.startsWith('E140') ||
    c.startsWith('E141');

  if (isCc) {
    return {
      tier: 'CC',
      code: c,
      badgeLabel: 'CC',
      shortLabel: '+Med RW',
      titleTh: 'โรคร่วมสำคัญ (Significant CC)',
      descriptionTh: 'เพิ่มค่าน้ำหนัก DRG ในระดับปานกลาง — ต้องมีผลตรวจและยาการรักษาชัดเจน',
      ccl: 2,
      priorityLevel: 2,
      priorityLabelTh: 'ทบทวนอันดับ 2 (ตรวจสอบผลตรวจ/ยา)',
      rwImpactEstimateTh: '+0.5 ถึง +1.4 AdjRW (~฿5,000 - ฿14,000)',
      auditScrutinyTh: 'ต้องมีผลแล็บผิดปกติและรายการยารักษาหรือการติดตามประเมินอาการในเวชระเบียน',
      style: {
        badgeBg: 'bg-amber-50 hover:bg-amber-100',
        badgeText: 'text-amber-800',
        badgeBorder: 'border-amber-200',
        dotBg: 'bg-amber-500',
        hoverRing: 'ring-amber-400',
        darkBadgeBg: 'dark:bg-amber-950/50 dark:hover:bg-amber-950/70',
        darkBadgeText: 'dark:text-amber-300',
        darkBadgeBorder: 'dark:border-amber-800/80',
      },
    };
  }

  // 3. Minor CC - CCL 1
  // Slight impact, increments weight only if no higher CC is present
  const isMinorCc =
    // DM without acute complications
    c.startsWith('E10') ||
    c.startsWith('E11') ||
    c.startsWith('E14') ||
    // Early CKD
    c.startsWith('N18') ||
    // Nutritional anemias
    c.startsWith('D50') ||
    c.startsWith('D51') ||
    c.startsWith('D52') ||
    c.startsWith('D53') ||
    c.startsWith('D64') ||
    // Hypertension
    c.startsWith('I10') ||
    c.startsWith('I11') ||
    c.startsWith('I12') ||
    c.startsWith('I13') ||
    c.startsWith('I15') ||
    // Thyroid / Dyslipidemia
    c.startsWith('E03') ||
    c.startsWith('E05') ||
    c.startsWith('E78') ||
    // Peptic ulcer / Gastritis / GERD
    c.startsWith('K21') ||
    c.startsWith('K29') ||
    c.startsWith('K25') ||
    c.startsWith('K26') ||
    // Gout / Arthritis
    c.startsWith('M10') ||
    c.startsWith('M06') ||
    // Chronic bronchitis / Asthma
    c.startsWith('J44') ||
    c.startsWith('J45');

  if (isMinorCc) {
    return {
      tier: 'MINOR',
      code: c,
      badgeLabel: 'Minor',
      shortLabel: '+Low RW',
      titleTh: 'โรคร่วมระดับเบา (Minor CC)',
      descriptionTh: 'มีผลต่อค่าน้ำหนัก DRG เล็กน้อย (กรณีไม่มี CC/MCC อื่น)',
      ccl: 1,
      priorityLevel: 3,
      priorityLabelTh: 'ทบทวนทั่วไป (ลำดับ 3)',
      rwImpactEstimateTh: '+0.1 ถึง +0.4 AdjRW (~฿1,000 - ฿4,000)',
      auditScrutinyTh: 'ควรตรวจสอบความถูกต้องของ Combination code (เช่น ความดันร่วมกับไต/หัวใจ)',
      style: {
        badgeBg: 'bg-blue-50 hover:bg-blue-100',
        badgeText: 'text-blue-700',
        badgeBorder: 'border-blue-200',
        dotBg: 'bg-blue-500',
        hoverRing: 'ring-blue-400',
        darkBadgeBg: 'dark:bg-blue-950/50 dark:hover:bg-blue-950/70',
        darkBadgeText: 'dark:text-blue-300',
        darkBadgeBorder: 'dark:border-blue-800/80',
      },
    };
  }

  // 4. Non-CC / Baseline - CCL 0
  return {
    tier: 'NON_CC',
    code: c,
    badgeLabel: 'Non-CC',
    shortLabel: 'Base',
    titleTh: 'ไม่มีผลต่อระดับ DRG (Non-CC)',
    descriptionTh: 'รหัสเพื่อระบุประวัติหรืออาการทั่วไป ไม่เพิ่มระดับความรุนแรงของกลุ่ม DRG',
    ccl: 0,
    priorityLevel: 4,
    priorityLabelTh: 'ข้อมูลสถิติ (ลำดับ 4)',
    rwImpactEstimateTh: '0 AdjRW (คงค่าน้ำหนักพื้นฐานเดิม)',
    auditScrutinyTh: 'ตรวจสอบว่ามีการวินิจฉัยจริง ไม่เป็นรหัสต้องห้าม (Banned codes เช่น R65.0)',
    style: {
      badgeBg: 'bg-slate-100 hover:bg-slate-200/80',
      badgeText: 'text-slate-600',
      badgeBorder: 'border-slate-200',
      dotBg: 'bg-slate-400',
      hoverRing: 'ring-slate-400',
      darkBadgeBg: 'dark:bg-slate-800/80 dark:hover:bg-slate-800',
      darkBadgeText: 'dark:text-slate-300',
      darkBadgeBorder: 'dark:border-slate-700',
    },
  };
}

/**
 * Determine the Base DRG Driver role of the Principal Diagnosis (PDx)
 */
export function getPdxDrgBaseInfo(pdxCode: string): PdxDrgBaseInfo {
  const c = cleanCode(pdxCode);

  // High Base RW Medical Admissions
  if (
    c.startsWith('A41') ||
    c.startsWith('A40') ||
    c.startsWith('I21') ||
    c.startsWith('I63') ||
    c.startsWith('M726') ||
    c.startsWith('K650') ||
    c.startsWith('A480')
  ) {
    return {
      code: c,
      baseTier: 'HIGH_BASE',
      badgeLabelTh: 'High Base DRG Driver',
      baseRwEstimateTh: 'Base RW ~1.8 - 2.8+ (กลุ่มโรควิกฤต/ติดเชื้อรุนแรง)',
      descriptionTh: 'รหัสโรคหลักที่กำหนดหมวด MDC และ Base DRG ขั้นสูง — สปสช. ตรวจสอบเงื่อนไขข้อ 1-11 เข้มข้น',
      style: {
        badgeBg: 'bg-indigo-50 border-indigo-200',
        badgeText: 'text-indigo-800',
        badgeBorder: 'border-indigo-200',
        dotBg: 'bg-indigo-600',
      },
    };
  }

  // Moderate Base RW Admissions
  if (
    c.startsWith('J18') ||
    c.startsWith('J15') ||
    c.startsWith('N390') ||
    c.startsWith('N10') ||
    c.startsWith('A09') ||
    c.startsWith('L03') ||
    c.startsWith('K85') ||
    c.startsWith('I50')
  ) {
    return {
      code: c,
      baseTier: 'MODERATE_BASE',
      badgeLabelTh: 'Mod Base DRG Driver',
      baseRwEstimateTh: 'Base RW ~0.8 - 1.5 (กลุ่มโรคติดเชื้อเฉพาะที่/อวัยวะ)',
      descriptionTh: 'รหัสโรคหลักกำหนด Base DRG ระดับกลาง — ขยับเป็นเคสมูลค่าสูงได้เมื่อมีโรคร่วม MCC',
      style: {
        badgeBg: 'bg-sky-50 border-sky-200',
        badgeText: 'text-sky-800',
        badgeBorder: 'border-sky-200',
        dotBg: 'bg-sky-600',
      },
    };
  }

  return {
    code: c,
    baseTier: 'STANDARD_BASE',
    badgeLabelTh: 'Standard Base DRG',
    baseRwEstimateTh: 'Base RW ~0.4 - 0.9 (โรคทั่วไป)',
    descriptionTh: 'รหัสโรคหลักกำหนด Base DRG ระดับมาตรฐาน',
    style: {
      badgeBg: 'bg-slate-100 border-slate-200',
      badgeText: 'text-slate-700',
      badgeBorder: 'border-slate-200',
      dotBg: 'bg-slate-500',
    },
  };
}

export interface DrgSummaryResult {
  totalSdx: number;
  mccCount: number;
  ccCount: number;
  minorCount: number;
  nonCcCount: number;
  hasMcc: boolean;
  hasCc: boolean;
  highestTier: DrgImpactTier | 'NONE';
  estimatedCumulativeRwImpactTh: string;
}

/**
 * Calculate DRG summary metrics for secondary diagnoses to help users prioritize reviews
 */
export function calculateDrgSummary(secondaryDx: { code: string }[]): DrgSummaryResult {
  let mccCount = 0;
  let ccCount = 0;
  let minorCount = 0;
  let nonCcCount = 0;

  for (const item of secondaryDx) {
    const impact = getDrgImpactForIcd10(item.code);
    if (impact.tier === 'MCC') mccCount++;
    else if (impact.tier === 'CC') ccCount++;
    else if (impact.tier === 'MINOR') minorCount++;
    else nonCcCount++;
  }

  const totalSdx = secondaryDx.length;
  let highestTier: DrgImpactTier | 'NONE' = 'NONE';
  let estimatedCumulativeRwImpactTh = 'Base RW';

  if (mccCount > 0) {
    highestTier = 'MCC';
    estimatedCumulativeRwImpactTh = '+2.0 ถึง +4.5+ AdjRW (ความรุนแรงสูงสุด)';
  } else if (ccCount > 0) {
    highestTier = 'CC';
    estimatedCumulativeRwImpactTh = '+0.8 ถึง +1.8 AdjRW (ความรุนแรงปานกลาง)';
  } else if (minorCount > 0) {
    highestTier = 'MINOR';
    estimatedCumulativeRwImpactTh = '+0.2 ถึง +0.5 AdjRW (ความรุนแรงระดับเบา)';
  } else if (totalSdx > 0) {
    highestTier = 'NON_CC';
    estimatedCumulativeRwImpactTh = '+0.0 AdjRW (ไม่มีผลต่อการเลื่อนขั้น)';
  }

  return {
    totalSdx,
    mccCount,
    ccCount,
    minorCount,
    nonCcCount,
    hasMcc: mccCount > 0,
    hasCc: ccCount > 0,
    highestTier,
    estimatedCumulativeRwImpactTh,
  };
}
