import JSZip from 'jszip';
import { ClinicalProfile, DiagnosisEntry, MedicationItem, Nhso17FilePatientCase, Nhso17ImportResult, NhsoCaseAuditAnalysis, ProcedureEntry } from '../types';
import { COMMON_MEDICATIONS, ICD10_DATABASE } from '../data/rulesData';
import { NHSO_ICD9_DATABASE } from '../data/nhsoCodingRules';
import { evaluateClaim } from './auditValidator';

export const DEFAULT_HIGH_COST_THRESHOLD = 50000;
export const EXTREME_HIGH_COST_THRESHOLD = 100000;

/**
 * Dedicated Auto-Audit Analyzer for 17-File Patient Cases
 * Evaluates High-Cost claims and CR37 Principal Dx / Diagnostic condition inconsistency with actual medications in DRU
 */
export function auditNhsoCase(
  pdx: string,
  secondaryDx: DiagnosisEntry[],
  medications: MedicationItem[],
  totalCharge: number = 0,
  costThreshold: number = DEFAULT_HIGH_COST_THRESHOLD
): NhsoCaseAuditAnalysis {
  const cleanPdx = pdx.trim().toUpperCase().replace('.', '');
  const cleanSdxList = secondaryDx.map((s) => ({
    ...s,
    cleanCode: s.code.trim().toUpperCase().replace('.', ''),
  }));

  const activeMeds = medications.filter((m) => m.isSelected !== false);
  const hasVasopressor = activeMeds.some((m) => m.category === 'vasopressor');
  const hasIvAntibiotic = activeMeds.some((m) => m.category === 'iv_antibiotic');
  const fluidVolume = activeMeds
    .filter((m) => m.category === 'iv_fluid')
    .reduce((sum, m) => {
      let vol = 500;
      if (m.name.includes('1,000 ml') || m.name.includes('1000 ml') || m.name.includes('1000')) vol = 1000;
      else if (m.name.includes('100 ml')) vol = 100;
      return sum + vol * m.quantity;
    }, 0);

  // High Claim Value Calculation
  const isHighCostClaim = totalCharge >= costThreshold;
  const highCostLevel = totalCharge >= EXTREME_HIGH_COST_THRESHOLD ? 'EXTREME' : isHighCostClaim ? 'HIGH' : undefined;

  // CR37 and Diagnostic Inconsistency Checks
  const cr37MismatchReasons: string[] = [];
  const alertTags: string[] = [];

  const isShockPdx = ['R570', 'R571', 'R572', 'R578', 'R579'].includes(cleanPdx);
  const shockSdx = cleanSdxList.filter((s) => ['R570', 'R571', 'R572', 'R578', 'R579'].includes(s.cleanCode));
  const hasSepticShockDx = cleanPdx === 'R572' || cleanSdxList.some((s) => s.cleanCode === 'R572');
  const hasHypoShockDx = cleanPdx === 'R571' || cleanSdxList.some((s) => s.cleanCode === 'R571');
  const isShockComorbid = cleanSdxList.some((s) => s.cleanCode === 'R572' && s.diagType === 'comorbid');
  const hasBannedCode = cleanPdx === 'R650' || cleanSdxList.some((s) => s.cleanCode === 'R650');
  const isSepsisPdx = cleanPdx.startsWith('A40') || cleanPdx.startsWith('A41');

  // Check 1: R572 Septic Shock vs Vasopressor
  if (hasSepticShockDx && !hasVasopressor) {
    cr37MismatchReasons.push(
      'วินิจฉัย Septic shock (R572) แต่ไม่พบรายการยากระตุ้นความดัน (Vasopressor เช่น Norepinephrine, Levophed, Dopamine) ในแฟ้มยา DRU ตามเกณฑ์ CR37'
    );
    alertTags.push('CR37_NO_VASOPRESSOR');
  }

  // Check 2: Shock coded as Principal Diagnosis
  if (isShockPdx) {
    cr37MismatchReasons.push(
      `ห้ามใช้รหัสกลุ่ม Shock (${cleanPdx}) เป็นการวินิจฉัยหลัก (Principal Dx) ขัดเกณฑ์ CR37 อย่างร้ายแรง ต้องระบุโรคต้นเหตุ (เช่น Sepsis A419 หรือ Gastroenteritis A090) เป็นโรคหลัก`
    );
    alertTags.push('CR37_SHOCK_AS_PDX');
  }

  // Check 3: Septic Shock recorded as Co-morbid
  if (isShockComorbid) {
    cr37MismatchReasons.push(
      'รหัส Septic shock (R572) ถูกระบุเป็น "โรคร่วม (Co-morbid)" ขัดเกณฑ์ CR37 ต้องระบุเป็น "โรคแทรก / ภาวะแทรกซ้อน (Complication)" เท่านั้น'
    );
    alertTags.push('CR37_SHOCK_AS_COMORBID');
  }

  // Check 4: Sepsis Principal Dx vs IV Antibiotics
  if (isSepsisPdx && !hasIvAntibiotic) {
    cr37MismatchReasons.push(
      `วินิจฉัยโรคหลักกลุ่ม Sepsis (${cleanPdx}) แต่ไม่พบรายการยาปฏิชีวนะชนิดฉีด (IV Antibiotic) ในแฟ้ม DRU ขัดเกณฑ์การรักษาและการตรวจสอบ CR1/CR37`
    );
    alertTags.push('CR1_SEPSIS_NO_ATB');
  }

  // Check 5: Hypovolemic Shock with insufficient fluid
  if (hasHypoShockDx && fluidVolume < 1000) {
    cr37MismatchReasons.push(
      `วินิจฉัย Hypovolemic shock (R571) แต่ปริมาณสารน้ำกู้ชีพในแฟ้ม DRU มีเพียง ${fluidVolume} ml (ต้องได้รับอย่างน้อย 1,000–2,000 ml) ขัดเกณฑ์ CR37`
    );
    alertTags.push('CR37_INSUFFICIENT_FLUID');
  }

  // Check 6: Vasopressor given with NO Shock diagnosis
  if (hasVasopressor && !isShockPdx && shockSdx.length === 0) {
    cr37MismatchReasons.push(
      'ในแฟ้ม DRU มีการใช้ยากระตุ้นความดัน (Vasopressor) แต่ไม่มีการสรุปรหัสภาวะช็อก (R57) เสี่ยง Under-coding หรือข้อมูลทางคลินิกขัดแย้ง'
    );
    alertTags.push('CR37_VASO_WITHOUT_SHOCK_DX');
  }

  // Check 7: Banned Code R650
  if (hasBannedCode) {
    alertTags.push('BANNED_CODE_R650');
  }

  if (isHighCostClaim) {
    alertTags.push('HIGH_COST_CLAIM');
  }

  const isCr37MedMismatch = cr37MismatchReasons.length > 0;
  const isPdxInconsistent = isShockPdx || (isSepsisPdx && !hasIvAntibiotic);

  let overallVerdict: 'DENY' | 'WARNING' | 'PASS' = 'PASS';
  if (isCr37MedMismatch || isShockPdx || isShockComorbid || hasBannedCode) {
    overallVerdict = 'DENY';
  } else if (isHighCostClaim) {
    overallVerdict = 'WARNING';
  }

  return {
    isHighCostClaim,
    totalCharge,
    costThreshold,
    highCostLevel,
    isCr37MedMismatch,
    cr37MismatchReasons,
    isPdxInconsistent,
    hasVasopressor,
    hasIvAntibiotic,
    isShockPdx,
    isShockComorbid,
    hasBannedCode,
    overallVerdict,
    alertTags,
  };
}

/**
 * Decode buffer handling UTF-8, Windows-874 (TIS-620), and ISO-8859-11
 * Common in Thai hospital electronic claim file exports.
 */
export function decodeThaiText(buffer: ArrayBuffer): string {
  try {
    const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
    return utf8Decoder.decode(buffer);
  } catch {
    try {
      const tisDecoder = new TextDecoder('windows-874');
      return tisDecoder.decode(buffer);
    } catch {
      const fallback = new TextDecoder('iso-8859-11');
      return fallback.decode(buffer);
    }
  }
}

/**
 * Strip quotes and trim
 */
function cleanField(val: string | undefined): string {
  if (!val) return '';
  let str = val.trim();
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

/**
 * Format ICD-10 code (e.g. A41.9 -> A419, A419 -> A419)
 */
function normalizeIcdCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Detect medication category and properties from drug name / DID name
 */
function categorizeDrug(name: string, workingCode: string, qty: number): MedicationItem {
  const lower = name.toLowerCase();

  // 1. Vasopressors
  if (
    lower.includes('norepinephrine') ||
    lower.includes('levophed') ||
    lower.includes('norad') ||
    lower.includes('dopamine') ||
    lower.includes('adrenaline') ||
    lower.includes('epinephrine') ||
    lower.includes('vasopressin')
  ) {
    return {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workingCode: workingCode || 'VASO',
      name: name.trim(),
      category: 'vasopressor',
      dosage: lower.includes('norepi') || lower.includes('levo') ? '4 mg / 4 ml' : 'IV drip / inj',
      quantity: qty > 0 ? qty : 1,
      isSelected: true,
    };
  }

  // 2. IV Antibiotics
  if (
    lower.includes('ceftriaxone') ||
    lower.includes('meropenem') ||
    lower.includes('piperacillin') ||
    lower.includes('tazocin') ||
    lower.includes('vancomycin') ||
    lower.includes('cefotaxime') ||
    lower.includes('ciprofloxacin') ||
    lower.includes('amikacin') ||
    lower.includes('levofloxacin') ||
    lower.includes('colistin') ||
    lower.includes('imipenem') ||
    lower.includes('ampicillin') ||
    lower.includes('gentamicin') ||
    lower.includes('ceftazidime') ||
    lower.includes('cefazolin') ||
    lower.includes('ertapenem') ||
    lower.includes('sulbactam') ||
    lower.includes('tazobactam') ||
    lower.includes('metronidazole') ||
    (lower.includes('inj') && (lower.includes('cef') || lower.includes('cillin') || lower.includes('penem')))
  ) {
    return {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workingCode: workingCode || 'ATB',
      name: name.trim(),
      category: 'iv_antibiotic',
      dosage: 'IV Injection / Infusion',
      quantity: qty > 0 ? qty : 1,
      isSelected: true,
    };
  }

  // 3. IV Fluids
  if (
    lower.includes('nss') ||
    lower.includes('saline') ||
    lower.includes('nacl') ||
    lower.includes('acetar') ||
    lower.includes('ringer') ||
    lower.includes('rls') ||
    lower.includes('lrs') ||
    lower.includes('plasmalyte') ||
    lower.includes('5% d/nss') ||
    lower.includes('5% dn/2') ||
    lower.includes('5% d/w') ||
    lower.includes('dextrose')
  ) {
    return {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workingCode: workingCode || 'FLUID',
      name: name.trim(),
      category: 'iv_fluid',
      dosage: lower.includes('1000') || lower.includes('1,000') ? '1,000 ml IV' : '500 ml IV',
      quantity: qty > 0 ? qty : 1,
      isSelected: true,
    };
  }

  // 4. Electrolytes
  if (
    lower.includes('kcl') ||
    lower.includes('potassium') ||
    lower.includes('sodium bicarb') ||
    lower.includes('nahco3') ||
    lower.includes('7.5%') ||
    lower.includes('magnesium') ||
    lower.includes('mgso4') ||
    lower.includes('calcium')
  ) {
    return {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      workingCode: workingCode || 'ELECTRO',
      name: name.trim(),
      category: 'electrolyte',
      dosage: 'IV Additive',
      quantity: qty > 0 ? qty : 1,
      isSelected: true,
    };
  }

  // 5. Supportive
  return {
    id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    workingCode: workingCode || 'MED',
    name: name.trim(),
    category: 'supportive',
    dosage: 'Standard',
    quantity: qty > 0 ? qty : 1,
    isSelected: false,
  };
}

/**
 * Parse Pipe Delimited Lines
 */
function parsePipeLines(content: string): string[][] {
  const lines = content.split(/\r?\n/);
  const rows: string[][] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('|').map((p) => cleanField(p));
    rows.push(parts);
  }
  return rows;
}

/**
 * Detect file name from standard NHSO 16/17/18-file pipe-delimited header
 */
export function identifyNhsoFileHeader(headerLine: string): string | null {
  const upper = headerLine.toUpperCase().trim();
  if (upper.startsWith('HN|AN|DATEOPD|TYPE|CODE') || upper.startsWith('HN|AN|DATEOPD|TYPE')) return 'ADP.txt';
  if (upper.startsWith('HN|AN|DATEOPD|AUTHAE') || upper.startsWith('HN|AN|DATEOPD|AEDATE')) return 'AER.txt';
  if (upper.startsWith('HN|AN|DATE|CHRGITEM')) return 'CHA.txt';
  if (upper.startsWith('HN|AN|DATE|TOTAL|PAID')) return 'CHT.txt';
  if (
    upper.startsWith('HCODE|HN|AN|CLINIC|PERSON_ID|DATE_SERV|DID') ||
    upper.startsWith('AN|DID|DIDNAME') ||
    (upper.includes('DID') && upper.includes('DIDNAME'))
  )
    return 'DRU.txt';
  if (upper.startsWith('AN|DIAG|DXTYPE|DRDX') || upper.startsWith('AN|DIAG|DXTYPE')) return 'IDX.txt';
  if (upper.startsWith('HN|INSCL|SUBTYPE') || upper.startsWith('HN|INSCL')) return 'INS.txt';
  if (upper.startsWith('AN|OPER|OPTYPE') || upper.startsWith('AN|OPER')) return 'IOP.txt';
  if (upper.startsWith('HN|AN|DATEADM|TIMEADM') || upper.startsWith('HN|AN|DATEADM')) return 'IPD.txt';
  if (upper.startsWith('AN|REFER|REFERTYPE') || upper.startsWith('AN|REFER')) return 'IRF.txt';
  if (upper.startsWith('HCODE|HN|PERSON_ID|DATESERV') && (upper.includes('LABTEST') || upper.includes('LABRESULT')))
    return 'LABFU.txt';
  if (upper.startsWith('SEQLVD|AN|DATEOUT')) return 'LVD.txt';
  if (upper.startsWith('HN|DATEDX|CLINIC|DIAG')) return 'ODX.txt';
  if (upper.startsWith('HN|DATEOPD|CLINIC|OPER')) return 'OOP.txt';
  if (upper.startsWith('HN|CLINIC|DATEOPD|TIMEOPD') || upper.startsWith('HN|CLINIC|DATEOPD')) return 'OPD.txt';
  if (upper.startsWith('HN|DATEOPD|CLINIC|REFER')) return 'ORF.txt';
  if (upper.startsWith('HCODE|HN|CHANGWAT|AMPHUR') || (upper.includes('NAMEPAT') && upper.includes('PERSON_ID')))
    return 'PAT.txt';
  if (upper.startsWith('HN|CODE|QTY|PRICE|AN') || upper.startsWith('HN|CODE|QTY|PRICE')) return 'CHR.txt';
  return null;
}

/**
 * Split a concatenated raw text containing any number of the 16/17/18 NHSO files
 * into individual file string contents in a Map
 */
export function parseConcatenated18FilesText(rawText: string): Map<string, string> {
  const fileMap = new Map<string, string>();
  const lines = rawText.split(/\r?\n/);

  let currentFile: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if this line is a recognized header
    const detectedHeader = identifyNhsoFileHeader(trimmed);
    if (detectedHeader) {
      // Save previous file lines if any
      if (currentFile && currentLines.length > 0) {
        const existing = fileMap.get(currentFile) || '';
        fileMap.set(currentFile, existing ? `${existing}\n${currentLines.join('\n')}` : currentLines.join('\n'));
      }
      currentFile = detectedHeader;
      currentLines = [trimmed];
    } else if (currentFile) {
      currentLines.push(trimmed);
    }
  }

  // Save the last file
  if (currentFile && currentLines.length > 0) {
    const existing = fileMap.get(currentFile) || '';
    fileMap.set(currentFile, existing ? `${existing}\n${currentLines.join('\n')}` : currentLines.join('\n'));
  }

  return fileMap;
}

/**
 * Find files in a collection by standard NHSO names (case-insensitive)
 */
function findFileContent(fileMap: Map<string, string>, targetPrefix: string): string | undefined {
  const lowerPrefix = targetPrefix.toLowerCase();
  for (const [key, value] of fileMap.entries()) {
    const baseName = key.split('/').pop()?.toLowerCase() || '';
    if (baseName.startsWith(lowerPrefix) && (baseName.endsWith('.txt') || baseName.endsWith('.csv') || !baseName.includes('.'))) {
      return value;
    }
  }
  return undefined;
}

/**
 * Core 18-files parser
 */
export function parseNhso17Files(fileMap: Map<string, string>, sourceFileName = '18-Files.zip'): Nhso17ImportResult {
  const detectedFiles: string[] = [];
  for (const key of fileMap.keys()) {
    const baseName = key.split('/').pop();
    if (baseName) detectedFiles.push(baseName);
  }

  // 1. Parse PAT.txt (Patients)
  // Format: HCODE|HN|CHANGWAT|AMPHUR|DOB|SEX|MARRIAGE|OCCUPA|NATION|PERSON_ID|NAMEPAT|TITLE|FNAME|LNAME
  const patContent = findFileContent(fileMap, 'pat');
  const patientMap = new Map<string, { hn: string; name?: string; age?: number; sex?: string }>();

  if (patContent) {
    const rows = parsePipeLines(patContent);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && row[0]?.toUpperCase().includes('HN')) continue; // Skip header
      if (row.length < 2) continue;

      // In PAT.txt, column 1 is usually HN, or column 0 if without HCODE
      let hn = row[1];
      let fname = '';
      let lname = '';
      let title = '';
      let dob = '';
      let sex = '';

      if (row.length >= 14) {
        hn = row[1];
        dob = row[4];
        sex = row[5];
        title = row[11];
        fname = row[12];
        lname = row[13];
      } else if (row.length >= 5) {
        hn = row[0] || row[1];
        fname = row[2] || '';
        lname = row[3] || '';
      }

      let fullName = `${title} ${fname} ${lname}`.trim();
      if (!fullName && row[10]) fullName = row[10];

      let age: number | undefined;
      if (dob && dob.length >= 4) {
        const birthYear = parseInt(dob.substring(0, 4), 10);
        if (!isNaN(birthYear)) {
          // Check if Buddhist Era (BE > 2400)
          const currentYear = new Date().getFullYear();
          const adYear = birthYear > 2400 ? birthYear - 543 : birthYear;
          age = Math.max(0, currentYear - adYear);
        }
      }

      if (hn) {
        patientMap.set(cleanField(hn), {
          hn: cleanField(hn),
          name: fullName || undefined,
          age,
          sex: sex === '1' || sex.toUpperCase() === 'M' ? 'ชาย' : sex === '2' || sex.toUpperCase() === 'F' ? 'หญิง' : undefined,
        });
      }
    }
  }

  // 2. Parse IPD.txt (Inpatients)
  // Format: HN|AN|DATEADM|TIMEADM|DATEDSC|TIMEDSC|DISCHS|DISCHT|WTTD|WTDSC|ADM_W|WARDDSC|DEPT
  const ipdContent = findFileContent(fileMap, 'ipd');
  const ipdMap = new Map<string, { hn: string; an: string; dateAdm?: string; dateDsc?: string; dischs?: string; discht?: string; ward?: string }>();

  if (ipdContent) {
    const rows = parsePipeLines(ipdContent);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toUpperCase().includes('HN') || row[1]?.toUpperCase().includes('AN'))) continue;
      if (row.length < 2) continue;

      let hn = cleanField(row[0]);
      let an = cleanField(row[1]);
      // Handle cases where AN is first column
      if (an.length > 5 && isNaN(Number(an)) && !isNaN(Number(hn))) {
        // Swap if needed
      }

      const dateAdm = row[2];
      const dateDsc = row[4];
      const dischs = row[6] ? cleanField(row[6]) : undefined;
      const discht = row[7] ? cleanField(row[7]) : undefined;
      const ward = row[11] || row[10];

      if (an) {
        ipdMap.set(an, { hn, an, dateAdm, dateDsc, dischs, discht, ward });
      }
    }
  }

  // 3. Parse INS.txt (Insurance / สิทธิ)
  // Format: HN|INSCL|SUBTYPE|...
  const insContent = findFileContent(fileMap, 'ins');
  const insMap = new Map<string, string>();
  if (insContent) {
    const rows = parsePipeLines(insContent);
    for (const row of rows) {
      if (row.length >= 2) {
        const hn = cleanField(row[0]);
        const inscl = cleanField(row[1]);
        if (hn && inscl) {
          let label = inscl;
          if (inscl.toUpperCase() === 'UCS') label = 'บัตรทอง (UCS)';
          else if (inscl.toUpperCase() === 'SSS') label = 'ประกันสังคม (SSS)';
          else if (inscl.toUpperCase() === 'OFC') label = 'ข้าราชการ/เบิกตรง (OFC)';
          insMap.set(hn, label);
        }
      }
    }
  }

  // 4. Parse CHT.txt (Total Claim Charges)
  const chtContent = findFileContent(fileMap, 'cht');
  const chargeMap = new Map<string, number>();
  if (chtContent) {
    const rows = parsePipeLines(chtContent);
    for (const row of rows) {
      if (row.length >= 4) {
        const an = cleanField(row[1]);
        const total = parseFloat(row[3]);
        if (an && !isNaN(total)) {
          chargeMap.set(an, total);
        }
      }
    }
  }

  // 4.1 Parse CHA.txt (Fallback for Charges by Category if CHT is missing or 0)
  const chaContent = findFileContent(fileMap, 'cha');
  if (chaContent) {
    const rows = parsePipeLines(chaContent);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toUpperCase().includes('HN') || row[1]?.toUpperCase().includes('AN'))) continue;
      if (row.length >= 5) {
        const an = cleanField(row[1]);
        const amt = parseFloat(cleanField(row[4]));
        if (an && !isNaN(amt) && amt > 0) {
          if (!chargeMap.has(an) || chargeMap.get(an) === 0) {
            chargeMap.set(an, (chargeMap.get(an) || 0) + amt);
          }
        }
      }
    }
  }

  // 5. Parse IDX.txt (Diagnoses) - MANDATORY
  // Format: AN|DIAG|DXTYPE|DRDX
  const idxContent = findFileContent(fileMap, 'idx');
  const diagnosesByAn = new Map<string, { pdx: string; secondaryDx: DiagnosisEntry[] }>();
  let totalDiagnosesCount = 0;

  if (idxContent) {
    const rows = parsePipeLines(idxContent);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toUpperCase().includes('AN') || row[1]?.toUpperCase().includes('DIAG'))) continue;
      if (row.length < 3) continue;

      const an = cleanField(row[0]);
      const diagRaw = cleanField(row[1]);
      const dxType = cleanField(row[2]); // '1' = Principal Dx, '2' = Co-morbid, '3' = Complication, '4' = Other, '5' = Ext Cause
      const drdx = row[3] ? cleanField(row[3]) : undefined;

      if (!an || !diagRaw) continue;

      const normalizedCode = normalizeIcdCode(diagRaw);
      const codeInfo = ICD10_DATABASE[normalizedCode];

      if (!diagnosesByAn.has(an)) {
        diagnosesByAn.set(an, { pdx: '', secondaryDx: [] });
      }

      const caseDx = diagnosesByAn.get(an)!;
      totalDiagnosesCount++;

      if (dxType === '1' && !caseDx.pdx) {
        // Principal Diagnosis
        caseDx.pdx = normalizedCode;
      } else {
        // Secondary Diagnosis
        // dxType '3' = complication, otherwise comorbid
        const diagType: 'comorbid' | 'complication' = dxType === '3' ? 'complication' : 'comorbid';
        caseDx.secondaryDx.push({
          id: `sdx_${an}_${normalizedCode}_${Math.random().toString(36).substring(2, 6)}`,
          code: normalizedCode,
          version: '2010',
          descriptionEn: codeInfo ? codeInfo.nameEn : 'ICD-10 Code',
          descriptionTh: codeInfo ? codeInfo.nameTh : 'การวินิจฉัยจากระบบ 18 แฟ้ม',
          diagType,
          doctorLicense: drdx,
        });
      }
    }
  }

  // 6. Parse DRU.txt (Medications)
  // Format: HCODE|HN|AN|CLINIC|PERSON_ID|DATE_SERV|DID|DIDNAME|AMOUNT|DRUGPRIC|DRUGCOST|...
  // Or: AN|DID|DIDNAME|AMOUNT|...
  const druContent = findFileContent(fileMap, 'dru');
  const medsByAn = new Map<string, MedicationItem[]>();
  let totalDrugsCount = 0;

  if (druContent) {
    const rows = parsePipeLines(druContent);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toUpperCase().includes('HN') || row[2]?.toUpperCase().includes('AN') || row[1]?.toUpperCase().includes('AN'))) continue;
      if (row.length < 3) continue;

      // Detect which column is AN:
      // In standard 24-column DRU.txt:
      // row[1] = HN, row[2] = AN, row[6] = DID, row[7] = DIDNAME, row[8] = AMOUNT
      let an = '';
      let did = '';
      let didName = '';
      let amount = 1;

      if (row.length >= 9) {
        an = cleanField(row[2]);
        did = cleanField(row[6]);
        didName = cleanField(row[7]);
        amount = parseFloat(cleanField(row[8])) || 1;
      } else {
        // Shorter format
        an = cleanField(row[0]);
        did = cleanField(row[1]);
        didName = cleanField(row[2]);
        amount = parseFloat(cleanField(row[3])) || 1;
      }

      if (!an || !didName) continue;

      if (!medsByAn.has(an)) {
        medsByAn.set(an, []);
      }

      const list = medsByAn.get(an)!;
      totalDrugsCount++;

      // Check if already exists in list (aggregate amount)
      const existing = list.find((m) => m.name.toLowerCase() === didName.toLowerCase());
      if (existing) {
        existing.quantity += amount;
      } else {
        const item = categorizeDrug(didName, did, amount);
        list.push(item);
      }
    }
  }

  // 7. Parse LABFU.txt (Laboratory Results)
  // Format: HCODE|HN|PERSON_ID|DATESERV|LABTEST|LABRESULT
  const labContent = findFileContent(fileMap, 'labfu');
  const labsByHn = new Map<string, { hemoculture: 'positive' | 'negative' | 'pending' | 'not_sent'; organism?: string; count: number }>();
  let totalLabsCount = 0;

  if (labContent) {
    const rows = parsePipeLines(labContent);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && row[0]?.toUpperCase().includes('HN')) continue;
      if (row.length < 3) continue;

      const hn = cleanField(row[1] || row[0]);
      const labTest = cleanField(row[4] || row[2]).toLowerCase();
      const labResult = cleanField(row[5] || row[3]);

      if (!hn) continue;
      totalLabsCount++;

      if (!labsByHn.has(hn)) {
        labsByHn.set(hn, { hemoculture: 'not_sent', count: 0 });
      }

      const entry = labsByHn.get(hn)!;
      entry.count++;

      if (labTest.includes('culture') || labTest.includes('hemo') || labTest.includes('blood culture')) {
        const resLower = labResult.toLowerCase();
        if (resLower.includes('no growth') || resLower.includes('negative') || resLower.includes('not found')) {
          entry.hemoculture = 'negative';
        } else if (
          resLower.includes('growth') ||
          resLower.includes('positive') ||
          resLower.includes('coli') ||
          resLower.includes('klebsiella') ||
          resLower.includes('staph') ||
          resLower.includes('acineto') ||
          resLower.includes('pseudomonas')
        ) {
          entry.hemoculture = 'positive';
          entry.organism = labResult;
        } else if (resLower.includes('pend') || resLower.includes('รอผล')) {
          entry.hemoculture = 'pending';
        }
      }
    }
  }

  // 8. Parse IOP.txt (Inpatient Operations & Procedures)
  const iopContent = findFileContent(fileMap, 'iop');
  const opsByAn = new Map<string, number>();
  const proceduresByAn = new Map<string, ProcedureEntry[]>();
  let totalOpsCount = 0;
  if (iopContent) {
    const rows = parsePipeLines(iopContent);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toUpperCase().includes('AN') || row[1]?.toUpperCase().includes('OPER'))) continue;
      if (row.length < 2) continue;
      const an = cleanField(row[0]);
      const oper = cleanField(row[1]);
      const optype = row[2] ? cleanField(row[2]) : '2';
      const drop = row[3] ? cleanField(row[3]) : undefined;
      const dateIn = row[4] ? cleanField(row[4]) : undefined;
      const timeIn = row[5] ? cleanField(row[5]) : undefined;
      const dateOut = row[6] ? cleanField(row[6]) : undefined;
      const timeOut = row[7] ? cleanField(row[7]) : undefined;

      if (an && oper) {
        totalOpsCount++;
        opsByAn.set(an, (opsByAn.get(an) || 0) + 1);

        if (!proceduresByAn.has(an)) {
          proceduresByAn.set(an, []);
        }

        const cleanOper = oper.replace('.', '');
        const procInfo = NHSO_ICD9_DATABASE[cleanOper];
        proceduresByAn.get(an)!.push({
          id: `proc_${an}_${cleanOper}_${Math.random().toString(36).substring(2, 6)}`,
          code: cleanOper,
          version: '2010',
          descriptionEn: procInfo ? procInfo.nameEn : 'ICD-9-CM Operation',
          descriptionTh: procInfo ? procInfo.nameTh : 'หัตถการจากแฟ้ม IOP',
          procType: optype === '1' ? 'principal' : 'secondary',
          dateOper: dateIn,
          timeIn,
          timeOut,
          doctorLicense: drop,
          auditRisk: procInfo?.auditRisk || 'NORMAL',
          auditNote: procInfo?.nhsoCondition,
        });
      }
    }
  }

  // 9. Parse ADP.txt (Additional Services / Procedure codes / Hemoculture)
  const adpContent = findFileContent(fileMap, 'adp');
  if (adpContent) {
    const rows = parsePipeLines(adpContent);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (i === 0 && (row[0]?.toUpperCase().includes('HN') || row[1]?.toUpperCase().includes('AN'))) continue;
      if (row.length < 5) continue;
      const hn = cleanField(row[0]);
      const code = cleanField(row[4]);
      // Code 33001 is Hemoculture in NHSO standard fee schedule
      if (code === '33001' && hn) {
        if (!labsByHn.has(hn)) {
          labsByHn.set(hn, { hemoculture: 'pending', count: 1 });
        } else if (labsByHn.get(hn)!.hemoculture === 'not_sent') {
          labsByHn.get(hn)!.hemoculture = 'pending';
        }
      }
    }
  }

  // Gather all unique ANs from IDX, IPD, and DRU
  const allAns = new Set<string>();
  for (const an of diagnosesByAn.keys()) allAns.add(an);
  for (const an of ipdMap.keys()) allAns.add(an);
  for (const an of medsByAn.keys()) allAns.add(an);

  const cases: Nhso17FilePatientCase[] = [];

  for (const an of allAns) {
    const ipd = ipdMap.get(an);
    const hn = ipd?.hn || '';
    const patient = hn ? patientMap.get(hn) : undefined;
    const dx = diagnosesByAn.get(an) || { pdx: 'A419', secondaryDx: [] };
    const pdx = dx.pdx || 'A419';
    const secondaryDx = dx.secondaryDx;

    // Medications: merge parsed meds with common default meds so user has checkboxes
    const parsedMeds = medsByAn.get(an) || [];
    // Ensure all parsed meds are in the list
    const medications: MedicationItem[] = [...parsedMeds];

    // Add unselected standard meds if not present
    for (const common of COMMON_MEDICATIONS) {
      const already = medications.some((m) => m.name.toLowerCase().includes(common.name.toLowerCase().slice(0, 8)));
      if (!already) {
        medications.push({ ...common, isSelected: false });
      }
    }

    // Clinical profile from LABFU or defaults
    const labInfo = hn ? labsByHn.get(hn) : undefined;
    const hasVaso = parsedMeds.some((m) => m.category === 'vasopressor');
    const fluidResuscitationMl = parsedMeds
      .filter((m) => m.category === 'iv_fluid')
      .reduce((acc, m) => {
        const vol = m.name.includes('1000') || m.name.includes('1,000') ? 1000 : 500;
        return acc + vol * m.quantity;
      }, 0);

    const dischs = ipd?.dischs as any;
    const discht = ipd?.discht as any;

    const clinicalProfile: ClinicalProfile = {
      hemoculture: labInfo?.hemoculture || 'not_sent',
      cultureOrganism: labInfo?.organism || undefined,
      sirsMetCount: 2,
      mapUnder65: hasVaso,
      fluidResuscitationMl: fluidResuscitationMl,
      hasOrganDysfunction: false,
      dischargeStatus: dischs,
      dischargeType: discht,
      clinicalSummary: `ข้อมูลจาก 18 แฟ้ม สปสช. (AN: ${an})`,
    };

    // Run audit validator to compute initial audit verdict
    const auditRes = evaluateClaim(pdx, secondaryDx, medications, clinicalProfile);
    const totalCharge = chargeMap.get(an) || 0;
    const auditAnalysis = auditNhsoCase(pdx, secondaryDx, parsedMeds, totalCharge);

    let initialStatus: 'PASS' | 'WARNING' | 'DENY' = 'PASS';
    if (auditAnalysis.isCr37MedMismatch || auditRes.status === 'DENY') {
      initialStatus = 'DENY';
    } else if (auditAnalysis.isHighCostClaim || auditRes.status === 'WARNING') {
      initialStatus = 'WARNING';
    }

    const initialRule = auditAnalysis.isCr37MedMismatch
      ? 'CR37'
      : auditRes.results.find((r) => r.severity === 'DENY')?.ruleCode || auditRes.results[0]?.ruleCode || 'CR_GENERAL';

    cases.push({
      an,
      hn: hn || (patient ? patient.hn : '-'),
      patientName: patient?.name || `ผู้ป่วยใน AN ${an}`,
      age: patient?.age,
      sex: patient?.sex,
      insuranceType: hn ? insMap.get(hn) : undefined,
      dateAdm: ipd?.dateAdm,
      dateDsc: ipd?.dateDsc,
      dischargeStatus: dischs,
      dischargeType: discht,
      totalCharge: totalCharge > 0 ? totalCharge : undefined,
      pdx,
      secondaryDx,
      medications,
      clinicalProfile,
      rawDiagnosesCount: (dx.pdx ? 1 : 0) + dx.secondaryDx.length,
      rawMedicationsCount: parsedMeds.length,
      rawLabsCount: labInfo?.count || 0,
      rawProceduresCount: opsByAn.get(an) || 0,
      procedures: proceduresByAn.get(an) || [],
      initialAuditStatus: initialStatus,
      initialAuditRule: initialRule,
      auditAnalysis,
    });
  }

  // Sort cases: CR37 Mismatch and High-Cost claims first, then other DENYs, then WARNINGs, then PASS
  cases.sort((a, b) => {
    const aPriority = (a.auditAnalysis?.isCr37MedMismatch ? -20 : 0) + (a.auditAnalysis?.isHighCostClaim ? -10 : 0);
    const bPriority = (b.auditAnalysis?.isCr37MedMismatch ? -20 : 0) + (b.auditAnalysis?.isHighCostClaim ? -10 : 0);
    if (aPriority !== bPriority) return aPriority - bPriority;

    const rank = { DENY: 0, WARNING: 1, PASS: 2 };
    const rA = rank[a.initialAuditStatus || 'PASS'];
    const rB = rank[b.initialAuditStatus || 'PASS'];
    if (rA !== rB) return rA - rB;

    return (b.totalCharge || 0) - (a.totalCharge || 0);
  });

  return {
    fileName: sourceFileName,
    detectedFiles,
    cases,
    totalRecords: {
      patients: cases.length,
      diagnoses: totalDiagnosesCount,
      drugs: totalDrugsCount,
      labs: totalLabsCount,
      procedures: totalOpsCount,
    },
  };
}

/**
 * Load ZIP File and extract all files
 */
export async function parseNhsoZipFile(file: File): Promise<Nhso17ImportResult> {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);
  const fileMap = new Map<string, string>();

  const entries = Object.keys(zipContent.files);
  for (const path of entries) {
    const entry = zipContent.files[path];
    if (entry.dir) continue;
    const buffer = await entry.async('arraybuffer');
    const text = decodeThaiText(buffer);
    fileMap.set(path, text);
  }

  return parseNhso17Files(fileMap, file.name);
}

/**
 * Pre-bundled realistic 17 files sample dataset
 * Generates an actual in-memory 17-file package with 6 diverse clinical scenarios
 * Demonstrating CR37 medication mismatch, high-cost claims, and compliant cases
 */
export function getSample17FilesData(): Nhso17ImportResult {
  const fileMap = new Map<string, string>();

  // 1. PAT.txt (6 patients)
  fileMap.set(
    'PAT.txt',
    [
      'HCODE|HN|CHANGWAT|AMPHUR|DOB|SEX|MARRIAGE|OCCUPA|NATION|PERSON_ID|NAMEPAT|TITLE|FNAME|LNAME',
      '10670|005421|40|01|24980514|1|2|01|099|1409900112233|นายสมศักดิ์ รักษาดี|นาย|สมศักดิ์|รักษาดี',
      '10670|008892|40|01|25021120|2|1|01|099|1409900223344|นางสมศรี มีสุข|นาง|สมศรี|มีสุข',
      '10670|009105|40|01|25150808|1|2|01|099|1409900334455|นายบุญมี เจริญสุข|นาย|บุญมี|เจริญสุข',
      '10670|009450|40|01|25200312|2|1|01|099|1409900445566|นางอำไพ สดใส|นาง|อำไพ|สดใส',
      '10670|009780|40|01|25100615|1|1|01|099|1409900556677|นายประสิทธิ์ มั่นคง|นาย|ประสิทธิ์|มั่นคง',
      '10670|009920|40|01|25251104|2|2|01|099|1409900667788|นางมาลี สุวรรณ|นาง|มาลี|สุวรรณ',
    ].join('\n')
  );

  // 2. IPD.txt
  fileMap.set(
    'IPD.txt',
    [
      'HN|AN|DATEADM|TIMEADM|DATEDSC|TIMEDSC|DISCHS|DISCHT|WTTD|WTDSC|ADM_W|WARDDSC|DEPT',
      '005421|67012345|20240901|0930|20240906|1400|1|1|62|61|02|หอผู้ป่วยอายุรกรรมชาย|01',
      '008892|67012346|20240902|1115|20240908|1200|1|1|55|54|03|หอผู้ป่วยวิกฤต (ICU)|01',
      '009105|67012347|20240903|1420|20240907|1030|1|1|68|67|02|หอผู้ป่วยอายุรกรรมชาย|01',
      '009450|67012348|20240904|0810|20240906|1500|1|1|58|57|04|หอผู้ป่วยอายุรกรรมหญิง|01',
      '009780|67012349|20240905|1020|20240908|1100|1|1|64|63|02|หอผู้ป่วยอายุรกรรมชาย|01',
      '009920|67012350|20240906|1345|20240909|0930|1|1|52|51|04|หอผู้ป่วยอายุรกรรมหญิง|01',
    ].join('\n')
  );

  // 3. INS.txt
  fileMap.set(
    'INS.txt',
    [
      'HN|INSCL|SUBTYPE|SUB|DATEIN|DATEEXP|HOSPMAIN',
      '005421|UCS|10|00|20240101|20241231|10670',
      '008892|UCS|10|00|20240101|20241231|10670',
      '009105|OFC|01|00|20240101|20241231|10670',
      '009450|SSS|02|00|20240101|20241231|10670',
      '009780|UCS|10|00|20240101|20241231|10670',
      '009920|OFC|01|00|20240101|20241231|10670',
    ].join('\n')
  );

  // 4. IDX.txt (Diagnoses)
  // AN 67012345: CR37 DENY case (R572 as comorbid dxType 2, no vasopressor)
  // AN 67012346: High Cost & PASS Septic shock case (R572 as complication dxType 3 + Levophed) - ฿138,500
  // AN 67012347: High Cost & CR1/CR37 Sepsis WITHOUT IV Antibiotic - ฿74,200
  // AN 67012348: High Cost & CR37 Shock as Principal Dx - ฿92,400
  // AN 67012349: PASS Hypovolemic shock (A090 + R571 complication + 3000ml fluid) - ฿16,800
  // AN 67012350: CR1 Banned SIRS code (N390 + R650) - ฿11,200
  fileMap.set(
    'IDX.txt',
    [
      'AN|DIAG|DXTYPE|DRDX',
      // Case 1: AN 67012345
      '67012345|A415|1|14890', // Pdx: Septicaemia Gram-neg
      '67012345|R572|2|14890', // Sdx: Septic shock as CO-MORBID (2) -> TRIGGERS CR37 DENY!
      '67012345|N390|2|14890', // Sdx: UTI
      '67012345|E119|2|14890', // Sdx: Type 2 DM
      // Case 2: AN 67012346 (ICU High-Cost Claim ฿138,500)
      '67012346|A419|1|18920', // Pdx: Sepsis
      '67012346|R572|3|18920', // Sdx: Septic shock as COMPLICATION (3) -> Correct!
      '67012346|J189|2|18920', // Sdx: Pneumonia
      '67012346|N179|3|18920', // Sdx: Acute kidney failure (Complication)
      '67012346|I10|2|18920',  // Sdx: Hypertension
      // Case 3: AN 67012347 (High-Cost ฿74,200, Sepsis but NO IV Antibiotic)
      '67012347|A419|1|15560', // Pdx: Sepsis
      '67012347|N390|2|15560', // Sdx: UTI
      '67012347|E119|2|15560', // Sdx: DM
      // Case 4: AN 67012348 (High-Cost ฿92,400, Shock as Principal Dx)
      '67012348|R572|1|16780', // Pdx: Septic shock (BANNED AS PDX under CR37!)
      '67012348|A419|2|16780', // Sdx: Sepsis
      '67012348|I10|2|16780',  // Sdx: Hypertension
      // Case 5: AN 67012349 (PASS Hypovolemic shock)
      '67012349|A090|1|17890', // Pdx: Infectious Gastroenteritis
      '67012349|R571|3|17890', // Sdx: Hypovolemic shock (Complication) -> Correct!
      '67012349|E86|2|17890',  // Sdx: Dehydration
      // Case 6: AN 67012350 (Banned SIRS code)
      '67012350|N390|1|19210', // Pdx: UTI
      '67012350|R650|2|19210', // Sdx: SIRS (R65.0 - Banned by NHSO)
    ].join('\n')
  );

  // 5. DRU.txt (Drugs)
  fileMap.set(
    'DRU.txt',
    [
      'HCODE|HN|AN|CLINIC|PERSON_ID|DATE_SERV|DID|DIDNAME|AMOUNT|DRUGPRIC|DRUGCOST|DIDSTD|UNIT',
      // AN 67012345: Antibiotics & 2x NSS, but NO Vasopressor!
      '10670|005421|67012345|01|1409900112233|20240901|1001|Ceftriaxone 1g powder for injection|6|45.00|30.00|1001|VIAL',
      '10670|005421|67012345|01|1409900112233|20240901|2001|0.9% Normal Saline Solution 1,000 ml|2|35.00|22.00|2001|BOTTLE',
      '10670|005421|67012345|01|1409900112233|20240901|3001|Omeprazole 40mg injection|5|50.00|35.00|3001|VIAL',
      // AN 67012346: Has Norepinephrine 4mg/4ml (Levophed) + Meropenem + 4x Acetar!
      '10670|008892|67012346|01|1409900223344|20240902|1005|Norepinephrine 4mg/4ml (Levophed)|6|180.00|120.00|1005|AMP',
      '10670|008892|67012346|01|1409900223344|20240902|1002|Meropenem 1g powder for injection|10|350.00|250.00|1002|VIAL',
      '10670|008892|67012346|01|1409900223344|20240902|2002|Acetar Solution 1,000 ml IV|5|40.00|25.00|2002|BOTTLE',
      // AN 67012347: Sepsis case with NO IV ANTIBIOTIC! (Only paracetamol & omeprazole)
      '10670|009105|67012347|01|1409900334455|20240903|3001|Omeprazole 40mg injection|4|50.00|35.00|3001|VIAL',
      '10670|009105|67012347|01|1409900334455|20240903|4001|Paracetamol 500mg tab|10|1.00|0.50|4001|TAB',
      '10670|009105|67012347|01|1409900334455|20240903|2001|0.9% Normal Saline Solution 1,000 ml|2|35.00|22.00|2001|BOTTLE',
      // AN 67012348: Has Norepinephrine + Ceftriaxone
      '10670|009450|67012348|01|1409900445566|20240904|1005|Norepinephrine 4mg/4ml (Levophed)|3|180.00|120.00|1005|AMP',
      '10670|009450|67012348|01|1409900445566|20240904|1001|Ceftriaxone 1g powder for injection|5|45.00|30.00|1001|VIAL',
      '10670|009450|67012348|01|1409900445566|20240904|2001|0.9% Normal Saline Solution 1,000 ml|3|35.00|22.00|2001|BOTTLE',
      // AN 67012349: 3,000 ml Acetar for hypovolemic shock
      '10670|009780|67012349|01|1409900556677|20240905|2002|Acetar Solution 1,000 ml IV|3|40.00|25.00|2002|BOTTLE',
      '10670|009780|67012349|01|1409900556677|20240905|4001|Paracetamol 500mg tab|10|1.00|0.50|4001|TAB',
      // AN 67012350: Ceftriaxone for UTI
      '10670|009920|67012350|01|1409900667788|20240906|1001|Ceftriaxone 1g powder for injection|4|45.00|30.00|1001|VIAL',
    ].join('\n')
  );

  // 6. LABFU.txt
  fileMap.set(
    'LABFU.txt',
    [
      'HCODE|HN|PERSON_ID|DATESERV|LABTEST|LABRESULT',
      '10670|005421|1409900112233|20240901|Hemoculture|Pending',
      '10670|008892|1409900223344|20240902|Hemoculture|Positive: Klebsiella pneumoniae',
      '10670|009105|1409900334455|20240903|Hemoculture|No growth after 5 days',
      '10670|009450|1409900445566|20240904|Hemoculture|Pending',
      '10670|009780|1409900556677|20240905|Electrolyte|Normal',
      '10670|009920|1409900667788|20240906|Urinalysis|WBC 50-100/HPF',
    ].join('\n')
  );

  // 7. CHT.txt (Charges)
  fileMap.set(
    'CHT.txt',
    [
      'HN|AN|DATE|TOTAL|PAID|PTYP|PERSON_ID|SEQ',
      '005421|67012345|20240906|28500.00|0.00|1|1409900112233|1',
      '008892|67012346|20240908|138500.00|0.00|1|1409900223344|1', // High-Cost Extreme ฿138,500
      '009105|67012347|20240907|74200.00|0.00|1|1409900334455|1',  // High-Cost ฿74,200 (No ATB)
      '009450|67012348|20240906|92400.00|0.00|1|1409900445566|1',  // High-Cost ฿92,400 (Shock as PDx)
      '009780|67012349|20240908|16800.00|0.00|1|1409900556677|1',  // ฿16,800 PASS
      '009920|67012350|20240909|11200.00|0.00|1|1409900667788|1',  // ฿11,200 Banned SIRS
    ].join('\n')
  );

  return parseNhso17Files(fileMap, 'eClaim_IPD_17Files_Sample.zip');
}

/**
 * Real NHSO 18-Files Case from User:
 * AN: 690017568, HN: 000637440, Patient: นายสิน เนินทราย
 * Sepsis with Noradrenaline & Ceftriaxone & Acetate Ringer 3,000 ml
 * Missing R57.2 Septic Shock Dx (CR37 Under-coding & clinical mismatch)
 */
export const SAMPLE_USER_18_FILES_RAW_TEXT = `HN|AN|DATEOPD|TYPE|CODE|QTY|RATE|SEQ|CAGCODE|DOSE|CA_TYPE|SERIALNO|TOTCOPAY|USE_STATUS|TOTAL|QTYDAY|TMLTCODE|STATUS1|BI|CLINIC|ITEMSRC|PROVIDER|GRAVIDA|GA_WEEK|DCIP/E_Screen|LMP|SP_ITEM
000637440|690017568|20260719|15|30101|2|90.00||||||0.00||180.00|0|300034||||||||||
000637440|690017568|20260719|15|30201|1|80.00||||||0.00||80.00|0|308039||||||||||
000637440|690017568|20260719|15|30202|1|85.00||||||0.00||85.00|0|308034||||||||||
000637440|690017568|20260720|15|31001|1|60.00||||||0.00||60.00|0|310015||||||||||
000637440|690017568|20260719|15|32001|3|100.00||||||0.00||300.00|0|320397||||||||||
000637440|690017568|20260719|15|32008|1|165.00||||||0.00||165.00|0|320338||||||||||
000637440|690017568|20260719|15|32106|2|50.00||||||0.00||100.00|0|320001||||||||||
000637440|690017568|20260719|15|32107|2|55.00||||||0.00||110.00|0|320016||||||||||
000637440|690017568|20260719|15|32109|2|55.00||||||0.00||110.00|0|320022||||||||||
000637440|690017568|20260719|15|32201|3|40.00||||||0.00||120.00|0|320052||||||||||
000637440|690017568|20260719|15|32202|3|45.00||||||0.00||135.00|0|320055||||||||||
000637440|690017568|20260719|15|32203|1|40.00||||||0.00||40.00|0|320064||||||||||
000637440|690017568|20260719|15|32207|1|40.00||||||0.00||40.00|0|320047||||||||||
000637440|690017568|20260719|15|32208|1|40.00||||||0.00||40.00|0|320050||||||||||
000637440|690017568|20260719|15|32309|1|40.00||||||0.00||40.00|0|320109||||||||||
000637440|690017568|20260719|15|32310|1|45.00||||||0.00||45.00|0|320150||||||||||
000637440|690017568|20260719|15|32311|1|40.00||||||0.00||40.00|0|320151||||||||||
000637440|690017568|20260719|15|32403|1|30.00||||||0.00||30.00|0|320100||||||||||
000637440|690017568|20260719|15|34301|1|60.00||||||0.00||60.00|0|320158||||||||||
000637440|690017568|20260720|15|35101|1|275.00||||||0.00||275.00|0|350001||||||||||
000637440|690017568|20260719|15|35105|2|300.00||||||0.00||600.00|0|350076||||||||||
000637440|690017568|16|41003|1|250.00||||||0.00||250.00|0|||||||||||
000637440|690017568|9|51410|1|200.00||||||0.00||200.00|0|||||||||||
HN|AN|DATEOPD|AUTHAE|AEDATE|AETIME|AETYPE|REFER_NO|REFMAINI|IREFTYPE|REFMAINO|OREFTYPE|UCAE|EMTYPE|SEQ|AESTATUS|DALERT|TALERT
HN|AN|DATE|CHRGITEM|AMOUNT|PERSON_ID|SEQ
000637440|690017568|20260721|31|1453.00|5350500004747|
000637440|690017568|20260721|41|57.00|5350500004747|
000637440|690017568|20260721|71|2655.00|5350500004747|
000637440|690017568|20260721|81|250.00|5350500004747|
000637440|690017568|20260721|91|200.00|5350500004747|
HN|AN|DATE|TOTAL|PAID|PTTYPE|PERSON_ID|SEQ|OPD_MEMO|INVOICE_NO|INVOICE_LT
000637440|690017568|20260721|4615.00|0.00|UA|5350500004747||||
HCODE|HN|AN|CLINIC|PERSON_ID|DATE_SERV|DID|DIDNAME|AMOUNT|DRUGPRIC|DRUGCOST|DIDSTD|UNIT|UNIT_PACK|SEQ|DRUGTYPE|DRUGREMARK|PA_NO|TOTCOPAY|USE_STATUS|TOTAL|SIGCODE|SIGTEXT|PROVIDER
10703|000637440|690017568|01|5350500004747|20260721|1900047|NSS inj 0.9% 100 ml|3|19.00||777636|ถุง||||||0.00|1|57.00|||
10703|000637440|690017568|01|5350500004747|20260721|1900360|cefTRIAXone inj 1 g|6|21.33||549007|Vial||||||0.00|1|129.00|||
10703|000637440|690017568|01|5350500004747|20260719|1900403|D-5-W inj 100 ml|1|19.00||557725|ถุง||||||0.00|1|19.00|||
10703|000637440|690017568|01|5350500004747|20260720|1900405|D-5-W inj 500 ml|1|47.25||557725|ถุง||||||0.00|1|47.00|||
10703|000637440|690017568|01|5350500004747|20260719|1900423|dimenhyDRINATE inj 50 mg/1ml|1|5.60||856719|Amp||||||0.00|1|6.00|||
10703|000637440|690017568|01|5350500004747|20260719|1900506|MAGNESIUM SULFATE  inj 10% 10ml|2|13.60||761220|Amp||||||0.00|1|27.00|||
10703|000637440|690017568|01|5350500004747|20260719|1900519|Metoclopramide inj 10 mg/2ml|1|5.36||569975|Amp||||||0.00|1|5.00|||
10703|000637440|690017568|01|5350500004747|20260721|1900521|metroNIDAZOLE inj 500 mg|10|22.75||570637|Vial||||||0.00|1|227.00|||
10703|000637440|690017568|01|5350500004747|20260721|1900541|NSS inj 0.9% 1000ml|8|38.50||761415|ถุง||||||0.00|1|310.00|||
10703|000637440|690017568|01|5350500004747|20260719|1900546|paracetamol tab 500 mg|10|1.00||402653|เม็ด||||||0.00|1|10.00|||
10703|000637440|690017568|01|5350500004747|20260722|1900546|paracetamol tab 500 mg|10|1.00||402653|เม็ด||||||0.00|2|10.00|||
10703|000637440|690017568|01|5350500004747|20260721|1900616|SWFI 10 ml.|6|4.68||768886|Vial (10 ml.)||||||0.00|1|27.00|||
10703|000637440|690017568|01|5350500004747|20260722|1900704|Hyoscine tab 10 mg|10|1.50||782285|เม็ด||||||0.00|2|15.00|||
10703|000637440|690017568|01|5350500004747|20260722|1900723|Omeprazole cap 20 mg|10|1.50||104539|เม็ด||||||0.00|2|15.00|||
10703|000637440|690017568|01|5350500004747|20260719|1900763|Acetate ringer inj 1000 ml|3|77.00||799860|ถุง||||||0.00|1|231.00|||
10703|000637440|690017568|01|5350500004747|20260722|1900843|Ofloxacin tab 200 mg|8|2.10||356085|เม็ด||||||0.00|2|17.00|||
10703|000637440|690017568|01|5350500004747|20260721|1900906|Omeprazole inj 40 mg|3|22.75||105322|Vial||||||0.00|1|69.00|||
10703|000637440|690017568|01|5350500004747|20260720|1901044|Noradrenaline inj 4 mg/4ml|2|137.00||572182|Amp||||||0.00|1|274.00|||
10703|000637440|690017568|01|5350500004747|20260719|1901230|PHOSPHATE SOLUTION 18 meq/5ml|10|1.50||1313798|(1ml)||||||0.00|1|15.00|||
AN|DIAG|DXTYPE|DRDX
690017568|A415|1|ว25870
690017568|A099|2|ว25870
690017568|E834|2|ว25870
690017568|E833|2|ว25870
690017568|M1099|2|ว25870
HN|INSCL|SUBTYPE|CID|HCODE|DATEEXP|HOSPMAIN|HOSPSUB|GOVCODE|GOVNAME|PERMITNO|DOCNO|OWNRPID|OWNNAME|AN|SEQ|SUBINSCL|RELINSCL|HTYPE
000637440|UCS|UC|5350500004747||19990101|10966|03879|||PP2439207931||||690017568||||
AN|OPER|OPTYPE|DROPID|DATEIN|TIMEIN|DATEOUT|TIMEOUT
HN|AN|DATEADM|TIMEADM|DATEDSC|TIMEDSC|DISCHS|DISCHT|WARDDSC|DEPT|ADM_W|UUC|SVCTYPE
000637440|690017568|20260719|1705|20260721|1400|2|1|03|01|0.000|1|I
AN|REFER|REFERTYPE
HCODE|HN|PERSON_ID|DATESERV|SEQ|LABTEST|LABRESULT
SEQLVD|AN|DATEOUT|TIMEOUT|DATEIN|TIMEIN|QTYDAY
HN|DATEDX|CLINIC|DIAG|DXTYPE|DRDX|PERSON_ID|SEQ
HN|DATEOPD|CLINIC|OPER|DROPID|PERSON_ID|SEQ|SERVPRICE
HN|CLINIC|DATEOPD|TIMEOPD|SEQ|UUC|DETAIL|BTEMP|SBP|DBP|PR|RR|OPTYPE|TYPEIN|TYPEOUT
HN|DATEOPD|CLINIC|REFER|REFERTYPE|SEQ|REFERDATE
HCODE|HN|CHANGWAT|AMPHUR|DOB|SEX|MARRIAGE|OCCUPA|NATION|PERSON_ID|NAMEPAT|TITLE|FNAME|LNAME|IDTYPE
10703|000637440|35|05|19540402|1|1|903|099|5350500004747|สิน เนินทราย,นาย|นาย|สิน|เนินทราย|1
HN|CODE|QTY|PRICE|AN|SEQ|INSCL
000637440|30101|2|180.00|690017568||UCS
000637440|30201|1|80.00|690017568||UCS
000637440|30202|1|85.00|690017568||UCS
000637440|31001|1|60.00|690017568||UCS
000637440|32001|3|300.00|690017568||UCS
000637440|32008|1|165.00|690017568||UCS
000637440|32106|2|100.00|690017568||UCS
000637440|32107|2|110.00|690017568||UCS
000637440|32109|2|110.00|690017568||UCS
000637440|32201|3|120.00|690017568||UCS
000637440|32202|3|135.00|690017568||UCS
000637440|32203|1|40.00|690017568||UCS
000637440|32207|1|40.00|690017568||UCS
000637440|32208|1|40.00|690017568||UCS
000637440|32309|1|40.00|690017568||UCS
000637440|32310|1|45.00|690017568||UCS
000637440|32311|1|40.00|690017568||UCS
000637440|32403|1|30.00|690017568||UCS
000637440|34301|1|60.00|690017568||UCS
000637440|35101|1|275.00|690017568||UCS
000637440|35105|2|600.00|690017568||UCS
000637440|41003|1|250.00|690017568||UCS
000637440|51410|1|200.00|690017568||UCS
000637440|M00002|105|1510.00|690017568||UCS`;

export function getUser18FilesSampleResult(): Nhso17ImportResult {
  const fileMap = parseConcatenated18FilesText(SAMPLE_USER_18_FILES_RAW_TEXT);
  return parseNhso17Files(fileMap, 'NHSO_18_Files_Case_690017568.txt');
}

// Aliases for 18-Files standard
export const parseNhso18Files = parseNhso17Files;
export const getSample18FilesData = getSample17FilesData;
export const parseNhso18ZipFile = parseNhsoZipFile;
