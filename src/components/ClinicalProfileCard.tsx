import React, { useState } from 'react';
import { ClinicalProfile, SofaScores } from '../types';
import {
  Stethoscope,
  Activity,
  Droplets,
  TestTube,
  FlaskConical,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Calculator,
  Flame,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  RESPIRATION_OPTIONS,
  COAGULATION_OPTIONS,
  LIVER_OPTIONS,
  CARDIOVASCULAR_OPTIONS,
  CNS_OPTIONS,
  RENAL_OPTIONS,
  calculateQSofa,
  calculateFullSofa,
} from '../utils/sofaCalculator';

interface ClinicalProfileCardProps {
  clinical: ClinicalProfile;
  onChange: (updated: ClinicalProfile) => void;
}

export const ClinicalProfileCard: React.FC<ClinicalProfileCardProps> = ({
  clinical,
  onChange,
}) => {
  const [activeScoreTab, setActiveScoreTab] = useState<'QSOFA' | 'FULL_SOFA'>('QSOFA');
  const [showFullDetails, setShowFullDetails] = useState(false);

  const sofa = clinical.sofaScores || {
    respiratoryRateOver22: false,
    systolicBpUnder100: false,
    alteredMentation: false,
    qSofaTotal: 0,
    isQsofaHighRisk: false,
    respirationScore: 0,
    coagulationScore: 0,
    liverScore: 0,
    cardiovascularScore: 0,
    cnsScore: 0,
    renalScore: 0,
    sofaTotal: 0,
    isSofaHighRisk: false,
  };

  // Helper to update sofa scores and recalculate totals
  const handleUpdateSofa = (partial: Partial<SofaScores>) => {
    const nextScores: SofaScores = {
      ...sofa,
      ...partial,
    };

    const qResult = calculateQSofa(nextScores);
    const fullResult = calculateFullSofa(nextScores);

    nextScores.qSofaTotal = qResult.total;
    nextScores.isQsofaHighRisk = qResult.isHighRisk;
    nextScores.sofaTotal = fullResult.total;
    nextScores.isSofaHighRisk = fullResult.isHighRisk;

    const hasOrganFailure = fullResult.total >= 2 || qResult.isHighRisk;

    onChange({
      ...clinical,
      sofaScores: nextScores,
      hasOrganDysfunction: hasOrganFailure,
    });
  };

  // Discharge condition evaluation
  // Rule: Discharge Status "3. Not Improve, 9. Dead" and Type Of Discharge "2. Against Advice, 3. By Escape, 4. By Transfer"
  const isStatusCritical = clinical.dischargeStatus === '3' || clinical.dischargeStatus === '9';
  const isTypeCritical =
    clinical.dischargeType === '2' || clinical.dischargeType === '3' || clinical.dischargeType === '4';
  const isSepsisDischargeConditionMet = isStatusCritical || isTypeCritical;

  const qResult = calculateQSofa(sofa);
  const fullResult = calculateFullSofa(sofa);
  const isOverallHighRisk = qResult.isHighRisk || fullResult.isHighRisk;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Card Header */}
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
            3
          </span>
          <h2 className="font-semibold text-slate-800 text-base">
            หลักฐานทางคลินิก & SOFA Score Calculator
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {isOverallHighRisk && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>SOFA High-Risk (Audit Alert)</span>
            </span>
          )}
          <span className="text-xs text-slate-500">เกณฑ์ตรวจสอบเวชระเบียน สปสช.</span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Section A: Discharge Status & Discharge Type (Discharge Criteria for Sepsis / Shock) */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            isSepsisDischargeConditionMet
              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
              : 'bg-slate-50/60 border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>สถานะการจำหน่ายและประเภทการจำหน่าย (Discharge Status & Type)</span>
            </div>
            {isSepsisDischargeConditionMet && (
              <span className="text-3xs font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300 animate-pulse">
                ✓ เข้าเงื่อนไข Sepsis & Septic Shock สปสช.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Discharge Status */}
            <div>
              <label className="block text-2xs font-semibold text-slate-700 mb-1">
                สถานะการจำหน่าย (Discharge Status - DISCHS):
              </label>
              <select
                id="select-discharge-status"
                value={clinical.dischargeStatus || '1'}
                onChange={(e) =>
                  onChange({
                    ...clinical,
                    dischargeStatus: e.target.value as any,
                  })
                }
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1. Complete Recovery (หายเป็นปกติ)</option>
                <option value="2">2. Improved (อาการทุเลาขึ้น)</option>
                <option value="3" className="font-bold text-rose-700">
                  3. Not Improve (อาการไม่ทุเลา) ⚠️ [เข้าเงื่อนไข Sepsis]
                </option>
                <option value="8">8. Other (อื่นๆ)</option>
                <option value="9" className="font-bold text-rose-700">
                  9. Dead (เสียชีวิต) ⚠️ [เข้าเงื่อนไข Sepsis]
                </option>
              </select>
            </div>

            {/* Type of Discharge */}
            <div>
              <label className="block text-2xs font-semibold text-slate-700 mb-1">
                ประเภทการจำหน่าย (Type of Discharge - DISCHT):
              </label>
              <select
                id="select-discharge-type"
                value={clinical.dischargeType || '1'}
                onChange={(e) =>
                  onChange({
                    ...clinical,
                    dischargeType: e.target.value as any,
                  })
                }
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1. With Approval (แพทย์อนุญาตให้ออกจาก รพ.)</option>
                <option value="2" className="font-bold text-rose-700">
                  2. Against Advice (ขอกลับบ้าน/ปฏิเสธการรักษา) ⚠️ [เข้าเงื่อนไข Sepsis]
                </option>
                <option value="3" className="font-bold text-rose-700">
                  3. By Escape (หลบหนีออกจาก รพ.) ⚠️ [เข้าเงื่อนไข Sepsis]
                </option>
                <option value="4" className="font-bold text-rose-700">
                  4. By Transfer (ส่งต่อไปรับการรักษา รพ. อื่น) ⚠️ [เข้าเงื่อนไข Sepsis]
                </option>
                <option value="5">5. Other (อื่นๆ)</option>
                <option value="8">8. Dead Autopsy (เสียชีวิต มีการชันสูตร)</option>
                <option value="9">9. Dead No Autopsy (เสียชีวิต ไม่มีการชันสูตร)</option>
              </select>
            </div>
          </div>

          {/* Audit Rule Summary Banner for Discharge */}
          {isSepsisDischargeConditionMet ? (
            <div className="mt-3 p-2.5 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-950 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-900">
                  เงื่อนไขจำหน่ายวิกฤตสอดคล้องกับ Sepsis & Septic Shock สปสช.:
                </span>{' '}
                ผู้ป่วยมีสถานะการจำหน่าย{' '}
                <strong>
                  {clinical.dischargeStatus === '3'
                    ? '3. ไม่ทุเลา (Not Improve)'
                    : clinical.dischargeStatus === '9'
                    ? '9. เสียชีวิต (Dead)'
                    : clinical.dischargeStatus}
                </strong>{' '}
                หรือประเภทการจำหน่าย{' '}
                <strong>
                  {clinical.dischargeType === '2'
                    ? '2. ขอกลับบ้าน (Against Advice)'
                    : clinical.dischargeType === '3'
                    ? '3. หลบหนี (By Escape)'
                    : clinical.dischargeType === '4'
                    ? '4. ส่งต่อ (By Transfer)'
                    : clinical.dischargeType}
                </strong>
                <p className="mt-1 text-3xs text-amber-800">
                  *สปสช. รองรับเกณฑ์วินิจฉัย Sepsis และ Septic Shock เมื่อมีหลักฐานอาการทรุดหนักหรือส่งต่อ/เสียชีวิต แม้ระยะเวลานอน รพ. สั้น เวชระเบียนต้องแนบใบส่งต่อ (Referral form), ใบยินยอมปฏิเสธการรักษา, หรือใบมรณบัตรกำกับ
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-3xs text-slate-500">
              *ตามเกณฑ์ สปสช. หากสถานะเป็น 3 หรือ 9 หรือประเภทเป็น 2, 3, 4 จะเข้าเงื่อนไขการตรวจประเมินภาวะวิกฤต Sepsis และ Septic Shock
            </p>
          )}
        </div>

        {/* Section B: SOFA & qSOFA Score Calculator */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                เครื่องคำนวณคะแนน SOFA / qSOFA (Organ Dysfunction Calculator)
              </h3>
            </div>

            {/* Tab switch */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
              <button
                type="button"
                id="btn-tab-qsofa"
                onClick={() => setActiveScoreTab('QSOFA')}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeScoreTab === 'QSOFA'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                qSOFA คัดกรองเบื้องต้น ({qResult.total}/3)
              </button>
              <button
                type="button"
                id="btn-tab-full-sofa"
                onClick={() => setActiveScoreTab('FULL_SOFA')}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeScoreTab === 'FULL_SOFA'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full SOFA อวัยวะล้มเหลว ({fullResult.total}/24)
              </button>
            </div>
          </div>

          {/* Quick Score Result Alert Banner */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isOverallHighRisk
                ? 'bg-rose-50 border-rose-300 text-rose-950'
                : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shrink-0 mt-0.5 ${
                  isOverallHighRisk ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                {activeScoreTab === 'QSOFA' ? qResult.total : fullResult.total}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm">
                    {isOverallHighRisk
                      ? '⚠️ เข้าเกณฑ์ High-Risk: บ่งชี้ภาวะอวัยวะล้มเหลว (Organ Dysfunction)'
                      : '✓ ปกติ / ความเสี่ยงต่ำ (Low Risk: ไม่พบสัญญาณอวัยวะล้มเหลวเฉียบพลัน)'}
                  </span>
                  <span
                    className={`text-3xs font-bold px-2 py-0.5 rounded-full ${
                      isOverallHighRisk
                        ? 'bg-rose-200 text-rose-800'
                        : 'bg-emerald-200 text-emerald-800'
                    }`}
                  >
                    {activeScoreTab === 'QSOFA'
                      ? `qSOFA = ${qResult.total} คะแนน`
                      : `SOFA = ${fullResult.total} คะแนน`}
                  </span>
                </div>
                <p className="text-2xs text-slate-600 mt-0.5">
                  {isOverallHighRisk
                    ? 'สปสช. Audit Flag: ต้องมีเอกสารตรวจยืนยันและสรุปผลกระทบต่ออวัยวะอย่างละเอียดในเวชระเบียน (เช่น ค่า Cr, Platelet, PaO2/FiO2, บันทึกการให้ยา Vasopressor)'
                    : 'ระดับความเสี่ยงปกติ ผู้ป่วยไม่มีภาวะแทรกซ้อนของอวัยวะล้มเหลวหลายระบบ'}
                </p>
              </div>
            </div>

            {isOverallHighRisk && (
              <div className="text-right shrink-0">
                <span className="text-3xs font-bold px-2 py-1 rounded bg-rose-600 text-white uppercase tracking-wider inline-block">
                  Audit Flag: High Risk Case
                </span>
              </div>
            )}
          </div>

          {/* Tab 1: qSOFA Tab Content */}
          {activeScoreTab === 'QSOFA' && (
            <div className="space-y-3">
              <div className="text-2xs text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  เกณฑ์ Sepsis-3 quick SOFA: หากได้คะแนน ≥ 2 คะแนน ถือว่ามีความเสี่ยงสูงต่อภาวะ Sepsis รุนแรง
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Respiratory rate */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    sofa.respiratoryRateOver22
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <input
                    id="chk-qsofa-rr"
                    type="checkbox"
                    checked={!!sofa.respiratoryRateOver22}
                    onChange={(e) => handleUpdateSofa({ respiratoryRateOver22: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      อัตราการหายใจ (RR) ≥ 22 /นาที
                    </span>
                    <span className="text-3xs text-slate-500">
                      Tachypnea หายใจเร็ว บ่งชี้การแลกเปลี่ยนก๊าซบกพร่อง (+1 คะแนน)
                    </span>
                  </div>
                </label>

                {/* 2. Systolic BP */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    sofa.systolicBpUnder100
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <input
                    id="chk-qsofa-sbp"
                    type="checkbox"
                    checked={!!sofa.systolicBpUnder100}
                    onChange={(e) => handleUpdateSofa({ systolicBpUnder100: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      ความดันโลหิตบน (SBP) ≤ 100 mmHg
                    </span>
                    <span className="text-3xs text-slate-500">
                      Hypotension ความดันโลหิตตก เสี่ยงต่อภาวะช็อก (+1 คะแนน)
                    </span>
                  </div>
                </label>

                {/* 3. Altered mental status */}
                <label
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                    sofa.alteredMentation
                      ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <input
                    id="chk-qsofa-gcs"
                    type="checkbox"
                    checked={!!sofa.alteredMentation}
                    onChange={(e) => handleUpdateSofa({ alteredMentation: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded mt-0.5 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      การรับรู้ผิดปกติ (GCS &lt; 15)
                    </span>
                    <span className="text-3xs text-slate-500">
                      Altered mentation สับสน ซึม เรียกไม่ค่อยรู้ตัว (+1 คะแนน)
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Tab 2: Full SOFA Subsystems Content */}
          {activeScoreTab === 'FULL_SOFA' && (
            <div className="space-y-4">
              <div className="text-2xs text-slate-500 flex items-center justify-between">
                <span>
                  ประเมิน 6 ระบบอวัยวะหลักตามเกณฑ์มาตรฐานสากล Sepsis-3 (คะแนนเพิ่มขึ้น ≥ 2 บ่งชี้ Sepsis)
                </span>
                {fullResult.affectedSystems.length > 0 && (
                  <span className="font-semibold text-rose-700">
                    อวัยวะที่มีปัญหา: {fullResult.affectedSystems.join(', ')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Respiration */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-2xs font-bold text-slate-800">
                      1. ระบบการหายใจ (Respiration - PaO₂/FiO₂)
                    </label>
                    <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      +{sofa.respirationScore || 0} คะแนน
                    </span>
                  </div>
                  <select
                    value={sofa.respirationScore ?? 0}
                    onChange={(e) => handleUpdateSofa({ respirationScore: parseInt(e.target.value, 10) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    {RESPIRATION_OPTIONS.map((opt) => (
                      <option key={opt.score} value={opt.score}>
                        [{opt.score} pt] {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Coagulation */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-2xs font-bold text-slate-800">
                      2. ระบบการแข็งตัวของเลือด (Coagulation - Platelets)
                    </label>
                    <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      +{sofa.coagulationScore || 0} คะแนน
                    </span>
                  </div>
                  <select
                    value={sofa.coagulationScore ?? 0}
                    onChange={(e) => handleUpdateSofa({ coagulationScore: parseInt(e.target.value, 10) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    {COAGULATION_OPTIONS.map((opt) => (
                      <option key={opt.score} value={opt.score}>
                        [{opt.score} pt] {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Liver */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-2xs font-bold text-slate-800">
                      3. การทำงานของตับ (Liver - Bilirubin)
                    </label>
                    <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      +{sofa.liverScore || 0} คะแนน
                    </span>
                  </div>
                  <select
                    value={sofa.liverScore ?? 0}
                    onChange={(e) => handleUpdateSofa({ liverScore: parseInt(e.target.value, 10) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    {LIVER_OPTIONS.map((opt) => (
                      <option key={opt.score} value={opt.score}>
                        [{opt.score} pt] {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Cardiovascular */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-2xs font-bold text-slate-800">
                      4. ระบบไหลเวียนโลหิต (Cardiovascular - MAP / Vasopressors)
                    </label>
                    <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      +{sofa.cardiovascularScore || 0} คะแนน
                    </span>
                  </div>
                  <select
                    value={sofa.cardiovascularScore ?? 0}
                    onChange={(e) => handleUpdateSofa({ cardiovascularScore: parseInt(e.target.value, 10) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    {CARDIOVASCULAR_OPTIONS.map((opt) => (
                      <option key={opt.score} value={opt.score}>
                        [{opt.score} pt] {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. CNS */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-2xs font-bold text-slate-800">
                      5. ระบบประสาท (Central Nervous System - GCS)
                    </label>
                    <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      +{sofa.cnsScore || 0} คะแนน
                    </span>
                  </div>
                  <select
                    value={sofa.cnsScore ?? 0}
                    onChange={(e) => handleUpdateSofa({ cnsScore: parseInt(e.target.value, 10) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    {CNS_OPTIONS.map((opt) => (
                      <option key={opt.score} value={opt.score}>
                        [{opt.score} pt] {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Renal */}
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-2xs font-bold text-slate-800">
                      6. ระบบไต (Renal - Creatinine / Urine Output)
                    </label>
                    <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                      +{sofa.renalScore || 0} คะแนน
                    </span>
                  </div>
                  <select
                    value={sofa.renalScore ?? 0}
                    onChange={(e) => handleUpdateSofa({ renalScore: parseInt(e.target.value, 10) })}
                    className="w-full text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white font-medium text-slate-800"
                  >
                    {RENAL_OPTIONS.map((opt) => (
                      <option key={opt.score} value={opt.score}>
                        [{opt.score} pt] {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section C: Lab & Fluid Evidence */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Hemoculture */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <TestTube className="w-4 h-4 text-purple-600" />
                <span>ผลเพาะเชื้อเลือด (Hemoculture)</span>
              </div>
              <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                CR1 บังคับ
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['positive', 'negative', 'not_sent'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => onChange({ ...clinical, hemoculture: status })}
                  className={`text-3xs sm:text-xs py-1.5 px-1 rounded-lg border font-medium transition-all cursor-pointer text-center ${
                    clinical.hemoculture === status
                      ? status === 'positive'
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {status === 'positive' ? 'พบเชื้อ (+)' : status === 'negative' ? 'ไม่พบเชื้อ (-)' : 'ไม่ได้ส่ง'}
                </button>
              ))}
            </div>
            {clinical.hemoculture === 'positive' && (
              <input
                type="text"
                value={clinical.cultureOrganism || ''}
                onChange={(e) => onChange({ ...clinical, cultureOrganism: e.target.value })}
                placeholder="ระบุเชื้อที่พบ เช่น E. coli, Klebsiella..."
                className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            )}
            <p className="text-3xs text-slate-500">
              *ต้องเจาะก่อนให้ยาปฏิชีวนะตามเกณฑ์ Hour-1 Bundle สปสช.
            </p>
          </div>

          {/* Serum Lactate Level (Mandatory Sepsis Marker) */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <FlaskConical className="w-4 h-4 text-amber-600" />
                <span>ระดับ Serum Lactate</span>
              </div>
              <span className="text-3xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                SSC / CR1
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => onChange({ ...clinical, lactateStatus: 'not_sent', lactateLevel: undefined })}
                className={`text-3xs py-1.5 px-1 rounded-lg border font-medium transition-all cursor-pointer text-center ${
                  !clinical.lactateLevel && (!clinical.lactateStatus || clinical.lactateStatus === 'not_sent')
                    ? 'bg-rose-700 text-white border-rose-700 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ไม่ได้ส่ง ⚠️
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...clinical, lactateStatus: 'normal', lactateLevel: 1.4 })}
                className={`text-3xs py-1.5 px-1 rounded-lg border font-medium transition-all cursor-pointer text-center ${
                  clinical.lactateLevel !== undefined && clinical.lactateLevel < 2.0
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ปกติ (&lt; 2.0)
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...clinical, lactateStatus: 'high', lactateLevel: 3.2 })}
                className={`text-3xs py-1.5 px-1 rounded-lg border font-medium transition-all cursor-pointer text-center ${
                  clinical.lactateLevel !== undefined && clinical.lactateLevel >= 2.0 && clinical.lactateLevel < 4.0
                    ? 'bg-amber-600 text-white border-amber-600 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                สูง (≥ 2.0)
              </button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1">
                <label className="text-3xs text-slate-500 block mb-0.5">ค่าแรกรับ (mmol/L):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="25"
                  value={clinical.lactateLevel ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    const status = val === undefined ? 'not_sent' : val >= 4.0 ? 'critical' : val >= 2.0 ? 'high' : 'normal';
                    onChange({ ...clinical, lactateLevel: val, lactateStatus: status });
                  }}
                  placeholder="เช่น 2.5, 4.2"
                  className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div className="flex-1">
                <label className="text-3xs text-slate-500 block mb-0.5">ซ้ำ 4 ชม. (mmol/L):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="25"
                  value={clinical.lactateRepeatLevel ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    onChange({ ...clinical, lactateRepeatLevel: val });
                  }}
                  placeholder="เช่น 1.8"
                  className="w-full text-xs px-2.5 py-1 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
            <p className="text-3xs text-slate-500">
              *ค่า ≥ 4.0 mmol/L บ่งชี้ภาวะ Septic Shock ต้องให้สารน้ำ ≥ 30 ml/kg
            </p>
          </div>

          {/* Blood Pressure / Shock State */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <Activity className="w-4 h-4 text-rose-600" />
              <span>ความดันโลหิตหลังให้สารน้ำ (MAP Status)</span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={clinical.mapUnder65}
                  onChange={(e) => onChange({ ...clinical, mapUnder65: e.target.checked })}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-slate-800 font-medium">
                  ความดันยังคงต่ำ (MAP &lt; 65 หรือ SBP &lt; 90) ดื้อต่อน้ำเกลือ
                </span>
              </label>
            </div>
            <p className="text-3xs text-slate-500">
              *เป็นเกณฑ์ชี้ขาดสำคัญของ Septic Shock หากให้น้ำเกลือแล้วความดันปกติ จะไม่เข้าเกณฑ์ช็อก
            </p>
          </div>
        </div>

        {/* Doctor Summary Note */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            สรุปการวินิจฉัยและการรักษาของแพทย์ในชาร์ต (Doctor's Progress / Discharge Summary):
          </label>
          <input
            type="text"
            value={clinical.clinicalSummary}
            onChange={(e) => onChange({ ...clinical, clinicalSummary: e.target.value })}
            placeholder="เช่น Urosepsis, Sepsis from gram-negative UTI, Acute Gastroenteritis with severe dehydration..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};
