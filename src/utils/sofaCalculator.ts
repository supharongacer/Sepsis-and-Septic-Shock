import { SofaScores } from '../types';

export interface SofaSubsystemOption {
  score: number;
  label: string;
  description: string;
}

export const RESPIRATION_OPTIONS: SofaSubsystemOption[] = [
  { score: 0, label: 'PaO₂/FiO₂ ≥ 400', description: 'การหายใจปกติ' },
  { score: 1, label: 'PaO₂/FiO₂ < 400', description: 'ปอดอักเสบเล็กน้อย' },
  { score: 2, label: 'PaO₂/FiO₂ < 300', description: 'การแลกเปลี่ยนก๊าซลดลง' },
  { score: 3, label: 'PaO₂/FiO₂ < 200 (ใช้เครื่องช่วยหายใจ)', description: 'ภาวะหายใจล้มเหลวเฉียบพลัน ARDS ปานกลาง' },
  { score: 4, label: 'PaO₂/FiO₂ < 100 (ใช้เครื่องช่วยหายใจ)', description: 'ARDS รุนแรง' },
];

export const COAGULATION_OPTIONS: SofaSubsystemOption[] = [
  { score: 0, label: 'Platelets ≥ 150 ×10³/µL', description: 'เกล็ดเลือดปกติ' },
  { score: 1, label: 'Platelets < 150 ×10³/µL', description: 'เกล็ดเลือดต่ำเล็กน้อย' },
  { score: 2, label: 'Platelets < 100 ×10³/µL', description: 'เกล็ดเลือดต่ำปานกลาง' },
  { score: 3, label: 'Platelets < 50 ×10³/µL', description: 'เกล็ดเลือดต่ำรุนแรง' },
  { score: 4, label: 'Platelets < 20 ×10³/µL', description: 'เสี่ยงภาวะเลือดออกรุนแรง/DIC' },
];

export const LIVER_OPTIONS: SofaSubsystemOption[] = [
  { score: 0, label: 'Bilirubin < 1.2 mg/dL', description: 'ตับทำงานปกติ' },
  { score: 1, label: 'Bilirubin 1.2–1.9 mg/dL', description: 'บิลิรูบินสูงเล็กน้อย' },
  { score: 2, label: 'Bilirubin 2.0–5.9 mg/dL', description: 'ตัวเหลืองตาเหลือง' },
  { score: 3, label: 'Bilirubin 6.0–11.9 mg/dL', description: 'ตับวายปานกลาง' },
  { score: 4, label: 'Bilirubin ≥ 12.0 mg/dL', description: 'ตับวายรุนแรง (Hepatic Failure)' },
];

export const CARDIOVASCULAR_OPTIONS: SofaSubsystemOption[] = [
  { score: 0, label: 'MAP ≥ 70 mmHg', description: 'ความดันโลหิตปกติ ไม่ใช้ยากระตุ้น' },
  { score: 1, label: 'MAP < 70 mmHg', description: 'ความดันตกเล็กน้อย ตอบสนองต่อน้ำเกลือ' },
  { score: 2, label: 'Dopamine ≤ 5 หรือ Dobutamine ทุกขนาด', description: 'ต้องใช้ยากระตุ้นความดันขนาดต่ำ' },
  { score: 3, label: 'Dopamine > 5 หรือ Norepi ≤ 0.1 mcg/kg/min', description: 'ภาวะ Septic shock ปานกลาง' },
  { score: 4, label: 'Dopamine > 15 หรือ Norepi > 0.1 mcg/kg/min', description: 'Refractory Septic shock ขนาดสูง' },
];

export const CNS_OPTIONS: SofaSubsystemOption[] = [
  { score: 0, label: 'GCS 15', description: 'รู้สึกตัวดี รู้เรื่องปกติ' },
  { score: 1, label: 'GCS 13–14', description: 'สับสนเล็กน้อย ง่วงซึม' },
  { score: 2, label: 'GCS 10–12', description: 'หลับลึก เรียกตื่นช้า ตอบสนองช้า' },
  { score: 3, label: 'GCS 6–9', description: 'ไม่ค่อยตอบสนอง (Stupor)' },
  { score: 4, label: 'GCS < 6', description: 'หมดสติลึก (Coma)' },
];

export const RENAL_OPTIONS: SofaSubsystemOption[] = [
  { score: 0, label: 'Creatinine < 1.2 mg/dL', description: 'การทำงานของไตปกติ' },
  { score: 1, label: 'Creatinine 1.2–1.9 mg/dL', description: 'ไตทำงานลดลงเล็กน้อย' },
  { score: 2, label: 'Creatinine 2.0–3.4 mg/dL', description: 'ไตวายเฉียบพลัน Stage 2' },
  { score: 3, label: 'Creatinine 3.5–4.9 หรือ ปัสสาวะ < 500 mL/วัน', description: 'ไตวายเฉียบพลัน Stage 3' },
  { score: 4, label: 'Creatinine ≥ 5.0 หรือ ปัสสาวะ < 200 mL/วัน', description: 'ไตวายรุนแรง ต้องการการฟอกไต' },
];

export function calculateQSofa(scores?: Partial<SofaScores>): {
  total: number;
  isHighRisk: boolean;
} {
  const rr = scores?.respiratoryRateOver22 ? 1 : 0;
  const bp = scores?.systolicBpUnder100 ? 1 : 0;
  const gcs = scores?.alteredMentation ? 1 : 0;
  const total = rr + bp + gcs;
  return {
    total,
    isHighRisk: total >= 2,
  };
}

export function calculateFullSofa(scores?: Partial<SofaScores>): {
  total: number;
  isHighRisk: boolean;
  affectedSystems: string[];
} {
  const resp = scores?.respirationScore ?? 0;
  const coag = scores?.coagulationScore ?? 0;
  const liver = scores?.liverScore ?? 0;
  const cardio = scores?.cardiovascularScore ?? 0;
  const cns = scores?.cnsScore ?? 0;
  const renal = scores?.renalScore ?? 0;

  const total = resp + coag + liver + cardio + cns + renal;

  const affectedSystems: string[] = [];
  if (resp >= 1) affectedSystems.push(`ระบบหายใจ (+${resp})`);
  if (coag >= 1) affectedSystems.push(`เกล็ดเลือด (+${coag})`);
  if (liver >= 1) affectedSystems.push(`ตับ (+${liver})`);
  if (cardio >= 1) affectedSystems.push(`หัวใจและหลอดเลือด (+${cardio})`);
  if (cns >= 1) affectedSystems.push(`ระบบประสาท (+${cns})`);
  if (renal >= 1) affectedSystems.push(`ไต (+${renal})`);

  return {
    total,
    isHighRisk: total >= 2,
    affectedSystems,
  };
}
