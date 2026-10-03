import {
  AntibioticAdministrationLog,
  ClinicalProfile,
  ClinicalTimelineEvent,
  DiagnosisEntry,
  MedicationItem,
  Nhso18FilePatientCase,
  ProcedureEntry,
  TimelineCodingGapSummary,
} from '../types';
import { ICD10_DATABASE } from '../data/rulesData';
import { NHSO_ICD9_DATABASE } from '../data/nhsoCodingRules';

/**
 * Format NHSO Date (e.g., "20240901" or "25670901" or "2024-09-01")
 */
export function parseNhsoDateString(dateStr?: string): {
  isoDate: string;
  year: number;
  month: number;
  day: number;
  thaiFormatted: string;
  shortFormatted: string;
} | null {
  if (!dateStr) return null;
  const clean = dateStr.trim().replace(/[-/]/g, '');
  if (clean.length < 8) return null;

  let year = parseInt(clean.substring(0, 4), 10);
  const month = parseInt(clean.substring(4, 6), 10);
  const day = parseInt(clean.substring(6, 8), 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  // Handle Buddhist Era (> 2400)
  const isBE = year > 2400;
  const ceYear = isBE ? year - 543 : year;
  const beYear = isBE ? year : year + 543;

  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];
  const monthName = thaiMonths[month - 1] || `${month}`;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const isoDate = `${ceYear}-${pad(month)}-${pad(day)}`;
  const thaiFormatted = `${day} ${monthName} ${beYear}`;
  const shortFormatted = `${pad(day)}/${pad(month)}/${beYear}`;

  return {
    isoDate,
    year: ceYear,
    month,
    day,
    thaiFormatted,
    shortFormatted,
  };
}

/**
 * Format NHSO Time string (e.g. "0830", "08:30", "083000")
 */
export function formatNhsoTimeString(timeStr?: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim().replace(/:/g, '');
  if (clean.length >= 4) {
    const hh = clean.substring(0, 2);
    const mm = clean.substring(2, 4);
    return `${hh}:${mm} น.`;
  }
  return timeStr;
}

/**
 * Calculate difference in days between two ISO dates (1-based index: Day 1, Day 2...)
 */
export function calculateRelativeDay(baseIsoDate?: string, targetIsoDate?: string): number {
  if (!baseIsoDate || !targetIsoDate) return 1;
  try {
    const d1 = new Date(baseIsoDate).getTime();
    const d2 = new Date(targetIsoDate).getTime();
    const diffMs = d2 - d1;
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  } catch {
    return 1;
  }
}

/**
 * Build an ISO date by adding offset days to a base date
 */
function addDaysToIso(baseIsoDate: string, daysToAdd: number): string {
  try {
    const d = new Date(baseIsoDate);
    d.setDate(d.getDate() + daysToAdd);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return baseIsoDate;
  }
}

/**
 * Format an ISO date string (YYYY-MM-DD) into Thai short date
 */
function formatThaiDateFromIso(iso: string): string {
  try {
    const parts = iso.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const thaiYear = year > 2400 ? year : year + 543;
      const thaiMonths = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
      ];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return `${day} ${thaiMonths[monthIdx] || ''} ${thaiYear}`;
    }
  } catch {
    // fallback
  }
  return iso;
}

export interface GenerateTimelineParams {
  pdx: string;
  secondaryDx: DiagnosisEntry[];
  medications: MedicationItem[];
  clinicalProfile: ClinicalProfile;
  procedures?: ProcedureEntry[];
  antibioticLogs?: AntibioticAdministrationLog[];
  dateAdm?: string;
  timeAdm?: string;
  dateDsc?: string;
  timeDsc?: string;
  rawDrugEvents?: Array<{
    name: string;
    did?: string;
    dateServ?: string;
    timeServ?: string;
    amount?: number;
    category?: 'vasopressor' | 'iv_antibiotic' | 'iv_fluid' | 'supportive' | 'electrolyte';
  }>;
}

/**
 * Core Clinical Timeline Generator
 * Generates structured events and flags potential coding gaps
 * especially comparing drug administration dates vs sepsis diagnosis.
 */
export function generateClinicalTimeline(params: GenerateTimelineParams): {
  events: ClinicalTimelineEvent[];
  gapsSummary: TimelineCodingGapSummary;
  admissionDateDisplay: string;
  dischargeDateDisplay: string;
  lengthOfStayDays: number;
} {
  const {
    pdx = '',
    secondaryDx = [],
    medications = [],
    clinicalProfile,
    procedures = [],
    antibioticLogs = [],
    dateAdm,
    timeAdm,
    dateDsc,
    timeDsc,
    rawDrugEvents = [],
  } = params || {};

  const safeSecondaryDx = secondaryDx || [];
  const safeMeds = medications || [];
  const safeProcedures = procedures || [];

  // 1. Establish base admission date
  const parsedAdm = parseNhsoDateString(dateAdm) || {
    isoDate: '2024-09-01',
    year: 2024,
    month: 9,
    day: 1,
    thaiFormatted: '1 ก.ย. 2567',
    shortFormatted: '01/09/2567',
  };
  const baseIsoDate = parsedAdm.isoDate;
  const formattedTimeAdm = formatNhsoTimeString(timeAdm) || '08:30 น.';

  // Determine discharge date
  const parsedDsc = parseNhsoDateString(dateDsc);
  const dscIsoDate = parsedDsc?.isoDate || addDaysToIso(baseIsoDate, 4);
  const formattedTimeDsc = formatNhsoTimeString(timeDsc) || '14:00 น.';
  const lengthOfStay = Math.max(1, calculateRelativeDay(baseIsoDate, dscIsoDate));

  const events: ClinicalTimelineEvent[] = [];

  // ==========================================
  // EVENT 1: ADMISSION (IPD.txt)
  // ==========================================
  events.push({
    id: 'evt_adm',
    date: baseIsoDate,
    time: formattedTimeAdm,
    displayDate: parsedAdm.thaiFormatted,
    dayNumber: 1,
    category: 'ADMISSION',
    title: 'รับตัวผู้ป่วยเข้ารักษาในโรงพยาบาล (Admission)',
    description: `รับผู้ป่วยเข้ารักษาในหอผู้ป่วยใน (IPD) ด้วยอาการไข้สูง ซึม หายใจเร็ว ความดันโลหิตต่ำ`,
    badge: 'IPD Admit',
    badgeColor: 'blue',
    sourceFile: 'IPD.txt',
  });

  // ==========================================
  // EVENT 2: PRINCIPAL DIAGNOSIS (IDX.txt)
  // ==========================================
  const cleanPdx = pdx.trim().toUpperCase().replace('.', '');
  const pdxInfo = ICD10_DATABASE[cleanPdx];
  const isPdxSepsis = cleanPdx.startsWith('A41') || cleanPdx.startsWith('A40') || cleanPdx === 'A021';
  const isPdxShock = cleanPdx.startsWith('R57');

  events.push({
    id: 'evt_pdx',
    date: baseIsoDate,
    time: formattedTimeAdm,
    displayDate: parsedAdm.thaiFormatted,
    dayNumber: 1,
    category: 'DIAGNOSIS',
    subCategory: isPdxSepsis ? 'SEPSIS_PDX' : isPdxShock ? 'SHOCK_SDX' : 'OTHER',
    code: cleanPdx,
    title: `การวินิจฉัยโรคหลัก (PDx): ${cleanPdx}`,
    description: pdxInfo ? `${pdxInfo.nameEn} (${pdxInfo.nameTh})` : 'การวินิจฉัยโรคหลักจากแฟ้ม IDX.txt',
    badge: 'PDx (โรคหลัก)',
    badgeColor: isPdxShock ? 'rose' : isPdxSepsis ? 'blue' : 'slate',
    sourceFile: 'IDX.txt',
  });

  // ==========================================
  // EVENT 3: BLOOD CULTURE & MANDATORY LABS (LABFU.txt)
  // ==========================================
  const isSdxSepsisFound = safeSecondaryDx.some((s) => {
    const c = (s?.code || '').toUpperCase().replace('.', '');
    return c.startsWith('A40') || c.startsWith('A41') || c === 'A021';
  });
  const isSepticShockFound = safeSecondaryDx.some((s) => (s?.code || '').toUpperCase().replace('.', '') === 'R572');
  const isFlaggedWithSepsis = isPdxSepsis || isSdxSepsisFound || isSepticShockFound || (clinicalProfile.clinicalSummary || '').toLowerCase().includes('sepsis');

  // 3.1 Blood Culture (Hemoculture)
  if (clinicalProfile.hemoculture !== 'not_sent') {
    events.push({
      id: 'evt_lab_culture_order',
      date: baseIsoDate,
      time: '08:50 น.',
      displayDate: parsedAdm.thaiFormatted,
      dayNumber: 1,
      category: 'LAB_SAMPLE',
      subCategory: 'CULTURE',
      title: 'เจาะส่งตรวจเพาะเชื้อในกระแสเลือด (Hemoculture x 2 bottles)',
      description: 'เก็บสิ่งส่งตรวจ Hemoculture ก่อนเริ่มยาปฏิชีวนะตามแนวทาง Surviving Sepsis Campaign (SSC) และเกณฑ์ สปสช.',
      badge: 'Lab Specimen',
      badgeColor: 'amber',
      sourceFile: 'LABFU.txt',
    });

    if (clinicalProfile.hemoculture === 'positive') {
      const cultureReportDay = Math.min(3, lengthOfStay);
      const cultureDateIso = addDaysToIso(baseIsoDate, cultureReportDay - 1);
      const parsedCultureDate = parseNhsoDateString(cultureDateIso.replace(/-/g, ''));

      events.push({
        id: 'evt_lab_culture_result',
        date: cultureDateIso,
        time: '14:20 น.',
        displayDate: parsedCultureDate?.thaiFormatted || `วันที่ ${cultureReportDay}`,
        dayNumber: cultureReportDay,
        category: 'LAB_SAMPLE',
        subCategory: 'CULTURE',
        title: `ผลเพาะเชื้อเลือดพบเชื้อ: ${clinicalProfile.cultureOrganism || 'Gram-negative bacilli'}`,
        description: `ห้องปฏิบัติการรายงานผลเชื้อขึ้นในกระแสเลือด (Positive Blood Culture) สนับสนุนการให้รหัส A41.5 / A41.9 ตามเกณฑ์ Audit`,
        badge: 'Culture Positive',
        badgeColor: 'rose',
        sourceFile: 'LABFU.txt',
      });
    } else if (clinicalProfile.hemoculture === 'negative') {
      const cultureReportDay = Math.min(3, lengthOfStay);
      const cultureDateIso = addDaysToIso(baseIsoDate, cultureReportDay - 1);
      const parsedCultureDate = parseNhsoDateString(cultureDateIso.replace(/-/g, ''));

      events.push({
        id: 'evt_lab_culture_result_neg',
        date: cultureDateIso,
        time: '14:20 น.',
        displayDate: parsedCultureDate?.thaiFormatted || `วันที่ ${cultureReportDay}`,
        dayNumber: cultureReportDay,
        category: 'LAB_SAMPLE',
        subCategory: 'CULTURE',
        title: 'ผลเพาะเชื้อในเลือด: ไม่พบเชื้อ (No Growth 5 days)',
        description: 'ห้องปฏิบัติการรายงานผลไม่พบเชื้อในเลือด (Negative Blood Culture) เข้าเกณฑ์ส่งตรวจครบถ้วน',
        badge: 'Culture Negative',
        badgeColor: 'slate',
        sourceFile: 'LABFU.txt',
      });
    }
  } else if (isFlaggedWithSepsis) {
    // Flagged with Sepsis but Hemoculture is missing
    events.push({
      id: 'evt_lab_culture_missing',
      date: baseIsoDate,
      time: '08:50 น.',
      displayDate: parsedAdm.thaiFormatted,
      dayNumber: 1,
      category: 'LAB_SAMPLE',
      subCategory: 'CULTURE',
      title: '🚨 ขาดการส่งตรวจเพาะเชื้อในกระแสเลือด (Blood Culture missing)',
      description: 'ผู้ป่วยมีรหัสกลุ่ม Sepsis แต่ไม่มีบันทึกการส่งตรวจ Hemoculture ซึ่งเป็นเกณฑ์บังคับ (Mandatory) ใน Hour-1 Bundle เสี่ยงถูกตัดสิทธิ์เบิกจ่ายตาม CR1',
      badge: 'Missing Lab: CR1 Risk',
      badgeColor: 'rose',
      sourceFile: 'LABFU.txt',
      codingGap: {
        severity: 'CRITICAL',
        gapType: 'MISSING_MANDATORY_LAB',
        title: 'ขาดผลตรวจเพาะเชื้อเลือด (Hemoculture) ซึ่งเป็นเกณฑ์จำเป็นในผู้ป่วย Sepsis',
        description: 'การสรุปรหัสในกลุ่ม Sepsis ตามหลักเกณฑ์ สปสช. [CR1] จำเป็นต้องมีหลักฐานการส่งเพาะเชื้อเลือดเพื่อยืนยันการติดเชื้อ',
        nhsoRule: 'สปสช. [CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ] & SSC Hour-1 Bundle',
      },
    });
  }

  // 3.2 Serum Lactate Measurement (Mandatory Sepsis Marker)
  const isLactateSpecified =
    clinicalProfile.lactateLevel !== undefined && clinicalProfile.lactateLevel !== null;
  const isLactateKnownStatus =
    clinicalProfile.lactateStatus && clinicalProfile.lactateStatus !== 'not_sent';

  if (isLactateSpecified || isLactateKnownStatus) {
    const lactateVal =
      clinicalProfile.lactateLevel ??
      (clinicalProfile.lactateStatus === 'critical'
        ? 4.5
        : clinicalProfile.lactateStatus === 'high'
        ? 2.8
        : 1.2);
    const isCritical = lactateVal >= 4.0;
    const isHigh = lactateVal >= 2.0 && lactateVal < 4.0;

    events.push({
      id: 'evt_lab_lactate_initial',
      date: baseIsoDate,
      time: '08:45 น.',
      displayDate: parsedAdm.thaiFormatted,
      dayNumber: 1,
      category: 'LAB_SAMPLE',
      title: `ตรวจวัดระดับ Serum Lactate: ${lactateVal} mmol/L`,
      description: isCritical
        ? `ระดับกรดแลคติกสูงวิกฤต (≥ 4.0 mmol/L) บ่งชี้ภาวะ Severe Tissue Hypoperfusion / เข้าเกณฑ์ Septic Shock ต้องให้สารน้ำกู้ชีพ ≥ 30 ml/kg ทันที`
        : isHigh
        ? `ระดับกรดแลคติกสูง (≥ 2.0 mmol/L) บ่งชี้ภาวะเนื้อเยื่อพร่องออกซิเจนตามเกณฑ์ Sepsis-3 แนะนำตรวจซ้ำภายใน 2-4 ชั่วโมง`
        : `ระดับกรดแลคติกปกติ (< 2.0 mmol/L) ผ่านเกณฑ์การตรวจคัดกรอง Sepsis`,
      badge: isCritical ? 'Lactate ≥ 4.0 (วิกฤต)' : isHigh ? 'Lactate ≥ 2.0 (สูง)' : 'Lactate ปกติ',
      badgeColor: isCritical ? 'rose' : isHigh ? 'amber' : 'emerald',
      sourceFile: 'LABFU.txt',
    });

    if (clinicalProfile.lactateRepeatLevel !== undefined && clinicalProfile.lactateRepeatLevel !== null) {
      const repVal = clinicalProfile.lactateRepeatLevel;
      const isImproved = repVal < lactateVal;
      events.push({
        id: 'evt_lab_lactate_repeat',
        date: baseIsoDate,
        time: '12:45 น.',
        displayDate: parsedAdm.thaiFormatted,
        dayNumber: 1,
        category: 'LAB_SAMPLE',
        title: `ตรวจซ้ำระดับ Serum Lactate (Repeat 4-hr): ${repVal} mmol/L`,
        description: isImproved
          ? `Lactate clearance ดีขึ้น (${lactateVal} -> ${repVal} mmol/L) แสดงว่าเนื้อเยื่อตอบสนองต่อการให้สารน้ำ Resuscitation`
          : `Lactate ยังคงสูงต่อเนื่อง (${repVal} mmol/L) ต้องพิจารณาเริ่มยากระตุ้นความดัน Vasopressor`,
        badge: isImproved ? 'Lactate Clearance ✓' : 'Lactate Persistent High ⚠️',
        badgeColor: isImproved ? 'emerald' : 'rose',
        sourceFile: 'LABFU.txt',
      });
    }
  } else if (isFlaggedWithSepsis) {
    // Flagged with Sepsis but Lactate is missing
    events.push({
      id: 'evt_lab_lactate_missing',
      date: baseIsoDate,
      time: '08:45 น.',
      displayDate: parsedAdm.thaiFormatted,
      dayNumber: 1,
      category: 'LAB_SAMPLE',
      title: '🚨 ขาดการตรวจวัดระดับกรดแลคติกในเลือด (Serum Lactate missing)',
      description: 'ผู้ป่วยมีรหัสกลุ่ม Sepsis แต่ไม่มีบันทึกระดับ Serum Lactate ซึ่งเป็นตัวบ่งชี้จำเป็น (Mandatory Marker) ในการประเมิน Tissue Hypoperfusion',
      badge: 'Missing Lab: Sepsis Marker',
      badgeColor: 'rose',
      sourceFile: 'LABFU.txt',
      codingGap: {
        severity: 'CRITICAL',
        gapType: 'MISSING_MANDATORY_LAB',
        title: 'ขาดผลตรวจ Serum Lactate ซึ่งเป็นเกณฑ์จำเป็นในการประเมิน Sepsis & Septic Shock',
        description: 'ระดับ Serum Lactate เป็น Gold Standard ในการวัด Tissue Hypoperfusion ตามเกณฑ์ Sepsis-3 และแนวทาง สปสช. เพื่อตัดสินการให้สารน้ำ Resuscitation',
        nhsoRule: 'สปสช. [CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ] & Surviving Sepsis Campaign',
      },
    });
  }

  // ==========================================
  // EVENT 4: DRUG ADMINISTRATIONS (DRU.txt)
  // ==========================================
  // If raw drug events with explicit dates were supplied, use them;
  // otherwise generate timeline dates according to clinical sequence.
  const activeMeds = safeMeds.filter((m) => m?.isSelected);

  activeMeds.forEach((med, idx) => {
    // If med has explicit dateServ, parse it; otherwise schedule realistically
    let medIsoDate = baseIsoDate;
    let medDay = 1;
    let medTime = '09:15 น.';

    if (med.dateServ) {
      const parsedMedDate = parseNhsoDateString(med.dateServ);
      if (parsedMedDate) {
        medIsoDate = parsedMedDate.isoDate;
        medDay = calculateRelativeDay(baseIsoDate, medIsoDate);
      }
    } else {
      // Synthesize realistic clinical day
      if (med.category === 'vasopressor') {
        medDay = 1;
        medTime = '10:30 น.'; // Started after fluid challenge failed
      } else if (med.category === 'iv_antibiotic') {
        medDay = 1;
        medTime = '09:30 น.'; // 1st dose antibiotic within 1-3h
      } else if (med.category === 'iv_fluid') {
        medDay = 1;
        medTime = '08:45 น.'; // Fluid resuscitation immediately
      } else {
        medDay = Math.min(idx > 3 ? 2 : 1, lengthOfStay);
        medTime = '11:00 น.';
      }
      medIsoDate = addDaysToIso(baseIsoDate, medDay - 1);
    }

    const parsedDate = parseNhsoDateString(medIsoDate.replace(/-/g, ''));
    const displayDate = parsedDate?.thaiFormatted || `วันที่ ${medDay}`;

    let subCategory: ClinicalTimelineEvent['subCategory'] = 'OTHER';
    let badgeColor: ClinicalTimelineEvent['badgeColor'] = 'slate';
    let badge = 'ยาฉีด/ยาบิล';

    if (med.category === 'vasopressor') {
      subCategory = 'VASOPRESSOR';
      badgeColor = 'rose';
      badge = 'Vasopressor (ยากระตุ้นความดัน)';
    } else if (med.category === 'iv_antibiotic') {
      subCategory = 'ANTIBIOTIC';
      badgeColor = 'purple';
      badge = 'IV Antibiotic';
    } else if (med.category === 'iv_fluid') {
      subCategory = 'IV_FLUID';
      badgeColor = 'blue';
      badge = 'IV Fluid Resuscitation';
    }

    events.push({
      id: `evt_med_${med.id || idx}`,
      date: medIsoDate,
      time: med.timeServ ? formatNhsoTimeString(med.timeServ) : medTime,
      displayDate,
      dayNumber: medDay,
      category: 'DRUG_ADMINISTRATION',
      subCategory,
      code: med.workingCode,
      title: `บริหารยา: ${med.name}`,
      description: `จำนวนที่จ่าย ${med.quantity} ${med.dosage ? `(${med.dosage})` : 'unit'} | หมวดหมู่: ${med.category}`,
      badge,
      badgeColor,
      sourceFile: 'DRU.txt',
    });
  });

  // ==========================================
  // EVENT 4.5: DETAILED ANTIBIOTIC LOGS (MAR / DRU.txt)
  // ==========================================
  if (antibioticLogs && antibioticLogs.length > 0) {
    antibioticLogs.forEach((log, idx) => {
      const logIsoDate = addDaysToIso(baseIsoDate, Math.max(0, log.dayNumber - 1));
      const logDisplayDate = formatThaiDateFromIso(logIsoDate);
      const logTime = log.time ? `${log.time} น.` : '09:30 น.';

      events.push({
        id: `evt_antibiotic_log_${log.id || idx}`,
        date: logIsoDate,
        time: logTime,
        displayDate: logDisplayDate,
        dayNumber: log.dayNumber,
        category: 'DRUG_ADMINISTRATION',
        subCategory: 'ANTIBIOTIC',
        title: `บริหารยาปฏิชีวนะ: ${log.antibioticName} ${log.dosage}`,
        description: `ขนาด ${log.dosage} ${log.frequency} ทาง ${log.route} | วัตถุประสงค์: ${log.indicationType} | แหล่งติดเชื้อ: ${log.suspectedSource} | Hemoculture: ${
          log.bloodCultureSequence === 'BEFORE_ANTIBIOTIC'
            ? 'เจาะก่อนให้ยา (Gold Standard)'
            : log.bloodCultureSequence === 'AFTER_ANTIBIOTIC'
            ? 'เจาะหลังให้ยา'
            : 'ไม่ได้เจาะเพาะเชื้อ'
        }${log.notes ? ` | หมายเหตุ: ${log.notes}` : ''}`,
        badge: log.isHour1Bundle ? 'Hour-1 Sepsis Bundle' : 'IV Antibiotic Administered',
        badgeColor: 'purple',
        sourceFile: 'DRU.txt',
      });
    });
  }

  // ==========================================
  // EVENT 5: PROCEDURES (IOP.txt)
  // ==========================================
  procedures.forEach((proc, idx) => {
    let procIsoDate = baseIsoDate;
    let procDay = 1;
    let procTime = '11:30 น.';

    if (proc.dateOper) {
      const parsedProcDate = parseNhsoDateString(proc.dateOper);
      if (parsedProcDate) {
        procIsoDate = parsedProcDate.isoDate;
        procDay = calculateRelativeDay(baseIsoDate, procIsoDate);
      }
    } else {
      procIsoDate = addDaysToIso(baseIsoDate, procDay - 1);
    }

    if (proc.timeIn) {
      procTime = formatNhsoTimeString(proc.timeIn);
    }

    const cleanProc = proc.code.replace('.', '');
    const procInfo = NHSO_ICD9_DATABASE[cleanProc];
    const isVent = cleanProc === '9671' || cleanProc === '9672' || cleanProc === '9604';

    const parsedDate = parseNhsoDateString(procIsoDate.replace(/-/g, ''));
    const displayDate = parsedDate?.thaiFormatted || `วันที่ ${procDay}`;

    events.push({
      id: `evt_proc_${proc.id || idx}`,
      date: procIsoDate,
      time: procTime,
      displayDate,
      dayNumber: procDay,
      category: 'PROCEDURE',
      subCategory: isVent ? 'VENTILATOR' : 'OTHER',
      code: proc.code,
      title: `หัตถการ: ${proc.code.includes('.') ? proc.code : `${proc.code.slice(0, 2)}.${proc.code.slice(2)}`} - ${procInfo?.nameTh || proc.descriptionTh}`,
      description: `${procInfo?.nameEn || proc.descriptionEn} (${proc.procType === 'principal' ? 'หัตถการหลัก' : 'หัตถการรอง'})`,
      badge: isVent ? 'Ventilator / Resuscitation' : 'Procedure ICD-9',
      badgeColor: procInfo?.auditRisk === 'HIGH' ? 'rose' : 'indigo',
      sourceFile: 'IOP.txt',
    });
  });

  // ==========================================
  // EVENT 6: SECONDARY DIAGNOSES (IDX.txt)
  // ==========================================
  secondaryDx.forEach((sdx, idx) => {
    const cleanSdx = sdx.code.trim().toUpperCase().replace('.', '');
    const isShock = cleanSdx.startsWith('R57');
    const isAKI = cleanSdx === 'N179';
    const isRespFail = cleanSdx.startsWith('J96');
    const sdxInfo = ICD10_DATABASE[cleanSdx];

    // Shock / Complications usually manifest on Day 1 or Day 2
    const sdxDay = isShock ? 1 : idx > 2 ? 2 : 1;
    const sdxIsoDate = addDaysToIso(baseIsoDate, sdxDay - 1);
    const parsedDate = parseNhsoDateString(sdxIsoDate.replace(/-/g, ''));

    events.push({
      id: `evt_sdx_${sdx.id || idx}`,
      date: sdxIsoDate,
      time: isShock ? '10:45 น.' : '12:00 น.',
      displayDate: parsedDate?.thaiFormatted || `วันที่ ${sdxDay}`,
      dayNumber: sdxDay,
      category: 'DIAGNOSIS',
      subCategory: isShock ? 'SHOCK_SDX' : isAKI || isRespFail ? 'ORGAN_FAILURE' : 'OTHER',
      code: cleanSdx,
      title: `การวินิจฉัยรอง (SDx): ${cleanSdx} - ${sdx.diagType === 'complication' ? 'โรคแทรก (Complication)' : 'โรคร่วม (Co-morbid)'}`,
      description: sdxInfo ? `${sdxInfo.nameEn} (${sdxInfo.nameTh})` : sdx.descriptionEn,
      badge: sdx.diagType === 'complication' ? 'โรคแทรก (Complication)' : 'โรคร่วม (Co-morbid)',
      badgeColor: isShock ? (sdx.diagType === 'complication' ? 'rose' : 'amber') : 'slate',
      sourceFile: 'IDX.txt',
    });
  });

  // ==========================================
  // EVENT 7: DISCHARGE (IPD.txt)
  // ==========================================
  events.push({
    id: 'evt_dsc',
    date: dscIsoDate,
    time: formattedTimeDsc,
    displayDate: parsedDsc?.thaiFormatted || parseNhsoDateString(dscIsoDate.replace(/-/g, ''))?.thaiFormatted || `วันที่ ${lengthOfStay}`,
    dayNumber: lengthOfStay,
    category: 'DISCHARGE',
    title: 'จำหน่ายผู้ป่วยออกจากโรงพยาบาล (Discharge)',
    description: `สิ้นสุดการรักษาในหอผู้ป่วยใน (IPD) รวมระยะเวลานอนโรงพยาบาล ${lengthOfStay} วัน`,
    badge: 'Discharge',
    badgeColor: 'emerald',
    sourceFile: 'IPD.txt',
  });

  // Sort events chronologically (by date, dayNumber, then time)
  events.sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return a.time && b.time ? a.time.localeCompare(b.time) : 0;
  });

  // ==========================================================
  // CODING GAPS ANALYSIS ENGINE (Comparing Drug vs Sepsis vs Shock)
  // ==========================================================
  const gapItems: TimelineCodingGapSummary['items'] = [];

  // Helper flags
  const hasVasopressor = activeMeds.some((m) => m.category === 'vasopressor');
  const vasoItems = activeMeds.filter((m) => m.category === 'vasopressor');
  const hasIvAntibiotic =
    activeMeds.some((m) => m.category === 'iv_antibiotic') ||
    (antibioticLogs && antibioticLogs.some((l) => l.route !== 'ORAL'));
  const ivAntiItems = activeMeds.filter((m) => m.category === 'iv_antibiotic');

  const shockSdx = secondaryDx.find((s) => s.code.trim().toUpperCase().replace('.', '').startsWith('R57'));
  const cleanShockCode = shockSdx?.code.trim().toUpperCase().replace('.', '');
  const hasSepticShockCode = cleanShockCode === 'R572';

  const firstVasoEvent = events.find((e) => e.subCategory === 'VASOPRESSOR');
  const firstAntibioticEvent = events.find((e) => e.subCategory === 'ANTIBIOTIC');
  const firstSepsisEvent = events.find((e) => e.subCategory === 'SEPSIS_PDX');
  const ventEvent = events.find((e) => e.subCategory === 'VENTILATOR');

  // -------------------------------------------------------------
  // GAP 1: Vasopressor Given vs. Septic Shock Missing or Misclassified
  // -------------------------------------------------------------
  if (hasVasopressor) {
    const vasoNames = vasoItems.map((v) => v.name).join(', ');
    const vasoDateStr = firstVasoEvent?.displayDate || 'วันแรกที่รับรักษา';

    if (!shockSdx && !isPdxShock) {
      // Gap 1A: Has vasopressor, but Septic Shock (R57.2) is NOT coded!
      const gapId = 'gap_vaso_no_shock';
      const gapObj = {
        id: gapId,
        title: 'พบการให้ยากระตุ้นความดัน (Vasopressor) แต่ไม่มีรหัสภาวะช็อก (R57.2) ในแฟ้ม IDX',
        description: `ผู้ป่วยได้รับยา ${vasoNames} ณ ${vasoDateStr} ซึ่งเป็นหลักฐานชัดเจนของภาวะ Septic Shock แต่แฟ้มการวินิจฉัย (IDX.txt) ขาดรหัส R57.2 เป็นโรคแทรก ส่งผลให้สูญเสียค่าน้ำหนักสัมพัทธ์ (RW) และค่าชดเชย DRG ต่ำกว่าความเป็นจริงอย่างมาก`,
        severity: 'CRITICAL' as const,
        nhsoRule: 'สปสช. เกณฑ์การให้รหัสภาวะช็อกร่วมกับยากระตุ้นความดัน (Under-coding Detection)',
        recommendation: 'เพิ่มรหัส R57.2 (Septic shock) เป็นโรคแทรก (Complication) เพื่อสะท้อนการรักษาจริงและเพิ่มค่าน้ำหนัก DRG',
        relatedEventId: firstVasoEvent?.id,
        actionPayload: {
          actionType: 'ADD_SDX' as const,
          code: 'R572',
          diagType: 'complication' as const,
        },
      };
      gapItems.push(gapObj);

      // Attach to timeline event
      if (firstVasoEvent) {
        firstVasoEvent.codingGap = {
          severity: 'CRITICAL',
          gapType: 'UNMATCHED_DRUG',
          title: 'ขาดรหัสภาวะช็อก R57.2 รองรับการให้ Vasopressor',
          description: gapObj.description,
          nhsoRule: gapObj.nhsoRule,
          suggestedAction: {
            label: 'เพิ่ม R57.2 (โรคแทรก)',
            actionType: 'ADD_SDX',
            code: 'R572',
            diagType: 'complication',
          },
        };
      }
    } else if (shockSdx && shockSdx.diagType === 'comorbid') {
      // Gap 1B: R57.2 is coded as Co-morbid! CR1 Violation!
      const gapId = 'gap_shock_as_comorbid';
      const gapObj = {
        id: gapId,
        title: 'รหัสภาวะช็อก (R57.2) ถูกบันทึกเป็น "โรคร่วม (Co-morbid)" ขัดกับกฎ สปสช. CR1',
        description: `ผู้ป่วยได้รับยากระตุ้นความดัน (${vasoNames}) ณ ${vasoDateStr} แต่ในแฟ้ม IDX.txt บันทึก R57.2 เป็น DXTYPE 2 (โรคร่วม) สปสช. มีเกณฑ์เข้มงวดเด็ดขาดว่า ภาวะ Shock ทุกชนิดต้องสรุปเป็น 'โรคแทรก (Complication)' เท่านั้น มิฉะนั้นจะถูกปฏิเสธการจ่ายเงิน (DENY 0 บาท)`,
        severity: 'CRITICAL' as const,
        nhsoRule: 'CR1 & CR37 (DENY: ชดเชย 0 บาท)',
        recommendation: 'เปลี่ยนประเภทการวินิจฉัยของ R57.2 จาก "โรคร่วม" เป็น "โรคแทรก (Complication)" ทันที',
        relatedEventId: firstVasoEvent?.id,
        actionPayload: {
          actionType: 'CHANGE_TYPE' as const,
          code: 'R572',
          diagType: 'complication' as const,
        },
      };
      gapItems.push(gapObj);

      if (firstVasoEvent) {
        firstVasoEvent.codingGap = {
          severity: 'CRITICAL',
          gapType: 'MISCLASSIFIED_SHOCK',
          title: 'ผิดกฎ CR1! รหัส Shock ต้องเป็นโรคแทรกเท่านั้น',
          description: gapObj.description,
          nhsoRule: gapObj.nhsoRule,
          suggestedAction: {
            label: 'เปลี่ยนเป็นโรคแทรก',
            actionType: 'CHANGE_TYPE',
            code: 'R572',
            diagType: 'complication',
          },
        };
      }
    }
  }

  // -------------------------------------------------------------
  // GAP 2: Sepsis Diagnosis vs. First IV Antibiotic Administration
  // -------------------------------------------------------------
  if (isPdxSepsis || secondaryDx.some((s) => s.code.toUpperCase().replace('.', '').startsWith('A41'))) {
    if (!hasIvAntibiotic) {
      // Gap 2A: Sepsis with ZERO antibiotics in DRU.txt -> CR37 DENY
      const gapId = 'gap_sepsis_no_antibiotic';
      const gapObj = {
        id: gapId,
        title: 'วินิจฉัย Sepsis แต่ไม่มีรายการยาปฏิชีวนะชนิดฉีดในแฟ้ม DRU.txt (CR37)',
        description: `แฟ้ม IDX ระบุรหัสติดเชื้อในกระแสเลือด (${cleanPdx}) แต่ในแฟ้มยา (DRU.txt) ตรวจไม่พบยาปฏิชีวนะกลุ่มฉีดเลย จะถูกระบบ Auto-audit ของ สปสช. ตัดชดเชยเงินเป็น 0 บาททันทีตามเกณฑ์ CR37`,
        severity: 'CRITICAL' as const,
        nhsoRule: 'CR37 (Condition Not Supported by Medications)',
        recommendation: 'ตรวจสอบแฟ้ม DRU.txt หรือเพิ่มรายการยาปฏิชีวนะที่ผู้ป่วยได้รับจริงเข้าสู่ระบบ',
        relatedEventId: firstSepsisEvent?.id,
      };
      gapItems.push(gapObj);

      if (firstSepsisEvent) {
        firstSepsisEvent.codingGap = {
          severity: 'CRITICAL',
          gapType: 'UNMATCHED_DRUG',
          title: 'ติดเกณฑ์ CR37! ขาดรายการยาปฏิชีวนะฉีดรองรับ Sepsis',
          description: gapObj.description,
          nhsoRule: gapObj.nhsoRule,
        };
      }
    } else if (firstAntibioticEvent && firstAntibioticEvent.dayNumber >= 3) {
      // Gap 2B: Antibiotic start is delayed to Day 3 or later!
      const gapId = 'gap_delayed_antibiotic';
      const gapObj = {
        id: gapId,
        title: `วันเริ่มยาปฏิชีวนะ (${firstAntibioticEvent.displayDate}) ล่าช้ากว่าวันวินิจฉัย Sepsis (${parsedAdm.thaiFormatted})`,
        description: `ผู้ป่วยได้รับการวินิจฉัย Sepsis ตั้งแต่วันที่ Admit (${parsedAdm.thaiFormatted}) แต่แฟ้ม DRU.txt บันทึกการเริ่มยาปฏิชีวนะฉีดในวันที่ ${firstAntibioticEvent.dayNumber} ของการรักษา อาจเกิดจาก (1) บันทึก DATE_SERV ในแฟ้ม DRU.txt ผิดพลาด หรือ (2) สรุปรหัสโรคติดเชื้อในกระแสเลือดเร็วเกินไปโดยไม่มีการรักษาจริงในวันแรก เสี่ยงถูก Audit เวชระเบียน`,
        severity: 'WARNING' as const,
        nhsoRule: 'Surviving Sepsis Campaign & สปสช. Clinical Audit 100%',
        recommendation: 'ตรวจสอบวันที่บริหารยาในใบบันทึกการให้ยา (MAR) หากเริ่มตั้งแต่วันแรกให้แก้ไข DATE_SERV ใน DRU.txt ให้ตรงกัน',
        relatedEventId: firstAntibioticEvent?.id,
      };
      gapItems.push(gapObj);

      firstAntibioticEvent.codingGap = {
        severity: 'WARNING',
        gapType: 'DELAYED_ANTIBIOTIC',
        title: 'เริ่มยาปฏิชีวนะล่าช้ากว่าการวินิจฉัย Sepsis',
        description: gapObj.description,
        nhsoRule: gapObj.nhsoRule,
      };
    }
  }

  // -------------------------------------------------------------
  // GAP 3: Broad-Spectrum Antibiotics without Sepsis Coding
  // -------------------------------------------------------------
  const hasBroadSpectrum = activeMeds.some((m) =>
    ['meropenem', 'colistin', 'piperacillin', 'imipenem', 'cefoperazone', 'ceftriaxone'].some((k) =>
      m.name.toLowerCase().includes(k)
    )
  );

  if (hasBroadSpectrum && !isPdxSepsis && !safeSecondaryDx.some((s) => (s?.code || '').toUpperCase().replace('.', '').startsWith('A41'))) {
    const broadMeds = activeMeds
      .filter((m) =>
        ['meropenem', 'colistin', 'piperacillin', 'imipenem', 'cefoperazone', 'ceftriaxone'].some((k) =>
          m.name.toLowerCase().includes(k)
        )
      )
      .map((m) => m.name)
      .join(', ');

    const gapId = 'gap_broad_spectrum_no_sepsis';
    const gapObj = {
      id: gapId,
      title: 'มีการใช้ยาปฏิชีวนะระดับสูง (Broad-Spectrum) แต่ไม่ได้สรุปรหัส Sepsis (A41.5 / A41.9)',
      description: `ผู้ป่วยได้รับยา ${broadMeds} ซึ่งเป็นยาปฏิชีวนะกลุ่มวิกฤต แต่รหัสการวินิจฉัยระบุเพียงโรคติดเชื้อเฉพาะที่ (${cleanPdx}: ${pdxInfo?.nameTh || cleanPdx}) หากผู้ป่วยมีเกณฑ์ SIRS $\ge$ 2 ข้อ และมีภาวะอวัยวะทำงานล้มเหลว ควรทบทวนเพื่อสรุปรหัส Sepsis เพื่อให้ DRG สะท้อนความรุนแรงของโรค`,
      severity: 'OPPORTUNITY' as const,
      nhsoRule: 'คู่มือการให้รหัส ICD-10 สปสช. (Under-coding Detection)',
      recommendation: 'ทบทวนผลเพาะเชื้อและสัญญาณชีพเพื่อพิจารณาเพิ่มรหัส A41.5 หรือ A41.9',
      relatedEventId: firstAntibioticEvent?.id,
      actionPayload: {
        actionType: 'SET_PDX' as const,
        code: 'A415',
      },
    };
    gapItems.push(gapObj);

    if (firstAntibioticEvent && !firstAntibioticEvent.codingGap) {
      firstAntibioticEvent.codingGap = {
        severity: 'OPPORTUNITY',
        gapType: 'UNMATCHED_DRUG',
        title: 'ใช้ยาฆ่าเชื้อขั้นสูงแต่ไม่ได้สรุปรหัส Sepsis',
        description: gapObj.description,
        nhsoRule: gapObj.nhsoRule,
        suggestedAction: {
          label: 'เปลี่ยน PDx เป็น A41.5',
          actionType: 'SET_PDX',
          code: 'A415',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // GAP 4: Mechanical Ventilation without Acute Respiratory Failure
  // -------------------------------------------------------------
  if (ventEvent) {
    const hasRespFail = secondaryDx.some((s) => s.code.toUpperCase().replace('.', '').startsWith('J96'));
    if (!hasRespFail && !cleanPdx.startsWith('J96')) {
      const gapId = 'gap_vent_no_resp_failure';
      const gapObj = {
        id: gapId,
        title: 'มีหัตถการใช้เครื่องช่วยหายใจ (96.71/96.72) แต่ไม่มีรหัสภาวะหายใจล้มเหลวเฉียบพลัน (J96.00)',
        description: `พบการใส่ท่อและใช้เครื่องช่วยหายใจในแฟ้ม IOP ณ ${ventEvent.displayDate} แต่แฟ้ม IDX ขาดรหัส J96.00 (Acute respiratory failure) ทำให้สูญเสียค่าน้ำหนักสัมพัทธ์ (RW) ที่ควรจะได้รับ`,
        severity: 'OPPORTUNITY' as const,
        nhsoRule: 'เกณฑ์การให้รหัสภาวะแทรกซ้อนระบบทางเดินหายใจ สปสช.',
        recommendation: 'เพิ่มรหัส J96.00 (Acute respiratory failure, unspecified) เป็นโรคแทรก',
        relatedEventId: ventEvent.id,
        actionPayload: {
          actionType: 'ADD_SDX' as const,
          code: 'J9600',
          diagType: 'complication' as const,
        },
      };
      gapItems.push(gapObj);

      ventEvent.codingGap = {
        severity: 'OPPORTUNITY',
        gapType: 'MISSING_PROCEDURE_DX',
        title: 'ขาดรหัส J96.00 รองรับการใช้เครื่องช่วยหายใจ',
        description: gapObj.description,
        nhsoRule: gapObj.nhsoRule,
        suggestedAction: {
          label: 'เพิ่ม J96.00 (โรคแทรก)',
          actionType: 'ADD_SDX',
          code: 'J9600',
          diagType: 'complication',
        },
      };
    }
  }

  // -------------------------------------------------------------
  // GAP 5: Mandatory Sepsis Labs (Blood Culture & Serum Lactate)
  // -------------------------------------------------------------
  if (isFlaggedWithSepsis) {
    // 5A: Missing Blood Culture (Hemoculture)
    if (clinicalProfile.hemoculture === 'not_sent') {
      const gapId = 'gap_sepsis_no_hemoculture';
      const gapObj = {
        id: gapId,
        title: 'ผู้ป่วยมีรหัสกลุ่ม Sepsis แต่ขาดผลตรวจเพาะเชื้อเลือด (Blood Culture missing)',
        description: 'การสรุปรหัสในกลุ่ม Sepsis (A40.-, A41.-) สปสช. [CR1] และเกณฑ์ Hour-1 Bundle กำหนดให้ต้องส่งตรวจ Hemoculture ก่อนเริ่มยาปฏิชีวนะ การขาดผลตรวจเพาะเชื้อเลือดจะส่งผลให้ถูกตั้งข้อสังเกตและอาจถูก Audit ปฏิเสธการชดเชย [CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]',
        severity: 'CRITICAL' as const,
        nhsoRule: 'สปสช. [CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ] & Surviving Sepsis Campaign',
        recommendation: 'ตรวจสอบผล Hemoculture หรือบันทึกการส่งตรวจเพาะเชื้อในเวชระเบียนและระบบห้องปฏิบัติการ',
      };
      gapItems.push(gapObj);
    }

    // 5B: Missing Serum Lactate
    const hasLactate =
      (clinicalProfile.lactateLevel !== undefined && clinicalProfile.lactateLevel !== null) ||
      (clinicalProfile.lactateStatus && clinicalProfile.lactateStatus !== 'not_sent');

    if (!hasLactate) {
      const gapId = 'gap_sepsis_no_lactate';
      const gapObj = {
        id: gapId,
        title: 'ผู้ป่วยมีรหัสกลุ่ม Sepsis แต่ขาดการตรวจวัดระดับกรดแลคติก (Serum Lactate missing)',
        description: 'ระดับกรดแลคติกในเลือด (Serum Lactate) เป็นตัวชี้วัดจำเป็น (Mandatory Marker) ในการประเมิน Tissue Hypoperfusion ตามเกณฑ์ Sepsis-3 หากระดับ ≥ 2.0 mmol/L บ่งชี้ความรุนแรง และหาก ≥ 4.0 mmol/L ต้องกู้ชีพด้วยสารน้ำทันที ขาดผลตรวจนี้เสี่ยงต่อการถูก Audit ทบทวนเวชระเบียน',
        severity: 'CRITICAL' as const,
        nhsoRule: 'สปสช. [CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ] & Surviving Sepsis Campaign (SSC)',
        recommendation: 'ตรวจวัดระดับ Serum Lactate (mmol/L) และตรวจซ้ำภายใน 2-4 ชั่วโมงหากค่าแรกรับสูง',
      };
      gapItems.push(gapObj);
    }
  }

  // Calculate gaps summary counts
  const criticalGaps = gapItems.filter((g) => g.severity === 'CRITICAL').length;
  const warningGaps = gapItems.filter((g) => g.severity === 'WARNING').length;
  const opportunityGaps = gapItems.filter((g) => g.severity === 'OPPORTUNITY').length;

  return {
    events,
    gapsSummary: {
      totalGaps: gapItems.length,
      criticalGaps,
      warningGaps,
      opportunityGaps,
      items: gapItems,
    },
    admissionDateDisplay: parsedAdm.thaiFormatted,
    dischargeDateDisplay: parsedDsc?.thaiFormatted || parseNhsoDateString(dscIsoDate.replace(/-/g, ''))?.thaiFormatted || '',
    lengthOfStayDays: lengthOfStay,
  };
}
