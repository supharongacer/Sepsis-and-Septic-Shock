import {
  Nhso18FilePatientCase,
  DiagnosisEntry,
  ProcedureEntry,
  MedicationItem,
  ClinicalProfile,
} from '../types';
import { evaluateClaim, ValidationSummary } from './auditValidator';
import { getDrgImpactForIcd10 } from './drgImpact';
import { PRESET_CASES } from '../data/rulesData';

export interface FinancialRiskCategoryItem {
  name: string;
  category: string;
  atRiskAmount: number;
  safeAmount: number;
  caseCount: number;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface SecondaryDxDistribution {
  comorbidCount: number;
  complicationCount: number;
  totalCount: number;
  comorbidPercent: number;
  complicationPercent: number;
  mccCount: number;
  ccCount: number;
  minorCount: number;
  nonCcCount: number;
  mccPercent: number;
  ccPercent: number;
}

export interface CaseExecutiveSummary {
  caseId: string;
  an: string;
  hn: string;
  patientName: string;
  pdx: string;
  totalCharge: number;
  atRiskCharge: number;
  safeCharge: number;
  verdict: 'PASS' | 'WARNING' | 'DENY';
  primaryIssue?: string;
  deniedReasons: string[];
  secondaryDxCount: number;
  comorbidCount: number;
  complicationCount: number;
  mccCount: number;
  ccCount: number;
}

export interface HospitalExecutiveMetrics {
  scope: 'HOSPITAL_IMPORTED' | 'HOSPITAL_SIMULATED' | 'SINGLE_CASE';
  totalCases: number;
  passCases: number;
  warningCases: number;
  denyCases: number;
  passRatePercent: number;
  denyRatePercent: number;
  warningRatePercent: number;

  totalClaimAmount: number;
  atRiskClaimAmount: number;
  safeClaimAmount: number;
  riskPercent: number;
  potentialRecoverableAmount: number;

  secondaryDxStats: SecondaryDxDistribution;
  financialRiskCategories: FinancialRiskCategoryItem[];
  caseSummaries: CaseExecutiveSummary[];
  topRiskCases: CaseExecutiveSummary[];
  highRiskDepartmentCodes: Array<{
    code: string;
    description: string;
    frequency: number;
    financialImpact: number;
    ruleTag: string;
  }>;
}

// Average standard NHSO reimbursement rate per AdjRW point
const NHSO_BASE_RATE_PER_RW = 8350;

/**
 * Estimate the base financial claim value for a case if not explicitly provided in totalCharge
 */
export function estimateCaseClaimValue(
  pdx: string,
  secondaryDx: DiagnosisEntry[] = [],
  providedTotalCharge?: number
): { totalCharge: number; estimatedAdjRw: number } {
  if (providedTotalCharge && providedTotalCharge > 0) {
    const estimatedRw = Number((providedTotalCharge / NHSO_BASE_RATE_PER_RW).toFixed(2));
    return { totalCharge: providedTotalCharge, estimatedAdjRw: Math.max(1.0, estimatedRw) };
  }

  // Calculate based on DRG RW estimates
  const cleanPdx = (pdx || '').toUpperCase().replace(/\./g, '');
  let baseRw = 1.65; // standard medical admission base
  if (cleanPdx.startsWith('A41') || cleanPdx.startsWith('A40')) baseRw = 2.45;
  else if (cleanPdx.startsWith('R57')) baseRw = 3.2;
  else if (cleanPdx.startsWith('M726') || cleanPdx.startsWith('A480')) baseRw = 3.8;
  else if (cleanPdx.startsWith('I63')) baseRw = 2.1;
  else if (cleanPdx.startsWith('N17')) baseRw = 2.0;

  let addedRw = 0;
  for (const s of secondaryDx) {
    const impact = getDrgImpactForIcd10(s.code);
    if (impact.tier === 'MCC') addedRw += 1.8;
    else if (impact.tier === 'CC') addedRw += 0.8;
    else if (impact.tier === 'MINOR') addedRw += 0.3;
  }

  // Cap added weight to realistic DRG max
  addedRw = Math.min(addedRw, 4.5);
  const totalRw = Number((baseRw + addedRw).toFixed(2));
  const estimatedCost = Math.round(totalRw * NHSO_BASE_RATE_PER_RW);

  return { totalCharge: estimatedCost, estimatedAdjRw: totalRw };
}

/**
 * Estimate the financial risk (amount at risk of denial or clawback) for a specific case
 */
export function evaluateCaseFinancialRisk(
  validation: ValidationSummary,
  totalCharge: number,
  secondaryDx: DiagnosisEntry[] = []
): { atRiskAmount: number; safeAmount: number; deniedReasons: string[] } {
  const deniedReasons: string[] = [];

  if (validation.status === 'PASS') {
    // Normal minimal random audit margin (5%)
    const atRisk = Math.round(totalCharge * 0.05);
    return {
      atRiskAmount: atRisk,
      safeAmount: totalCharge - atRisk,
      deniedReasons: [],
    };
  }

  let penaltyFraction = 0;

  for (const result of validation.results) {
    if (result.severity === 'DENY') {
      deniedReasons.push(result.title);
      // Certain catastrophic denials cut 70-100% of the claim
      if (
        result.errorTag?.includes('CR1') ||
        result.errorTag?.includes('CR37') ||
        result.title.includes('SIRS') ||
        result.title.includes('ช็อก')
      ) {
        penaltyFraction = Math.max(penaltyFraction, 0.75); // Loss of MCC or entire claim
      } else if (result.title.includes('ผ่าตัด') || result.title.includes('Debridement')) {
        penaltyFraction = Math.max(penaltyFraction, 0.65);
      } else {
        penaltyFraction = Math.max(penaltyFraction, 0.5);
      }
    } else if (result.severity === 'WARNING') {
      deniedReasons.push(result.title);
      penaltyFraction = Math.max(penaltyFraction, 0.25);
    }
  }

  // Calculate financial clawback amount
  const atRiskAmount = Math.min(totalCharge, Math.round(totalCharge * penaltyFraction));
  const safeAmount = Math.max(0, totalCharge - atRiskAmount);

  return {
    atRiskAmount,
    safeAmount,
    deniedReasons,
  };
}

/**
 * Generate secondary diagnosis distribution metrics (Comorbid vs Complication and DRG tiers)
 */
export function calculateSecondaryDxDistribution(secondaryDxList: DiagnosisEntry[]): SecondaryDxDistribution {
  let comorbidCount = 0;
  let complicationCount = 0;
  let mccCount = 0;
  let ccCount = 0;
  let minorCount = 0;
  let nonCcCount = 0;

  for (const item of secondaryDxList) {
    if (item.diagType === 'complication') {
      complicationCount++;
    } else {
      comorbidCount++;
    }

    const impact = getDrgImpactForIcd10(item.code);
    if (impact.tier === 'MCC') mccCount++;
    else if (impact.tier === 'CC') ccCount++;
    else if (impact.tier === 'MINOR') minorCount++;
    else nonCcCount++;
  }

  const totalCount = secondaryDxList.length;
  const comorbidPercent = totalCount > 0 ? Math.round((comorbidCount / totalCount) * 100) : 0;
  const complicationPercent = totalCount > 0 ? Math.round((complicationCount / totalCount) * 100) : 0;
  const mccPercent = totalCount > 0 ? Math.round((mccCount / totalCount) * 100) : 0;
  const ccPercent = totalCount > 0 ? Math.round((ccCount / totalCount) * 100) : 0;

  return {
    comorbidCount,
    complicationCount,
    totalCount,
    comorbidPercent,
    complicationPercent,
    mccCount,
    ccCount,
    minorCount,
    nonCcCount,
    mccPercent,
    ccPercent,
  };
}

/**
 * Calculate comprehensive Executive Metrics for either hospital cohort or a single active patient
 */
export function calculateExecutiveMetrics(params: {
  activePdx: string;
  activeSecondaryDx: DiagnosisEntry[];
  activeMedications: MedicationItem[];
  activeClinicalProfile?: ClinicalProfile;
  activeProcedures?: ProcedureEntry[];
  activePatientCase?: Nhso18FilePatientCase | null;
  importedCases?: Nhso18FilePatientCase[];
  forceViewScope?: 'HOSPITAL' | 'ACTIVE_CASE';
}): HospitalExecutiveMetrics {
  const {
    activePdx,
    activeSecondaryDx,
    activeMedications,
    activeClinicalProfile,
    activeProcedures,
    activePatientCase,
    importedCases = [],
    forceViewScope,
  } = params;

  const hasImportedCases = importedCases.length > 0;
  const isSingleCaseScope = forceViewScope === 'ACTIVE_CASE';

  // If user selected Single Case view, analyze only the active case
  if (isSingleCaseScope) {
    const validation = evaluateClaim(
      activePdx,
      activeSecondaryDx,
      activeMedications,
      activeClinicalProfile,
      activeProcedures
    );

    const { totalCharge } = estimateCaseClaimValue(
      activePdx,
      activeSecondaryDx,
      activePatientCase?.totalCharge
    );

    const { atRiskAmount, safeAmount, deniedReasons } = evaluateCaseFinancialRisk(
      validation,
      totalCharge,
      activeSecondaryDx
    );

    const dxStats = calculateSecondaryDxDistribution(activeSecondaryDx);

    const isPass = validation.status === 'PASS';
    const isWarn = validation.status === 'WARNING';
    const isDeny = validation.status === 'DENY';

    const caseSummary: CaseExecutiveSummary = {
      caseId: activePatientCase?.an || 'ACTIVE_CASE',
      an: activePatientCase?.an || 'AN-990142',
      hn: activePatientCase?.hn || 'HN-000157',
      patientName: activePatientCase?.patientName || 'เคสที่กำลังตรวจประเมิน',
      pdx: activePdx,
      totalCharge,
      atRiskCharge: atRiskAmount,
      safeCharge: safeAmount,
      verdict: validation.status,
      primaryIssue: deniedReasons[0] || (isPass ? 'ผ่านเกณฑ์ครบถ้วน' : 'ข้อควรระวัง'),
      deniedReasons,
      secondaryDxCount: activeSecondaryDx.length,
      comorbidCount: dxStats.comorbidCount,
      complicationCount: dxStats.complicationCount,
      mccCount: dxStats.mccCount,
      ccCount: dxStats.ccCount,
    };

    // Financial risk categories for single case
    const categories: FinancialRiskCategoryItem[] = [
      {
        name: 'เกณฑ์ CR37 (Shock & ยากระตุ้น)',
        category: 'CR37',
        atRiskAmount: validation.results.some((r) => r.errorTag?.includes('CR37')) ? atRiskAmount : 0,
        safeAmount: validation.results.some((r) => r.errorTag?.includes('CR37')) ? 0 : safeAmount,
        caseCount: validation.results.some((r) => r.errorTag?.includes('CR37')) ? 1 : 0,
        description: 'ความสัมพันธ์ระหว่างรหัสช็อกและการใช้ยา Vasopressor ทางหลอดเลือดดำ',
        severity: validation.results.some((r) => r.errorTag?.includes('CR37')) ? 'CRITICAL' : 'LOW',
      },
      {
        name: 'เกณฑ์ CR1 (Sepsis & ผลตรวจแล็บ)',
        category: 'CR1',
        atRiskAmount: validation.results.some((r) => r.errorTag?.includes('CR1')) ? Math.round(atRiskAmount * 0.8) : 0,
        safeAmount: validation.results.some((r) => r.errorTag?.includes('CR1')) ? 0 : safeAmount,
        caseCount: validation.results.some((r) => r.errorTag?.includes('CR1')) ? 1 : 0,
        description: 'ข้อห้ามใช้รหัส SIRS (R65) และการส่งตรวจ Hemoculture / Lactate',
        severity: validation.results.some((r) => r.errorTag?.includes('CR1')) ? 'CRITICAL' : 'LOW',
      },
      {
        name: 'พิมพ์เขียว 47 ข้อ สปสช.',
        category: 'BLUEPRINT',
        atRiskAmount: validation.results.some((r) => r.errorTag?.includes('CR_BLUEPRINT')) ? atRiskAmount : 0,
        safeAmount: validation.results.some((r) => r.errorTag?.includes('CR_BLUEPRINT')) ? 0 : safeAmount,
        caseCount: validation.results.some((r) => r.errorTag?.includes('CR_BLUEPRINT')) ? 1 : 0,
        description: 'Combination Code, ข้อห้ามรหัสซ้ำซ้อน, และเกณฑ์ Upcoding',
        severity: validation.results.some((r) => r.errorTag?.includes('CR_BLUEPRINT')) ? 'HIGH' : 'LOW',
      },
      {
        name: 'หัตถการจำเป็น (Mandatory Procedures)',
        category: 'PROCEDURE',
        atRiskAmount: validation.results.some((r) => r.title.includes('หัตถการ') || r.title.includes('Debridement')) ? atRiskAmount : 0,
        safeAmount: validation.results.some((r) => r.title.includes('หัตถการ')) ? 0 : safeAmount,
        caseCount: validation.results.some((r) => r.title.includes('หัตถการ')) ? 1 : 0,
        description: 'รหัสหัตถการ ICD-9-CM ที่ต้องลงคู่กับการวินิจฉัยหลัก',
        severity: validation.results.some((r) => r.title.includes('หัตถการ')) ? 'CRITICAL' : 'LOW',
      },
    ];

    return {
      scope: 'SINGLE_CASE',
      totalCases: 1,
      passCases: isPass ? 1 : 0,
      warningCases: isWarn ? 1 : 0,
      denyCases: isDeny ? 1 : 0,
      passRatePercent: isPass ? 100 : 0,
      denyRatePercent: isDeny ? 100 : 0,
      warningRatePercent: isWarn ? 100 : 0,
      totalClaimAmount: totalCharge,
      atRiskClaimAmount: atRiskAmount,
      safeClaimAmount: safeAmount,
      riskPercent: totalCharge > 0 ? Math.round((atRiskAmount / totalCharge) * 100) : 0,
      potentialRecoverableAmount: atRiskAmount,
      secondaryDxStats: dxStats,
      financialRiskCategories: categories,
      caseSummaries: [caseSummary],
      topRiskCases: isDeny || isWarn ? [caseSummary] : [],
      highRiskDepartmentCodes: activeSecondaryDx.map((s) => ({
        code: s.code,
        description: s.descriptionTh || s.descriptionEn,
        frequency: 1,
        financialImpact: getDrgImpactForIcd10(s.code).tier === 'MCC' ? Math.round(totalCharge * 0.4) : 5000,
        ruleTag: s.diagType === 'comorbid' && s.code.startsWith('R57') ? 'CR37 Shock ผิดหลักการ' : 'ตรวจประเมินปกติ',
      })),
    };
  }

  // Otherwise, analyze Hospital Cohort (either imported cases or standard simulated hospital cohort)
  const cohortCases: Array<{
    caseId: string;
    an: string;
    hn: string;
    patientName: string;
    pdx: string;
    secondaryDx: DiagnosisEntry[];
    medications: MedicationItem[];
    clinicalProfile?: ClinicalProfile;
    procedures?: ProcedureEntry[];
    totalCharge?: number;
  }> = hasImportedCases
    ? importedCases.map((c) => ({
        caseId: c.an,
        an: c.an,
        hn: c.hn,
        patientName: c.patientName || `ผู้ป่วย AN: ${c.an}`,
        pdx: c.pdx,
        secondaryDx: c.secondaryDx,
        medications: c.medications,
        clinicalProfile: c.clinicalProfile,
        procedures: c.procedures,
        totalCharge: c.totalCharge,
      }))
    : PRESET_CASES.map((preset) => ({
        caseId: preset.id,
        an: `AN-${preset.id.replace('case_', '').slice(0, 6)}`,
        hn: `HN-00${Math.floor(Math.random() * 89999 + 10000)}`,
        patientName: preset.title.split(':')[0],
        pdx: preset.pdx,
        secondaryDx: preset.secondaryDx,
        medications: preset.medications,
        clinicalProfile: preset.clinicalProfile,
        procedures: preset.procedures,
        totalCharge: undefined,
      }));

  let totalHospitalClaim = 0;
  let totalAtRiskClaim = 0;
  let totalSafeClaim = 0;
  let passCount = 0;
  let warnCount = 0;
  let denyCount = 0;

  const allSecondaryDx: DiagnosisEntry[] = [];
  const caseSummaries: CaseExecutiveSummary[] = [];

  // Financial category accumulators
  let cr37Risk = 0;
  let cr37Count = 0;
  let cr1Risk = 0;
  let cr1Count = 0;
  let blueprintRisk = 0;
  let blueprintCount = 0;
  let procedureRisk = 0;
  let procedureCount = 0;

  for (const item of cohortCases) {
    const val = evaluateClaim(
      item.pdx,
      item.secondaryDx,
      item.medications,
      item.clinicalProfile,
      item.procedures
    );

    const { totalCharge } = estimateCaseClaimValue(item.pdx, item.secondaryDx, item.totalCharge);
    const { atRiskAmount, safeAmount, deniedReasons } = evaluateCaseFinancialRisk(
      val,
      totalCharge,
      item.secondaryDx
    );

    totalHospitalClaim += totalCharge;
    totalAtRiskClaim += atRiskAmount;
    totalSafeClaim += safeAmount;

    if (val.status === 'PASS') passCount++;
    else if (val.status === 'WARNING') warnCount++;
    else denyCount++;

    for (const sdx of item.secondaryDx) {
      allSecondaryDx.push(sdx);
    }

    // Accumulate category risks
    for (const r of val.results) {
      if (r.severity === 'DENY' || r.severity === 'WARNING') {
        if (r.errorTag?.includes('CR37')) {
          cr37Risk += Math.round(atRiskAmount * 0.45);
          cr37Count++;
        } else if (r.errorTag?.includes('CR1')) {
          cr1Risk += Math.round(atRiskAmount * 0.35);
          cr1Count++;
        } else if (r.errorTag?.includes('CR_BLUEPRINT')) {
          blueprintRisk += Math.round(atRiskAmount * 0.4);
          blueprintCount++;
        } else if (r.title.includes('หัตถการ') || r.title.includes('Debridement')) {
          procedureRisk += Math.round(atRiskAmount * 0.5);
          procedureCount++;
        }
      }
    }

    const dxStats = calculateSecondaryDxDistribution(item.secondaryDx);

    caseSummaries.push({
      caseId: item.caseId,
      an: item.an,
      hn: item.hn,
      patientName: item.patientName,
      pdx: item.pdx,
      totalCharge,
      atRiskCharge: atRiskAmount,
      safeCharge: safeAmount,
      verdict: val.status,
      primaryIssue: deniedReasons[0] || (val.status === 'PASS' ? 'ผ่านเกณฑ์ตรวจสอบ' : 'ข้อสังเกต'),
      deniedReasons,
      secondaryDxCount: item.secondaryDx.length,
      comorbidCount: dxStats.comorbidCount,
      complicationCount: dxStats.complicationCount,
      mccCount: dxStats.mccCount,
      ccCount: dxStats.ccCount,
    });
  }

  const totalCases = cohortCases.length;
  const passRatePercent = totalCases > 0 ? Math.round((passCount / totalCases) * 100) : 0;
  const denyRatePercent = totalCases > 0 ? Math.round((denyCount / totalCases) * 100) : 0;
  const warningRatePercent = totalCases > 0 ? Math.round((warnCount / totalCases) * 100) : 0;
  const riskPercent = totalHospitalClaim > 0 ? Math.round((totalAtRiskClaim / totalHospitalClaim) * 100) : 0;

  const dxStats = calculateSecondaryDxDistribution(allSecondaryDx);

  // Sort cases by highest financial at-risk charge
  const topRiskCases = [...caseSummaries]
    .filter((c) => c.atRiskCharge > 0)
    .sort((a, b) => b.atRiskCharge - a.atRiskCharge);

  // Financial categories breakdown
  const categories: FinancialRiskCategoryItem[] = [
    {
      name: 'เกณฑ์ CR37 (Shock & ขาดยากระตุ้น)',
      category: 'CR37',
      atRiskAmount: Math.max(cr37Risk, Math.round(totalAtRiskClaim * 0.45)),
      safeAmount: Math.round(totalSafeClaim * 0.3),
      caseCount: Math.max(cr37Count, 1),
      description: 'รหัสช็อก (R572) บันทึกผิดเป็นโรคร่วม หรือไม่มีประวัติให้ยากระตุ้นความดัน',
      severity: 'CRITICAL',
    },
    {
      name: 'เกณฑ์ CR1 (Sepsis / ห้ามใช้ SIRS / ขาดแล็บ)',
      category: 'CR1',
      atRiskAmount: Math.max(cr1Risk, Math.round(totalAtRiskClaim * 0.25)),
      safeAmount: Math.round(totalSafeClaim * 0.4),
      caseCount: Math.max(cr1Count, 1),
      description: 'ใช้รหัสต้องห้าม R65 หรือขาดผลตรวจ Hemoculture / Lactate ตามมาตรฐาน',
      severity: 'CRITICAL',
    },
    {
      name: 'พิมพ์เขียว 47 ข้อ (Combination Codes & Upcoding)',
      category: 'BLUEPRINT',
      atRiskAmount: Math.max(blueprintRisk, Math.round(totalAtRiskClaim * 0.2)),
      safeAmount: Math.round(totalSafeClaim * 0.2),
      caseCount: Math.max(blueprintCount, 1),
      description: 'แยกโรคคู่บังคับ (เช่น HT+CKD) หรือลงรหัสผลตรวจเกินจริงโดยไม่มีการรักษา',
      severity: 'HIGH',
    },
    {
      name: 'หัตถการผ่าตัดจำเป็น (Mandatory Procedures)',
      category: 'PROCEDURE',
      atRiskAmount: Math.max(procedureRisk, Math.round(totalAtRiskClaim * 0.1)),
      safeAmount: Math.round(totalSafeClaim * 0.1),
      caseCount: Math.max(procedureCount, 1),
      description: 'เช่น Necrotizing Fasciitis แต่ไม่มีรหัสทำ Debridement ใน OR (ICD-9 86.22)',
      severity: 'HIGH',
    },
  ];

  // Frequency count of high risk ICD codes
  const codeCounts: Record<string, { count: number; desc: string }> = {};
  for (const s of allSecondaryDx) {
    const c = s.code.replace(/\./g, '');
    if (!codeCounts[c]) {
      codeCounts[c] = {
        count: 0,
        desc: s.descriptionTh || s.descriptionEn,
      };
    }
    codeCounts[c].count++;
  }

  const highRiskDepartmentCodes = Object.entries(codeCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 6)
    .map(([code, data]) => {
      const impact = getDrgImpactForIcd10(code);
      return {
        code,
        description: data.desc,
        frequency: data.count,
        financialImpact: impact.tier === 'MCC' ? 45000 : impact.tier === 'CC' ? 22000 : 8000,
        ruleTag: code.startsWith('R57')
          ? 'เสี่ยง CR37'
          : code.startsWith('N17')
          ? 'MCC สูง'
          : impact.tier === 'MCC'
          ? 'MCC เข้มงวด'
          : 'โรคร่วมมาตรฐาน',
      };
    });

  return {
    scope: hasImportedCases ? 'HOSPITAL_IMPORTED' : 'HOSPITAL_SIMULATED',
    totalCases,
    passCases: passCount,
    warningCases: warnCount,
    denyCases: denyCount,
    passRatePercent,
    denyRatePercent,
    warningRatePercent,
    totalClaimAmount: totalHospitalClaim,
    atRiskClaimAmount: totalAtRiskClaim,
    safeClaimAmount: totalSafeClaim,
    riskPercent,
    potentialRecoverableAmount: totalAtRiskClaim,
    secondaryDxStats: dxStats,
    financialRiskCategories: categories,
    caseSummaries,
    topRiskCases,
    highRiskDepartmentCodes,
  };
}
