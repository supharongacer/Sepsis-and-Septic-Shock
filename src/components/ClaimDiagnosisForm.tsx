import React, { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Info,
  Lightbulb,
  Sparkles,
  Wrench,
  Stethoscope,
  Clock,
  ShieldAlert,
  Zap,
  ArrowRight,
  HeartPulse,
  ArrowUpDown,
  Filter,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { DiagnosisEntry, ProcedureEntry, ClinicalProfile } from '../types';
import { ICD10_DATABASE } from '../data/rulesData';
import { NHSO_ICD9_DATABASE } from '../data/nhsoCodingRules';
import { DrgWeightBadge } from './DrgWeightBadge';
import {
  getDrgImpactForIcd10,
  getPdxDrgBaseInfo,
  calculateDrgSummary,
  DrgImpactTier,
} from '../utils/drgImpact';

interface SmartSuggestionItem {
  code: string;
  nameEn: string;
  nameTh: string;
  suggestedType: 'comorbid' | 'complication' | 'pdx';
  clinicalTrigger: string;
  nhsoBenefit: string;
}

interface ClaimDiagnosisFormProps {
  pdx: string;
  onPdxChange: (newPdx: string) => void;
  secondaryDx: DiagnosisEntry[];
  onSecondaryDxChange: (updated: DiagnosisEntry[]) => void;
  procedures?: ProcedureEntry[];
  onProceduresChange?: (updated: ProcedureEntry[]) => void;
  clinicalProfile?: ClinicalProfile;
  onOpenAdvisorModal?: () => void;
  recommendationsCount?: number;
  criticalRecommendationsCount?: number;
}

export const ClaimDiagnosisForm: React.FC<ClaimDiagnosisFormProps> = ({
  pdx,
  onPdxChange,
  secondaryDx,
  onSecondaryDxChange,
  procedures = [],
  onProceduresChange,
  clinicalProfile,
  onOpenAdvisorModal,
  recommendationsCount = 0,
  criticalRecommendationsCount = 0,
}) => {
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<'comorbid' | 'complication'>('comorbid');

  // DRG filtering & prioritization state
  const [drgFilter, setDrgFilter] = useState<'ALL' | DrgImpactTier>('ALL');
  const [sortByDrgPriority, setSortByDrgPriority] = useState<boolean>(true);

  // Procedure state
  const [newProcCode, setNewProcCode] = useState('');
  const [newProcType, setNewProcType] = useState<'principal' | 'secondary'>('secondary');

  const cleanPdx = pdx.trim().toUpperCase().replace(/\./g, '');
  const currentPdxInfo = ICD10_DATABASE[cleanPdx];

  // Base DRG role of Principal Diagnosis
  const pdxBaseInfo = useMemo(() => getPdxDrgBaseInfo(cleanPdx), [cleanPdx]);

  // DRG Summary & Metrics of Secondary Diagnoses
  const drgSummary = useMemo(() => calculateDrgSummary(secondaryDx), [secondaryDx]);

  // Processed (filtered and sorted by DRG review priority) Secondary Diagnoses list
  const displayedSecondaryDx = useMemo(() => {
    let list = [...secondaryDx];
    if (drgFilter !== 'ALL') {
      list = list.filter((item) => getDrgImpactForIcd10(item.code).tier === drgFilter);
    }
    if (sortByDrgPriority) {
      list.sort((a, b) => {
        const priorityA = getDrgImpactForIcd10(a.code).priorityLevel;
        const priorityB = getDrgImpactForIcd10(b.code).priorityLevel;
        return priorityA - priorityB;
      });
    }
    return list;
  }, [secondaryDx, drgFilter, sortByDrgPriority]);

  // =========================================================================
  // Smart Suggestion Engine based on Clinical Profile & SOFA Scores
  // =========================================================================
  const smartSuggestions = useMemo(() => {
    if (!clinicalProfile) return [];
    const suggestions: SmartSuggestionItem[] = [];
    const currentCodes = new Set([
      cleanPdx,
      ...secondaryDx.map((s) => s.code.trim().toUpperCase().replace(/\./g, '')),
    ]);

    const sofa = clinicalProfile.sofaScores;

    // 1. Renal failure (SOFA renal >= 2 or hasOrganDysfunction)
    if ((sofa && (sofa.renalScore ?? 0) >= 2) || clinicalProfile.hasOrganDysfunction) {
      if (!currentCodes.has('N179')) {
        suggestions.push({
          code: 'N179',
          nameEn: 'Acute kidney failure, unspecified',
          nameTh: 'ไตวายเฉียบพลัน',
          suggestedType: 'complication',
          clinicalTrigger: `SOFA Renal Score = ${sofa?.renalScore ?? 2} (Creatinine ≥ 2.0 mg/dL หรือ ปัสสาวะลดลง)`,
          nhsoBenefit: 'บันทึกเป็นโรคแทรก (Complication) ช่วยสะท้อนความรุนแรงและเพิ่มค่าน้ำหนัก AdjRW ตามเกณฑ์ สปสช.',
        });
      }
    }

    // 2. Acute Respiratory Failure (SOFA respiration >= 2 or ventilator procedure)
    const hasVentProc = procedures.some((p) => {
      const c = p.code.replace(/\./g, '');
      return c === '9671' || c === '9672' || c === '9604';
    });
    if ((sofa && (sofa.respirationScore ?? 0) >= 2) || hasVentProc) {
      if (!currentCodes.has('J9600') && !currentCodes.has('J960')) {
        suggestions.push({
          code: 'J9600',
          nameEn: 'Acute respiratory failure, unspecified',
          nameTh: 'ภาวะหายใจล้มเหลวเฉียบพลัน',
          suggestedType: 'complication',
          clinicalTrigger: hasVentProc
            ? 'มีหัตถการใช้เครื่องช่วยหายใจ (Ventilator 9671/9672)'
            : `SOFA Respiration = ${sofa?.respirationScore} (PaO₂/FiO₂ < 300)`,
          nhsoBenefit: 'โรคร่วมรุนแรง (Major CC) ตามมาตรฐานการตรวจประเมิน สปสช.',
        });
      }
    }

    // 3. Septic Shock (MAP < 65 or SOFA cardio >= 2)
    if (clinicalProfile.mapUnder65 || (sofa && (sofa.cardiovascularScore ?? 0) >= 2)) {
      if (!currentCodes.has('R572')) {
        suggestions.push({
          code: 'R572',
          nameEn: 'Septic shock',
          nameTh: 'ภาวะช็อกเหตุพิษติดเชื้อ',
          suggestedType: 'complication',
          clinicalTrigger: `ความดันตกหลังให้น้ำเกลือ (MAP < 65 mmHg) หรือ SOFA Cardio = ${sofa?.cardiovascularScore ?? 2}`,
          nhsoBenefit: 'ต้องระบุเป็น "โรคแทรก (Complication)" เท่านั้น และมีรายการ Vasopressor ในชาร์ต',
        });
      }
    }

    // 4. Thrombocytopenia / Coagulopathy (SOFA Coagulation >= 2)
    if (sofa && (sofa.coagulationScore ?? 0) >= 2) {
      if (!currentCodes.has('D696')) {
        suggestions.push({
          code: 'D696',
          nameEn: 'Thrombocytopenia, unspecified',
          nameTh: 'เกล็ดเลือดต่ำ',
          suggestedType: 'complication',
          clinicalTrigger: `SOFA Coagulation = ${sofa.coagulationScore} (Platelets < 100 ×10³/µL)`,
          nhsoBenefit: 'ภาวะแทรกซ้อนทางโลหิตวิทยาจากภาวะ Sepsis รุนแรง',
        });
      }
    }

    // 5. Hepatic failure (SOFA liver >= 2)
    if (sofa && (sofa.liverScore ?? 0) >= 2) {
      if (!currentCodes.has('K720')) {
        suggestions.push({
          code: 'K720',
          nameEn: 'Acute and subacute hepatic failure',
          nameTh: 'ภาวะตับวายเฉียบพลัน',
          suggestedType: 'complication',
          clinicalTrigger: `SOFA Liver = ${sofa.liverScore} (Bilirubin ≥ 2.0 mg/dL)`,
          nhsoBenefit: 'ตับวายเฉียบพลันจากภาวะช็อกหรือติดเชื้อในกระแสเลือด',
        });
      }
    }

    // 6. Hemoculture positive with specific organism
    if (clinicalProfile.hemoculture === 'positive' && clinicalProfile.cultureOrganism) {
      const org = clinicalProfile.cultureOrganism.toLowerCase();
      if ((org.includes('e. coli') || org.includes('klebsiella') || org.includes('gram-negative')) && !currentCodes.has('A415')) {
        suggestions.push({
          code: 'A415',
          nameEn: 'Septicaemia due to other Gram-negative organisms',
          nameTh: 'การติดเชื้อกรัมลบในกระแสเลือด (E. coli, Klebsiella)',
          suggestedType: cleanPdx.startsWith('A41') ? 'pdx' : 'comorbid',
          clinicalTrigger: `ผลเพาะเชื้อเลือดพบ ${clinicalProfile.cultureOrganism}`,
          nhsoBenefit: 'สปสช. แนะนำให้ระบุรหัสเชื้อเฉพาะเจาะจงแทนรหัส A419 เมื่อผลเพาะเชื้อยืนยัน',
        });
      } else if (org.includes('staph') && !currentCodes.has('A410')) {
        suggestions.push({
          code: 'A410',
          nameEn: 'Septicaemia due to Staphylococcus aureus',
          nameTh: 'การติดเชื้อ Staph aureus ในกระแสเลือด',
          suggestedType: cleanPdx.startsWith('A41') ? 'pdx' : 'comorbid',
          clinicalTrigger: `ผลเพาะเชื้อเลือดพบ ${clinicalProfile.cultureOrganism}`,
          nhsoBenefit: 'รหัสเชื้อเฉพาะเจาะจงลดข้อโต้แย้งจากผู้ตรวจประเมิน สปสช.',
        });
      }
    }

    // 7. Discharge Criteria Sepsis/Shock alignment
    const isStatusCritical = clinicalProfile.dischargeStatus === '3' || clinicalProfile.dischargeStatus === '9';
    const isTypeCritical =
      clinicalProfile.dischargeType === '2' || clinicalProfile.dischargeType === '3' || clinicalProfile.dischargeType === '4';
    if (isStatusCritical || isTypeCritical) {
      if (!currentCodes.has('A419') && !currentCodes.has('A415') && !cleanPdx.startsWith('A4')) {
        suggestions.push({
          code: 'A419',
          nameEn: 'Sepsis, unspecified organism',
          nameTh: 'ภาวะพิษเหตุติดเชื้อ (Sepsis)',
          suggestedType: 'pdx',
          clinicalTrigger: 'สถานะจำหน่ายเข้าเกณฑ์วิกฤต (3. ไม่ทุเลา หรือ 9. เสียชีวิต หรือ ส่งต่อ/ขอกลับบ้าน)',
          nhsoBenefit: 'เข้าเงื่อนไขวินิจฉัย Sepsis สปสช. กรณีอาการทรุดลงอย่างรวดเร็ว',
        });
      }
    }

    // 8. Dehydration / Volume depletion (fluid resuscitation >= 1000ml)
    if (clinicalProfile.fluidResuscitationMl >= 1000 && !currentCodes.has('E86')) {
      suggestions.push({
        code: 'E86',
        nameEn: 'Volume depletion',
        nameTh: 'ภาวะขาดสารน้ำรุนแรง (Dehydration)',
        suggestedType: 'comorbid',
        clinicalTrigger: `ได้รับสารน้ำกู้ชีพ ${clinicalProfile.fluidResuscitationMl.toLocaleString()} mL`,
        nhsoBenefit: 'โรคร่วมแสดงภาวะขาดสารน้ำสอดคล้องกับปริมาณน้ำเกลือที่ใช้',
      });
    }

    return suggestions;
  }, [clinicalProfile, cleanPdx, secondaryDx, procedures]);

  // Handler to apply smart suggestion
  const handleApplySuggestion = (sugg: SmartSuggestionItem) => {
    const targetCode = sugg.code.replace(/\./g, '');
    if (sugg.suggestedType === 'pdx') {
      onPdxChange(targetCode);
      return;
    }

    // Add as secondary diagnosis
    const matchedInfo = ICD10_DATABASE[targetCode];
    const newEntry: DiagnosisEntry = {
      id: `sdx_smart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      code: targetCode,
      version: '2010',
      descriptionEn: matchedInfo ? matchedInfo.nameEn : sugg.nameEn,
      descriptionTh: matchedInfo ? matchedInfo.nameTh : sugg.nameTh,
      diagType: sugg.suggestedType,
    };

    onSecondaryDxChange([...secondaryDx, newEntry]);
  };

  const handleAddSdx = (codeToAdd?: string, forcedType?: 'comorbid' | 'complication') => {
    const targetCode = (codeToAdd || newCode).trim().toUpperCase().replace(/\./g, '');
    if (!targetCode) return;

    const matchedInfo = ICD10_DATABASE[targetCode];
    const newEntry: DiagnosisEntry = {
      id: `sdx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      code: targetCode,
      version: '2010',
      descriptionEn: matchedInfo ? matchedInfo.nameEn : 'Other specified condition',
      descriptionTh: matchedInfo ? matchedInfo.nameTh : 'ภาวะผิดปกติอื่นๆ ที่ระบุ',
      diagType: forcedType || (matchedInfo && matchedInfo.allowedSdxTypes.length === 1 ? matchedInfo.allowedSdxTypes[0] : newType),
    };

    onSecondaryDxChange([...secondaryDx, newEntry]);
    setNewCode('');
  };

  const handleRemoveSdx = (id: string) => {
    onSecondaryDxChange((secondaryDx || []).filter((item) => item.id !== id));
  };

  const handleTypeChange = (id: string, newTypeValue: 'comorbid' | 'complication') => {
    onSecondaryDxChange(
      secondaryDx.map((item) =>
        item.id === id ? { ...item, diagType: newTypeValue } : item
      )
    );
  };

  // Procedure handlers
  const handleAddProcedure = (codeToAdd?: string, forcedProcType?: 'principal' | 'secondary') => {
    if (!onProceduresChange) return;
    const targetCode = (codeToAdd || newProcCode).trim().toUpperCase().replace(/\./g, '');
    if (!targetCode) return;

    const matchedInfo = NHSO_ICD9_DATABASE[targetCode];
    const newProc: ProcedureEntry = {
      id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      code: targetCode,
      version: '2010',
      descriptionEn: matchedInfo ? matchedInfo.nameEn : 'Other specified procedure',
      descriptionTh: matchedInfo ? matchedInfo.nameTh : 'หัตถการอื่นๆ ที่ระบุ',
      procType: forcedProcType || newProcType,
      auditRisk: matchedInfo ? matchedInfo.auditRisk : 'NORMAL',
      auditNote: matchedInfo ? matchedInfo.nhsoCondition : undefined,
    };

    onProceduresChange([...procedures, newProc]);
    setNewProcCode('');
  };

  const handleRemoveProcedure = (id: string) => {
    if (!onProceduresChange) return;
    onProceduresChange((procedures || []).filter((p) => p.id !== id));
  };

  const handleProcTypeChange = (id: string, newTypeVal: 'principal' | 'secondary') => {
    if (!onProceduresChange) return;
    onProceduresChange(
      procedures.map((p) => (p.id === id ? { ...p, procType: newTypeVal } : p))
    );
  };

  const commonQuickCodes = ['A415', 'A419', 'R572', 'R571', 'A090', 'E834', 'E833', 'M1099', 'N390', 'N179'];
  const commonQuickProcedures = [
    { code: '9671', label: '9671 Vent<96h' },
    { code: '9672', label: '9672 Vent≥96h' },
    { code: '9604', label: '9604 Intubation' },
    { code: '8962', label: '8962 CVP' },
    { code: '3995', label: '3995 ฟอกไต' },
    { code: '8622', label: '8622 ล้างแผลลึก' },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
            1
          </span>
          <h2 className="font-semibold text-slate-800 text-base">
            ข้อมูลการวินิจฉัยโรคและหัตถการ (Diagnoses & Procedures)
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {onOpenAdvisorModal && (
            <button
              type="button"
              id="btn-open-coding-advisor-inline"
              onClick={onOpenAdvisorModal}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer shadow-2xs ${
                criticalRecommendationsCount > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                  : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>คำแนะนำรหัส สปสช. ({recommendationsCount})</span>
            </button>
          )}
          <span className="text-xs text-slate-500 hidden md:inline">
            e-Claim 18 แฟ้ม (รหัสไม่มีจุดทศนิยม)
          </span>
        </div>
      </div>

      {/* Smart Coding Advisor Banner */}
      {recommendationsCount > 0 && onOpenAdvisorModal && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-100/50 to-orange-50 border-b border-amber-200 px-5 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 text-xs text-amber-900">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>สปสช. Coding Advisor:</strong> มีข้อเสนอแนะการให้รหัส <strong>{recommendationsCount} ข้อ</strong> สำหรับเคสนี้
              {criticalRecommendationsCount > 0 && (
                <span className="text-rose-700 font-bold ml-1">
                  (พบข้อผิดพลาดร้ายแรง {criticalRecommendationsCount} ข้อ ที่เสี่ยงติด DENY)
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenAdvisorModal}
            className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer shrink-0"
          >
            เปิดดูคำแนะนำ & นำรหัสไปใช้ &rarr;
          </button>
        </div>
      )}

      {/* Smart Suggestion Engine Box (Based on SOFA / Clinical Profile) */}
      {smartSuggestions.length > 0 && (
        <div className="bg-indigo-50/70 border-b border-indigo-200 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
              <h3 className="text-xs font-bold text-indigo-950">
                Smart Suggestion: แนะนำรหัส ICD-10 โรคร่วม/โรคแทรกจากหลักฐานคลินิก & SOFA Score ({smartSuggestions.length} รายการ)
              </h3>
            </div>
            <span className="text-3xs px-2 py-0.5 rounded-full bg-indigo-200/80 text-indigo-900 font-semibold">
              NHSO Audit Standards
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {smartSuggestions.map((sugg) => (
              <div
                key={`sugg_${sugg.code}`}
                className="p-2.5 rounded-lg bg-white border border-indigo-200 shadow-2xs flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded">
                        {sugg.code}
                      </span>
                      <DrgWeightBadge code={sugg.code} size="xs" />
                    </div>
                    <span
                      className={`text-3xs font-semibold px-2 py-0.5 rounded-full ${
                        sugg.suggestedType === 'complication'
                          ? 'bg-blue-100 text-blue-800'
                          : sugg.suggestedType === 'pdx'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      แนะนำเป็น: {sugg.suggestedType === 'complication' ? 'โรคแทรก' : sugg.suggestedType === 'pdx' ? 'โรคหลัก' : 'โรคร่วม'}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {sugg.nameTh}
                  </div>
                  <div className="text-3xs text-slate-500">
                    {sugg.nameEn}
                  </div>
                  <div className="mt-1.5 text-2xs text-indigo-900 bg-indigo-50/60 p-1.5 rounded border border-indigo-100">
                    <span className="font-semibold text-indigo-950">ตรวจพบคีย์คลินิก:</span> {sugg.clinicalTrigger}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplySuggestion(sugg)}
                  className="w-full inline-flex items-center justify-center gap-1 text-xs py-1.5 px-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มรหัส {sugg.code} เข้าระบบทันที</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-5 space-y-6">
        {/* Section 1: Principal Diagnosis */}
        <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2.5">
            <label htmlFor="input-pdx" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-blue-600" />
              <span>การวินิจฉัยหลัก (Principal Diagnosis - PDx)</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500">รหัสที่พบบ่อย (ไม่มีจุด):</span>
              {['A415', 'A419', 'N390', 'A090'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onPdxChange(code)}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    cleanPdx === code
                      ? 'bg-blue-600 text-white border-blue-600 font-medium'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <div className="relative">
                <input
                  id="input-pdx"
                  type="text"
                  value={pdx.replace(/\./g, '')}
                  onChange={(e) => onPdxChange(e.target.value.toUpperCase().replace(/\./g, ''))}
                  placeholder="เช่น A415"
                  className="w-full font-mono font-bold text-base px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="md:col-span-9 flex items-center">
              {currentPdxInfo ? (
                <div className="text-xs sm:text-sm text-slate-700 space-y-1 w-full">
                  <div className="font-medium text-slate-900 flex flex-wrap items-center gap-2">
                    <span>{currentPdxInfo.nameEn}</span>
                    <span className="text-xs font-normal text-slate-500">({currentPdxInfo.nameTh})</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span
                      id="pdx-base-drg-indicator"
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-3xs font-semibold ${pdxBaseInfo.style.badgeBg} ${pdxBaseInfo.style.badgeText} ${pdxBaseInfo.style.badgeBorder}`}
                      title={pdxBaseInfo.descriptionTh}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${pdxBaseInfo.style.dotBg}`} />
                      <span className="font-bold">{pdxBaseInfo.badgeLabelTh}</span>
                      <span className="opacity-80">({pdxBaseInfo.baseRwEstimateTh})</span>
                    </span>
                    <span className="text-3xs text-slate-500">
                      *รหัสโรคหลักกำหนด Base DRG เริ่มต้นก่อนผนวกค่าน้ำหนักจากโรคร่วม (SDx)
                    </span>
                  </div>

                  {currentPdxInfo.warningNote && (
                    <div className="text-amber-700 flex items-center gap-1 text-xs pt-0.5">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{currentPdxInfo.warningNote}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic">
                  ใส่รหัส ICD-10 สากล 4 หลักไม่มีจุด (เช่น A419 = Sepsis, A415 = Gram-negative sepsis)
                </div>
              )}
            </div>
          </div>

          {['R570', 'R571', 'R572', 'R578', 'R579'].includes(cleanPdx) && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <span className="font-bold">คำเตือนกฎ CR1 & CR37:</span> รหัสกลุ่ม Shock ({cleanPdx}) <strong>ห้ามเป็นโรคหลักเด็ดขาด!</strong> ต้องเปลี่ยนเป็นโรคติดเชื้อต้นเหตุ (เช่น A419) และย้าย Shock ไปเป็นการวินิจฉัยรองประเภท "โรคแทรก (Complication)"
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Secondary Diagnoses Table with DRG Impact Prioritization */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-600" />
                <span>การวินิจฉัยรอง ICD-10 (Secondary Diagnoses - SDx)</span>
                <span className="text-xs font-normal text-slate-500">
                  ({secondaryDx.length} รายการ - ไม่มีจุดทศนิยม)
                </span>
              </h3>
              <p className="text-3xs text-slate-500 mt-0.5">
                จำแนกตามผลต่อน้ำหนักสัมพัทธ์ (DRG Weight) เพื่อจัดลำดับความสำคัญในการตรวจสอบเวชระเบียน (Audit Readiness)
              </p>
            </div>

            {/* Quick add chips */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-400">เพิ่มด่วน:</span>
              {commonQuickCodes.map((code) => {
                const impact = getDrgImpactForIcd10(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleAddSdx(code)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer font-mono text-3xs"
                    title={`เพิ่ม ${code} (${impact.titleTh} - ${impact.badgeLabel})`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${impact.style.dotBg}`} />
                    <span>+{code}</span>
                    <span className="text-4xs opacity-75 font-sans font-bold">[{impact.badgeLabel}]</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DRG Weight Summary & Prioritization Bar */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            {/* Filter buttons by DRG Impact Tier */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-3xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>กรองระดับ DRG:</span>
              </span>

              {/* All */}
              <button
                type="button"
                id="filter-drg-all"
                onClick={() => setDrgFilter('ALL')}
                className={`px-2 py-0.5 rounded text-3xs font-medium border transition-colors cursor-pointer ${
                  drgFilter === 'ALL'
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด ({secondaryDx.length})
              </button>

              {/* MCC Filter */}
              <button
                type="button"
                id="filter-drg-mcc"
                onClick={() => setDrgFilter(drgFilter === 'MCC' ? 'ALL' : 'MCC')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-medium border transition-colors cursor-pointer ${
                  drgFilter === 'MCC'
                    ? 'bg-rose-700 text-white border-rose-700 shadow-2xs font-bold'
                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                }`}
                title="Major Complication/Comorbidity: มีผลเพิ่มค่าน้ำหนักสัมพัทธ์สูงสุด (Audit อันดับ 1)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>MCC ({drgSummary.mccCount})</span>
              </button>

              {/* CC Filter */}
              <button
                type="button"
                id="filter-drg-cc"
                onClick={() => setDrgFilter(drgFilter === 'CC' ? 'ALL' : 'CC')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-medium border transition-colors cursor-pointer ${
                  drgFilter === 'CC'
                    ? 'bg-amber-700 text-white border-amber-700 shadow-2xs font-bold'
                    : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                }`}
                title="Complication/Comorbidity: มีผลเพิ่มค่าน้ำหนักปานกลาง (Audit อันดับ 2)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>CC ({drgSummary.ccCount})</span>
              </button>

              {/* Minor Filter */}
              <button
                type="button"
                id="filter-drg-minor"
                onClick={() => setDrgFilter(drgFilter === 'MINOR' ? 'ALL' : 'MINOR')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-medium border transition-colors cursor-pointer ${
                  drgFilter === 'MINOR'
                    ? 'bg-blue-700 text-white border-blue-700 shadow-2xs font-bold'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
                title="Minor CC: มีผลต่อน้ำหนักเล็กน้อย (Audit อันดับ 3)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Minor ({drgSummary.minorCount})</span>
              </button>

              {/* Non-CC Filter */}
              <button
                type="button"
                id="filter-drg-non-cc"
                onClick={() => setDrgFilter(drgFilter === 'NON_CC' ? 'ALL' : 'NON_CC')}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-3xs font-medium border transition-colors cursor-pointer ${
                  drgFilter === 'NON_CC'
                    ? 'bg-slate-600 text-white border-slate-600 shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
                title="Non-CC: ไม่มีผลต่อน้ำหนัก DRG (Audit อันดับ 4)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Non-CC ({drgSummary.nonCcCount})</span>
              </button>
            </div>

            {/* Sort & Cumulative RW Metrics */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-toggle-sort-drg"
                onClick={() => setSortByDrgPriority(!sortByDrgPriority)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-3xs font-semibold border transition-all cursor-pointer ${
                  sortByDrgPriority
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 ring-1 ring-indigo-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="จัดลำดับแสดงรหัสที่ส่งผลต่อ DRG และถูกตรวจเข้มงวดที่สุดขึ้นก่อน (MCC -> CC -> Minor -> Non-CC)"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{sortByDrgPriority ? 'เรียงตาม DRG Priority (MCC ขึ้นก่อน)' : 'เรียงตามลำดับป้อนข้อมูล'}</span>
              </button>

              <div
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-3xs font-semibold"
                title="ผลรวมการเพิ่มค่าน้ำหนักสัมพัทธ์ (Relative Weight) โดยประมาณจากรหัสโรคร่วมทั้งหมด"
              >
                <span>ผลกระทบ DRG รวม:</span>
                <span className="font-bold text-emerald-700">{drgSummary.estimatedCumulativeRwImpactTh}</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                  <th className="py-2.5 px-3 w-44">รหัสโรค & ผลต่อ DRG</th>
                  <th className="py-2.5 px-3">คำอธิบายภาษาอังกฤษ / ไทย & ลำดับ Audit</th>
                  <th className="py-2.5 px-3 w-48 text-center bg-slate-200/60">ประเภทโรครอง (สำคัญมาก)</th>
                  <th className="py-2.5 px-3 w-16 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {displayedSecondaryDx.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      {drgFilter !== 'ALL' ? (
                        <div className="space-y-1.5">
                          <p>ไม่มีรหัสโรคในกลุ่ม {drgFilter} ในรายการปัจจุบัน</p>
                          <button
                            type="button"
                            onClick={() => setDrgFilter('ALL')}
                            className="text-xs text-blue-600 underline cursor-pointer"
                          >
                            แสดงรหัสโรคทั้งหมด
                          </button>
                        </div>
                      ) : (
                        'ยังไม่มีการระบุการวินิจฉัยรอง สามารถเพิ่มรหัสด้านล่างนี้ได้'
                      )}
                    </td>
                  </tr>
                ) : (
                  displayedSecondaryDx.map((item, idx) => {
                    const cleanCode = item.code.toUpperCase().replace(/\./g, '');
                    const info = ICD10_DATABASE[cleanCode];
                    const drgImpact = getDrgImpactForIcd10(cleanCode);
                    const isShock = cleanCode.startsWith('R57');
                    const isComorbidWrong = isShock && item.diagType === 'comorbid';

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50 transition-colors ${
                          isComorbidWrong
                            ? 'bg-rose-50/50'
                            : drgImpact.tier === 'MCC'
                            ? 'bg-rose-50/15'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>

                        {/* Code and DRG Weight Badge */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-xs">
                              {cleanCode}
                            </span>
                            <DrgWeightBadge
                              code={cleanCode}
                              size="xs"
                              customId={`drg-badge-${item.id}`}
                            />
                          </div>
                        </td>

                        {/* Description & Review Priority Indicators */}
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-slate-800">
                            {info ? info.nameEn : item.descriptionEn}
                          </div>
                          <div className="text-slate-500 text-3xs">
                            {info ? info.nameTh : item.descriptionTh}
                          </div>

                          {/* DRG Priority and Scrutiny helper */}
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {drgImpact.tier === 'MCC' && (
                              <span className="inline-flex items-center gap-1 text-3xs font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                อันดับ 1: ผลต่อค่าน้ำหนักสูงสุด (ต้องมีบันทึกและผลตรวจชัดเจน)
                              </span>
                            )}
                            {drgImpact.tier === 'CC' && (
                              <span className="inline-flex items-center gap-1 text-3xs font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/80">
                                อันดับ 2: ผลต่อน้ำหนักปานกลาง ({drgImpact.rwImpactEstimateTh})
                              </span>
                            )}
                          </div>

                          {isComorbidWrong && (
                            <div className="text-rose-600 font-semibold text-3xs mt-1 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>ผิดกฎ สปสช.! ภาวะช็อกต้องเป็น "โรคแทรก" เท่านั้น</span>
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center bg-slate-50/50">
                          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white shadow-2xs">
                            <button
                              id={`btn-type-comorbid-${item.id}`}
                              type="button"
                              onClick={() => handleTypeChange(item.id, 'comorbid')}
                              className={`px-2 py-1 text-3xs font-semibold rounded-md transition-all cursor-pointer ${
                                item.diagType === 'comorbid'
                                  ? isShock
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-800 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              โรคร่วม (Co-morbid)
                            </button>
                            <button
                              id={`btn-type-complication-${item.id}`}
                              type="button"
                              onClick={() => handleTypeChange(item.id, 'complication')}
                              className={`px-2 py-1 text-3xs font-semibold rounded-md transition-all cursor-pointer ${
                                item.diagType === 'complication'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              โรคแทรก (Complication)
                            </button>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <button
                            id={`btn-remove-sdx-${item.id}`}
                            type="button"
                            onClick={() => handleRemoveSdx(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="ลบแถวนี้"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Add Row Input bar */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <div className="relative flex-1">
              <input
                id="input-new-sdx-code"
                type="text"
                value={newCode.replace(/\./g, '')}
                onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\./g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSdx();
                  }
                }}
                placeholder="พิมพ์รหัส ICD-10 ไม่มีจุด เช่น R572, N179, E872, J9600..."
                className="w-full text-xs font-mono px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>

            <select
              id="select-new-sdx-type"
              value={newType}
              onChange={(e) => setNewType(e.target.value as 'comorbid' | 'complication')}
              className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 cursor-pointer"
            >
              <option value="comorbid">ประเภท: โรคร่วม (Co-morbid)</option>
              <option value="complication">ประเภท: โรคแทรก (Complication)</option>
            </select>

            <button
              id="btn-add-sdx"
              type="button"
              onClick={() => handleAddSdx()}
              disabled={!newCode.trim()}
              className="inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มรหัส ICD-10</span>
            </button>
          </div>
        </div>

        {/* Section 3: Procedures (ICD-9-CM) - NO DOTS */}
        {onProceduresChange && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-800">
                  ข้อมูลหัตถการทางการแพทย์ ICD-9-CM (Procedures - ไม่มีจุดทศนิยม)
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium font-mono">
                  {procedures.length} รายการ
                </span>
              </div>

              {/* Quick Add Procedures without dots */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400">หัตถการด่วน:</span>
                {commonQuickProcedures.map((proc) => (
                  <button
                    key={proc.code}
                    type="button"
                    onClick={() => handleAddProcedure(proc.code)}
                    className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer text-3xs font-semibold font-mono"
                  >
                    +{proc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Procedures Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                    <th className="py-2.5 px-3 w-28">รหัส ICD-9</th>
                    <th className="py-2.5 px-3">ชื่อหัตถการ / ข้อกำหนดเวชระเบียน</th>
                    <th className="py-2.5 px-3 w-40 text-center">ประเภทหัตถการ</th>
                    <th className="py-2.5 px-3 w-28 text-center">ความเสี่ยง Audit</th>
                    <th className="py-2.5 px-3 w-16 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {procedures.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                        ยังไม่มีรายการหัตถการ (สามารถเพิ่มรหัส เช่น 9671 สำหรับเครื่องช่วยหายใจ, 9604 ใส่ท่อ, 8962 CVP)
                      </td>
                    </tr>
                  ) : (
                    procedures.map((proc, idx) => {
                      const cleanCode = proc.code.replace(/\./g, '');
                      const info = NHSO_ICD9_DATABASE[cleanCode];

                      return (
                        <tr key={proc.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                              {cleanCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-900">
                              {info ? info.nameTh : proc.descriptionTh}
                            </div>
                            <div className="text-3xs text-slate-500">
                              {info ? info.nameEn : proc.descriptionEn}
                            </div>
                            {info && info.auditRisk === 'HIGH' && (
                              <div className="text-rose-600 font-medium text-3xs mt-0.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>สปสช. ตรวจสอบ 100%: ต้องมี Operative/Ventilator Note ฉบับสมบูรณ์</span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <select
                              value={proc.procType}
                              onChange={(e) =>
                                handleProcTypeChange(proc.id, e.target.value as 'principal' | 'secondary')
                              }
                              className="text-3xs px-2 py-1 rounded border border-slate-200 bg-white font-medium text-slate-700 cursor-pointer"
                            >
                              <option value="secondary">หัตถการรอง (Secondary)</option>
                              <option value="principal">หัตถการหลัก (Principal)</option>
                            </select>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`text-3xs px-2 py-0.5 rounded-full font-bold ${
                                info?.auditRisk === 'HIGH'
                                  ? 'bg-rose-100 text-rose-800'
                                  : info?.auditRisk === 'MEDIUM'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {info?.auditRisk || 'NORMAL'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveProcedure(proc.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="ลบหัตถการนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Add Procedure Input Bar */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  id="input-new-proc-code"
                  type="text"
                  value={newProcCode.replace(/\./g, '')}
                  onChange={(e) => setNewProcCode(e.target.value.toUpperCase().replace(/\./g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddProcedure();
                    }
                  }}
                  placeholder="พิมพ์รหัส ICD-9-CM ไม่มีจุด เช่น 9671, 9672, 9604, 8962, 3995, 8622..."
                  className="w-full text-xs font-mono px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <select
                id="select-new-proc-type"
                value={newProcType}
                onChange={(e) => setNewProcType(e.target.value as 'principal' | 'secondary')}
                className="text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 cursor-pointer"
              >
                <option value="secondary">หัตถการรอง (Secondary)</option>
                <option value="principal">หัตถการหลัก (Principal)</option>
              </select>

              <button
                id="btn-add-procedure"
                type="button"
                onClick={() => handleAddProcedure()}
                disabled={!newProcCode.trim()}
                className="inline-flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มหัตถการ</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
