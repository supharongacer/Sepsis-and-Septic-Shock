import {
  AntibioticAdministrationLog,
  AntibioticGuidelineMatchCheck,
  AntibioticGuidelineMatchResult,
  ClinicalProfile,
  DiagnosisEntry,
  ProcedureEntry,
} from '../types';
import { ANTIBIOTIC_DATABASE } from '../data/antibioticDatabase';

interface MatchParams {
  antibioticLogs: AntibioticAdministrationLog[];
  pdx: string;
  secondaryDx: DiagnosisEntry[];
  clinicalProfile: ClinicalProfile;
  procedures?: ProcedureEntry[];
  lengthOfStayDays?: number;
}

/**
 * Match logged antibiotics against ICD-10 diagnoses, culture results,
 * and NHSO/Surviving Sepsis Campaign (SSC) guidelines.
 */
export function matchAntibioticsAgainstGuidelines({
  antibioticLogs = [],
  pdx,
  secondaryDx = [],
  clinicalProfile,
  procedures = [],
  lengthOfStayDays = 4,
}: MatchParams): AntibioticGuidelineMatchResult {
  const checks: AntibioticGuidelineMatchCheck[] = [];
  const suggestedCodingActions: NonNullable<AntibioticGuidelineMatchResult['suggestedCodingActions']> = [];

  const cleanPdx = (pdx || '').trim().toUpperCase().replace(/\./g, '');
  const cleanSdxList = secondaryDx.map((s) => s.code.trim().toUpperCase().replace(/\./g, ''));

  const isSepsisPdx = cleanPdx.startsWith('A41') || cleanPdx.startsWith('A40') || cleanPdx === 'A021';
  const hasSepsisCode = isSepsisPdx || cleanSdxList.some((c) => c.startsWith('A41') || c.startsWith('A40'));
  const hasSepticShock = cleanSdxList.includes('R572') || cleanPdx === 'R572';
  const hasAki = cleanSdxList.includes('N179') || cleanPdx === 'N179' || (clinicalProfile?.sofaScores?.renalScore || 0) >= 2;

  // Source infections
  const hasIntraAbdominal = ['A090', 'A099', 'K650', 'K358', 'K566', 'K810'].some((c) => cleanPdx === c || cleanSdxList.includes(c));
  const hasUti = ['N390', 'N10', 'N136'].some((c) => cleanPdx === c || cleanSdxList.includes(c));
  const hasPneumonia = ['J189', 'J159', 'J158', 'J13', 'J14'].some((c) => cleanPdx === c || cleanSdxList.includes(c));
  const hasSkinInfection = ['L039', 'M726', 'L029'].some((c) => cleanPdx === c || cleanSdxList.includes(c));

  // If no antibiotics logged at all
  if (antibioticLogs.length === 0) {
    if (hasSepsisCode || hasSepticShock) {
      checks.push({
        id: 'chk_no_antibiotics',
        title: 'ไม่พบประวัติการบริหารยาปฏิชีวนะระหว่างการนอน รพ. (CR37)',
        status: 'FAIL',
        description: 'การเคลมรหัส Sepsis / Septic shock จำเป็นต้องมีหลักฐานการบริหารยาปฏิชีวนะฉีดเข้าเส้น (IV) ในแฟ้ม DRU.txt หากไม่มีจะถูกตัดชดเชย 0 บาทตามเกณฑ์ CR37',
        guidelineRef: 'สปสช. CR37 & Surviving Sepsis Campaign',
        recommendation: 'บันทึกยาปฏิชีวนะที่ผู้ป่วยได้รับจริงระหว่างนอนโรงพยาบาล',
      });
    }

    return {
      concordanceStatus: 'DISCORDANT',
      scorePercent: 0,
      hour1BundleMet: false,
      bloodCultureTimingMet: false,
      routeMet: false,
      spectrumMatchesPdx: false,
      spectrumMatchesCulture: false,
      renalDoseCaution: false,
      checks,
      suggestedCodingActions,
    };
  }

  // 1. ROUTE CHECK (NHSO CR37 Mandate)
  const hasIvRoute = antibioticLogs.some((l) => l.route === 'IV' || l.route === 'IV_DRIP' || l.route === 'IV_PUSH');
  const allOral = antibioticLogs.every((l) => l.route === 'ORAL');

  if (allOral && (hasSepsisCode || hasSepticShock)) {
    checks.push({
      id: 'chk_route',
      title: 'ยาปฏิชีวนะทุกรายการเป็นชนิดรับประทาน (Oral Only) ขัดเกณฑ์ CR37',
      status: 'FAIL',
      description: 'เกณฑ์ CR37 ของ สปสช. ปฏิเสธการเบิกจ่าย Sepsis ในผู้ป่วยในหากได้รับเฉพาะยารับประทาน ต้องเป็นยาฉีดหลอดเลือดดำ (IV/Parenteral)',
      guidelineRef: 'สปสช. กฎ CR37 ข้อห้ามการให้รหัส Sepsis',
      recommendation: 'ปรับเปลี่ยนเส้นทางการให้ยาเป็น IV หรือทบทวนการวินิจฉัยโรคหลัก',
    });
  } else if (hasIvRoute) {
    checks.push({
      id: 'chk_route',
      title: 'บริหารยาปฏิชีวนะทางหลอดเลือดดำ (IV Route) สอดคล้องตามเกณฑ์ CR37',
      status: 'PASS',
      description: 'ผู้ป่วยได้รับยาปฏิชีวนะฉีดเข้าหลอดเลือดดำ มีหลักฐานในเวชระเบียนรองรับการเคลม Sepsis ในผู้ป่วยใน',
      guidelineRef: 'สปสช. CR37 Verified',
    });
  }

  // 2. TIMELINESS & HOUR-1 BUNDLE CHECK
  const day1Logs = antibioticLogs.filter((l) => l.dayNumber === 1);
  const hour1Logged = antibioticLogs.some((l) => l.isHour1Bundle);
  const firstDoseDay = Math.min(...antibioticLogs.map((l) => l.dayNumber));

  if (hour1Logged) {
    checks.push({
      id: 'chk_hour1',
      title: 'ผ่านเกณฑ์ชั่วโมงทอง Hour-1 Sepsis Bundle (ได้รับยาภายใน 1 ชม. แรกรับ)',
      status: 'PASS',
      description: 'ผู้ป่วยได้รับยาปฏิชีวนะเข็มแรกภายใน 1 ชั่วโมงหลังจากวินิจฉัยหรือแรกรับ ตรงตามมาตรฐานสากล Surviving Sepsis Campaign',
      guidelineRef: 'Surviving Sepsis Campaign: Hour-1 Bundle & สปสช. Clinical Audit',
    });
  } else if (day1Logs.length > 0) {
    checks.push({
      id: 'chk_hour1',
      title: 'ได้รับยาปฏิชีวนะในวันแรกของการรับรักษา (Day 1)',
      status: 'PASS',
      description: `เริ่มบริหารยาปฏิชีวนะเข็มแรกใน Day 1 (${day1Logs[0]?.antibioticName} เวลา ${day1Logs[0]?.time || 'ช่วงแรกรับ'}) สอดคล้องกับวันแรกรับในแฟ้ม IPD และ IDX`,
      guidelineRef: 'สปสช. ความสอดคล้องเชิงเวลา (Temporal Cross-check)',
    });
  } else {
    checks.push({
      id: 'chk_hour1',
      title: `เริ่มยาปฏิชีวนะล่าช้า (เข็มแรกเริ่มวันที่ ${firstDoseDay} ของการนอน รพ.)`,
      status: 'WARNING',
      description: `การให้ยาปฏิชีวนะเข็มแรกเกิดขึ้นในวันที่ ${firstDoseDay} ซึ่งล่าช้ากว่าวันวินิจฉัย Sepsis ตั้งแต่แรกรับ เสี่ยงต่อการถูก Audit ขอเวชระเบียนสอบทานความถูกต้อง`,
      guidelineRef: 'สปสช. Clinical Audit เกณฑ์ความล่าช้าในการรักษา',
      recommendation: 'ตรวจสอบบันทึกใบสั่งยา (MAR) หากเริ่มตั้งแต่วันแรกรับ ให้ปรับแก้วันที่ให้ถูกต้อง',
    });
  }

  // 3. HEMOCULTURE TIMING SEQUENCE CHECK
  const hemocultureBeforeAny = antibioticLogs.some((l) => l.bloodCultureSequence === 'BEFORE_ANTIBIOTIC');
  const hemocultureAfter = antibioticLogs.some((l) => l.bloodCultureSequence === 'AFTER_ANTIBIOTIC');
  const noCultureDrawn = antibioticLogs.every((l) => l.bloodCultureSequence === 'NO_CULTURE') && clinicalProfile?.hemoculture === 'not_sent';

  if (hemocultureBeforeAny || clinicalProfile?.hemoculture !== 'not_sent') {
    if (hemocultureBeforeAny) {
      checks.push({
        id: 'chk_culture_timing',
        title: 'เจาะ Hemoculture ก่อนให้ยาปฏิชีวนะ (Gold Standard)',
        status: 'PASS',
        description: 'เก็บสิ่งส่งตรวจเพาะเชื้อในกระแสเลือดก่อนบริหารยาปฏิชีวนะเข็มแรก ช่วยเพิ่มโอกาสตรวจพบเชื้อก่อโรคที่แท้จริงและสนับสนุนการเคลมรหัสระบุเชื้อ',
        guidelineRef: 'Surviving Sepsis Campaign & สปสช. Audit Evidence',
      });
    } else if (hemocultureAfter) {
      checks.push({
        id: 'chk_culture_timing',
        title: 'เจาะเพาะเชื้อเลือดหลังเริ่มยาปฏิชีวนะ (Post-Antibiotic Culture)',
        status: 'WARNING',
        description: 'การเจาะเลือดเพาะเชื้อหลังให้ยาปฏิชีวนะอาจทำให้ได้ผลลบลวง (False negative) และกระทบต่อการระบุเชื้อก่อโรคที่แน่นอน',
        guidelineRef: 'คู่มือแนวทางการตรวจประเมินเวชระเบียน สปสช.',
        recommendation: 'แนบหลักฐานผลแลปอื่นๆ เช่น Urine culture หรือ Sputum culture เพิ่มเติม',
      });
    }
  } else if (noCultureDrawn) {
    checks.push({
      id: 'chk_culture_timing',
      title: 'ไม่มีการส่งตรวจ Hemoculture ในผู้ป่วย Sepsis',
      status: 'WARNING',
      description: 'การสรุปรหัส Sepsis โดยไม่มีผลเพาะเชื้อเลือดหรือบันทึกเหตุผล มีความเสี่ยงสูงต่อการถูกจัดอยู่ในกลุ่มสุ่มตรวจ Pre-payment Audit',
      guidelineRef: 'เกณฑ์ความสมบูรณ์ของเวชระเบียน สปสช.',
      recommendation: 'ตรวจสอบผล Hemoculture ในระบบ HIS หรือเวชระเบียนย้อนหลัง',
    });
  }

  // 4. SPECTRUM & DIAGNOSIS ANATOMICAL FOCUS CONCORDANCE
  const loggedNamesLower = antibioticLogs.map((l) => l.antibioticName.toLowerCase()).join(' ');

  // Anaerobic check for intra-abdominal
  const hasAnaerobicDrug = loggedNamesLower.includes('metro') || loggedNamesLower.includes('mero') || loggedNamesLower.includes('piperacillin');
  if (hasIntraAbdominal) {
    if (hasAnaerobicDrug) {
      checks.push({
        id: 'chk_intra_abdominal',
        title: 'ครอบคลุมเชื้อไม่ใช้ออกซิเจนในช่องท้อง (Anaerobic Coverage)',
        status: 'PASS',
        description: 'มีรายการยาครอบคลุมเชื้อแบคทีเรียไม่ใช้ออกซิเจน (Anaerobe) สอดคล้องกับการติดเชื้อในระบบทางเดินอาหาร/ช่องท้อง',
        guidelineRef: 'IDSA & Thai Intra-abdominal Infection Guidelines',
      });
    } else {
      checks.push({
        id: 'chk_intra_abdominal',
        title: 'ขาดความครอบคลุมเชื้อ Anaerobe สำหรับการติดเชื้อในช่องท้อง',
        status: 'WARNING',
        description: 'ผู้ป่วยมีรหัสโรคในช่องท้อง/ลำไส้อักเสบ แต่ยาปฏิชีวนะที่ได้รับยังไม่ครอบคลุมเชื้อ Anaerobe (เช่น ขาด Metronidazole)',
        guidelineRef: 'แนวทางการรักษาโรคติดเชื้อในช่องท้อง',
        recommendation: 'ตรวจสอบว่ามีการบริหาร Metronidazole หรือยาอื่นร่วมด้วยหรือไม่',
      });
    }
  }

  // Urinary check
  if (hasUti) {
    const hasUtiDrug = ['ceftri', 'cefotax', 'mero', 'levo', 'cipro', 'amikacin'].some((k) => loggedNamesLower.includes(k));
    if (hasUtiDrug) {
      checks.push({
        id: 'chk_uti_coverage',
        title: 'ครอบคลุมเชื้อก่อโรคในทางเดินปัสสาวะ (Urosepsis Coverage)',
        status: 'PASS',
        description: 'ยาปฏิชีวนะที่เลือกใช้ครอบคลุมเชื้อกลุ่ม Enterobacteriaceae (E. coli, Klebsiella) ที่พบบ่อยในทางเดินปัสสาวะ',
        guidelineRef: 'Thai Sepsis & Urosepsis Guideline',
      });
    }
  }

  // 5. MICROBIOLOGY & HEMOCULTURE MATCH
  let spectrumMatchesCulture = true;
  if (clinicalProfile?.hemoculture === 'positive') {
    const organism = (clinicalProfile.cultureOrganism || '').toLowerCase();

    // Check Pseudomonas
    if (organism.includes('pseudomonas')) {
      const hasAntipseudomonal = ['ceftazidime', 'meropenem', 'piperacillin', 'imipenem', 'colistin', 'cefepime'].some((k) =>
        loggedNamesLower.includes(k)
      );
      if (hasAntipseudomonal) {
        checks.push({
          id: 'chk_culture_organism',
          title: 'ยาปฏิชีวนะครอบคลุมเชื้อ Pseudomonas aeruginosa ตามผลเพาะเชื้อ',
          status: 'PASS',
          description: 'มีการใช้ยาที่มีฤทธิ์ต่อต้าน Pseudomonas (Antipseudomonal agent) ตรงตามผลเพาะเชื้อเลือด',
          guidelineRef: 'Microbiology Concordance Audit',
        });
      } else {
        spectrumMatchesCulture = false;
        checks.push({
          id: 'chk_culture_organism',
          title: 'ยาที่ใช้ไม่ครอบคลุมเชื้อ Pseudomonas aeruginosa ที่เพาะเชื้อขึ้น!',
          status: 'FAIL',
          description: `ผลเพาะเชื้อเลือดพบ ${clinicalProfile.cultureOrganism} แต่ยาที่บันทึกไว้ (เช่น Ceftriaxone) ไม่มีฤทธิ์ฆ่าเชื้อ Pseudomonas`,
          guidelineRef: 'สปสช. Clinical Inconsistency Audit',
          recommendation: 'ปรับเปลี่ยนหรือเพิ่ม Ceftazidime / Meropenem และลงรหัส A41.52 (Pseudomonas sepsis)',
        });
      }
    }

    // Check MRSA
    if (organism.includes('mrsa') || organism.includes('methicillin-resistant')) {
      const hasAntiMrsa = ['vancomycin', 'linezolid', 'teicoplanin'].some((k) => loggedNamesLower.includes(k));
      if (hasAntiMrsa) {
        checks.push({
          id: 'chk_mrsa_coverage',
          title: 'มียาครอบคลุมเชื้อ MRSA (Vancomycin/Linezolid) สอดคล้องกับผลเพาะเชื้อ',
          status: 'PASS',
          description: 'ได้รับยาปฏิชีวนะกลุ่มต่อต้าน MRSA สอดคล้องกับเชื้อ Staphylococcus aureus ที่ดื้อยา',
          guidelineRef: 'Microbiology Concordance Audit',
        });
      } else {
        spectrumMatchesCulture = false;
        checks.push({
          id: 'chk_mrsa_coverage',
          title: 'ผลเพาะเชื้อพบ MRSA แต่ไม่พบยาฆ่าเชื้อกลุ่ม Anti-MRSA (Vancomycin)',
          status: 'FAIL',
          description: 'เชื้อ Staphylococcus aureus ดื้อต่อยากลุ่ม Beta-lactam ทั่วไป จำเป็นต้องได้รับ Vancomycin',
          guidelineRef: 'สปสช. Clinical Inconsistency Audit',
        });
      }
    }
  }

  // 6. RENAL DOSE & ORGAN DYSFUNCTION CAUTION
  let renalCaution = false;
  const hasNephrotoxic = ['vancomycin', 'amikacin', 'colistin'].some((k) => loggedNamesLower.includes(k));
  if (hasAki && hasNephrotoxic) {
    renalCaution = true;
    checks.push({
      id: 'chk_renal_dose',
      title: 'ผู้ป่วยมีภาวะไตวายเฉียบพลัน (AKI) ร่วมกับการใช้ยาที่มีผลต่อไต',
      status: 'WARNING',
      description: 'ผู้ป่วยมีภาวะ AKI (N17.9) หรือค่า Creatinine สูง และได้รับยา Vancomycin/Amikacin/Colistin ต้องมีบันทึกการปรับขนาดยาตาม CrCl และผลระดับยาในเลือด (TDM) ในเวชระเบียนเพื่อประกอบการ Audit',
      guidelineRef: 'สปสช. แนวทางการตรวจประเมินเวชระเบียนเฉพาะโรคไต',
      recommendation: 'แนบผลตรวจระดับยา TDM และบันทึกการคำนวณ eGFR/CrCl ในชาร์ต',
    });
  }

  // 7. CODING OPPORTUNITIES / RECOMMENDATIONS BASED ON ANTIBIOTICS
  if (loggedNamesLower.includes('metro') && !hasIntraAbdominal) {
    suggestedCodingActions.push({
      label: 'เพิ่มรหัสการติดเชื้อในช่องท้อง (เช่น A09.0 หรือ K65.0)',
      actionType: 'ADD_SDX',
      code: 'A090',
      diagType: 'comorbid',
      reason: 'ผู้ป่วยได้รับยา Metronidazole ซึ่งบ่งชี้ว่าอาจมีการติดเชื้อในระบบทางเดินอาหารหรือช่องท้อง',
    });
  }

  if (loggedNamesLower.includes('vanco') && !cleanSdxList.includes('A410') && !cleanPdx.startsWith('A410')) {
    suggestedCodingActions.push({
      label: 'พิจารณารหัสเชื้อ Staphylococcal sepsis (A41.0) หากผลเพาะเชื้อยืนยัน',
      actionType: 'ADD_SDX',
      code: 'A410',
      diagType: 'comorbid',
      reason: 'การใช้ Vancomycin มักใช้รักษาการติดเชื้อแกรมบวกหรือ MRSA',
    });
  }

  // Overall scoring
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const warnCount = checks.filter((c) => c.status === 'WARNING').length;
  const passCount = checks.filter((c) => c.status === 'PASS').length;

  let scorePercent = 100;
  scorePercent -= failCount * 35;
  scorePercent -= warnCount * 12;
  scorePercent = Math.max(0, Math.min(100, scorePercent));

  let concordanceStatus: AntibioticGuidelineMatchResult['concordanceStatus'] = 'CONCORDANT';
  if (failCount > 0 || scorePercent < 60) {
    concordanceStatus = 'DISCORDANT';
  } else if (warnCount > 0 || scorePercent < 85) {
    concordanceStatus = 'PARTIAL';
  }

  return {
    concordanceStatus,
    scorePercent,
    hour1BundleMet: hour1Logged || day1Logs.length > 0,
    bloodCultureTimingMet: hemocultureBeforeAny || clinicalProfile?.hemoculture !== 'not_sent',
    routeMet: hasIvRoute && !allOral,
    spectrumMatchesPdx: checks.filter((c) => c.status === 'FAIL').length === 0,
    spectrumMatchesCulture,
    renalDoseCaution: renalCaution,
    checks,
    suggestedCodingActions,
  };
}
