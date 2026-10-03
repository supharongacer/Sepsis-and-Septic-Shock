import {
  ClinicalProfile,
  DiagnosisEntry,
  ProcedureEntry,
  MedicationItem,
  Nhso17FilePatientCase,
} from '../types';

export interface HighCostRiskFactor {
  name: string;
  weight: number;
  score: number; // 0 to 100
  status: 'normal' | 'moderate' | 'critical';
  detail: string;
}

export interface HighCostAnalysis {
  probability: number; // 0 - 100%
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  estimatedCostMin: number;
  estimatedCostMax: number;
  isOver50kThreshold: boolean;
  isOver100kThreshold: boolean;
  factors: HighCostRiskFactor[];
  historicalBenchmark: {
    category: string;
    avgCost: number;
    probability: number;
    auditIntensity: string;
    isCurrentTier: boolean;
  }[];
  auditMitigationChecklist: string[];
}

export function calculateHighCostProbability(params: {
  pdx: string;
  secondaryDx?: DiagnosisEntry[];
  procedures?: ProcedureEntry[];
  medications?: MedicationItem[];
  clinicalProfile?: ClinicalProfile;
  activePatientCase?: Nhso17FilePatientCase | null;
}): HighCostAnalysis {
  const {
    pdx,
    secondaryDx = [],
    procedures = [],
    medications = [],
    clinicalProfile,
    activePatientCase,
  } = params;

  const cleanPdx = pdx.trim().toUpperCase().replace(/\./g, '');
  const cleanSdx = secondaryDx.map((s) => s.code.trim().toUpperCase().replace(/\./g, ''));
  const cleanProcs = procedures.map((p) => p.code.trim().toUpperCase().replace(/\./g, ''));

  // 1. Vasopressor & Inotropic score (Weight: 25%)
  const hasNorepinephrine = medications.some(
    (m) => m.isSelected && (m.id === 'norepinephrine' || m.name.toLowerCase().includes('norepi'))
  );
  const hasDopamine = medications.some(
    (m) => m.isSelected && (m.id === 'dopamine' || m.name.toLowerCase().includes('dopa'))
  );
  const hasVasopressors = hasNorepinephrine || hasDopamine || (clinicalProfile?.sofaScores?.cardiovascularScore ?? 0) >= 2;
  const vasoScore = hasNorepinephrine ? 95 : hasDopamine ? 70 : clinicalProfile?.mapUnder65 ? 50 : 0;

  // 2. Mechanical Ventilation & Invasive Procedures (Weight: 30%)
  const hasVentLong = cleanProcs.includes('9672'); // >= 96 hrs
  const hasVentShort = cleanProcs.includes('9671'); // < 96 hrs
  const hasIntubation = cleanProcs.includes('9604');
  const hasDialysis = cleanProcs.includes('3995');
  const hasCvp = cleanProcs.includes('8962');

  let procScore = 0;
  if (hasVentLong) procScore += 65;
  else if (hasVentShort) procScore += 45;
  else if (hasIntubation) procScore += 30;
  if (hasDialysis) procScore += 30;
  if (hasCvp) procScore += 15;
  procScore = Math.min(procScore, 100);

  // 3. SOFA Organ Dysfunction & Clinical Severity (Weight: 25%)
  const sofaTotal = clinicalProfile?.sofaScores?.sofaTotal ?? (clinicalProfile?.hasOrganDysfunction ? 4 : 0);
  const sofaScore = Math.min(Math.round((sofaTotal / 12) * 100), 100);

  // 4. Secondary Complications & Comorbidities (Weight: 10%)
  const hasSepticShock = cleanSdx.includes('R572') || cleanPdx === 'R572';
  const hasAki = cleanSdx.includes('N179') || cleanSdx.includes('N170');
  const hasRespFailure = cleanSdx.some((c) => c.startsWith('J96'));
  const hasDic = cleanSdx.includes('D65') || cleanSdx.includes('D696');
  let complicationScore = 0;
  if (hasSepticShock) complicationScore += 40;
  if (hasAki) complicationScore += 25;
  if (hasRespFailure) complicationScore += 25;
  if (hasDic) complicationScore += 20;
  complicationScore = Math.min(complicationScore, 100);

  // 5. Discharge Acuity (Weight: 10%)
  // Rule: Discharge Status "3. Not Improve, 9. Dead" and Type Of Discharge "2. Against Advice, 3. By Escape, 4. By Transfer"
  const isStatusCritical = clinicalProfile?.dischargeStatus === '3' || clinicalProfile?.dischargeStatus === '9';
  const isTypeCritical =
    clinicalProfile?.dischargeType === '2' ||
    clinicalProfile?.dischargeType === '3' ||
    clinicalProfile?.dischargeType === '4';
  const dischargeScore = isStatusCritical && isTypeCritical ? 100 : isStatusCritical || isTypeCritical ? 75 : 15;

  // Composite probability calculation
  const compositeProbability = Math.round(
    vasoScore * 0.25 +
    procScore * 0.30 +
    sofaScore * 0.25 +
    complicationScore * 0.10 +
    dischargeScore * 0.10
  );

  const probability = Math.max(10, Math.min(compositeProbability, 98));

  // Risk Tier
  let riskLevel: HighCostAnalysis['riskLevel'] = 'LOW';
  if (probability >= 75) riskLevel = 'CRITICAL';
  else if (probability >= 55) riskLevel = 'HIGH';
  else if (probability >= 30) riskLevel = 'MODERATE';

  // Cost estimates (Base ~ 18,000 + additive based on probability)
  let estimatedCostMin = 18000;
  let estimatedCostMax = 32000;

  if (activePatientCase?.totalCharge && activePatientCase.totalCharge > 0) {
    estimatedCostMin = Math.round(activePatientCase.totalCharge * 0.9);
    estimatedCostMax = Math.round(activePatientCase.totalCharge * 1.1);
  } else {
    if (probability >= 75) {
      estimatedCostMin = 85000;
      estimatedCostMax = 180000;
    } else if (probability >= 55) {
      estimatedCostMin = 52000;
      estimatedCostMax = 88000;
    } else if (probability >= 30) {
      estimatedCostMin = 30000;
      estimatedCostMax = 52000;
    }
  }

  const isOver50kThreshold = estimatedCostMax >= 50000;
  const isOver100kThreshold = estimatedCostMax >= 100000;

  const factors: HighCostRiskFactor[] = [
    {
      name: 'หัตถการวิกฤต (Ventilator/ICU)',
      weight: 30,
      score: procScore,
      status: procScore >= 60 ? 'critical' : procScore >= 30 ? 'moderate' : 'normal',
      detail: hasVentLong
        ? 'ใช้เครื่องช่วยหายใจ ≥ 96 ชม. (9672) มีค่าใช้จ่ายและ AdjRW สูงมาก'
        : hasVentShort
        ? 'ใช้เครื่องช่วยหายใจ < 96 ชม. (9671)'
        : hasIntubation
        ? 'ใส่ท่อช่วยหายใจ (9604)'
        : 'ไม่มีหัตถการช่วยชีวิตขั้นสูง',
    },
    {
      name: 'ยากระตุ้นความดัน & ภาวะช็อก',
      weight: 25,
      score: vasoScore,
      status: vasoScore >= 60 ? 'critical' : vasoScore >= 30 ? 'moderate' : 'normal',
      detail: hasNorepinephrine
        ? 'ใช้ Norepinephrine แสดงถึงภาวะ Septic Shock รุนแรง'
        : hasDopamine
        ? 'ใช้ Dopamine สำหรับกู้ชีพความดัน'
        : clinicalProfile?.mapUnder65
        ? 'ความดันตก ดื้อต่อน้ำเกลือ'
        : 'ความดันคงที่ ไม่ต้องใช้ Vasopressor',
    },
    {
      name: 'SOFA Organ Dysfunction',
      weight: 25,
      score: sofaScore,
      status: sofaScore >= 50 ? 'critical' : sofaScore >= 25 ? 'moderate' : 'normal',
      detail: `คะแนน SOFA รวม ${sofaTotal} คะแนน (อวัยวะทำงานล้มเหลวหลายระบบ)`,
    },
    {
      name: 'ภาวะแทรกซ้อน (Major CC)',
      weight: 10,
      score: complicationScore,
      status: complicationScore >= 50 ? 'critical' : complicationScore >= 25 ? 'moderate' : 'normal',
      detail: [
        hasSepticShock ? 'Septic shock (R572)' : null,
        hasAki ? 'Acute Kidney Injury (N179)' : null,
        hasRespFailure ? 'Respiratory Failure' : null,
      ]
        .filter(Boolean)
        .join(', ') || 'ไม่มีโรคร่วมรุนแรง',
    },
    {
      name: 'สถานะจำหน่ายวิกฤต (DISCHS/T)',
      weight: 10,
      score: dischargeScore,
      status: dischargeScore >= 70 ? 'critical' : 'normal',
      detail: isStatusCritical || isTypeCritical
        ? 'จำหน่ายไม่ทุเลา (3) / เสียชีวิต (9) / ส่งต่อ (4) / ปฏิเสธ (2)'
        : 'จำหน่ายปกติ (ทุเลา/หาย)',
    },
  ];

  // Historical benchmark tiers for comparison
  const historicalBenchmark = [
    {
      category: 'ทั่วไป (Standard)',
      avgCost: 22000,
      probability: 15,
      auditIntensity: 'Random 5%',
      isCurrentTier: probability < 30,
    },
    {
      category: 'เฝ้าระวัง (Moderate)',
      avgCost: 42000,
      probability: 45,
      auditIntensity: 'Pre-Audit 15%',
      isCurrentTier: probability >= 30 && probability < 55,
    },
    {
      category: 'เสี่ยงสูง (High Cost >50k)',
      avgCost: 72000,
      probability: 72,
      auditIntensity: 'Pre-Payment 80%',
      isCurrentTier: probability >= 55 && probability < 75,
    },
    {
      category: 'วิกฤต (Super High >100k)',
      avgCost: 135000,
      probability: 92,
      auditIntensity: 'Full Review 100%',
      isCurrentTier: probability >= 75,
    },
  ];

  // Mitigation checklist for NHSO Audit
  const auditMitigationChecklist: string[] = [];
  if (hasVentLong || hasVentShort) {
    auditMitigationChecklist.push('แนบใบ Ventilator Record ระบุวัน-เวลา On/Off เครื่องช่วยหายใจ ชัดเจน');
  }
  if (hasVasopressors) {
    auditMitigationChecklist.push('แนบ Flow Sheet ขนาดยา Norepinephrine / Dopamine และค่า MAP ตอบสนอง');
  }
  if (hasAki) {
    auditMitigationChecklist.push('มีผลตรวจค่า Cr / eGFR ก่อนและหลังการรักษาเพื่อยืนยันภาวะไตวายเฉียบพลัน');
  }
  if (isStatusCritical || isTypeCritical) {
    auditMitigationChecklist.push('มีใบส่งต่อ (Referral sheet) หรือใบบันทึกปฏิเสธการรักษาพร้อมลายเซ็นญาติ');
  }
  if (isOver50kThreshold) {
    auditMitigationChecklist.push('ยอดเบิกเกิน ฿50,000: ตรวจสอบความสอดคล้องระหว่างใบสรุปหน้างบ (BILL) กับชาร์ตพยาบาล');
  }

  return {
    probability,
    riskLevel,
    estimatedCostMin,
    estimatedCostMax,
    isOver50kThreshold,
    isOver100kThreshold,
    factors,
    historicalBenchmark,
    auditMitigationChecklist,
  };
}
