import { AuditResultItem, ClinicalProfile, DiagnosisEntry, MedicationItem, ProcedureEntry } from '../types';
import { ICD10_DATABASE } from '../data/rulesData';

export interface ValidationSummary {
  status: 'PASS' | 'WARNING' | 'DENY';
  results: AuditResultItem[];
  errorCount: number;
  warningCount: number;
  passCount: number;
}

export function evaluateClaim(
  pdx: string = '',
  secondaryDx: DiagnosisEntry[] = [],
  medications: MedicationItem[] = [],
  clinical?: ClinicalProfile,
  procedures?: ProcedureEntry[]
): ValidationSummary {
  const results: AuditResultItem[] = [];
  const safeMeds = medications || [];
  const selectedMeds = safeMeds.filter((m) => m?.isSelected);

  const hasVasopressor = selectedMeds.some((m) => m.category === 'vasopressor');
  const hasIvAntibiotic = selectedMeds.some((m) => m.category === 'iv_antibiotic');
  
  // Calculate approximate total IV fluid
  const totalFluidMl = selectedMeds
    .filter((m) => m.category === 'iv_fluid')
    .reduce((sum, m) => {
      let vol = 0;
      const mName = m?.name || '';
      if (mName.includes('1,000 ml') || mName.includes('1000 ml')) vol = 1000;
      else if (mName.includes('500 ml')) vol = 500;
      else if (mName.includes('100 ml')) vol = 100;
      return sum + vol * (m.quantity || 1);
    }, 0);

  const effectiveFluidMl = Math.max(totalFluidMl, clinical?.fluidResuscitationMl || 0);

  const cleanPdx = (pdx || '').trim().toUpperCase().replace('.', '');
  const cleanSdxList = (secondaryDx || []).map((s) => ({
    ...s,
    cleanCode: (s?.code || '').trim().toUpperCase().replace('.', ''),
  }));

  // ==========================================
  // RULE 1: Banned Codes Check (e.g. R65.0, R65.1, R65.2, R65.9 SIRS)
  // ==========================================
  const bannedSirsCode = ['R650', 'R651', 'R652', 'R659'].find(
    (code) => cleanPdx === code || cleanSdxList.some((s) => s.cleanCode === code)
  );
  if (bannedSirsCode) {
    const formattedBanned = bannedSirsCode.slice(0, 3) + '.' + bannedSirsCode.slice(3);
    results.push({
      ruleCode: 'CR1',
      severity: 'DENY',
      title: `รหัส ${formattedBanned} (SIRS) ถูกยกเลิกโดย สปสช. แล้ว`,
      errorTag: '[CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]',
      description:
        `พบการบันทึกรหัส ${formattedBanned} ซึ่ง สปสช. ประกาศยกเลิกการใช้รหัสกลุ่ม SIRS (R65.-) แล้วเนื่องจากเกณฑ์ Sepsis-3 ไม่ใช้ SIRS โดดๆ ในการเบิกจ่าย การส่งรหัสนี้จะทำให้ถูกปฏิเสธทันที`,
      howToFix: `ให้ลบรหัส ${formattedBanned} ออกจากทั้งการวินิจฉัยหลักและการวินิจฉัยรอง`,
      recommendedAction: {
        actionType: 'REMOVE_CODE',
        targetCode: bannedSirsCode,
      },
    });
  }

  // ==========================================
  // RULE 2: CR37 Shock as Principal Diagnosis
  // ==========================================
  if (['R570', 'R571', 'R572', 'R578', 'R579'].includes(cleanPdx)) {
    results.push({
      ruleCode: 'CR37',
      severity: 'DENY',
      title: 'ห้ามใช้รหัสกลุ่ม Shock (R57) เป็นการวินิจฉัยหลัก (Principal Dx)',
      errorTag: '[CR37#การสรุปกลุ่มอาการ Shock ผิดหลักการ]',
      description: `คุณระบุรหัส ${cleanPdx} ในช่องการวินิจฉัยหลัก ตามหลักเกณฑ์การให้รหัส ICD-10 สากลและ สปสช. ภาวะช็อกเป็นภาวะแทรกซ้อนปลายทาง ไม่สามารถเป็นโรคหลักได้ ต้องให้โรคต้นเหตุ (เช่น การติดเชื้อ Sepsis หรือการขาดน้ำรุนแรง) เป็นโรคหลัก`,
      howToFix:
        'ย้ายรหัส Shock ไปไว้ในการวินิจฉัยรอง (ตั้งเป็น "โรคแทรก") และเลือกรหัสโรคต้นเหตุ (เช่น A419 หรือ A090) เป็นโรคหลักแทน',
      recommendedAction: {
        actionType: 'REPLACE_PDX',
        pdx: 'A419',
        targetCode: cleanPdx,
      },
    });
  }

  // ==========================================
  // RULE 3: CR37 Shock in Secondary Dx
  // ==========================================
  const septicShockEntry = cleanSdxList.find((s) => s.cleanCode === 'R572');
  if (septicShockEntry) {
    // Check 3.1: Diagnosis Type
    if (septicShockEntry.diagType === 'comorbid') {
      results.push({
        ruleCode: 'CR37',
        severity: 'DENY',
        title: 'รหัส R572 (Septic shock) ต้องบันทึกเป็น "โรคแทรก (Complication)" เท่านั้น',
        errorTag: '[CR37#การสรุปกลุ่มอาการ Shock ผิดหลักการ]',
        description:
          'ตรวจพบบันทึก R572 ในสถานะ "โรคร่วม (Co-morbid)" ซึ่งขัดกับหลักเกณฑ์อย่างสิ้นเชิง ภาวะช็อกเหตุติดเชื้อเกิดขึ้นจากการติดเชื้อลุกลาม จึงถือเป็นภาวะแทรกซ้อน ไม่สามารถเป็นโรคร่วมที่มีอยู่เดิมได้',
        howToFix: 'ในแถวของ R572 ให้เปลี่ยนช่อง "ประเภทโรครอง" จาก "โรคร่วม" เป็น "โรคแทรก / ภาวะแทรกซ้อน (Complication)"',
        recommendedAction: {
          actionType: 'CHANGE_TYPE',
          targetCode: 'R572',
          newType: 'complication',
        },
      });
    }

    // Check 3.2: Clinical Evidence - Vasopressor Requirement
    if (!hasVasopressor) {
      results.push({
        ruleCode: 'CR37',
        severity: 'DENY',
        title: 'ผู้ป่วยลงรหัส Septic shock (R572) แต่ไม่มีรายการ "ยากระตุ้นความดัน" (Vasopressor)',
        errorTag: '[CR37#การสรุปกลุ่มอาการ Shock ผิดหลักการ]',
        description:
          'เกณฑ์วินิจฉัย Septic shock ของ สปสช. กำหนดว่าผู้ป่วยต้องมีความดันโลหิตต่ำที่ไม่ตอบสนองต่อสารน้ำ และ "ต้องได้รับยากระตุ้นความดัน" เช่น Norepinephrine, Dopamine หรือ Adrenaline ในการรักษา หากผู้ป่วยฟื้นด้วยสารน้ำอย่างเดียวจะไม่เข้าเกณฑ์ Septic shock ระบบ AI Pre-Audit จะถือเป็น Over-coding',
        howToFix:
          'หากผู้ป่วยไม่ได้ใช้ยากระตุ้นความดัน ให้ลบรหัส R572 ออก (ส่งเฉพาะโรคหลัก A419/A415) หรือหากมีการใช้ยาจริงให้ตรวจสอบและเพิ่มรายการยากระตุ้นความดันเข้าในใบสั่งยา',
        recommendedAction: {
          actionType: 'REMOVE_CODE',
          targetCode: 'R572',
        },
      });
    } else {
      // Has vasopressor, good!
      results.push({
        ruleCode: 'CR37',
        severity: 'PASS',
        title: 'Septic shock (R572) มีการให้ยากระตุ้นความดันสอดคล้องตามเกณฑ์ สปสช.',
        description: 'ตรวจพบยากระตุ้นความดันในบิลยา สอดคล้องกับข้อกำหนดทางคลินิก',
        howToFix: 'ตรวจสอบให้แน่ใจว่าได้ระบุประเภทเป็น "โรคแทรก (Complication)" เรียบร้อยแล้ว',
      });
    }
  }

  // Check 3.3: Hypovolemic Shock R571
  const hypoShockEntry = cleanSdxList.find((s) => s.cleanCode === 'R571');
  if (hypoShockEntry) {
    if (hypoShockEntry.diagType === 'comorbid') {
      results.push({
        ruleCode: 'CR37',
        severity: 'DENY',
        title: 'รหัส R571 (Hypovolemic shock) ต้องบันทึกเป็น "โรคแทรก (Complication)"',
        errorTag: '[CR37#การสรุปกลุ่มอาการ Shock ผิดหลักการ]',
        description: 'ภาวะช็อกจากการขาดสารน้ำหรือเสียเลือดต้องเป็นโรคแทรกที่เกิดตามหลังโรคหลัก (เช่น ท้องเสียรุนแรง หรือตกเลือด)',
        howToFix: 'เปลี่ยนประเภทโรคของ R571 เป็น "โรคแทรก (Complication)"',
        recommendedAction: {
          actionType: 'CHANGE_TYPE',
          targetCode: 'R571',
          newType: 'complication',
        },
      });
    }

    if (effectiveFluidMl < 1000) {
      results.push({
        ruleCode: 'CR37',
        severity: 'DENY',
        title: 'ปริมาณสารน้ำกู้ชีพไม่เพียงพอสำหรับ Hypovolemic shock (R571)',
        errorTag: '[CR37#การสรุปกลุ่มอาการ Shock ผิดหลักการ]',
        description: `ผู้ป่วย Hypovolemic shock ต้องได้รับการชดเชยสารน้ำทางหลอดเลือดดำปริมาณมาก (Fluid loading อย่างน้อย 1,000–2,000 ml) แต่ในรายการยาพบนสารน้ำเพียง ${effectiveFluidMl} ml ซึ่งส่วนใหญ่เป็นขวด 100 ml สำหรับผสมยาฉีด ขัดแย้งกับการรักษาภาวะช็อกอย่างชัดเจน`,
        howToFix: 'หากไม่ได้ช็อกจริงให้ลบรหัส R571 ออก หรือหากมีการให้สารน้ำกู้ชีพถุงใหญ่ (NSS/RLS 1,000 ml) ให้คีย์รายการสารน้ำเพิ่ม',
        recommendedAction: {
          actionType: 'REMOVE_CODE',
          targetCode: 'R571',
        },
      });
    }
  }

  // ==========================================
  // RULE 4: CR1 Sepsis Coding Rules
  // ==========================================
  const isSepsisPdx = cleanPdx.startsWith('A40') || cleanPdx.startsWith('A41');
  const isLocalInfectionPdx =
    ['N390', 'N10', 'J189', 'K358', 'A090', 'A099', 'M600', 'M6001'].includes(cleanPdx) ||
    cleanPdx.startsWith('M600') ||
    cleanPdx.startsWith('L03');

  // Check 4.0: Sepsis in Secondary Diagnoses coded as "comorbid" (CR1 Primary Trigger)
  // รหัสในกลุ่ม Sepsis (A40.-, A41.-) ห้ามลงเป็น "โรคร่วม (Co-morbid)" เด็ดขาด
  cleanSdxList.forEach((s) => {
    if ((s.cleanCode.startsWith('A40') || s.cleanCode.startsWith('A41')) && s.diagType === 'comorbid') {
      const codeInfo = ICD10_DATABASE[s.cleanCode];
      const codeName = codeInfo ? `${s.cleanCode} (${codeInfo.nameTh})` : s.cleanCode;
      results.push({
        ruleCode: 'CR1',
        severity: 'DENY',
        title: `รหัส ${codeName} บันทึกเป็น "โรคร่วม (Co-morbid)" ขัดกับหลักเกณฑ์ สปสช.`,
        errorTag: '[CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]',
        description: `ตรวจพบบันทึกรหัส Sepsis (${s.cleanCode}) ในสถานะ "โรคร่วม (Co-morbid)" ตามคู่มือ TCG และแนวทาง Audit สปสช. ภาวะพิษเหตุติดเชื้อ/ติดเชื้อในกระแสเลือด (Sepsis กลุ่ม A40.-, A41.-) เป็นภาวะติดเชื้อรุนแรงเฉียบพลัน (Acute systemic condition) ไม่อนุญาตให้ลงเป็นโรคร่วมเด็ดขาด (เพราะไม่ใช่โรคเรื้อรังที่มีอยู่เดิม)`,
        howToFix: `เลือกวิธีแก้ไขวิธีใดวิธีหนึ่ง:\n1. หากเกิดภาวะ Sepsis ตามหลังโรคหลัก (${cleanPdx}): เปลี่ยนประเภทของ ${s.cleanCode} จาก "โรคร่วม" เป็น "โรคแทรก (Complication)"\n2. หากผู้ป่วยมี Sepsis ตั้งแต่แรกรับและเป็นสาเหตุหลักที่นอน รพ.: ให้สลับรหัส ${s.cleanCode} ขึ้นเป็นโรคหลัก (Principal Dx) และย้าย ${cleanPdx} ลงมาเป็นการวินิจฉัยรอง`,
        recommendedAction: {
          actionType: 'CHANGE_TYPE',
          targetCode: s.cleanCode,
          newType: 'complication',
        },
      });
    }
  });

  // Check 4.0.1: R392 (Extrarenal uraemia) in Sepsis / Infection
  const uraemiaEntry = cleanSdxList.find((s) => s.cleanCode === 'R392');
  if (uraemiaEntry) {
    results.push({
      ruleCode: 'CR1',
      severity: 'WARNING',
      title: 'รหัส R392 (Extrarenal uraemia) เป็นหมวดอาการแสดง (R-code) เสี่ยงถูกตัด Audit',
      description:
        'ในผู้ป่วย Sepsis หรือติดเชื้อรุนแรง หากมีภาวะไตทำงานบกพร่องเฉียบพลัน (Creatinine สูงขึ้น หรือปัสสาวะออกน้อยลง) ควรบันทึกเป็น N179 (Acute kidney failure, unspecified) เป็น "โรคแทรก (Complication)" เพื่อสะท้อนภาวะ Sepsis-associated AKI (SOFA Renal) และเพิ่มค่าน้ำหนัก AdjRW ได้ถูกต้อง',
      howToFix: 'พิจารณาเปลี่ยนรหัสจาก R392 เป็น N179 และตั้งประเภทเป็น "โรคแทรก (Complication)"',
      recommendedAction: {
        actionType: 'CHANGE_TYPE',
        targetCode: 'R392',
        newCode: 'N179',
        newType: 'complication',
      },
    });
  }

  // Check 4.1: Urosepsis mismatch
  if (isLocalInfectionPdx && (cleanPdx === 'N390' || cleanPdx === 'N10')) {
    if (clinical.clinicalSummary.toLowerCase().includes('urosepsis') || clinical.hemoculture === 'positive') {
      results.push({
        ruleCode: 'CR1',
        severity: 'DENY',
        title: 'ตรวจพบแนวโน้ม Urosepsis แต่ใส่เฉพาะ N390 / N10 เป็นโรคหลัก',
        errorTag: '[CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]',
        description:
          'คู่มือการให้รหัสของ สปสช. ระบุชัดเจน: หากแพทย์สรุป "Urosepsis" ห้ามให้รหัส N390 หรือ N10 เพียงลำพัง จะต้องให้รหัส Sepsis (A419 หรือ A415 ตามเชื้อ) เป็นโรคหลัก และให้รหัสตำแหน่งติดเชื้อ (N390 หรือ N10) เป็นโรคร่วม',
        howToFix: 'เปลี่ยนโรคหลักเป็น A419 (หรือ A415 หากเป็นกรัมลบ) และเพิ่ม N390 เป็นโรคร่วม',
        recommendedAction: {
          actionType: 'REPLACE_PDX',
          pdx: 'A419',
          newCode: cleanPdx,
        },
      });
    }
  }

  // Check 4.2: Sepsis Principal & Secondary Dx validation
  const hasSdxSepsisCode = cleanSdxList.some(
    (s) => s.cleanCode.startsWith('A40') || s.cleanCode.startsWith('A41') || s.cleanCode === 'A021'
  );
  const isAnySepsisOrShock = isSepsisPdx || hasSdxSepsisCode || Boolean(septicShockEntry);

  if (isSepsisPdx) {
    // Must have IV antibiotic
    if (!hasIvAntibiotic) {
      results.push({
        ruleCode: 'CR1',
        severity: 'DENY',
        title: 'ผู้ป่วยลงรหัสโรคหลัก Sepsis แต่ไม่มีรายการ "ยาปฏิชีวนะชนิดฉีด" (IV Antibiotic)',
        errorTag: '[CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]',
        description: 'การวินิจฉัยภาวะติดเชื้อในกระแสเลือด (Sepsis) ต้องมีหลักฐานการได้รับยาปฏิชีวนะทางหลอดเลือดดำเพื่อการรักษา',
        howToFix: 'ตรวจสอบและคีย์รายการยาปฏิชีวนะฉีด (เช่น Ceftriaxone, Meropenem, Metronidazole) ในหน้าค่ายา',
      });
    } else {
      results.push({
        ruleCode: 'CR1',
        severity: 'PASS',
        title: 'มีการให้ยาปฏิชีวนะชนิดฉีดทางหลอดเลือดดำสอดคล้องกับภาวะ Sepsis',
        description: 'พบยาปฏิชีวนะในบิลยา รองรับการเบิกจ่ายการวินิจฉัย Sepsis',
        howToFix: 'ผ่านเกณฑ์ยาปฏิชีวนะ',
      });
    }

    // Gram-negative code alignment
    if (cleanPdx === 'A415' && clinical.cultureOrganism && !clinical.cultureOrganism.toLowerCase().includes('gram-negative') && !clinical.cultureOrganism.toLowerCase().includes('coli') && !clinical.cultureOrganism.toLowerCase().includes('klebsiella') && clinical.hemoculture === 'positive') {
      results.push({
        ruleCode: 'CR1',
        severity: 'WARNING',
        title: 'รหัส A415 ระบุเชื้อกรัมลบ แต่ผลเชื้อระบุอย่างอื่น',
        description: 'หากผลเพาะเชื้อระบุเชื้อชัดเจน เช่น E. coli แนะนำใช้ A4151 หรือตามเชื้อที่ตรวจพบ',
        howToFix: 'ปรับรหัสให้ตรงกับชนิดเชื้อก่อโรคที่เพาะได้',
      });
    }
  }

  // Check 4.3: Mandatory Sepsis Labs (Blood Culture & Serum Lactate)
  if (isAnySepsisOrShock) {
    // 4.3.1 Hemoculture status
    if (clinical.hemoculture === 'not_sent') {
      results.push({
        ruleCode: 'CR1',
        severity: 'WARNING',
        title: 'ผู้ป่วยมีรหัสกลุ่ม Sepsis แต่ไม่มีการส่งตรวจเพาะเชื้อในเลือด (Blood Culture missing)',
        errorTag: '[CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]',
        description:
          'สปสช. และแนวทาง Surviving Sepsis Campaign (SSC Hour-1 Bundle) เน้นย้ำให้ส่ง Hemoculture ในผู้ป่วย Sepsis ทุกรายก่อนเริ่มยาปฏิชีวนะ หากไม่ได้ส่งตรวจ อาจถูกสุ่มตรวจ Audit และปฏิเสธการชดเชยรหัส Sepsis',
        howToFix: 'ตรวจสอบผล Hemoculture ในระบบห้องปฏิบัติการและระบุผลตรวจให้ชัดเจน',
      });
    } else if (clinical.hemoculture === 'positive') {
      results.push({
        ruleCode: 'CR1',
        severity: 'PASS',
        title: 'มีผลตรวจ Hemoculture ยืนยันเชื้อ เป็นหลักฐานชั้นดีตามเกณฑ์ Audit',
        description: `พบผลเพาะเชื้อ: ${clinical.cultureOrganism || 'ระบุเชื้อก่อโรค'} รองรับรหัสโรคกลุ่ม Sepsis อย่างสมบูรณ์`,
        howToFix: 'ผ่านเกณฑ์ตรวจทางห้องปฏิบัติการ',
      });
    } else if (clinical.hemoculture === 'negative') {
      results.push({
        ruleCode: 'CR1',
        severity: 'PASS',
        title: 'มีบันทึกส่งตรวจ Hemoculture ครบถ้วน (ผลไม่พบเชื้อ)',
        description: 'มีหลักฐานการส่งตรวจเพาะเชื้อเลือดครบ 2 ขวด แม้ผลไม่พบเชื้อก็ถือว่าผ่านเกณฑ์การส่งตรวจ Mandatory Lab',
        howToFix: 'ผ่านเกณฑ์การส่งตรวจ Hemoculture',
      });
    }

    // 4.3.2 Serum Lactate Status
    const hasLactateRecord =
      (clinical.lactateLevel !== undefined && clinical.lactateLevel !== null) ||
      (clinical.lactateStatus && clinical.lactateStatus !== 'not_sent');

    if (!hasLactateRecord) {
      results.push({
        ruleCode: 'CR1',
        severity: 'WARNING',
        title: 'ผู้ป่วยมีรหัสกลุ่ม Sepsis แต่ขาดการตรวจวัดระดับกรดแลคติกในเลือด (Serum Lactate missing)',
        errorTag: '[CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]',
        description:
          'ระดับกรดแลคติกในเลือด (Serum Lactate) เป็นตัวชี้วัดจำเป็น (Mandatory Diagnostic Marker) ในการประเมินภาวะ Tissue Hypoperfusion ตามเกณฑ์ Sepsis-3 และแนวทาง สปสช. หากระดับ >= 2.0 mmol/L บ่งชี้ความรุนแรง และหาก >= 4.0 mmol/L ต้องกู้ชีพด้วยสารน้ำทันที ขาดผลตรวจนี้มีความเสี่ยงสูงต่อการถูก Audit ปรับลดรหัสโรค',
        howToFix: 'ตรวจวัดระดับ Serum Lactate (mmol/L) และบันทึกในเวชระเบียน',
      });
    } else {
      const lactateValue = clinical.lactateLevel;
      if (lactateValue !== undefined && lactateValue >= 4.0) {
        results.push({
          ruleCode: 'CR1',
          severity: 'PASS',
          title: `ระดับ Serum Lactate = ${lactateValue} mmol/L สูงวิกฤต (≥ 4.0) สนับสนุนภาวะ Severe Hypoperfusion`,
          description: 'ผลแลคเตตเป็นหลักฐานระดับ Gold Standard ยืนยันความรุนแรงของโรคตามเกณฑ์ สปสช. ตรวจสอบให้มีบันทึกการให้สารน้ำ Resuscitation ≥ 30 ml/kg',
          howToFix: 'ผ่านเกณฑ์ระดับแลคเตต',
        });
      } else {
        results.push({
          ruleCode: 'CR1',
          severity: 'PASS',
          title: `มีผลตรวจ Serum Lactate ${lactateValue ? `(${lactateValue} mmol/L)` : ''} ครบถ้วนตามเกณฑ์ Sepsis Diagnostic Workup`,
          description: 'ผ่านเกณฑ์การตรวจวัดระดับกรดแลคติกในเลือดตามแนวทาง Surviving Sepsis Campaign',
          howToFix: 'ผ่านเกณฑ์แล็บจำเป็น',
        });
      }
    }
  }

  // ==========================================
  // RULE 5: Discharge Status & Type Criteria for Sepsis & Septic Shock
  // "Discharge Status '3. Not Improve, 9. Dead' และ Type Of Discharge '2. Against Advice, 3. By Escape, 4. By Transfer' เข้าเงื่อนไข Sepsis และ Septic Shock"
  // ==========================================
  const dscStatus = clinical.dischargeStatus;
  const dscType = clinical.dischargeType;
  const isDscStatusConditionMet = dscStatus === '3' || dscStatus === '9';
  const isDscTypeConditionMet = dscType === '2' || dscType === '3' || dscType === '4';
  const hasDischargeCriteria = isDscStatusConditionMet || isDscTypeConditionMet;

  if (hasDischargeCriteria) {
    const statusText = dscStatus === '3' ? '3. Not Improve (ไม่ทุเลา)' : dscStatus === '9' ? '9. Dead (เสียชีวิต)' : '';
    const typeText = dscType === '2' ? '2. Against Advice (ขอกลับบ้าน)' : dscType === '3' ? '3. By Escape (หลบหนี)' : dscType === '4' ? '4. By Transfer (ส่งต่อ)' : '';
    const criteriaDetails = [statusText, typeText].filter(Boolean).join(' และ ');

    if (isSepsisPdx || Boolean(septicShockEntry)) {
      // Sepsis or Septic shock is coded, and discharge criteria matches
      results.push({
        ruleCode: 'CR1',
        severity: 'PASS',
        title: 'เข้าเงื่อนไขการจำหน่าย Sepsis และ Septic Shock ตามเกณฑ์ สปสช.',
        description: `ผู้ป่วยมีเกณฑ์การจำหน่ายเข้าเงื่อนไข (${criteriaDetails}) ซึ่งเป็นตัวบ่งชี้ความรุนแรงและผลลัพธ์ทางคลินิก (High-Severity Outcome Criteria) สำหรับ Sepsis และ Septic Shock ตามแนวทาง สปสช.`,
        howToFix: 'ตรวจสอบและแนบเอกสารรับรองเวชระเบียนที่เกี่ยวข้อง เช่น Death Summary, Refer Form 102/103 พร้อม Vital Signs ล่าสุด หรือใบยินยอม Against Advice เพื่อความสมบูรณ์ในการรับตรวจ Audit',
      });
    } else if (clinical.hasOrganDysfunction || hasVasopressor || clinical.mapUnder65) {
      // Patient has severe clinical markers and matches discharge criteria, but neither Sepsis nor Shock is coded!
      results.push({
        ruleCode: 'CR1',
        severity: 'WARNING',
        title: 'ผลลัพธ์การจำหน่ายเข้าเงื่อนไข Sepsis/Septic Shock สปสช. แต่ยังไม่ได้สรุปรหัส Sepsis หรือ Septic Shock',
        description: `ผู้ป่วยมีเกณฑ์การจำหน่าย (${criteriaDetails}) ร่วมกับสัญญาณความรุนแรง (อวัยวะล้มเหลว หรือความดันโลหิตต่ำ) แต่ในชุดรหัสโรคยังไม่มี A419 หรือ R572 มีโอกาสเกิดภาวะ Under-coding ขาดการเบิกจ่ายตามความรุนแรงจริง`,
        howToFix: 'ตรวจสอบเวชระเบียนแพทย์ หากมีการบันทึกการติดเชื้อในกระแสเลือดหรือภาวะช็อก ให้พิจารณาลงรหัส A419 เป็นโรคหลัก หรือเพิ่ม R572 เป็นโรคแทรก',
      });
    }
  }

  // ==========================================
  // RULE 6: SOFA / qSOFA Score Audit Assessment
  // ==========================================
  if (clinical.sofaScores) {
    if (clinical.sofaScores.isQsofaHighRisk) {
      results.push({
        ruleCode: 'CR1',
        severity: 'PASS',
        title: `คะแนน qSOFA = ${clinical.sofaScores.qSofaTotal}/3 เข้าเกณฑ์ความเสี่ยงสูง (High Risk)`,
        description: 'คะแนน qSOFA ≥ 2 บ่งชี้ความเสี่ยงสูงต่อการเจ็บป่วยวิกฤตและเสียชีวิตจากภาวะ Sepsis ตามเกณฑ์มาตรฐานสากลและแนวทางเวชปฏิบัติ สปสช.',
        howToFix: 'ตรวจสอบให้มีบันทึก Vital Signs ติดตาม (RR, BP, GCS) อย่างน้อยทุก 1-2 ชั่วโมงในเวชระเบียน',
      });
    }
    if (clinical.sofaScores.isSofaHighRisk) {
      results.push({
        ruleCode: 'CR1',
        severity: 'PASS',
        title: `คะแนน SOFA Score = ${clinical.sofaScores.sofaTotal} เข้าเกณฑ์ Sepsis-3 Organ Dysfunction`,
        description: 'คะแนน SOFA รวมสูง บ่งชี้ภาวะอวัยวะล้มเหลวเฉียบพลันจากการติดเชื้อ ต้องมีหลักฐานผล Lab และการรักษาสนับสนุนรหัสโรคร่วม/โรคแทรก',
        howToFix: 'ตรวจสอบให้มีผลแล็บ ABG, Creatinine, Platelet, Bilirubin ครบถ้วนในเวชระเบียน',
      });
    }
  }

  // ==========================================
  // RULE 7: Specific Sub-diagnoses checks
  // ==========================================
  // A099 vs A090
  const hasA099 = cleanSdxList.some((s) => s.cleanCode === 'A099');
  if (hasA099 && hasIvAntibiotic) {
    results.push({
      ruleCode: 'CR_GENERAL',
      severity: 'WARNING',
      title: 'แนะนำเปลี่ยนรหัส A099 เป็น A090 (ลำไส้อักเสบจากการติดเชื้อ)',
      description: 'เนื่องจากผู้ป่วยมีภาวะติดเชื้อและได้รับยาปฏิชีวนะ การใช้ A090 จะจำเพาะและตรงกับบริบททางคลินิกมากกว่า A099 (ไม่ระบุสาเหตุ)',
      howToFix: 'เปลี่ยนรหัสจาก A099 เป็น A090',
      recommendedAction: {
        actionType: 'CHANGE_TYPE',
        targetCode: 'A099',
        newCode: 'A090',
      },
    });
  }

  // E834 Magnesium disorder check
  const hasE834 = cleanSdxList.some((s) => s.cleanCode === 'E834');
  const hasMgDrug = selectedMeds.some((m) => m.name.toLowerCase().includes('magnesium'));
  if (hasE834 && !hasMgDrug) {
    results.push({
      ruleCode: 'CR_GENERAL',
      severity: 'WARNING',
      title: 'ลงรหัส E834 (ความผิดปกติของแมกนีเซียม) แต่ไม่มีรายการยาชดเชยแมกนีเซียม',
      description: 'หากมีการตรวจพบ Mg ต่ำ ควรมีรายการยา Magnesium sulfate ในบิลยาเพื่อยืนยันการรักษา',
      howToFix: 'ตรวจสอบว่ามีการให้ยา MgSO4 หรือไม่ หากไม่ได้รักษาอาจเสี่ยงถูกตัดโรคร่วม',
    });
  } else if (hasE834 && hasMgDrug) {
    results.push({
      ruleCode: 'CR_GENERAL',
      severity: 'PASS',
      title: 'รหัสโรคร่วม E834 มีรายการยา Magnesium Sulfate รองรับการรักษา',
      description: 'การให้โรคร่วมมีความสมเหตุสมผลตามเกณฑ์ Clinical Audit',
      howToFix: 'ผ่านเกณฑ์',
    });
  }

  // ==========================================
  // RULE 8: NHSO Audit 47 Blueprint Rules (พิมพ์เขียวป้องกัน Deny Claim จาก สปสช.)
  // ==========================================

  // 8.1 จุดตาย Audit: Necrotizing Fasciitis (M72.6) ต้องมีบันทึก Debridement ใน OR (Slide 12)
  const hasNecrotizing = cleanPdx === 'M726' || cleanSdxList.some((s) => s.cleanCode === 'M726');
  if (hasNecrotizing) {
    const hasOrDebridement =
      (procedures || []).some((p) => {
        const c = (p.code || '').replace('.', '');
        return ['8339', '8345', '8622', '8628', '8604'].includes(c);
      }) ||
      (clinical?.clinicalSummary || '').toLowerCase().includes('debridement') ||
      (clinical?.clinicalSummary || '').includes('ผ่าตัดเลาะเนื้อตาย') ||
      (clinical?.clinicalSummary || '').includes('ห้องผ่าตัด');

    if (!hasOrDebridement) {
      results.push({
        ruleCode: 'CR_BLUEPRINT',
        severity: 'DENY',
        title: 'จุดตายของ Audit: วินิจฉัย Necrotizing Fasciitis (M72.6) แต่ไม่มีบันทึกผ่าตัดเลาะเนื้อตายในห้องผ่าตัด (OR)',
        errorTag: '[จุดตาย Audit#Necrotizing Fasciitis ไร้บันทึก OR Debridement]',
        description:
          'พิมพ์เขียว สปสช. (สไลด์ 12): โรคแบคทีเรียกินเนื้อ (Necrotizing Fasciitis) รักษาด้วยยาฆ่าเชื้อหรือทำแผลที่เตียงเพียงอย่างเดียวไม่ได้! หากไม่มีการทำ Debridement ในห้องผ่าตัด สปสช. จะปรับรหัสผิดทันที (Immediate Fail / Deny Claim)',
        howToFix:
          'หากมีการผ่าตัดใน OR ให้บันทึกรหัสหัตถการ Debridement (เช่น 83.39 หรือ 86.22) พร้อม Operative Note หรือหากไม่ได้ผ่าตัด ให้ปรับรหัสเป็น Cellulitis (L03.-) หรือ Abscess (L02.-) แทน',
        recommendedAction: {
          actionType: 'CHANGE_TYPE',
          targetCode: 'M726',
          newCode: 'L039',
        },
      });
    } else {
      results.push({
        ruleCode: 'CR_BLUEPRINT',
        severity: 'PASS',
        title: 'ผ่านเกณฑ์ Necrotizing Fasciitis: มีบันทึกการทำผ่าตัด Debridement ในห้องผ่าตัดสอดคล้องกับเกณฑ์ สปสช.',
        description: 'ตรวจพบบันทึกหัตถการเลาะเนื้อตายในห้องผ่าตัด รองรับรหัส M72.6 ตามพิมพ์เขียวป้องกัน Deny Claim',
        howToFix: 'ผ่านเกณฑ์จุดตาย Audit',
      });
    }
  }

  // 8.2 กฎเกณฑ์ที่ห้ามละเมิด: Combination Code สำหรับ Hypertension + Kidney/Heart Disease (Slide 7)
  const hasI10 = cleanPdx === 'I10' || cleanSdxList.some((s) => s.cleanCode === 'I10');
  const hasKidneyDisease = cleanPdx.startsWith('N18') || cleanSdxList.some((s) => s.cleanCode.startsWith('N18'));
  const hasHeartDisease = cleanPdx.startsWith('I50') || cleanSdxList.some((s) => s.cleanCode.startsWith('I50'));

  if (hasI10 && (hasKidneyDisease || hasHeartDisease)) {
    const recommendedCombination =
      hasKidneyDisease && hasHeartDisease ? 'I139' : hasKidneyDisease ? 'I129' : 'I119';
    const comboName =
      hasKidneyDisease && hasHeartDisease
        ? 'I13.9 (Hypertensive heart and renal disease)'
        : hasKidneyDisease
        ? 'I12.9 (Hypertensive renal disease)'
        : 'I11.9 (Hypertensive heart disease)';
    results.push({
      ruleCode: 'CR_BLUEPRINT',
      severity: 'DENY',
      title: 'ห้ามให้รหัส Hypertension (I10) แยกกับโรคไตเรื้อรัง/โรคหัวใจเด็ดขาด! (ละเมิด Combination Code)',
      errorTag: '[กฎการให้รหัส สปสช.#ละเมิด Combination Code]',
      description:
        'พิมพ์เขียว สปสช. (สไลด์ 7): ตามมาตรฐาน ICD-10 สากลและเกณฑ์ สปสช. ห้ามให้รหัส I10 (Essential hypertension) แยกกับโรคไตเรื้อรัง (N18.-) หรือโรคหัวใจ (I50.-) เด็ดขาด ต้องใช้ Combination Code ตัวเดียว',
      howToFix: `ให้ตัดรหัส I10 ออก แล้วเปลี่ยนเป็น ${comboName} เพื่อความถูกต้องตามกฎการให้รหัส`,
      recommendedAction: {
        actionType: 'CHANGE_TYPE',
        targetCode: 'I10',
        newCode: recommendedCombination,
      },
    });
  }

  // 8.3 กฎเกณฑ์ที่ห้ามละเมิด: Current Stroke (I60-I64) ควบคู่กับ Sequelae (I69.-) (Slide 7)
  const isCurrentStroke =
    ['I60', 'I61', 'I62', 'I63', 'I64'].some((p) => cleanPdx.startsWith(p)) ||
    cleanSdxList.some((s) => ['I60', 'I61', 'I62', 'I63', 'I64'].some((p) => s.cleanCode.startsWith(p)));
  const sequelaeStrokeEntry = cleanSdxList.find((s) => s.cleanCode.startsWith('I69'));

  if (isCurrentStroke && sequelaeStrokeEntry) {
    results.push({
      ruleCode: 'CR_BLUEPRINT',
      severity: 'DENY',
      title: `ห้ามให้รหัส Stroke ปัจจุบัน ควบคู่กับ Sequelae (${sequelaeStrokeEntry.cleanCode}) ในการรักษาครั้งเดียวกัน`,
      errorTag: '[กฎการให้รหัส สปสช.#Stroke ปัจจุบันพ่วง Sequelae]',
      description:
        'พิมพ์เขียว สปสช. (สไลด์ 7): ข้อห้ามเด็ดขาดของ สปสช. คือ "ห้ามให้รหัส Stroke ในปัจจุบัน (I60-I64) ควบคู่กับร่องรอยโรคในอดีต (Sequelae กลุ่ม I69.-) ในการรับการรักษาครั้งเดียวกัน"',
      howToFix: `ให้ลบรหัส ${sequelaeStrokeEntry.cleanCode} ออกจากรายการการวินิจฉัยรอง`,
      recommendedAction: {
        actionType: 'REMOVE_CODE',
        targetCode: sequelaeStrokeEntry.cleanCode,
      },
    });
  }

  // 8.4 ความผิดปกติของเกลือแร่: แค่ผล Lab ผิดปกติ... ยังให้รหัสไม่ได้! (Slide 6)
  const hasAcidosis = cleanSdxList.some((s) => s.cleanCode === 'E872');
  if (hasAcidosis) {
    const hasBicarb = selectedMeds.some((m) => {
      const n = (m.name || '').toLowerCase();
      return (
        n.includes('bicarbonate') ||
        n.includes('sodamint') ||
        n.includes('soda bicarb') ||
        n.includes('nahco3')
      );
    });
    const hasDialysis =
      (procedures || []).some((p) => (p.code || '').replace('.', '') === '3995') ||
      (clinical?.clinicalSummary || '').toLowerCase().includes('hemodialysis') ||
      (clinical?.clinicalSummary || '').toLowerCase().includes('dialysis');

    if (!hasBicarb && !hasDialysis) {
      results.push({
        ruleCode: 'CR_BLUEPRINT',
        severity: 'WARNING',
        title: 'รหัส Acidosis (E87.2) ขาดหลักฐานการรักษา (เช่น IV Sodium Bicarbonate) เสี่ยงข้อหา Upcoding',
        errorTag: '[ดักจับ Upcoding#ผล Lab ผิดปกติแต่ไร้การรักษา]',
        description:
          'พิมพ์เขียว สปสช. (สไลด์ 6): "แค่ผล Lab ผิดปกติ... ยังให้รหัสไม่ได้!" การให้รหัส Acidosis โดยไม่มีการรักษาจริง เช่น การให้ Sodium Bicarbonate IV หรือการล้างไต สปสช. ถือเป็นการสรุปโรคเกินจริง (Upcoding) และจะถูกตัดรหัสออกทันที',
        howToFix:
          'ตรวจสอบว่ามีการให้ 7.5% Sodium Bicarbonate IV หรือไม่ หากไม่มีการรักษา ให้ตัดรหัส E87.2 ออกเพื่อป้องกันการถูก Audit เรียกเงินคืน',
        recommendedAction: {
          actionType: 'REMOVE_CODE',
          targetCode: 'E872',
        },
      });
    } else {
      results.push({
        ruleCode: 'CR_BLUEPRINT',
        severity: 'PASS',
        title: 'รหัส Acidosis (E87.2) มีการรักษาด้วย Sodium Bicarbonate หรือ Dialysis รองรับสมบูรณ์',
        description: 'ผ่านเกณฑ์ความสอดคล้องระหว่างผลแล็บและการรักษาจริงตามพิมพ์เขียว สปสช.',
        howToFix: 'ผ่านเกณฑ์',
      });
    }
  }

  // 8.5 หัตถการคือพยานปากเอก: Esophageal Varices / GI Bleeding ต้องมี Endoscopy ยืนยัน (Slide 13)
  const hasVarices = cleanPdx === 'I850' || cleanSdxList.some((s) => s.cleanCode === 'I850');
  if (hasVarices) {
    const hasEndoscopy =
      (procedures || []).some((p) => {
        const c = (p.code || '').replace('.', '');
        return ['4513', '4233', '4443', '4516'].includes(c);
      }) ||
      (clinical?.clinicalSummary || '').toLowerCase().includes('endoscopy') ||
      (clinical?.clinicalSummary || '').toLowerCase().includes('egd') ||
      (clinical?.clinicalSummary || '').includes('ส่องกล้อง');

    if (!hasEndoscopy) {
      results.push({
        ruleCode: 'CR_BLUEPRINT',
        severity: 'WARNING',
        title: 'Esophageal Varices with bleeding (I85.0): หลักฐานบังคับคือผลการส่องกล้อง (Endoscopy) ยืนยันเท่านั้น',
        errorTag: '[หัตถการพยานปากเอก#GI Bleeding ขาดผลส่องกล้อง]',
        description:
          'พิมพ์เขียว สปสช. (สไลด์ 13): การดูแค่อาเจียนเป็นเลือดหรือถ่ายดำ ไม่เพียงพอสำหรับการให้รหัสเฉพาะเจาะจง สปสช. กำหนดว่าต้องมีรายงานผลการส่องกล้อง (Endoscopy Report) ยืนยันเท่านั้น',
        howToFix:
          'แนบผลส่องกล้อง EGD ในเวชระเบียน หรือหากไม่ได้ส่องกล้องให้ปรับเป็นรหัสตามอาการ เช่น K92.2 (Gastrointestinal haemorrhage, unspecified)',
      });
    }
  }

  // 8.6 Perception vs Audit Reality: Malnutrition ต้องมีค่า BMI หรือ Serum Albumin/Protein (Slide 9)
  const hasMalnutrition = cleanSdxList.some((s) => ['E43', 'E440', 'E441', 'E46'].includes(s.cleanCode));
  if (hasMalnutrition) {
    results.push({
      ruleCode: 'CR_BLUEPRINT',
      severity: 'WARNING',
      title: 'ภาวะทุพโภชนาการ (Malnutrition): ห้ามใช้สายตาดูว่าผอม ต้องมีค่า BMI หรือผล Albumin ยืนยัน',
      errorTag: '[Perception vs Reality#Malnutrition ต้องมีเกณฑ์เชิงประจักษ์]',
      description:
        'พิมพ์เขียว สปสช. (สไลด์ 9): การดูแค่ผู้ป่วยผอม ซูบซีด ไม่มีแรง ไม่พอ! ต้องมีบันทึกค่าดัชนีมวลกาย (BMI) ต่ำตามเกณฑ์ หรือผลตรวจ Serum Albumin/Protein ยืนยันในเวชระเบียน มิฉะนั้นจะถูกตัดโรคร่วมทันที',
      howToFix:
        'ตรวจสอบให้มีบันทึกการประเมินภาวะโภชนาการ น้ำหนัก ส่วนสูง ค่า BMI หรือผล Serum Albumin แนบในชาร์ต',
    });
  }

  // Calculate overall status
  const errorCount = results.filter((r) => r.severity === 'DENY').length;
  const warningCount = results.filter((r) => r.severity === 'WARNING').length;
  const passCount = results.filter((r) => r.severity === 'PASS').length;

  const status: 'PASS' | 'WARNING' | 'DENY' =
    errorCount > 0 ? 'DENY' : warningCount > 0 ? 'WARNING' : 'PASS';

  return {
    status,
    results,
    errorCount,
    warningCount,
    passCount,
  };
}

export function checkSepsisDischargeCriteria(dischargeStatus?: string, dischargeType?: string) {
  const isStatusMet = dischargeStatus === '3' || dischargeStatus === '9';
  const isTypeMet = dischargeType === '2' || dischargeType === '3' || dischargeType === '4';
  const isMet = isStatusMet || isTypeMet;

  const statusLabel = dischargeStatus === '3' ? '3. Not Improve (ไม่ทุเลา)' : dischargeStatus === '9' ? '9. Dead (เสียชีวิต)' : dischargeStatus ? `สถานะ ${dischargeStatus}` : '';
  const typeLabel = dischargeType === '2' ? '2. Against Advice (ขอกลับบ้าน)' : dischargeType === '3' ? '3. By Escape (หลบหนี)' : dischargeType === '4' ? '4. By Transfer (ส่งต่อ)' : dischargeType ? `ประเภท ${dischargeType}` : '';

  return {
    isMet,
    isStatusMet,
    isTypeMet,
    statusLabel,
    typeLabel,
    summary: isMet
      ? `เข้าเงื่อนไข Sepsis & Septic Shock สปสช. (${[statusLabel, typeLabel].filter(Boolean).join(', ')})`
      : 'การจำหน่ายปกติ (ไม่เข้าเงื่อนไขวิกฤต)',
  };
}
