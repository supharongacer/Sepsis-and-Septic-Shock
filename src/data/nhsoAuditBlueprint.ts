/**
 * NHSO Audit 47 Conditions Blueprint Data
 * ถอดรหัส Audit 47 ข้อ: พิมพ์เขียวป้องกัน Deny Claim จาก สปสช.
 * อ้างอิงเอกสารอบรมและแนวทางตรวจสอบเวชระเบียนผู้ป่วยใน สปสช.
 */

export interface AuditPillar {
  id: 'documentation' | 'evidence' | 'treatment' | 'coding';
  color: string;
  nameTh: string;
  nameEn: string;
  description: string;
  checklistItems: string[];
}

export interface SurveillanceGroup {
  id: number;
  nameTh: string;
  nameEn: string;
  range: string;
  color: string;
  focusTh: string;
  iconName: string;
  conditionsCount: number;
  examples: string[];
}

export interface AuditTrapItem {
  id: string;
  title: string;
  subTitle: string;
  category: string;
  slideRef: number;
  clinicalPerception: string;
  mandatoryEvidence: string;
  denyRiskDescription: string;
  passCriteriaDescription: string;
  decisionTree?: {
    question: string;
    yesPath: string;
    noPath: string;
    yesVerdict: 'Approved' | 'Pass';
    noVerdict: 'Immediate Fail' | 'Deny';
  };
  icd10Rules?: string[];
  suggestedAction: string;
}

export interface AlignmentChecklistItem {
  role: 'doctor' | 'coder';
  roleTh: string;
  tasks: {
    id: string;
    text: string;
    example: string;
  }[];
}

export const AUDIT_4_PILLARS: AuditPillar[] = [
  {
    id: 'documentation',
    color: 'blue',
    nameTh: '1. บันทึกชัดเจน',
    nameEn: 'Clear Documentation',
    description: 'ทุกรหัสโรคที่ให้ ต้องมีเขียนระบุชัดเจนในบันทึกการตรวจร่างกายหรือบันทึกทางการพยาบาล',
    checklistItems: [
      'ระบุเกณฑ์ความรุนแรงของโรคชัดเจน (เช่น SOFA score, ระดับ COPD GOLD stage)',
      'บันทึกเหตุผลการสั่งยาและหัตถการ (เช่น เหตุผลการให้ IV Sodium Bicarbonate แก้ Acidosis)',
      'หากเป็นภาวะเฉียบพลันซ้อนเรื้อรัง ต้องระบุค่า Lab เริ่มต้นเทียบกับค่าปัจจุบัน',
      'บันทึกหัตถการให้ครบถ้วน โดยเฉพาะในห้องผ่าตัด (OR) หรือห้องส่องกล้อง (Endoscopy)',
    ],
  },
  {
    id: 'evidence',
    color: 'emerald',
    nameTh: '2. หลักฐานยืนยัน',
    nameEn: 'Mandatory Evidence',
    description: 'ต้องมีผลตรวจทางห้องปฏิบัติการ (Lab), ภาพถ่ายรังสี (X-ray) หรือผลชิ้นเนื้อ (Patho) สนับสนุน',
    checklistItems: [
      'ไม่ใช้เพียงสายตาประเมิน (เช่น Hypoxia ในเด็กแรกเกิด ต้องมีผล Blood Gas ยืนยัน)',
      'ภาวะทุพโภชนาการ (Malnutrition) ต้องมี BMI หรือผล Serum Albumin/Protein ยืนยัน',
      'โรคจิตจากสารเสพติด (Psychiatry) ประวัติอย่างเดียวไม่พอ ต้องมีผลตรวจ Urine Tox ยืนยัน',
      'น้ำในช่องปอด (Pleural Effusion) ต้องมีผล X-ray หรือบันทึกเจาะดูดน้ำ (Tap)',
    ],
  },
  {
    id: 'treatment',
    color: 'amber',
    nameTh: '3. การรักษาสอดคล้อง',
    nameEn: 'Treatment Concordance',
    description: 'ยาที่สั่งจ่าย หัตถการที่ทำ และระยะเวลาการนอนโรงพยาบาล ต้องสมเหตุสมผลกับระดับความรุนแรงของโรค',
    checklistItems: [
      'แค่ผล Lab ผิดปกติ ยังให้รหัสไม่ได้ (ต้องมีการรักษา เช่น ให้ยา IV แก้เกลือแร่)',
      'Sepsis / Shock ต้องมีระยะเวลานอน รพ. สมเหตุสมผล และมีบันทึกการให้สารน้ำ/ยากระตุ้นความดัน',
      'Volume Overload ต้องแยกว่าเกิดจากหัวใจหรือไต และต้องมีการสั่งยาขับปัสสาวะ (Diuretics) จริง',
      'โลหิตจาง (Anemia) ต้องมีผล Hct/Hb ลดลงจริง ร่วมกับมีการหาสาเหตุหรือให้เลือด (Blood Transfusion)',
    ],
  },
  {
    id: 'coding',
    color: 'purple',
    nameTh: '4. กฎการให้รหัส',
    nameEn: 'Coding Rules Accuracy',
    description: 'ต้องแม่นยำเรื่องการใช้รหัสตามคู่มือ ICD-10 เช่น การใช้รหัสร่วม (Combination Code)',
    checklistItems: [
      'Combination Codes: ห้ามให้ Hypertension คู่กับ Heart/Kidney Disease แยกกันเด็ดขาด (ต้องใช้ I11, I12, I13)',
      'กฎ Cerebrovascular: TIA อาการต้องหายสมบูรณ์ใน 24 ชั่วโมง',
      'ห้ามให้รหัส Stroke ในปัจจุบัน (I60-I64) ควบคู่กับ Sequelae (I69.-) ในการรักษาครั้งเดียวกัน',
      'ห้ามให้รหัสกลุ่ม Shock (R57.-) หรือ Sepsis (A40.-, A41.-) เป็นโรคร่วม (Comorbid) ต้องเป็นโรคแทรกหรือโรคหลัก',
    ],
  },
];

export const SURVEILLANCE_4_GROUPS: SurveillanceGroup[] = [
  {
    id: 1,
    nameTh: 'กลุ่ม 1: Sepsis, Electrolyte & Cardiovascular',
    nameEn: 'Sepsis, Electrolyte & Cardiovascular',
    range: 'ข้อ 1-11',
    color: 'blue',
    focusTh: 'ความสมเหตุสมผลระหว่างความรุนแรงและหลักฐานทางคลินิก',
    iconName: 'Activity',
    conditionsCount: 11,
    examples: ['Sepsis นอน รพ. สั้น', 'Sepsis ในเด็ก', 'Acidosis ขาดการรักษา', 'Metabolic ในไตวาย', 'Hyper/Hypokalemia'],
  },
  {
    id: 2,
    nameTh: 'กลุ่ม 2: Cardio, Cerebrovascular, Pulmonary & Shock',
    nameEn: 'Cardio, Cerebrovascular, Pulmonary & Shock',
    range: 'ข้อ 12-22',
    color: 'emerald',
    focusTh: 'กฎการให้รหัสมาตรฐานและหลักฐานสนับสนุนเชิงประจักษ์',
    iconName: 'HeartPulse',
    conditionsCount: 11,
    examples: ['Combination Codes (HT+Heart/Kidney)', 'Stroke vs Sequelae', 'Pleural Effusion X-ray', 'Shock ให้สารน้ำน้อย'],
  },
  {
    id: 3,
    nameTh: 'กลุ่ม 3: Hemato, Psychiatry & Malnutrition',
    nameEn: 'Hemato, Psychiatry & Malnutrition',
    range: 'ข้อ 23-34',
    color: 'amber',
    focusTh: 'การแยกโรคหลักออกจากภาวะแทรกซ้อน และการตรวจยืนยัน Mandatory Lab',
    iconName: 'Scale',
    conditionsCount: 12,
    examples: ['Hypoxia ในเด็ก (Blood gas)', 'Malnutrition (BMI/Protein)', 'จิตเวชสารเสพติด (Urine Tox)', 'Anemia ต้องมี Hct ต่ำจริง'],
  },
  {
    id: 4,
    nameTh: 'กลุ่ม 4: DM, CKD, GI/Liver & Wound/Surgery',
    nameEn: 'DM, CKD, GI/Liver & Wound/Surgery',
    range: 'ข้อ 35-47',
    color: 'purple',
    focusTh: 'ความสัมพันธ์ของโรค บันทึกหัตถการ และจุดตาย Necrotizing Fasciitis',
    iconName: 'FileCheck',
    conditionsCount: 13,
    examples: ['Necrotizing Fasciitis ต้องทำ Debridement ใน OR', 'GI Bleeding ต้องมี Endoscopy', 'Acute on Chronic (Creatinine delta)', 'Dengue Hepatitis (AST/ALT)'],
  },
];

export const AUDIT_TRAPS: AuditTrapItem[] = [
  {
    id: 'trap_necrotizing',
    title: 'จุดตายของ Audit (The Trap): กฎของ Necrotizing Fasciitis',
    subTitle: 'โรคนี้รักษาด้วยยาเพียงอย่างเดียวไม่ได้ การประเมินขึ้นอยู่กับสถานที่ทำหัตถการ',
    category: 'Wound & Surgery',
    slideRef: 12,
    clinicalPerception: 'แพทย์วินิจฉัย Necrotizing Fasciitis (M72.6) แต่คนไข้ไม่พร้อมผ่าตัด หรือทำเพียงแผลที่เตียง',
    mandatoryEvidence: 'ต้องมีบันทึกการทำผ่าตัดเลาะเนื้อตาย (Debridement) ใน "ห้องผ่าตัด (OR)" พร้อม Operative Note',
    denyRiskDescription: 'หากวินิจฉัย M72.6 แล้วมีเพียงการสั่งยาฆ่าเชื้อ (Antibiotics) หรือทำแผลทั่วไปที่เตียง สปสช. จะปรับรหัสผิดทันที (Immediate Fail / Deny Claim)',
    passCriteriaDescription: 'มีการทำ Debridement ใน OR พร้อมบันทึกพยาธิสภาพของ Fascia ที่เน่าตาย -> ผ่านเกณฑ์ (Approved)',
    decisionTree: {
      question: 'วินิจฉัย Necrotizing Fasciitis -> มีบันทึกผ่าตัดเลาะเนื้อตาย (Debridement) ใน "ห้องผ่าตัด" หรือไม่?',
      yesPath: 'มีการทำ Debridement ใน OR พร้อม Operative Note ครบถ้วน',
      noPath: 'สั่งจ่ายยาฆ่าเชื้อ (Antibiotics) หรือทำแผลทั่วไปที่เตียง',
      yesVerdict: 'Approved',
      noVerdict: 'Immediate Fail',
    },
    icd10Rules: ['M726', '8339', '8622'],
    suggestedAction: 'หากไม่ได้ผ่าตัดในห้องผ่าตัด ให้พิจารณาปรับรหัสเป็น Cellulitis (L03.-) หรือ Abscess (L02.-) แทน',
  },
  {
    id: 'trap_combination_codes',
    title: 'กฎเกณฑ์ที่ห้ามละเมิด: การใช้ Combination Codes',
    subTitle: 'Hypertension + Heart/Kidney Disease ห้ามให้รหัสแยกกันเด็ดขาด',
    category: 'Cardiovascular & Renal',
    slideRef: 7,
    clinicalPerception: 'ผู้ป่วยมีความดันโลหิตสูงและมีโรคไตเรื้อรัง (CKD) หรือภาวะหัวใจล้มเหลว (Heart failure)',
    mandatoryEvidence: 'ต้องใช้ตัวเลขรหัสเฉพาะที่เป็น Combination Code ตามคู่มือ ICD-10 สากลและ สปสช.',
    denyRiskDescription: 'หากลงรหัส I10 (Essential hypertension) คู่กับ N18.- (CKD) หรือ I50.- (Heart failure) แยกกัน จะถูก Audit ปฏิเสธหรือหักคะแนนความถูกต้องของการให้รหัส',
    passCriteriaDescription: 'ใช้ Combination Code: I11.- (Hypertensive heart disease), I12.- (Hypertensive renal disease), หรือ I13.- (Hypertensive heart and renal disease)',
    icd10Rules: ['I10', 'I119', 'I129', 'I139', 'N189'],
    suggestedAction: 'เปลี่ยนจากรหัสเดี่ยว I10 + N189 เป็นรหัสร่วม I129 หรือ I139 ตามพยาธิสภาพของผู้ป่วย',
  },
  {
    id: 'trap_stroke_sequelae',
    title: 'กฎเกณฑ์ที่ห้ามละเมิด: Stroke ปัจจุบัน vs Sequelae',
    subTitle: 'ห้ามให้รหัสหลอดเลือดสมองปัจจุบันควบคู่กับร่องรอยโรคในอดีตในการรักษาครั้งเดียวกัน',
    category: 'Cerebrovascular',
    slideRef: 7,
    clinicalPerception: 'ผู้ป่วยโรคหลอดเลือดสมองรายเก่า มีอาการแขนขาอ่อนแรงเดิม มารับการรักษาโรคหลอดเลือดสมองครั้งใหม่',
    mandatoryEvidence: 'TIA อาการต้องหายสนิทใน 24 ชม., Stroke ครั้งปัจจุบันต้องมีผล CT/MRI สมองยืนยัน',
    denyRiskDescription: 'ห้ามให้รหัส Current Stroke (I60-I64) ควบคู่กับ Sequelae (I69.-) ในการรับการรักษาครั้งเดียวกัน สปสช. ถือเป็นข้อห้ามเด็ดขาด',
    passCriteriaDescription: 'ถ้ามาด้วย Stroke ใหม่ ให้รหัสเฉพาะกลุ่ม I60-I64 ไม่พ่วง I69.- ในแอดมิชชั่นเดียวกัน',
    icd10Rules: ['I639', 'I693', 'G459'],
    suggestedAction: 'ลบรหัส Sequelae (I69.-) ออกเมื่อผู้ป่วยกำลังรับการรักษาภาวะหลอดเลือดสมองเฉียบพลันครั้งใหม่ (Current Stroke)',
  },
  {
    id: 'trap_electrolyte_lab_no_treatment',
    title: 'ความผิดปกติของเกลือแร่: แค่ผล Lab ผิดปกติ... ยังให้รหัสไม่ได้!',
    subTitle: 'ผลตรวจผิดปกติแต่ไม่มีการรักษา = ถือว่าสรุปโรคเกินจริง (Upcoding)',
    category: 'Electrolyte & Metabolic',
    slideRef: 6,
    clinicalPerception: 'เห็นผลเลือด Acidosis หรือ ค่า K, Na ใน Lab Chemistry ผิดปกติเล็กน้อย แล้วพ่วงรหัสโรคทันที',
    mandatoryEvidence: 'ต้องมีทั้งผลตรวจทางห้องปฏิบัติการผิดปกติจริง + มีคำสั่งการรักษาแก้ไขชัดเจนใน Doctor Order และ Nurse Note',
    denyRiskDescription: 'หากให้รหัส Acidosis (E87.2) หรือ Hyper/Hypokalemia โดยไม่มีการรักษา (เช่น ไม่ได้ให้ IV Bicarbonate, ไม่ได้ให้ Kalimate หรือ KCl IV) สปสช. จะถือว่าสรุปโรคเกินจริง (Upcoding) และตัดรหัสทิ้ง',
    passCriteriaDescription: 'มีผล Lab ยืนยัน + มีการรักษา เช่น สั่งยา 7.5% Sodium Bicarbonate IV หรือยาขับปัสสาวะ/แก้เกลือแร่ทางหลอดเลือดดำ',
    icd10Rules: ['E872', 'E875', 'E876', 'E871'],
    suggestedAction: 'ตรวจสอบว่ามีการสั่งยาแก้ไขเกลือแร่จริงหรือไม่ หากไม่มีให้ตัดรหัสโรคร่วมออกเพื่อป้องกันข้อหา Upcoding',
  },
  {
    id: 'trap_gi_bleeding_endoscopy',
    title: 'หัตถการคือพยานปากเอก: เลือดออกในทางเดินอาหาร (GI Bleeding / Varices)',
    subTitle: 'หลักฐานบังคับ: ต้องมีผลการส่องกล้อง (Endoscopy) ยืนยันเท่านั้น',
    category: 'GI & Liver',
    slideRef: 13,
    clinicalPerception: 'ผู้ป่วยมีประวัติถ่ายดำ (Melena) หรืออาเจียนเป็นเลือด (Hematemesis) จึงสรุปเป็น Esophageal Varices หรือ Peptic Ulcer Bleeding',
    mandatoryEvidence: 'ต้องมีรายงานผลการส่องกล้องทางเดินอาหาร (Esophagogastroduodenoscopy - EGD หรือ Colonoscopy)',
    denyRiskDescription: 'การประเมินจากอาการถ่ายดำหรืออาเจียนเป็นเลือดเพียงอย่างเดียว ไม่เพียงพอ หากไม่มีผลส่องกล้องจะถูกปฏิเสธรหัสจำเพาะ',
    passCriteriaDescription: 'มีภาพหรือผลการตรวจส่องกล้อง (Endoscopy Report) บันทึกตำแหน่งและรอยโรคเลือดออกชัดเจน',
    icd10Rules: ['I850', 'K920', 'K922', '4513'],
    suggestedAction: 'หากไม่ได้ส่องกล้อง ให้ลงรหัสตามอาการ เช่น K92.2 (Gastrointestinal haemorrhage, unspecified) แทนรหัสจำเพาะ',
  },
  {
    id: 'trap_perception_vs_reality',
    title: 'Perception vs. Audit Reality: สยบการคาดเดาด้วยผลตรวจ',
    subTitle: '3 โรคที่ห้ามใช้สายตาหรือประวัติเพียงอย่างเดียวในการสรุปโรค',
    category: 'Mandatory Lab Evidence',
    slideRef: 9,
    clinicalPerception: '1) เด็กแรกเกิดตัวเขียว หายใจลำบาก 2) ผู้ป่วยดูผอม ซูบซีด ไม่มีแรง 3) มีอาการจิตเวชและประวัติใช้สารเสพติด',
    mandatoryEvidence: '1) Hypoxia ในเด็ก ต้องมี Blood Gas ยืนยัน 2) Malnutrition ต้องมีค่า BMI ต่ำตามเกณฑ์หรือผล Serum Protein/Albumin 3) โรคจิตจากยาเสพติด ต้องมีผล Urine Tox ยืนยัน',
    denyRiskDescription: 'การใช้ความรู้สึกทางคลินิก (Clinical Perception) โดยไม่มี Mandatory Lab ยืนยัน สปสช. จะตัดรหัสโรคออกทั้งหมด',
    passCriteriaDescription: 'มีเอกสารใบรายงานผลตรวจห้องปฏิบัติการแนบในเวชระเบียนสอดคล้องกับเกณฑ์วินิจฉัย',
    icd10Rules: ['P84', 'E43', 'E440', 'F195'],
    suggestedAction: 'ตรวจสอบใบรายงานผล Blood Gas, บันทึกการคำนวณ BMI หรือผลตรวจ Urine Toxic Screen ก่อนสรุปรหัส',
  },
  {
    id: 'trap_sepsis_acs_los',
    title: 'Sepsis & ACS: อาการหนักต้องมีหลักฐานและเวลาที่สอดคล้อง',
    subTitle: 'ระยะเวลานอนโรงพยาบาล (LOS) ต้องสมเหตุสมผลกับความรุนแรงของโรค',
    category: 'Sepsis & Cardiovascular',
    slideRef: 5,
    clinicalPerception: 'ผู้ป่วยได้รับการวินิจฉัย Sepsis หรือ Acute Coronary Syndrome (ACS) แต่นอน รพ. เพียง 1-2 วันแล้วกลับบ้าน',
    mandatoryEvidence: 'Sepsis: บันทึก SIRS หรือ SOFA score ชัดเจน + ให้ IV Antibiotics ครบตามแผน, ACS: มีผล EKG ชัดเจน หรือมีผล Troponin/Cardiac Enzyme ยืนยัน',
    denyRiskDescription: 'หากนอนสั้นผิดปกติโดยไม่มีบันทึกส่งต่อ (Refer), ขอกลับบ้าน (Against Advice) หรือเสียชีวิต สปสช. จะสงสัยว่าอาการไม่ได้หนักจริงและ Deny Claim',
    passCriteriaDescription: 'ระยะเวลา Admit สอดคล้อง หรือมีบันทึกเหตุผลการจำหน่ายพิเศษ (Refer / D/C against advice / Dead)',
    icd10Rules: ['A419', 'I219', 'R572'],
    suggestedAction: 'ตรวจสอบระยะเวลานอนรักษา หากนอนสั้นต้องมีบันทึกการส่งต่อ หรือบันทึกปฏิเสธการรักษาแนบชัดเจน',
  },
  {
    id: 'trap_respiratory_shock_pleural',
    title: 'ระบบทางเดินหายใจและภาวะช็อก: การยืนยันด้วยหลักฐานเชิงประจักษ์',
    subTitle: 'Pleural Effusion, HAP, Shock ต้องมีหลักฐานที่ตรงไปตรงมา',
    category: 'Pulmonary & Shock',
    slideRef: 8,
    clinicalPerception: 'วินิจฉัย Pleural effusion จากการฟังปอด, วินิจฉัย Shock แต่ให้น้ำเกลือเพียงเล็กน้อย',
    mandatoryEvidence: 'Pleural Effusion: ต้องมีผล Chest X-ray หรือบันทึกเจาะดูดน้ำ (Tap), Shock: ต้องให้ IV Fluid กู้ชีพปริมาณมาก (Fluid load) หรือใช้ยากระตุ้นความดัน',
    denyRiskDescription: 'หากวินิจฉัย Shock แต่ให้น้ำเกลือน้อยมาก (100-200 ml) หรือนอน รพ. เพียง 1 วัน สปสช. จะถือว่าไม่สอดคล้องกับภาวะช็อกจริง',
    passCriteriaDescription: 'มีภาพรังสีทรวงอกยืนยัน และมีบันทึกการให้สารน้ำ Resuscitation สอดคล้องกับภาวะช็อก',
    icd10Rules: ['J90', 'R571', 'R572', '3491'],
    suggestedAction: 'แนบผลอ่านภาพ Chest X-ray หรือทบทวนการให้สารน้ำกู้ชีพใน Nurse Flowsheet',
  },
  {
    id: 'trap_acute_on_chronic',
    title: 'จากเรื้อรังสู่เฉียบพลัน: ต้องพิสูจน์ความเปลี่ยนแปลง',
    subTitle: 'ภาวะเฉียบพลันซ้อนทับเรื้อรัง (Acute on Chronic) ต้องมีค่า Creatinine / Enzyme ชัดเจน',
    category: 'Renal & Hepatology',
    slideRef: 11,
    clinicalPerception: 'ผู้ป่วยมีโรคไตเรื้อรัง (CKD) หรือโรคตับ/ไข้เลือดออก แล้วพ่วงรหัสเฉียบพลันโดยอัตโนมัติ',
    mandatoryEvidence: 'AKI on CKD: ต้องมีบันทึกค่า Serum Creatinine ที่เปลี่ยนแปลงเพิ่มขึ้นชัดเจนตามเกณฑ์ KDIGO (ไม่ใช่บันทึกเพียงลอยๆ), Dengue Hepatitis: ต้องมีผล Enzyme ตับ (AST/ALT) สูงขึ้นถึงเกณฑ์วินิจฉัย',
    denyRiskDescription: 'การพ่วงรหัสเฉียบพลันโดยไม่มีค่าแล็บเทียบกับค่าเดิม จะถูกตัดรหัสภาวะแทรกซ้อนเฉียบพลันออก',
    passCriteriaDescription: 'มีค่า Creatinine Baseline เทียบกับค่า Peak ชัดเจน หรือมีผล AST/ALT สูงเกิน 3-10 เท่าของค่าปกติ',
    icd10Rules: ['N179', 'N189', 'A91', 'K719'],
    suggestedAction: 'บันทึกค่า Creatinine ก่อนและหลังการรักษาลงใน Summary Sheet เพื่อยืนยันภาวะเฉียบพลัน',
  },
];

export const ALIGNMENT_CHECKLISTS: AlignmentChecklistItem[] = [
  {
    role: 'doctor',
    roleTh: 'แพทย์ (สิ่งที่ต้องบันทึกในเวชระเบียน)',
    tasks: [
      {
        id: 'doc_1',
        text: 'เขียนเกณฑ์ความรุนแรงเสมอ',
        example: 'บันทึกคะแนน SOFA score, qSOFA หรือระดับความรุนแรงของ COPD/Pneumonia ใน Progress Note',
      },
      {
        id: 'doc_2',
        text: 'บันทึกเหตุผลการสั่งยาและหัตถการ',
        example: 'ระบุใน Doctor Order เช่น "ให้ 7.5% Sodium Bicarbonate 100 ml IV drip เพื่อแก้ภาวะ Metabolic Acidosis"',
      },
      {
        id: 'doc_3',
        text: 'หากเป็นภาวะเฉียบพลัน ต้องบันทึกค่า Lab ที่เปลี่ยนแปลงชัดเจน',
        example: 'บันทึก Creatinine จากเดิม 1.2 mg/dL พุ่งขึ้นเป็น 3.4 mg/dL บ่งชี้ Acute on top chronic kidney disease',
      },
      {
        id: 'doc_4',
        text: 'บันทึกการทำหัตถการให้ครบถ้วน โดยเฉพาะใน OR หรือ Endoscopy',
        example: 'เขียน Operative Note การทำ Debridement ใน OR สำหรับเคส Necrotizing Fasciitis ให้ชัดเจน',
      },
    ],
  },
  {
    role: 'coder',
    roleTh: 'ผู้ให้รหัสโรค (สิ่งที่ต้องตรวจสอบก่อนส่งเบิก)',
    tasks: [
      {
        id: 'code_1',
        text: 'ห้ามละเมิด Combination Code เด็ดขาด',
        example: 'ตรวจเช็กกรณีผู้ป่วยเป็นทั้งความดันและโรคหัวใจ/ไต ต้องใช้ I11.-, I12.- หรือ I13.- ห้ามให้ I10 โดดๆ คู่กับโรคไต/หัวใจ',
      },
      {
        id: 'code_2',
        text: 'ตรวจสอบว่าผู้ป่วยอยู่ รพ. นานพอสำหรับรหัสโรควิกฤต',
        example: 'เคส Sepsis หรือ Shock ที่นอนเพียง 1-2 วัน ต้องตรวจสอบเอกสารการ Refer หรือ D/C against advice ก่อนส่ง',
      },
      {
        id: 'code_3',
        text: 'มองหาผล Lab (Blood gas, Urine Tox, Hct) ก่อนพ่วงรหัสภาวะแทรกซ้อน',
        example: 'ตรวจสอบผลตรวจแล็บเชิงประจักษ์ตาม Mandatory Evidence ก่อนคีย์รหัสโรคร่วม/โรคแทรก',
      },
      {
        id: 'code_4',
        text: 'ระวังห้ามใช้รหัส Stroke ปัจจุบันคู่กับร่องรอยโรคในอดีต (Sequelae)',
        example: 'หากผู้ป่วยมาด้วย Stroke ครั้งใหม่ ห้ามใส่รหัสกลุ่ม I69.- ร่วมด้วยในการรักษาครั้งเดียวกัน',
      },
    ],
  },
];

export const GOLDEN_RULE = {
  title: 'บทสรุป (The Golden Rule of Audit)',
  quote1: 'หากไม่มีการบันทึก... เท่ากับสิ่งนั้นไม่เคยเกิดขึ้น',
  quote2: 'หากไม่มีหลักฐานการรักษาที่สอดคล้อง... เท่ากับโรคนั้นไม่ได้รุนแรงจริง',
  conclusion: 'เวชระเบียนที่สมบูรณ์ คือเกราะป้องกันที่ดีที่สุด การสื่อสารระหว่างทีมแพทย์ พยาบาล และเจ้าหน้าที่ให้รหัสโรค คือกุญแจสำคัญในการรักษารายได้และทรัพยากรของโรงพยาบาลให้ยั่งยืน',
};
