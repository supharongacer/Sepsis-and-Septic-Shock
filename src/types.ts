export type ClaimAuditRule = 'CR1' | 'CR37' | 'CR_GENERAL' | 'CR_BLUEPRINT' | 'INFO';
export type AuditSeverity = 'DENY' | 'WARNING' | 'PASS';

export type DiagnosisType = 'pdx' | 'comorbid' | 'complication' | 'other';

export interface DiagnosisEntry {
  id: string;
  code: string;
  version: string;
  descriptionEn: string;
  descriptionTh: string;
  diagType: 'comorbid' | 'complication';
  doctorLicense?: string;
}

export interface ProcedureEntry {
  id: string;
  code: string; // e.g. '9671', '9604', '3893', '8622', '3995'
  version?: string;
  descriptionEn: string;
  descriptionTh: string;
  procType: 'principal' | 'secondary';
  dateOper?: string;
  timeIn?: string;
  timeOut?: string;
  doctorLicense?: string;
  auditRisk?: 'HIGH' | 'MEDIUM' | 'NORMAL';
  auditNote?: string;
}

export interface IcdRecommendation {
  id: string;
  type: 'ICD-10' | 'ICD-9-CM';
  code: string;
  nameTh: string;
  nameEn: string;
  category: string;
  recommendedRole: 'PDx' | 'Comorbid' | 'Complication' | 'Principal_Proc' | 'Secondary_Proc';
  nhsoCondition: string;
  priority: 'CRITICAL' | 'RECOMMENDED' | 'INFORMATIONAL';
  reason: string;
  auditCriteria: string[];
  requiredDocumentation: string[];
  bannedRules?: string[];
  drgImpact?: string;
  actionPayload?: {
    actionType: 'SET_PDX' | 'ADD_SDX' | 'ADD_PROCEDURE';
    code: string;
    diagType?: 'comorbid' | 'complication';
    procType?: 'principal' | 'secondary';
  };
}

export interface MedicationItem {
  id: string;
  workingCode: string;
  name: string;
  category: 'vasopressor' | 'iv_antibiotic' | 'iv_fluid' | 'supportive' | 'electrolyte';
  dosage?: string;
  quantity: number;
  isSelected: boolean;
  dateServ?: string;
  timeServ?: string;
}

export interface AntibioticAdministrationLog {
  id: string;
  antibioticName: string; // e.g. 'cefTRIAXone (Ceftriaxone)'
  genericName: string; // e.g. 'Ceftriaxone'
  dosage: string; // e.g. '2 g', '1 g'
  route: 'IV' | 'IV_DRIP' | 'IV_PUSH' | 'ORAL';
  frequency: string; // e.g. 'OD (q 24 hr)', 'q 8 hr'
  dayNumber: number; // Day 1 to Day N
  date?: string; // YYYY-MM-DD
  time?: string; // e.g. '09:30'
  isHour1Bundle?: boolean; // Administered within 1 hour of admission/triage
  bloodCultureSequence: 'BEFORE_ANTIBIOTIC' | 'AFTER_ANTIBIOTIC' | 'NO_CULTURE';
  indicationType: 'EMPIRIC_BROAD_SPECTRUM' | 'TARGETED_PATHOGEN' | 'DE_ESCALATION' | 'PROPHYLAXIS';
  suspectedSource: 'BLOODSTREAM_SEPSIS' | 'URINARY_TRACT' | 'INTRA_ABDOMINAL' | 'RESPIRATORY' | 'SKIN_SOFT_TISSUE' | 'CNS' | 'UNKNOWN';
  status: 'GIVEN' | 'SCHEDULED' | 'DISCONTINUED';
  notes?: string;
}

export interface AntibioticGuidelineMatchCheck {
  id: string;
  title: string;
  status: 'PASS' | 'WARNING' | 'FAIL';
  description: string;
  guidelineRef: string;
  recommendation?: string;
}

export interface AntibioticGuidelineMatchResult {
  concordanceStatus: 'CONCORDANT' | 'PARTIAL' | 'DISCORDANT';
  scorePercent: number;
  hour1BundleMet: boolean;
  bloodCultureTimingMet: boolean;
  routeMet: boolean; // CR37 requirement (must be IV)
  spectrumMatchesPdx: boolean;
  spectrumMatchesCulture: boolean;
  renalDoseCaution: boolean;
  checks: AntibioticGuidelineMatchCheck[];
  suggestedCodingActions?: Array<{
    label: string;
    actionType: 'SET_PDX' | 'ADD_SDX' | 'CHANGE_TYPE' | 'ADD_PROCEDURE';
    code: string;
    diagType?: 'comorbid' | 'complication';
    reason: string;
  }>;
}

export interface ClinicalTimelineEvent {
  id: string;
  date: string; // e.g. "2024-09-01" or "25670901"
  time?: string; // e.g. "08:30"
  displayDate: string;
  dayNumber: number; // Day 1, Day 2, etc. (relative to admission)
  category: 'ADMISSION' | 'DIAGNOSIS' | 'DRUG_ADMINISTRATION' | 'PROCEDURE' | 'LAB_SAMPLE' | 'DISCHARGE';
  subCategory?: 'VASOPRESSOR' | 'ANTIBIOTIC' | 'IV_FLUID' | 'VENTILATOR' | 'CULTURE' | 'SEPSIS_PDX' | 'SHOCK_SDX' | 'ORGAN_FAILURE' | 'OTHER';
  title: string;
  description: string;
  code?: string;
  badge?: string;
  badgeColor?: 'blue' | 'purple' | 'amber' | 'emerald' | 'rose' | 'indigo' | 'slate';
  sourceFile: 'IPD.txt' | 'DRU.txt' | 'IDX.txt' | 'IOP.txt' | 'LABFU.txt' | 'CLINICAL';
  codingGap?: {
    severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
    gapType: 'UNMATCHED_DRUG' | 'MISCLASSIFIED_SHOCK' | 'DELAYED_ANTIBIOTIC' | 'MISSING_PROCEDURE_DX' | 'ORGAN_FAILURE_UNCODED' | 'DOCUMENTATION_GAP' | 'MISSING_MANDATORY_LAB';
    title: string;
    description: string;
    nhsoRule: string;
    suggestedAction?: {
      label: string;
      actionType: 'SET_PDX' | 'ADD_SDX' | 'CHANGE_TYPE' | 'ADD_PROCEDURE';
      code?: string;
      diagType?: 'comorbid' | 'complication';
      procType?: 'principal' | 'secondary';
    };
  };
}

export interface TimelineCodingGapSummary {
  totalGaps: number;
  criticalGaps: number;
  warningGaps: number;
  opportunityGaps: number;
  items: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'CRITICAL' | 'WARNING' | 'OPPORTUNITY';
    nhsoRule: string;
    recommendation: string;
    relatedEventId?: string;
    actionPayload?: {
      actionType: 'SET_PDX' | 'ADD_SDX' | 'CHANGE_TYPE' | 'ADD_PROCEDURE';
      code?: string;
      diagType?: 'comorbid' | 'complication';
      procType?: 'principal' | 'secondary';
    };
  }>;
}

export interface SofaScores {
  // qSOFA items
  respiratoryRateOver22?: boolean; // RR >= 22 /min (1 pt)
  systolicBpUnder100?: boolean;    // SBP <= 100 mmHg (1 pt)
  alteredMentation?: boolean;      // GCS < 15 (1 pt)
  qSofaTotal: number;              // 0 to 3
  isQsofaHighRisk: boolean;        // qSOFA >= 2

  // Full SOFA components (0-4 pts each)
  respirationScore?: number;       // PaO2/FiO2 ratio
  coagulationScore?: number;       // Platelets
  liverScore?: number;             // Bilirubin
  cardiovascularScore?: number;    // MAP & Vasopressors
  cnsScore?: number;               // Glasgow Coma Scale
  renalScore?: number;             // Creatinine / Urine output
  sofaTotal: number;               // 0 to 24
  isSofaHighRisk: boolean;         // SOFA >= 2 (Sepsis-3 Organ Dysfunction)
}

export interface ClinicalProfile {
  hemoculture: 'positive' | 'negative' | 'pending' | 'not_sent';
  cultureOrganism?: string;
  lactateStatus?: 'not_sent' | 'normal' | 'high' | 'critical'; // not_sent | normal (<2) | high (2-3.9) | critical (>=4)
  lactateLevel?: number; // e.g. 2.5 mmol/L (initial)
  lactateRepeatLevel?: number; // e.g. 1.8 mmol/L (repeat within 2-4 hr)
  sirsMetCount: number; // 0 to 4
  mapUnder65: boolean; // MAP < 65 or SBP < 90
  fluidResuscitationMl: number;
  hasOrganDysfunction: boolean; // AKI, ARDS, coagulopathy, altered mental status
  clinicalSummary: string;

  // Discharge Status & Type (CR1 / CR37 Sepsis & Septic Shock criteria)
  dischargeStatus?: '1' | '2' | '3' | '4' | '5' | '8' | '9'; // '3' = Not Improve, '9' = Dead
  dischargeType?: '1' | '2' | '3' | '4' | '5' | '8' | '9';   // '2' = Against Advice, '3' = By Escape, '4' = By Transfer
  dischargeStatusLabel?: string;
  dischargeTypeLabel?: string;

  // SOFA & qSOFA scoring
  sofaScores?: SofaScores;
}

export interface AuditResultItem {
  ruleCode: ClaimAuditRule;
  severity: AuditSeverity;
  title: string;
  description: string;
  errorTag?: string; // e.g. [CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]
  howToFix: string;
  recommendedAction?: {
    actionType: 'CHANGE_TYPE' | 'REMOVE_CODE' | 'REPLACE_PDX' | 'ADD_CODE' | 'APPLY_PRESET';
    targetCode?: string;
    newCode?: string;
    newType?: 'comorbid' | 'complication';
    pdx?: string;
  };
}

export interface CasePreset {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  pdx: string;
  pdxDescriptionEn: string;
  pdxDescriptionTh: string;
  secondaryDx: DiagnosisEntry[];
  medications: MedicationItem[];
  clinicalProfile: ClinicalProfile;
  procedures?: ProcedureEntry[];
  timelineEvents?: ClinicalTimelineEvent[];
}

export interface NhsoCaseAuditAnalysis {
  isHighCostClaim: boolean;
  totalCharge: number;
  costThreshold: number;
  highCostLevel?: 'HIGH' | 'EXTREME';
  isCr37MedMismatch: boolean;
  cr37MismatchReasons: string[];
  isPdxInconsistent: boolean;
  hasVasopressor: boolean;
  hasIvAntibiotic: boolean;
  isShockPdx: boolean;
  isShockComorbid: boolean;
  hasBannedCode: boolean;
  overallVerdict: 'DENY' | 'WARNING' | 'PASS';
  alertTags: string[];
}

export type Nhso17FilePatientCase = Nhso18FilePatientCase;
export type Nhso17ImportResult = Nhso18ImportResult;

export interface Nhso18FilePatientCase {
  an: string;
  hn: string;
  patientName?: string;
  age?: number;
  sex?: string;
  insuranceType?: string;
  dateAdm?: string;
  dateDsc?: string;
  dischargeStatus?: string;
  dischargeType?: string;
  totalCharge?: number;
  pdx: string;
  secondaryDx: DiagnosisEntry[];
  medications: MedicationItem[];
  clinicalProfile: ClinicalProfile;
  rawDiagnosesCount: number;
  rawMedicationsCount: number;
  rawLabsCount: number;
  rawProceduresCount?: number;
  procedures?: ProcedureEntry[];
  timelineEvents?: ClinicalTimelineEvent[];
  initialAuditStatus?: 'PASS' | 'WARNING' | 'DENY';
  initialAuditRule?: string;
  auditAnalysis?: NhsoCaseAuditAnalysis;
}

export interface Nhso18ImportResult {
  fileName: string;
  detectedFiles: string[];
  cases: Nhso18FilePatientCase[];
  totalRecords: {
    patients: number;
    diagnoses: number;
    drugs: number;
    labs: number;
    procedures?: number;
  };
}
