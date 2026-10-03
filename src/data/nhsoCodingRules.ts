import { DiagnosisEntry, MedicationItem, ClinicalProfile, ProcedureEntry, IcdRecommendation } from '../types';

export interface NhsoIcd9Info {
  code: string;
  nameTh: string;
  nameEn: string;
  category: 'airway_vent' | 'vascular_cvp' | 'dialysis' | 'transfusion' | 'surgery_wound' | 'drainage_puncture' | 'resuscitation';
  categoryTh: string;
  procType: 'principal' | 'secondary' | 'either';
  auditRisk: 'HIGH' | 'MEDIUM' | 'NORMAL';
  nhsoCondition: string;
  calculationRules?: string[];
  requiredDocumentation: string[];
  pitfalls: string[];
  drgImpact: string;
}

export interface NhsoIcd10RuleInfo {
  code: string;
  nameTh: string;
  nameEn: string;
  category: 'sepsis' | 'shock' | 'respiratory' | 'renal' | 'electrolyte' | 'infection' | 'banned';
  categoryTh: string;
  allowedRoles: ('PDx' | 'Comorbid' | 'Complication')[];
  defaultRole: 'PDx' | 'Comorbid' | 'Complication';
  nhsoCondition: string;
  auditKeyPoints: string[];
  requiredDocumentation: string[];
  bannedCombinations?: string[];
  drgImpact: string;
}

/**
 * NHSO ICD-9-CM Database & Documentation Rules
 */
export const NHSO_ICD9_DATABASE: Record<string, NhsoIcd9Info> = {
  '9671': {
    code: '96.71',
    nameTh: 'การใช้เครื่องช่วยหายใจต่อเนื่อง น้อยกว่า 96 ชั่วโมงติดต่อกัน',
    nameEn: 'Continuous mechanical ventilation for less than 96 consecutive hours',
    category: 'airway_vent',
    categoryTh: 'เครื่องช่วยหายใจและทางเดินหายใจ',
    procType: 'secondary',
    auditRisk: 'MEDIUM',
    nhsoCondition: 'ผู้ป่วยที่มีภาวะการหายใจล้มเหลว และได้รับการต่อเข้าเครื่องช่วยหายใจชนิด Invasive Positive Pressure ผ่านทางท่อช่วยหายใจ (ETT) หรือท่อเจาะคอ (Tracheostomy) โดยมีระยะเวลาใช้งานต่อเนื่อง < 96 ชั่วโมง',
    calculationRules: [
      'เริ่มนับเวลา (Start time): เมื่อเริ่มต่อผู้ป่วยเข้าเครื่องช่วยหายใจ ไม่ใช่นับตั้งแต่เวลาเริ่มใส่ท่อช่วยหายใจ',
      'สิ้นสุดเวลา (Stop time): เมื่อผู้ป่วยสามารถหย่าเครื่องช่วยหายใจ (Wean) สำเร็จ หรือถอดท่อช่วยหายใจ (Extubate)',
      'ช่วงทำ T-piece trial เกิน 24 ชั่วโมงโดยไม่ได้ต่อเครื่องช่วยหายใจ ไม่สามารถนำมานับรวมในชั่วโมงเครื่องช่วยหายใจได้',
    ],
    requiredDocumentation: [
      'ใบสั่งการรักษาของแพทย์ (Doctor Order) ระบุข้อบ่งชี้และ Mode เครื่องช่วยหายใจ',
      'ใบบันทึกการดูแลระบบทางเดินหายใจ (Ventilator Flowsheet / Respiratory sheet) ระบุวันเวลาเริ่ม-หยุดชัดเจน',
      'บันทึกทางการพยาบาล (Nurse Notes) ทุกเวรที่เฝ้าระวังผู้ป่วยใส่เครื่องช่วยหายใจ',
    ],
    pitfalls: [
      'นับเวลาช่วงพักหายใจเอง (Off vent) มารวมจนทำให้ชั่วโมงคลาดเคลื่อน',
      'ขาดใบบันทึกการปรับตั้งค่าเครื่องช่วยหายใจ (Ventilator sheet) ยืนยัน',
    ],
    drgImpact: 'เพิ่มค่าน้ำหนักสัมพัทธ์ (RW) อย่างมีนัยสำคัญในกลุ่มโรคระบบทางเดินหายใจและ Sepsis',
  },
  '9672': {
    code: '96.72',
    nameTh: 'การใช้เครื่องช่วยหายใจต่อเนื่อง ตั้งแต่ 96 ชั่วโมงขึ้นไปติดต่อกัน',
    nameEn: 'Continuous mechanical ventilation for 96 consecutive hours or more',
    category: 'airway_vent',
    categoryTh: 'เครื่องช่วยหายใจและทางเดินหายใจ',
    procType: 'secondary',
    auditRisk: 'HIGH',
    nhsoCondition: 'ผู้ป่วยใส่เครื่องช่วยหายใจต่อเนื่องติดต่อกันไม่น้อยกว่า 96 ชั่วโมง (4 วันเต็ม) โดยไม่มีการหยุดพักนานเกินเกณฑ์ที่กำหนด สปสช. มีการสุ่มตรวจ 100% สำหรับเคสที่ลง 96.72 เนื่องจากค่าน้ำหนัก DRG สูงมาก',
    calculationRules: [
      'ต้องมีระยะเวลาติดต่อกันครบ 96 ชั่วโมงเต็ม (นับแบบ Continuous consecutive hours)',
      'หากมีการถอดพักเกิน 2-4 ชั่วโมง แล้วต้องใส่ใหม่ จะต้องเริ่มนับรอบเวลาใหม่ (ห้ามรวมสะสมช่วงที่เว้นระยะ)',
      'ต้องตรวจนับเวลาจาก Ventilator sheet เทียบกับ Doctor Order และ Nurse Note ให้ตรงกัน',
    ],
    requiredDocumentation: [
      'ใบบันทึก Ventilator Flowsheet ครบทุกเวร ตลอดระยะเวลา ≥ 96 ชั่วโมง',
      'บันทึกแพทย์ระบุการประเมิน Weaning criteria และเหตุผลที่ยังถอดเครื่องไม่ได้',
      'ผลตรวจ Arterial Blood Gas (ABG) หรือ Oxygen saturation ติดตามอาการ',
    ],
    pitfalls: [
      'ถูกสุ่มตรวจและปรับลดรหัสเป็น 96.71 หากพบว่ามีช่วงถอดเครื่องหรือเวลาบันทึกไม่ครบ 96 ชั่วโมงจริง',
      'ใบ Ventilator sheet ขาดหายหรือไม่ลงลายมือชื่อผู้ดูแล',
    ],
    drgImpact: 'เพิ่มค่าน้ำหนักสัมพัทธ์ (RW) สูงมาก เป็นตัวขับเคลื่อนหลักของ DRG ในผู้ป่วยวิกฤต',
  },
  '9604': {
    code: '96.04',
    nameTh: 'การใส่ท่อช่วยหายใจ (Endotracheal Intubation)',
    nameEn: 'Insertion of endotracheal tube',
    category: 'airway_vent',
    categoryTh: 'เครื่องช่วยหายใจและทางเดินหายใจ',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การทำหัตถการใส่ท่อช่วยหายใจทางปากหรือจมูก เพื่อช่วยชีวิตหรือต่อเครื่องช่วยหายใจ',
    calculationRules: [
      'ให้รหัสคู่กับ 96.71 หรือ 96.72 เสมอเมื่อมีการใส่ท่อและต่อเครื่องช่วยหายใจ',
      'หากเป็นการใส่เพื่อดมยาสลบผ่าตัดตามปกติ (Routine GA) ไม่ต้องให้รหัส 96.04 แยกต่างหาก',
    ],
    requiredDocumentation: [
      'ใบบันทึกการใส่ท่อช่วยหายใจ (Intubation Record) ระบุเบอร์ท่อ ความลึก และผู้ทำหัตถการ',
      'ภาพถ่ายรังสีทรวงอก (Chest X-ray) ตรวจสอบตำแหน่งปลายท่อช่วยหายใจ (Tip of ETT)',
    ],
    pitfalls: [
      'ให้รหัส 96.04 ซ้ำซ้อนในเคสผ่าตัดทั่วไปที่ดมยาสลบธรรมดา',
    ],
    drgImpact: 'สะท้อนความรุนแรงของการทำหัตถการฉุกเฉิน',
  },
  '311': {
    code: '31.1',
    nameTh: 'การเจาะคอชั่วคราว (Temporary tracheostomy)',
    nameEn: 'Temporary tracheostomy',
    category: 'airway_vent',
    categoryTh: 'เครื่องช่วยหายใจและทางเดินหายใจ',
    procType: 'principal',
    auditRisk: 'MEDIUM',
    nhsoCondition: 'การผ่าตัดเจาะคอเพื่อใส่ท่อช่วยหายใจในผู้ป่วยที่ต้องใช้เครื่องช่วยหายใจยาวนาน (Prolonged mechanical ventilation) หรือทางเดินหายใจอุดกั้น',
    requiredDocumentation: [
      'ใบบันทึกการผ่าตัด (Operative Note) ระบุเทคนิค ขนาด Cannula และภาวะแทรกซ้อน',
      'ใบยินยอมรับการผ่าตัด (Informed Consent)',
    ],
    pitfalls: ['ไม่มี Operative note หรือไม่มีบันทึกการดูแลแผลเจาะคอ'],
    drgImpact: 'ค่าน้ำหนัก DRG ผ่าตัด (Surgical DRG)',
  },
  '8962': {
    code: '89.62',
    nameTh: 'การตรวจวัดความดันหลอดเลือดดำส่วนกลาง (Central venous pressure monitoring / CVP Line)',
    nameEn: 'Central venous pressure monitoring',
    category: 'vascular_cvp',
    categoryTh: 'สายสวนหลอดเลือดและการเฝ้าระวัง',
    procType: 'secondary',
    auditRisk: 'MEDIUM',
    nhsoCondition: 'การใส่สายสวนหลอดเลือดดำส่วนกลาง (Subclavian, Internal Jugular หรือ Femoral vein) เพื่อวัด CVP หรือบริหารยาที่มีฤทธิ์หดหลอดเลือดรุนแรง (Inotropes/Vasopressors)',
    requiredDocumentation: [
      'หัตถการโน้ตการใส่สาย C-line ระบุตำแหน่ง เทคนิคปลอดเชื้อ และความยาวสาย',
      'ใบบันทึกผลความดัน CVP อย่างน้อยวันละ 1-2 ครั้ง',
      'ผล Chest X-ray ยืนยันตำแหน่งปลายสาย (ยกเว้นตำแหน่ง Femoral)',
    ],
    pitfalls: ['ใส่สายเพื่อฉีดยาแต่ไม่มีการบันทึกค่า CVP monitoring ตามชื่อรหัส'],
    drgImpact: 'เพิ่มค่า Resource intensity ในเคสวิกฤต',
  },
  '8961': {
    code: '89.61',
    nameTh: 'การใส่สายสวนหลอดเลือดแดงเพื่อวัดความดันต่อเนื่อง (Systemic arterial catheterization / A-Line)',
    nameEn: 'Systemic arterial catheterization',
    category: 'vascular_cvp',
    categoryTh: 'สายสวนหลอดเลือดและการเฝ้าระวัง',
    procType: 'secondary',
    auditRisk: 'MEDIUM',
    nhsoCondition: 'การใส่สายสวนหลอดเลือดแดง (ส่วนใหญ่ตำแหน่ง Radial หรือ Femoral artery) เพื่อวัดความดันโลหิตแบบต่อเนื่อง (Invasive blood pressure monitoring) ใน Septic Shock หรือเจาะ ABG บ่อย',
    requiredDocumentation: [
      'บันทึกหัตถการการใส่ A-line และการทดสอบ Allen test',
      'ใบบันทึกกราฟความดันโลหิตต่อเนื่อง (Arterial line pressure monitoring sheet)',
    ],
    pitfalls: ['มีเฉพาะการเจาะเลือดตรวจ ABG รายครั้ง (ห้ามให้รหัสนี้สำหรับการเจาะเลือดธรรมดา)'],
    drgImpact: 'สะท้อนระดับการดูแลในหอผู้ป่วยหนัก (ICU)',
  },
  '3893': {
    code: '38.93',
    nameTh: 'การใส่สายสวนหลอดเลือดดำส่วนกลางชนิดอื่นๆ (Venous catheterization, not elsewhere classified / PICC)',
    nameEn: 'Venous catheterization, not elsewhere classified',
    category: 'vascular_cvp',
    categoryTh: 'สายสวนหลอดเลือดและการเฝ้าระวัง',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การใส่สายสวนหลอดเลือดดำ เช่น PICC line (Peripherally inserted central catheter) หรือการผ่าตัดเปิดหาเส้นเลือด (Venous cutdown)',
    requiredDocumentation: [
      'บันทึกการใส่สาย PICC หรือ Cutdown ระบุตำแหน่งและชนิดสาย',
      'ภาพถ่ายรังสีคอนเฟิร์มตำแหน่งปลายสาย',
    ],
    pitfalls: ['ให้รหัสนี้กับการเปิดเส้น IV Catheter ธรรมดาที่หลังมือ (ห้ามเด็ดขาด)'],
    drgImpact: 'รองรับการให้ยาปฏิชีวนะหรือ TPN ระยะยาว',
  },
  '3895': {
    code: '38.95',
    nameTh: 'การใส่สายสวนหลอดเลือดดำเพื่อการฟอกเลือดล้างไต (Venous catheterization for renal dialysis)',
    nameEn: 'Venous catheterization for renal dialysis',
    category: 'dialysis',
    categoryTh: 'การล้างไตและบำบัดทดแทนไต',
    procType: 'secondary',
    auditRisk: 'MEDIUM',
    nhsoCondition: 'การใส่สายสวนสองช่อง (Double lumen catheter) ที่หลอดเลือดดำส่วนกลาง (IJV หรือ Femoral vein) เพื่อใช้ฟอกเลือดล้างไตฉุกเฉิน',
    requiredDocumentation: [
      'บันทึกการทำหัตถการใส่สาย Double lumen',
      'ข้อบ่งชี้ฉุกเฉินในการฟอกไต (Emergency Hemodialysis)',
    ],
    pitfalls: ['ขาดบันทึกหัตถการหรือไม่มีการนำสายไปใช้ฟอกไตจริง'],
    drgImpact: 'หัตถการร่วมกับการฟอกไต',
  },
  '3995': {
    code: '39.95',
    nameTh: 'การฟอกเลือดด้วยเครื่องไตเทียม (Hemodialysis)',
    nameEn: 'Hemodialysis',
    category: 'dialysis',
    categoryTh: 'การล้างไตและบำบัดทดแทนไต',
    procType: 'secondary',
    auditRisk: 'HIGH',
    nhsoCondition: 'การฟอกเลือดล้างไตด้วยเครื่องไตเทียมในผู้ป่วยใน โดยมีข้อบ่งชี้ฉุกเฉินทางการแพทย์ (AEIOU Criteria: Acidosis pH<7.15, Electrolyte K>6.5, Ingestion, Overload ปอดบวมน้ำ, Uremic pericarditis/encephalopathy)',
    requiredDocumentation: [
      'ใบประเมินและสั่งการฟอกไตของอายุรแพทย์โรคไต (Nephrologist Order)',
      'ใบบันทึกการฟอกเลือด (Hemodialysis Flowsheet) ระบุเวลาเริ่ม-สิ้นสุด อัตราไหลของเลือด ปริมาณดึงน้ำ (UF) และสารกันเลือดแข็งตัว',
      'ผลตรวจเลือดก่อนและหลังฟอกไต (Pre- and Post-HD Lab: BUN, Cr, K, Bicarbonate)',
    ],
    pitfalls: [
      'เป็นเคสฟอกไตประจำ (Maintenance HD) แต่มานอนด้วยโรคอื่นแล้วขอเบิกเป็นฉุกเฉินซ้ำซ้อน',
      'ไม่มีผลเลือดพิสูจน์ภาวะฉุกเฉิน (AEIOU criteria)',
    ],
    drgImpact: 'เพิ่มค่าน้ำหนัก DRG อย่างมีนัยสำคัญ',
  },
  '5498': {
    code: '54.98',
    nameTh: 'การล้างไตทางช่องท้อง (Peritoneal dialysis)',
    nameEn: 'Peritoneal dialysis',
    category: 'dialysis',
    categoryTh: 'การล้างไตและบำบัดทดแทนไต',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การล้างไตผ่านทางช่องท้องในผู้ป่วยไตวาย',
    requiredDocumentation: ['ใบบันทึกรอบการเปลี่ยนน้ำยาล้างไตและปริมาณเข้า-ออก (CAPD Flowsheet)'],
    pitfalls: ['ไม่มีบันทึกรอบน้ำยาเข้า-ออกจริง'],
    drgImpact: 'หัตถการทดแทนไต',
  },
  '9904': {
    code: '99.04',
    nameTh: 'การให้เลือดชนิด Packed Red Blood Cells (PRC)',
    nameEn: 'Transfusion of packed cells',
    category: 'transfusion',
    categoryTh: 'การให้เลือดและส่วนประกอบของเลือด',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การให้เม็ดเลือดแดงเข้มข้นในผู้ป่วยที่มีภาวะซีดรุนแรง หรือเสียเลือดเฉียบพลัน',
    requiredDocumentation: [
      'ผลตรวจความเข้มข้นเลือดก่อนให้ (Pre-transfusion Hb/Hct ส่วนใหญ่ < 7-8 g/dL)',
      'ใบบันทึกการให้เลือดและเฝ้าระวังอาการแพ้เลือด (Blood Transfusion Record)',
    ],
    pitfalls: ['ไม่มีบันทึกเฝ้าระวัง Vital signs ระหว่างให้เลือด'],
    drgImpact: 'สะท้อนต้นทุนการรักษา',
  },
  '9905': {
    code: '99.05',
    nameTh: 'การให้เกล็ดเลือด (Platelet transfusion)',
    nameEn: 'Transfusion of other platelets',
    category: 'transfusion',
    categoryTh: 'การให้เลือดและส่วนประกอบของเลือด',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การให้เกล็ดเลือดในผู้ป่วยเกล็ดเลือดต่ำรุนแรง (Thrombocytopenia) ที่มีเลือดออกหรือต้องทำหัตถการ',
    requiredDocumentation: ['ผลตรวจ Platelet count ก่อนให้ และบันทึกการให้เลือด'],
    pitfalls: ['ไม่มีผลแล็บ Platelet count ก่อนให้'],
    drgImpact: 'สะท้อนความรุนแรงของ Coagulopathy ใน Sepsis',
  },
  '9907': {
    code: '99.07',
    nameTh: 'การให้พลาสมาสดแช่แข็ง (Fresh Frozen Plasma - FFP)',
    nameEn: 'Transfusion of other serum',
    category: 'transfusion',
    categoryTh: 'การให้เลือดและส่วนประกอบของเลือด',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การให้พลาสมาเพื่อแก้ไขภาวะการแข็งตัวของเลือดผิดปกติ (Coagulopathy / DIC)',
    requiredDocumentation: ['ผลตรวจ Coagulogram (PT, INR, PTT) ก่อนให้เลือด'],
    pitfalls: ['ให้ FFP เพื่อหวังผลเพิ่ม Volume แทน IV fluid ทั่วไป (ผิดข้อบ่งชี้)'],
    drgImpact: 'สะท้อนภาวะแทรกซ้อนระบบการแข็งตัวของเลือด',
  },
  '9960': {
    code: '99.60',
    nameTh: 'การกู้ชีพขั้นสูง / การปั๊มหัวใจ (Cardiopulmonary resuscitation - CPR)',
    nameEn: 'Cardiopulmonary resuscitation, not otherwise specified',
    category: 'resuscitation',
    categoryTh: 'การช่วยชีวิตฉุกเฉิน',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การกดหน้าอกและช่วยชีวิตขั้นสูงในผู้ป่วยหัวใจหยุดเต้น (Cardiac arrest)',
    requiredDocumentation: [
      'ใบบันทึกการช่วยฟื้นคืนชีพ (CPR Record) ระบุเวลาเริ่ม-หยุด ยากระตุ้นหัวใจที่ใช้ และผลการกู้ชีพ',
    ],
    pitfalls: ['ไม่มี CPR record sheet แนบในเวชระเบียน'],
    drgImpact: 'สะท้อนเหตุการณ์วิกฤต',
  },
  '8622': {
    code: '86.22',
    nameTh: 'การผ่าตัดตัดลอกเนื้อตายด้วยของมีคม (Excisional debridement of wound, infection, or burn)',
    nameEn: 'Excisional debridement of wound, infection, or burn',
    category: 'surgery_wound',
    categoryTh: 'การผ่าตัดล้างแผลและควบคุมการติดเชื้อ',
    procType: 'principal',
    auditRisk: 'HIGH',
    nhsoCondition: '⚠️ จุดตรวจเข้มข้นสูงสุดของ สปสช.: การตัดเนื้อตายออกด้วยของมีคม (Scalpel, Scissors) ถึงชั้นเนื้อเยื่อมีชีวิต (Viable bleeding tissue, Fascia, หรือ Muscle) เพื่อควบคุมแหล่งติดเชื้อในผู้ป่วย Necrotizing fasciitis, Diabetic foot ulcer, หรือ Severe wound infection',
    requiredDocumentation: [
      'ใบบันทึกการผ่าตัด (Operative Note) ต้องระบุคำสำคัญ: ใช้ของมีคมตัด (Excision with scalpel/scissors), ความลึกที่ตัดถึง (Fascia, Muscle, Subcutaneous), และลักษณะเนื้อตายที่ตัดออก',
      'ห้ามใช้คำว่า: Scrubbing, Washing, Irrigation, Mechanical cleansing หรือ Wet-to-dry dressing โดดๆ',
    ],
    pitfalls: [
      'สปสช. Audit ปรับลดรหัสเป็น 86.28 (Nonexcisional) ทันทีหากใน Operative note ไม่มีคำว่าตัดด้วยของมีคม หรือตัดไม่ถึงเนื้อเยื่อมีชีวิต ส่งผลให้ถูกเรียกเงินคืนจำนวนมาก!',
    ],
    drgImpact: 'จัดเป็นกลุ่ม Surgical DRG ค่าน้ำหนัก RW สูงมาก',
  },
  '8628': {
    code: '86.28',
    nameTh: 'การทำความสะอาดแผล/ล้างแผลโดยไม่ตัดเนื้อเยื่อ (Nonexcisional debridement of wound)',
    nameEn: 'Nonexcisional debridement of wound, infection or burn',
    category: 'surgery_wound',
    categoryTh: 'การผ่าตัดล้างแผลและควบคุมการติดเชื้อ',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การล้างทำความสะอาดแผลทั่วไป ขัดถู หรือทำแผลแบบ Wet-to-dry dressing โดยไม่มีการตัดเฉือนเนื้อเยื่อด้วยของมีคม',
    requiredDocumentation: ['บันทึกการทำแผลและสารละลายที่ใช้ล้างแผล (NSS, Antiseptic)'],
    pitfalls: ['มักใช้แทน 86.22 ในกรณีที่ไม่มีหลักฐานการตัดเฉือนเนื้อเยื่อ'],
    drgImpact: 'ค่าน้ำหนัก DRG ต่ำกว่า 86.22 อย่างมาก',
  },
  '8604': {
    code: '86.04',
    nameTh: 'การกรีดระบายหนองชั้นใต้ผิวหนัง (Incision with extensive drainage of subcutaneous tissue / I&D)',
    nameEn: 'Other incision with drainage of skin and subcutaneous tissue',
    category: 'surgery_wound',
    categoryTh: 'การผ่าตัดล้างแผลและควบคุมการติดเชื้อ',
    procType: 'principal',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การกรีดเปิดและระบายหนองจากฝีหรือการติดเชื้อชั้นใต้ผิวหนัง (Incision and Drainage of Abscess)',
    requiredDocumentation: ['Operative Note ระบุตำแหน่งฝี ปริมาณหนอง และการใส่ Drain/Gauze drain'],
    pitfalls: ['ไม่มีบันทึก Operative note'],
    drgImpact: 'หัตถการผ่าตัดเล็ก',
  },
  '3404': {
    code: '34.04',
    nameTh: 'การใส่สายระบายทรวงอก (Insertion of intercostal catheter for drainage / ICD)',
    nameEn: 'Insertion of intercostal catheter for drainage',
    category: 'drainage_puncture',
    categoryTh: 'การเจาะดูดและการระบายสารน้ำ',
    procType: 'secondary',
    auditRisk: 'MEDIUM',
    nhsoCondition: 'การใส่สายระบายทรวงอกในผู้ป่วยภาวะลมหรือหนองในช่องเยื่อหุ้มปอด (Empyema thoracis / Pneumothorax / Hemothorax)',
    requiredDocumentation: [
      'หัตถการโน้ตระบุตำแหน่ง Intercostal space ขนาดสาย และการต่อขวดระบาย (Underwater seal)',
      'ภาพ Chest X-ray ก่อนและหลังใส่สาย',
    ],
    pitfalls: ['ไม่มีภาพเอกซเรย์ยืนยันตำแหน่ง'],
    drgImpact: 'สะท้อนความรุนแรงของโรคปอด',
  },
  '3491': {
    code: '34.91',
    nameTh: 'การเจาะดูดน้ำในช่องเยื่อหุ้มปอด (Thoracentesis)',
    nameEn: 'Thoracentesis',
    category: 'drainage_puncture',
    categoryTh: 'การเจาะดูดและการระบายสารน้ำ',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การเจาะดูดน้ำในช่องเยื่อหุ้มปอดเพื่อการวินิจฉัยหรือรักษาอาการเหนื่อย',
    requiredDocumentation: ['บันทึกปริมาณน้ำที่ดูดได้ และผลตรวจ Pleural fluid analysis'],
    pitfalls: ['ไม่มีผลตรวจแล็บน้ำในช่องปอด'],
    drgImpact: 'หัตถการวินิจฉัย/รักษา',
  },
  '5491': {
    code: '54.91',
    nameTh: 'การเจาะดูดน้ำในช่องท้อง (Percutaneous abdominal paracentesis)',
    nameEn: 'Percutaneous abdominal paracentesis',
    category: 'drainage_puncture',
    categoryTh: 'การเจาะดูดและการระบายสารน้ำ',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การเจาะดูดน้ำในช่องท้องในผู้ป่วยตับแข็งหรือท้องมาน เพื่อตรวจวินิจฉัย Spontaneous Bacterial Peritonitis (SBP) หรือบรรเทาอาการแน่นท้อง',
    requiredDocumentation: ['บันทึกปริมาณ Ascitic fluid และผลตรวจ Ascitic fluid cell count/culture'],
    pitfalls: ['ไม่มีผลตรวจ Ascitic fluid analysis'],
    drgImpact: 'หัตถการวินิจฉัย/รักษา',
  },
  '0331': {
    code: '03.31',
    nameTh: 'การเจาะน้ำไขสันหลัง (Spinal tap / Lumbar puncture)',
    nameEn: 'Spinal tap',
    category: 'drainage_puncture',
    categoryTh: 'การเจาะดูดและการระบายสารน้ำ',
    procType: 'secondary',
    auditRisk: 'NORMAL',
    nhsoCondition: 'การเจาะน้ำไขสันหลังเพื่อตรวจหาภาวะเยื่อหุ้มสมองอักเสบ (Meningitis/Encephalitis)',
    requiredDocumentation: ['หัตถการโน้ต LP ระบุระดับ L3-L4/L4-L5 และผลตรวจ CSF analysis'],
    pitfalls: ['ไม่มีผลตรวจ CSF'],
    drgImpact: 'หัตถการวินิจฉัย',
  },
};

/**
 * NHSO ICD-10 Rule Database & Audit Key Points
 */
export const NHSO_ICD10_RULES: Record<string, NhsoIcd10RuleInfo> = {
  'A419': {
    code: 'A41.9',
    nameTh: 'ภาวะพิษเหตุติดเชื้อ ไม่ระบุเชื้อก่อโรค (Sepsis, unspecified)',
    nameEn: 'Sepsis, unspecified organism',
    category: 'sepsis',
    categoryTh: 'กลุ่มโรค Sepsis',
    allowedRoles: ['PDx', 'Comorbid', 'Complication'],
    defaultRole: 'PDx',
    nhsoCondition: 'ต้องมีหลักฐานการติดเชื้อ (Infection source) ร่วมกับเกณฑ์ SIRS อย่างน้อย 2 ข้อ หรือ qSOFA ≥ 2 หรือ SOFA score เพิ่มขึ้น ≥ 2 แต้ม และได้รับการรักษาด้วยยาปฏิชีวนะทางหลอดเลือดดำ (IV Antibiotics) โดยมีระยะเวลานอนรักษา (LOS) เหมาะสม',
    auditKeyPoints: [
      'ตรวจดูระยะเวลานอนรักษา (LOS) ต้องสอดคล้องกับความรุนแรง (ไม่ใช่นอน 1 วันแล้วกลับบ้านโดยไม่มีเหตุผล)',
      'ต้องมีหลักฐานการสั่งและบริหาร IV Antibiotics ต่อเนื่อง',
      'ควรส่งเพาะเชื้อในเลือด (Hemoculture) ก่อนเริ่มยาปฏิชีวนะ',
    ],
    requiredDocumentation: [
      'บันทึกแรกรับ (Admission Note) ระบุอาการไข้ หนาวสั่น หายใจเร็ว ความดันโลหิต',
      'ใบสั่งยา (Kardex / Medication Sheet) แสดงการให้ IV Antibiotics',
      'ผลตรวจ Hemoculture และ CBC',
    ],
    drgImpact: 'รหัสโรคหลักมูลค่าสูง และเป็นเกณฑ์หลักในการคิด DRG ในกลุ่ม Sepsis',
  },
  'A415': {
    code: 'A41.5',
    nameTh: 'การติดเชื้อแบคทีเรียแกรมลบในกระแสเลือด (Septicaemia due to other Gram-negative organisms)',
    nameEn: 'Septicaemia due to other Gram-negative organisms',
    category: 'sepsis',
    categoryTh: 'กลุ่มโรค Sepsis',
    allowedRoles: ['PDx', 'Comorbid', 'Complication'],
    defaultRole: 'PDx',
    nhsoCondition: 'ใช้ในกรณีที่สงสัยหรือตรวจพบการติดเชื้อแกรมลบในกระแสเลือด เช่น มีต้นตอจากระบบทางเดินปัสสาวะ หรือทางเดินอาหาร/ช่องท้อง',
    auditKeyPoints: [
      'มักใช้คู่กับแหล่งติดเชื้อ เช่น กรวยไตอักเสบ (N10) หรือถุงน้ำดีอักเสบ (K81.0)',
      'ยาปฏิชีวนะต้องครอบคลุมเชื้อแกรมลบ (เช่น Ceftriaxone, Meropenem, Ciprofloxacin)',
    ],
    requiredDocumentation: ['บันทึกแพทย์ระบุสงสัย Gram-negative sepsis และผล Gram stain/Culture'],
    drgImpact: 'ค่าน้ำหนัก DRG กลุ่ม Sepsis แกรมลบ',
  },
  'A4151': {
    code: 'A41.51',
    nameTh: 'ภาวะติดเชื้อในกระแสเลือดจากเชื้ออีโคไล (Sepsis due to Escherichia coli)',
    nameEn: 'Sepsis due to Escherichia coli',
    category: 'sepsis',
    categoryTh: 'กลุ่มโรค Sepsis',
    allowedRoles: ['PDx', 'Comorbid', 'Complication'],
    defaultRole: 'PDx',
    nhsoCondition: 'ใช้เมื่อผลเพาะเชื้อในเลือด (Hemoculture) ขึ้นเชื้อ E. coli ชัดเจน',
    auditKeyPoints: [
      'ต้องมีใบรายงานผลแล็บ Hemoculture ขึ้นเชื้อ E. coli ชัดเจน',
      'หากผลเพาะเชื้อไม่ขึ้น หรือไม่ทราบเชื้อ ห้ามใช้รหัสนี้ ให้ใช้ A41.9 หรือ A41.5',
    ],
    requiredDocumentation: ['ใบรายงานผล Hemoculture & Sensitivity'],
    drgImpact: 'ค่าน้ำหนัก Sepsis ระบุเชื้อเฉพาะ',
  },
  'R572': {
    code: 'R57.2',
    nameTh: 'ภาวะช็อกเหตุพิษติดเชื้อ (Septic shock)',
    nameEn: 'Septic shock',
    category: 'shock',
    categoryTh: 'ภาวะช็อกและหลอดเลือดล้มเหลว',
    allowedRoles: ['Complication'],
    defaultRole: 'Complication',
    nhsoCondition: '🚨 กฎเหล็ก สปสช. (CR1 & CR37): ห้ามใช้เป็นโรคหลัก (PDx) โดยเด็ดขาด! และต้องให้รหัสประเภท "โรคแทรก (Complication)" เท่านั้น และผู้ป่วยต้องได้รับยากระตุ้นความดัน (Vasopressor เช่น Norepinephrine, Dopamine, Adrenaline) ทางหลอดเลือดดำอย่างต่อเนื่องหลังจากให้สารน้ำเพียงพอแล้ว',
    auditKeyPoints: [
      'ตรวจสอบแฟ้ม DRU.txt ต้องพบยากลุ่ม Vasopressor (เช่น Norepinephrine inj, Dopamine inj, Adrenaline inj)',
      'ตรวจสอบแฟ้ม IDX.txt รหัสประเภทต้องเป็น 3 (Complication) เท่านั้น หากเป็น 1 (PDx) จะติด DENY CR1 ทันที',
      'ต้องมีหลักฐานความดันโลหิตต่ำต่อเนื่อง (MAP < 65 mmHg หรือ SBP < 90 mmHg) แม้ให้สารน้ำแล้ว',
    ],
    requiredDocumentation: [
      'ใบบันทึกสัญญาณชีพ (Vital Signs / ICU Flowsheet) แสดง MAP < 65 หรือ SBP < 90',
      'ใบสั่งยาและบันทึกการบริหารยาหยดเข้าหลอดเลือด (IV Infusion Record / Drip rate) ของ Vasopressor',
      'ใบบันทึกปริมาณสารน้ำเข้า-ออก (Intake/Output Record)',
    ],
    bannedCombinations: ['ห้ามใช้เป็น PDx (dxType=1)', 'ห้ามใช้โดยไม่มี Vasopressor ใน DRU'],
    drgImpact: 'เป็น Major Complication (MCC) ที่เพิ่มค่าน้ำหนัก DRG สูงที่สุดในกลุ่ม Sepsis',
  },
  'R571': {
    code: 'R57.1',
    nameTh: 'ภาวะช็อกจากการขาดสารน้ำหรือเสียเลือด (Hypovolemic shock)',
    nameEn: 'Hypovolemic shock',
    category: 'shock',
    categoryTh: 'ภาวะช็อกและหลอดเลือดล้มเหลว',
    allowedRoles: ['Complication'],
    defaultRole: 'Complication',
    nhsoCondition: 'ภาวะช็อกจากการสูญเสียปริมาตรเลือดหรือสารน้ำ เช่น ถ่ายเหลวรุนแรง (A09.-) หรือเสียเลือดรุนแรง และได้รับการกู้ชีพด้วย IV fluid ปริมาณมาก (≥ 1,000–2,000 ml) หรือการให้เลือด',
    auditKeyPoints: [
      'ต้องมีประวัติการสูญเสียสารน้ำชัดเจน (Dehydration / Diarrhea / Hemorrhage)',
      'ต้องมีการให้สารน้ำปริมาณมากทางหลอดเลือดดำ (NSS, Acetar, Ringer lactate) บันทึกใน DRU',
    ],
    requiredDocumentation: ['บันทึก Intake/Output และบันทึกการให้ IV Fluid Resuscitation'],
    drgImpact: 'เป็น Complication เพิ่มค่าน้ำหนัก DRG',
  },
  'N390': {
    code: 'N39.0',
    nameTh: 'การติดเชื้อในทางเดินปัสสาวะ ไม่ระบุตำแหน่ง (Urinary tract infection, site not specified)',
    nameEn: 'Urinary tract infection, site not specified',
    category: 'infection',
    categoryTh: 'การติดเชื้อเฉพาะที่',
    allowedRoles: ['PDx', 'Comorbid', 'Complication'],
    defaultRole: 'Comorbid',
    nhsoCondition: 'การติดเชื้อในทางเดินปัสสาวะ หากผู้ป่วยมีภาวะ Urosepsis ร่วมด้วย แพทย์มักเขียน Urosepsis แต่ในระบบ e-Claim สปสช. ห้ามลง N39.0 เป็น PDx โดดๆ โดยไม่มี Sepsis! ให้ใช้ A41.9 หรือ A41.5 เป็นโรคหลัก และให้ N39.0 เป็นโรคร่วม (Comorbid)',
    auditKeyPoints: [
      'กรณี Urosepsis ต้องให้คู่รหัส: A41.9 (PDx) + N39.0 (Comorbid)',
      'หากลง N39.0 เป็น PDx โดดๆ จะได้ค่าน้ำหนัก DRG ต่ำมาก และไม่สะท้อนการรักษาจริง',
    ],
    requiredDocumentation: ['ผลตรวจปัสสาวะ (Urine Analysis) และผลเพาะเชื้อปัสสาวะ (Urine Culture)'],
    drgImpact: 'เป็นโรคร่วม (Comorbid) ที่ดีเมื่อใช้คู่กับ Sepsis',
  },
  'N179': {
    code: 'N17.9',
    nameTh: 'ไตวายเฉียบพลัน ไม่ระบุรายละเอียด (Acute kidney failure, unspecified / AKI)',
    nameEn: 'Acute kidney failure, unspecified',
    category: 'renal',
    categoryTh: 'ไตและระบบทางเดินปัสสาวะ',
    allowedRoles: ['PDx', 'Comorbid', 'Complication'],
    defaultRole: 'Complication',
    nhsoCondition: 'ภาวะไตทำงานบกพร่องเฉียบพลันตามเกณฑ์ KDIGO (Serum Creatinine เพิ่มขึ้น ≥ 0.3 mg/dL ภายใน 48 ชม. หรือเพิ่มขึ้น ≥ 1.5 เท่าของค่า Baseline เดิม หรือปัสสาวะออกน้อยกว่า 0.5 ml/kg/hr นานกว่า 6 ชม.)',
    auditKeyPoints: [
      'ต้องมีผลตรวจ Serum Creatinine อย่างน้อย 2 ค่าเพื่อเปรียบเทียบการเพิ่มขึ้น',
      'ต้องมีการบันทึกการรักษาภาวะไตวาย เช่น การปรับสารน้ำ หยุดยาพิษต่อไต หรือการฟอกไตฉุกเฉิน',
      'ห้ามสรุปซ้ำซ้อนในกรณีที่เป็นเพียงภาวะแทรกซ้อนทั่วไปของ CKD ระยะสุดท้ายที่ไม่รุนแรง',
    ],
    requiredDocumentation: [
      'ผลตรวจ Blood Chemistry (BUN, Creatinine) ติดตามค่าอย่างน้อย 2 ครั้ง',
      'ใบบันทึกปริมาณปัสสาวะรายชั่วโมง (Urine Output Record)',
    ],
    drgImpact: 'เป็น Complication/CC ที่เพิ่มค่าน้ำหนัก DRG สูง',
  },
  'J9600': {
    code: 'J96.00',
    nameTh: 'ภาวะการหายใจล้มเหลวเฉียบพลัน ไม่ระบุชนิด (Acute respiratory failure, unspecified)',
    nameEn: 'Acute respiratory failure, unspecified',
    category: 'respiratory',
    categoryTh: 'ระบบทางเดินหายใจ',
    allowedRoles: ['PDx', 'Comorbid', 'Complication'],
    defaultRole: 'Complication',
    nhsoCondition: 'ภาวะระบบทางเดินหายใจล้มเหลวเฉียบพลันตามเกณฑ์ ABG (PaO2 < 60 mmHg บน Room air หรือ PaCO2 > 50 mmHg ร่วมกับ pH < 7.35) และได้รับการใส่ท่อช่วยหายใจ/ใช้เครื่องช่วยหายใจ หรือ High Flow Oxygen',
    auditKeyPoints: [
      'ต้องมีหลักฐานผลตรวจ Arterial Blood Gas (ABG) หรือ SpO2 ต่ำรุนแรง ร่วมกับการหายใจล้มเหลว',
      'ต้องมีหัตถการใส่เครื่องช่วยหายใจ (96.71/96.72) หรือให้ออกซิเจนบำบัดเข้มข้น',
    ],
    requiredDocumentation: ['ผลตรวจ Arterial Blood Gas (ABG)', 'บันทึกการใส่ท่อและต่อเครื่องช่วยหายใจ'],
    drgImpact: 'เป็น Major Complication (MCC)',
  },
  'E872': {
    code: 'E87.2',
    nameTh: 'ภาวะเลือดเป็นกรด (Acidosis)',
    nameEn: 'Acidosis',
    category: 'electrolyte',
    categoryTh: 'เกลือแร่และสมดุลกรด-ด่าง',
    allowedRoles: ['Comorbid', 'Complication'],
    defaultRole: 'Complication',
    nhsoCondition: 'เงื่อนไขข้อ 3 สปสช.: ต้องมีผลตรวจ ABG ยืนยัน pH < 7.35 หรือ Serum Bicarbonate ใน Blood Chemistry < 18-20 mEq/L และต้องมีการรักษาแก้ไข เช่น การให้ 7.5% Sodium Bicarbonate IV หรือการปรับ Ventilator',
    auditKeyPoints: [
      'ต้องมีผล Lab ยืนยันชัดเจน (ABG หรือ Electrolyte HCO3 ต่ำ)',
      'ต้องมีรายการยาแก้ไขกรดใน DRU.txt (เช่น Sodium Bicarbonate inj)',
    ],
    requiredDocumentation: ['ผล ABG / Electrolyte', 'บันทึกการให้ 7.5% Sodium Bicarbonate ทางหลอดเลือดดำ'],
    drgImpact: 'เป็นโรคร่วม/โรคแทรก (CC)',
  },
  'E876': {
    code: 'E87.6',
    nameTh: 'ภาวะโพแทสเซียมในเลือดต่ำ (Hypokalaemia)',
    nameEn: 'Hypokalaemia',
    category: 'electrolyte',
    categoryTh: 'เกลือแร่และสมดุลกรด-ด่าง',
    allowedRoles: ['Comorbid', 'Complication'],
    defaultRole: 'Comorbid',
    nhsoCondition: 'เงื่อนไขข้อ 4, 6 สปสช.: Serum K < 3.5 mEq/L และต้องมีการให้โพแทสเซียมชดเชย (เช่น KCl Elixir oral หรือ KCl inj ผสม IV Fluid) ห้ามลงเป็นโรคร่วมหากระดับต่ำเล็กน้อยและไม่ได้รักษาจำเพาะ',
    auditKeyPoints: [
      'ผล Serum Potassium ต่ำกว่าเกณฑ์ปกติ',
      'มีคำสั่งการรักษาให้ยา Potassium chloride ทางหลอดเลือดดำหรือทางปาก',
    ],
    requiredDocumentation: ['ผล Electrolyte (K)', 'ใบสั่งยา KCl'],
    drgImpact: 'โรคร่วม (CC)',
  },
  'E875': {
    code: 'E87.5',
    nameTh: 'ภาวะโพแทสเซียมในเลือดสูง (Hyperkalaemia)',
    nameEn: 'Hyperkalaemia',
    category: 'electrolyte',
    categoryTh: 'เกลือแร่และสมดุลกรด-ด่าง',
    allowedRoles: ['Comorbid', 'Complication'],
    defaultRole: 'Complication',
    nhsoCondition: 'Serum K > 5.5 mEq/L และได้รับการรักษาฉุกเฉิน เช่น การให้ 10% Calcium gluconate, RI + 50% Glucose, Kalimate หรือการฟอกไตฉุกเฉิน',
    auditKeyPoints: [
      'ต้องมีผล Serum Potassium > 5.5 mEq/L',
      'ต้องมีบันทึกการรักษาฉุกเฉิน หรือยา Kalimate / Calcium gluconate / Insulin-Glucose drip',
    ],
    requiredDocumentation: ['ผล Electrolyte (K)', 'ใบสั่งยาฉุกเฉินและคลื่นไฟฟ้าหัวใจ (ECG)'],
    drgImpact: 'โรคร่วม/โรคแทรก (CC)',
  },
  'R650': {
    code: 'R65.0',
    nameTh: 'กลุ่มอาการตอบสนองต่อการอักเสบทั่วร่างกายที่ไม่เกิดจากการติดเชื้อ (SIRS non-infectious)',
    nameEn: 'Systemic Inflammatory Response Syndrome of non-infectious origin',
    category: 'banned',
    categoryTh: 'รหัสต้องห้ามในกลุ่มติดเชื้อ',
    allowedRoles: ['Comorbid'],
    defaultRole: 'Comorbid',
    nhsoCondition: '🚨 รหัสต้องห้ามในเคส Sepsis: สปสช. มีข้อกำหนดชัดเจนว่า รหัส R65.0 ใช้เฉพาะกับ SIRS ที่ไม่ได้เกิดจากการติดเชื้อ (เช่น Severe burn, Acute pancreatitis) ห้ามนำมาใช้คู่กับโรคติดเชื้อหรือ Sepsis เพราะซ้ำซ้อนและจะติดคำเตือนปฏิเสธการเบิก',
    auditKeyPoints: ['ห้ามใช้คู่กับ A41.- หรือโรคติดเชื้อใดๆ ในเคส Sepsis'],
    requiredDocumentation: ['ห้ามให้รหัสนี้'],
    drgImpact: 'ความเสี่ยงติด DENY',
  },
};

/**
 * Intelligent Case Coding Recommender:
 * Scans active patient case and recommends ICD-10 and ICD-9-CM codes according to NHSO standards.
 */
export function getCaseCodingRecommendations(
  pdx: string = '',
  secondaryDx: DiagnosisEntry[] = [],
  medications: MedicationItem[] = [],
  clinicalProfile?: ClinicalProfile,
  procedures: ProcedureEntry[] = []
): IcdRecommendation[] {
  const recommendations: IcdRecommendation[] = [];

  const cleanPdx = (pdx || '').trim().toUpperCase().replace('.', '');
  const safeSecondaryDx = secondaryDx || [];
  const safeMeds = medications || [];
  const safeProcedures = procedures || [];
  const safeClinical = clinicalProfile || {
    hemoculture: 'not_sent',
    sirsMetCount: 0,
    mapUnder65: false,
    fluidResuscitationMl: 0,
    hasOrganDysfunction: false,
    clinicalSummary: '',
  };

  const existingDxCodes = new Set([cleanPdx, ...safeSecondaryDx.map(s => (s?.code || '').trim().toUpperCase().replace('.', ''))]);
  const existingProcCodes = new Set(safeProcedures.map(p => (p?.code || '').trim().toUpperCase().replace('.', '')));

  const selectedMeds = safeMeds.filter(m => m?.isSelected);
  const medNamesLower = selectedMeds.map(m => (m?.name || '').toLowerCase());

  const hasVasopressor = selectedMeds.some(m => m.category === 'vasopressor') ||
    medNamesLower.some(n => n.includes('norepi') || n.includes('levophed') || n.includes('dopamine') || n.includes('adrenaline') || n.includes('epinephrine') || n.includes('vasopressin'));

  const hasIvAntibiotic = selectedMeds.some(m => m.category === 'iv_antibiotic') ||
    medNamesLower.some(n => n.includes('ceftri') || n.includes('mero') || n.includes('cipro') || n.includes('amoxi') || n.includes('cloxa') || n.includes('genta') || n.includes('tazocin') || n.includes('pip/tazo') || n.includes('vanco') || n.includes('colistin'));

  const hasBicarbonate = medNamesLower.some(n => n.includes('bicarbonate') || n.includes('7.5% sod') || n.includes('nahco3'));
  const hasKalimate = medNamesLower.some(n => n.includes('kalimate') || n.includes('calcium gluconate'));
  const hasKcl = medNamesLower.some(n => n.includes('kcl') || n.includes('potassium'));

  // 1. RULE: CR1 Violation - Septic Shock as PDx
  if (cleanPdx === 'R572') {
    recommendations.push({
      id: 'rec_err_shock_pdx',
      type: 'ICD-10',
      code: 'R57.2',
      nameTh: 'ภาวะช็อกเหตุพิษติดเชื้อ (Septic shock)',
      nameEn: 'Septic shock',
      category: 'ความถูกต้องตามเกณฑ์ CR1 / สปสช.',
      recommendedRole: 'Complication',
      nhsoCondition: 'CR1: รหัส R57.2 ห้ามใช้เป็นโรคหลัก (PDx) เด็ดขาด',
      priority: 'CRITICAL',
      reason: 'ปัจจุบันเคสนี้ลง R57.2 เป็นการวินิจฉัยหลัก (PDx) ซึ่งผิดระเบียบ สปสช. 100% จะส่งผลให้ติดสถานะ DENY [CR1] ถูกปฏิเสธการจ่ายเงินทันที',
      auditCriteria: [
        'สปสช. กำหนดให้ R57.2 เป็น "โรคแทรก (Complication - dxType 3)" เท่านั้น',
        'ต้องเปลี่ยนโรคหลัก (PDx) เป็นโรคติดเชื้อต้นเหตุ เช่น A41.9 หรือ A41.5',
      ],
      requiredDocumentation: [
        'บันทึกเวชระเบียนสรุปโรคหลักเป็น Sepsis',
        'ระบุ Septic shock เป็นภาวะแทรกซ้อนที่เกิดขึ้น',
      ],
      bannedRules: ['ห้ามลง R57.2 ในช่อง Principal Diagnosis'],
      drgImpact: 'ต้องแก้ไขทันทีเพื่อหลีกเลี่ยงการถูกปฏิเสธทั้งฉบับ',
      actionPayload: {
        actionType: 'SET_PDX',
        code: 'A419',
        diagType: 'complication',
      },
    });
  }

  // 2. RULE: Under-coding - Vasopressor is given, but R57.2 is missing
  if (hasVasopressor && !existingDxCodes.has('R572')) {
    recommendations.push({
      id: 'rec_suggest_r572',
      type: 'ICD-10',
      code: 'R57.2',
      nameTh: 'ภาวะช็อกเหตุพิษติดเชื้อ (Septic shock)',
      nameEn: 'Septic shock',
      category: 'การวินิจฉัยที่สอดคล้องกับยา (CR37)',
      recommendedRole: 'Complication',
      nhsoCondition: 'CR37: ผู้ป่วยได้รับยากระตุ้นความดัน (Vasopressor) เข้าเกณฑ์ Septic shock สมบูรณ์',
      priority: 'CRITICAL',
      reason: 'ผู้ป่วยได้รับยากลุ่ม Vasopressor (เช่น Norepinephrine / Levophed / Dopamine) ทางหลอดเลือดดำ แต่ในรายการวินิจฉัยยังไม่มีรหัส R57.2 เป็นโรคแทรก การเพิ่มรหัสนี้จะทำให้การเบิกจ่ายสอดคล้องกับรายการยาจริง และเพิ่มค่าน้ำหนัก DRG อย่างถูกต้องตามกฎหมาย',
      auditCriteria: [
        'มีรายการยากระตุ้นความดันในแฟ้ม DRU.txt ครบถ้วน',
        'ผู้ป่วยมีภาวะความดันตกต่อเนื่องหลังให้สารน้ำ',
        'ต้องลงประเภทการวินิจฉัยเป็น "โรคแทรก (Complication)" เท่านั้น',
      ],
      requiredDocumentation: [
        'ใบบันทึกสัญญาณชีพ (Vital signs sheet) แสดงค่าความดันโลหิต',
        'ใบบันทึกการให้ยาหยดหลอดเลือด (IV drip rate chart) ของยา Vasopressor',
      ],
      drgImpact: 'เป็น Major CC (MCC) ที่เพิ่มค่าน้ำหนักสัมพัทธ์ (Relative Weight) สูงสุดในกลุ่ม Sepsis',
      actionPayload: {
        actionType: 'ADD_SDX',
        code: 'R572',
        diagType: 'complication',
      },
    });
  }

  // 3. RULE: Urosepsis standard coding
  if (cleanPdx === 'N390' && (hasIvAntibiotic || (safeClinical.sirsMetCount ?? 0) >= 2 || hasVasopressor)) {
    recommendations.push({
      id: 'rec_suggest_urosepsis_pdx',
      type: 'ICD-10',
      code: 'A41.9',
      nameTh: 'ภาวะพิษเหตุติดเชื้อ ไม่ระบุเชื้อก่อโรค (Sepsis, unspecified)',
      nameEn: 'Sepsis, unspecified organism',
      category: 'การเลือกโรคหลักที่ถูกต้อง (Urosepsis)',
      recommendedRole: 'PDx',
      nhsoCondition: 'มาตรฐาน สปสช. กรณี Urosepsis: ควรให้ A41.9 เป็นโรคหลัก และ N39.0 เป็นโรคร่วม',
      priority: 'CRITICAL',
      reason: 'ปัจจุบันเคสนี้ลง N39.0 (UTI) เป็นโรคหลักโดดๆ แต่ผู้ป่วยมีอาการและรักษาแบบภาวะติดเชื้อในกระแสเลือด (Sepsis) หากไม่ลงรหัส Sepsis จะทำให้ค่าน้ำหนัก DRG ต่ำกว่าความเป็นจริงมาก และอาจถูกตั้งข้อสังเกตเรื่องการใช้ยาปฏิชีวนะเกินความจำเป็น',
      auditCriteria: [
        'เกณฑ์วินิจฉัย Sepsis เข้าเกณฑ์ (SIRS ≥ 2 ข้อ หรือ qSOFA ≥ 2)',
        'เปลี่ยนโรคหลักเป็น A41.9 และย้าย N39.0 ไปเป็นโรคร่วม (Comorbid)',
      ],
      requiredDocumentation: ['ผลตรวจปัสสาวะ (U/A) และผล Hemoculture'],
      drgImpact: 'เพิ่มค่าน้ำหนัก DRG สอดคล้องกับทรัพยากรที่ใช้รักษาจริง',
      actionPayload: {
        actionType: 'SET_PDX',
        code: 'A419',
      },
    });
  }

  // 4. RULE: Mechanical Ventilation (ICD-9-CM)
  const isVentilated = safeClinical.hasOrganDysfunction || existingDxCodes.has('J960') || existingDxCodes.has('J9600') || existingDxCodes.has('J9601');
  const hasVentCode = existingProcCodes.has('9671') || existingProcCodes.has('9672') || existingProcCodes.has('9670');

  if (isVentilated && !hasVentCode) {
    recommendations.push({
      id: 'rec_suggest_icd9_vent',
      type: 'ICD-9-CM',
      code: '96.71',
      nameTh: 'การใช้เครื่องช่วยหายใจต่อเนื่อง น้อยกว่า 96 ชม. (Ventilator < 96 hrs)',
      nameEn: 'Continuous mechanical ventilation for less than 96 consecutive hours',
      category: 'หัตถการช่วยชีวิตและการหายใจล้มเหลว',
      recommendedRole: 'Secondary_Proc',
      nhsoCondition: 'เงื่อนไขการให้รหัสเครื่องช่วยหายใจ สปสช.',
      priority: 'RECOMMENDED',
      reason: 'เคสนี้มีภาวะการหายใจล้มเหลวหรืออวัยวะล้มเหลว หากผู้ป่วยได้รับการใส่ท่อช่วยหายใจและต่อเครื่องช่วยหายใจ ควรให้รหัสหัตถการ 96.71 (หรือ 96.72 หาก ≥ 96 ชม.) คู่กับ 96.04 เพื่อให้สะท้อนค่าน้ำหนักหัตถการผู้ป่วยวิกฤต',
      auditCriteria: [
        'เริ่มนับเวลาเมื่อต่อเข้าเครื่องช่วยหายใจจริง (Invasive mechanical ventilation)',
        'ต้องมีใบบันทึกการตั้งค่าเครื่องช่วยหายใจ (Ventilator Sheet) ยืนยันเวลาเริ่ม-สิ้นสุด',
        'หากต่อเครื่อง ≥ 96 ชม. ติดต่อกัน ให้ใช้รหัส 96.72',
      ],
      requiredDocumentation: [
        'Ventilator Flowsheet ครบทุกเวร',
        'Doctor Order ระบุคำสั่งใส่เครื่องช่วยหายใจ',
      ],
      drgImpact: 'เพิ่มค่าน้ำหนักสัมพัทธ์ (RW) อย่างมีนัยสำคัญในกลุ่มโรคระบบทางเดินหายใจ',
      actionPayload: {
        actionType: 'ADD_PROCEDURE',
        code: '9671',
        procType: 'secondary',
      },
    });

    if (!existingProcCodes.has('9604')) {
      recommendations.push({
        id: 'rec_suggest_icd9_intubation',
        type: 'ICD-9-CM',
        code: '96.04',
        nameTh: 'การใส่ท่อช่วยหายใจ (Insertion of endotracheal tube)',
        nameEn: 'Insertion of endotracheal tube',
        category: 'หัตถการช่วยชีวิตและการหายใจล้มเหลว',
        recommendedRole: 'Secondary_Proc',
        nhsoCondition: 'ให้รหัสคู่กับเครื่องช่วยหายใจ (96.71/96.72)',
        priority: 'RECOMMENDED',
        reason: 'ควรให้รหัส 96.04 ควบคู่กับรหัสเครื่องช่วยหายใจเมื่อมีการใส่ท่อช่วยหายใจทางหลอดลม',
        auditCriteria: ['ต้องมีบันทึกการใส่ท่อช่วยหายใจในเวชระเบียน'],
        requiredDocumentation: ['ใบบันทึกการใส่ท่อช่วยหายใจ (Intubation sheet) และผล Chest X-ray คอนเฟิร์ม'],
        drgImpact: 'หัตถการเสริมความสมบูรณ์ของเวชระเบียน',
        actionPayload: {
          actionType: 'ADD_PROCEDURE',
          code: '9604',
          procType: 'secondary',
        },
      });
    }
  }

  // 5. RULE: Central Venous Line / CVP Monitoring (ICD-9-CM)
  if (hasVasopressor && !existingProcCodes.has('8962') && !existingProcCodes.has('3893')) {
    recommendations.push({
      id: 'rec_suggest_icd9_cvp',
      type: 'ICD-9-CM',
      code: '89.62',
      nameTh: 'การวัดความดันหลอดเลือดดำส่วนกลาง (Central venous pressure monitoring / CVP)',
      nameEn: 'Central venous pressure monitoring',
      category: 'หัตถการสายสวนหลอดเลือดในผู้ป่วยวิกฤต',
      recommendedRole: 'Secondary_Proc',
      nhsoCondition: 'การใส่สายสวน C-line เพื่อบริหารยากระตุ้นความดันและวัด CVP',
      priority: 'INFORMATIONAL',
      reason: 'ผู้ป่วยได้รับยา Vasopressor ขนาดสูง หากในเวชระเบียนมีการใส่สาย Central line (IJV, Subclavian หรือ Femoral) และมีการวัดค่า CVP ควรลงรหัส 89.62 ให้ครบถ้วน',
      auditCriteria: [
        'มีหัตถการโน้ตการใส่สาย C-line',
        'มีบันทึกการวัดค่า CVP อย่างน้อยวันละ 1-2 ครั้งใน ICU Flowsheet',
      ],
      requiredDocumentation: ['หัตถการโน้ต C-line insertion และใบบันทึกผล CVP'],
      drgImpact: 'สะท้อนความซับซ้อนของการดูแลรักษาในหอผู้ป่วยวิกฤต',
      actionPayload: {
        actionType: 'ADD_PROCEDURE',
        code: '8962',
        procType: 'secondary',
      },
    });
  }

  // 6. RULE: Acidosis E87.2 from Bicarbonate
  if (hasBicarbonate && !existingDxCodes.has('E872')) {
    recommendations.push({
      id: 'rec_suggest_acidosis',
      type: 'ICD-10',
      code: 'E87.2',
      nameTh: 'ภาวะเลือดเป็นกรด (Acidosis)',
      nameEn: 'Acidosis',
      category: 'เกลือแร่และสมดุลกรด-ด่าง (เงื่อนไขข้อ 3 สปสช.)',
      recommendedRole: 'Complication',
      nhsoCondition: 'เงื่อนไขข้อ 3 สปสช.: การสรุปวินิจฉัยหรือให้รหัสกลุ่มอาการ Acidosis',
      priority: 'RECOMMENDED',
      reason: 'พบรายการยา 7.5% Sodium Bicarbonate ในรายการยา แต่ยังไม่มีรหัส E87.2 หากผลตรวจ ABG มีค่า pH < 7.35 หรือ HCO3 < 18-20 mEq/L ควรให้รหัส E87.2 เป็นโรคแทรก/โรคร่วม เพื่อให้สอดคล้องกับการรักษา',
      auditCriteria: [
        'ต้องมีผลตรวจ Lab ยืนยัน: ABG (pH < 7.35) หรือ Serum HCO3 ต่ำ',
        'มีการรักษาด้วยยา Sodium Bicarbonate ทางหลอดเลือดดำจริง',
      ],
      requiredDocumentation: ['ใบรายงานผล Arterial Blood Gas (ABG) หรือ Electrolytes'],
      drgImpact: 'เป็น Complication/CC เพิ่มค่าน้ำหนัก DRG',
      actionPayload: {
        actionType: 'ADD_SDX',
        code: 'E872',
        diagType: 'complication',
      },
    });
  }

  // 7. RULE: Hyperkalaemia E87.5 from Kalimate
  if (hasKalimate && !existingDxCodes.has('E875')) {
    recommendations.push({
      id: 'rec_suggest_hyperk',
      type: 'ICD-10',
      code: 'E87.5',
      nameTh: 'ภาวะโพแทสเซียมในเลือดสูง (Hyperkalaemia)',
      nameEn: 'Hyperkalaemia',
      category: 'เกลือแร่และสมดุลกรด-ด่าง (เงื่อนไขข้อ 4 สปสช.)',
      recommendedRole: 'Complication',
      nhsoCondition: 'เงื่อนไขข้อ 4 สปสช.: การรักษาภาวะ Metabolic disorder ในผู้ป่วยไตวาย/วิกฤต',
      priority: 'RECOMMENDED',
      reason: 'พบการใช้ยาขับโพแทสเซียม (Kalimate) หรือ Calcium gluconate แต่ยังไม่มีรหัส E87.5 หากผลตรวจ Serum K > 5.5 mEq/L ควรเพิ่มรหัสนี้เป็นโรคแทรก',
      auditCriteria: [
        'ผลตรวจ Serum K > 5.5 mEq/L',
        'มีการสั่งยาขับโพแทสเซียมเฉพาะเจาะจง',
      ],
      requiredDocumentation: ['ใบผลแล็บ Serum Potassium และใบสั่งยา Kalimate'],
      drgImpact: 'เป็นโรคร่วม/โรคแทรก (CC)',
      actionPayload: {
        actionType: 'ADD_SDX',
        code: 'E875',
        diagType: 'complication',
      },
    });
  }

  // 8. RULE: Hypokalaemia E87.6 from KCl
  if (hasKcl && !existingDxCodes.has('E876')) {
    recommendations.push({
      id: 'rec_suggest_hypok',
      type: 'ICD-10',
      code: 'E87.6',
      nameTh: 'ภาวะโพแทสเซียมในเลือดต่ำ (Hypokalaemia)',
      nameEn: 'Hypokalaemia',
      category: 'เกลือแร่และสมดุลกรด-ด่าง (เงื่อนไขข้อ 6 สปสช.)',
      recommendedRole: 'Comorbid',
      nhsoCondition: 'เงื่อนไขข้อ 6 สปสช.: ภาวะโพแทสเซียมต่ำที่ได้รับการรักษาชดเชยเฉพาะ',
      priority: 'INFORMATIONAL',
      reason: 'มีการให้ยา Potassium Chloride (KCl) ชดเชย หากมีผลตรวจ Serum K < 3.5 mEq/L สามารถลงรหัส E87.6 เป็นโรคร่วมได้',
      auditCriteria: ['ผลแล็บ Serum K < 3.5 mEq/L และมีคำสั่งให้ยา KCl'],
      requiredDocumentation: ['ผล Electrolyte และใบสั่งยา KCl'],
      drgImpact: 'เป็นโรคร่วม (CC)',
      actionPayload: {
        actionType: 'ADD_SDX',
        code: 'E876',
        diagType: 'comorbid',
      },
    });
  }

  // 9. RULE: Banned Codes check (e.g. R65.0 SIRS)
  if (existingDxCodes.has('R650') || existingDxCodes.has('R651')) {
    const banned = existingDxCodes.has('R650') ? 'R65.0' : 'R65.1';
    recommendations.push({
      id: 'rec_warn_banned_sirs',
      type: 'ICD-10',
      code: banned,
      nameTh: `รหัสต้องห้าม ${banned} (SIRS in Sepsis)`,
      nameEn: 'Systemic Inflammatory Response Syndrome',
      category: 'รหัสต้องห้ามตามเกณฑ์ สปสช. (Banned Code)',
      recommendedRole: 'Comorbid',
      nhsoCondition: 'สปสช. ห้ามใช้รหัส R65.0 หรือ R65.1 ในเคส Sepsis หรือโรคติดเชื้อ',
      priority: 'CRITICAL',
      reason: `พบการใส่รหัส ${banned} ซึ่ง สปสช. ระบุว่าเป็นรหัสที่ซ้ำซ้อนกับกลุ่ม A41.- และห้ามใช้ในเคสติดเชื้อ e-Claim จะถูกระบบ Audit ตัดออกหรือขึ้นเตือนข้อผิดพลาด`,
      auditCriteria: ['ต้องลบรหัสนี้ออกจากรายการโรคร่วม/โรคแทรก'],
      requiredDocumentation: ['ลบรหัสนี้ออก'],
      drgImpact: 'ลดความเสี่ยงติด DENY หรือ Audit Warning',
    });
  }

  // 10. RULE: High Audit Alert for Excisional Debridement (86.22)
  if (existingProcCodes.has('8622')) {
    recommendations.push({
      id: 'rec_warn_debridement_8622',
      type: 'ICD-9-CM',
      code: '86.22',
      nameTh: 'ข้อควรระวังการ Audit รหัส 86.22 (Excisional Debridement)',
      nameEn: 'Excisional debridement of wound, infection, or burn',
      category: 'เกณฑ์การตรวจสอบเข้มข้นของ สปสช. (Audit Trap)',
      recommendedRole: 'Principal_Proc',
      nhsoCondition: 'จุดตรวจและเรียกเงินคืนอันดับต้นๆ ของ สปสช.',
      priority: 'CRITICAL',
      reason: 'เคสนี้มีการให้รหัส 86.22 ซึ่งมีค่าน้ำหนัก DRG สูงมาก สปสช. จะตรวจสอบบันทึกการผ่าตัด (Operative Note) อย่างเคร่งครัด หากพบว่าเป็นเพียงการล้างแผล (Washing/Scrubbing/Wet-to-dry) โดยไม่ได้ใช้ของมีคมตัดเฉือนถึงเนื้อเยื่อมีชีวิต (Fascia/Muscle) จะถูกปรับลดเป็น 86.28 และเรียกเงินคืน',
      auditCriteria: [
        'Operative Note ต้องระบุคำว่า: ตัดเฉือนด้วยของมีคม (Excision with scalpel/scissors)',
        'ต้องระบุความลึก: ถึงชั้น Fascia, Muscle หรือ Viable bleeding tissue',
        'ห้ามมีข้อความว่าเพียงล้างแผล ขูดแผล หรือทำแผลทั่วไป',
      ],
      requiredDocumentation: ['Operative Note ฉบับสมบูรณ์ระบุเทคนิคและเครื่องมือมีคม'],
      drgImpact: 'หากไม่ผ่าน Audit จะถูกลดเป็น 86.28 ซึ่งทำให้สูญเสียเงินชดเชยจำนวนมาก',
    });
  }

  return recommendations;
}
