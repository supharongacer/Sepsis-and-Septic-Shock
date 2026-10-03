import React, { useState, useMemo } from 'react';
import {
  X,
  Lightbulb,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Plus,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  Wrench,
  Stethoscope,
  Info,
  Clock,
  FileCheck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  DiagnosisEntry,
  MedicationItem,
  ClinicalProfile,
  ProcedureEntry,
  IcdRecommendation,
} from '../types';
import {
  NHSO_ICD9_DATABASE,
  NHSO_ICD10_RULES,
  getCaseCodingRecommendations,
  NhsoIcd9Info,
  NhsoIcd10RuleInfo,
} from '../data/nhsoCodingRules';

interface NhsoCodingAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdx: string;
  secondaryDx: DiagnosisEntry[];
  medications?: MedicationItem[];
  clinicalProfile?: ClinicalProfile;
  procedures?: ProcedureEntry[];
  recommendations?: IcdRecommendation[];
  onApplyRecommendation: (rec: IcdRecommendation) => void;
}

export const NhsoCodingAdvisorModal: React.FC<NhsoCodingAdvisorModalProps> = ({
  isOpen,
  onClose,
  pdx,
  secondaryDx,
  medications = [],
  clinicalProfile,
  procedures = [],
  recommendations: externalRecommendations,
  onApplyRecommendation,
}) => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'icd10' | 'icd9' | 'golden_rules'>('recommendations');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcd10Cat, setSelectedIcd10Cat] = useState<string>('all');
  const [selectedIcd9Cat, setSelectedIcd9Cat] = useState<string>('all');
  const [appliedRecIds, setAppliedRecIds] = useState<Set<string>>(new Set());

  // Compute recommendations reactively if not provided
  const computedRecommendations = useMemo(() => {
    if (externalRecommendations) return externalRecommendations;
    return getCaseCodingRecommendations(
      pdx,
      secondaryDx || [],
      medications || [],
      clinicalProfile,
      procedures || []
    );
  }, [externalRecommendations, pdx, secondaryDx, medications, clinicalProfile, procedures]);

  const recommendations = externalRecommendations || computedRecommendations || [];

  if (!isOpen) return null;

  const handleApply = (rec: IcdRecommendation) => {
    onApplyRecommendation(rec);
    setAppliedRecIds((prev) => new Set(prev).add(rec.id));
  };

  // Filter ICD-10 database
  const filteredIcd10List = Object.values(NHSO_ICD10_RULES).filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryTh.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedIcd10Cat === 'all' || item.category === selectedIcd10Cat;
    return matchesSearch && matchesCat;
  });

  // Filter ICD-9 database
  const filteredIcd9List = Object.values(NHSO_ICD9_DATABASE).filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameTh.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryTh.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedIcd9Cat === 'all' || item.category === selectedIcd9Cat;
    return matchesSearch && matchesCat;
  });

  const criticalCount = (recommendations || []).filter((r) => r.priority === 'CRITICAL').length;
  const recommendedCount = (recommendations || []).filter((r) => r.priority === 'RECOMMENDED').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner">
              <Lightbulb className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  ระบบแนะนำการให้รหัส ICD-10 & ICD-9-CM สปสช.
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-3xs font-semibold">
                  NHSO Coding Standards
                </span>
              </div>
              <p className="text-xs text-slate-300">
                วิเคราะห์ความสอดคล้องตามเกณฑ์ e-Claim, CR1, CR37 และคู่มือการให้รหัสโรค สปสช.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('recommendations')}
            className={`flex items-center gap-2 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'recommendations'
                ? 'border-amber-500 text-amber-700 bg-white px-3 rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 px-2'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>คำแนะนำสำหรับเคสปัจจุบัน</span>
            {recommendations.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-3xs font-bold ${
                criticalCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
              }`}>
                {recommendations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('icd10')}
            className={`flex items-center gap-2 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'icd10'
                ? 'border-blue-600 text-blue-700 bg-white px-3 rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 px-2'
            }`}
          >
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span>คลังรหัส ICD-10 & เกณฑ์วินิจฉัย</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('icd9')}
            className={`flex items-center gap-2 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'icd9'
                ? 'border-indigo-600 text-indigo-700 bg-white px-3 rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 px-2'
            }`}
          >
            <Wrench className="w-4 h-4 text-indigo-600" />
            <span>คลังหัตถการ ICD-9-CM & กฎเวชระเบียน</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('golden_rules')}
            className={`flex items-center gap-2 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'golden_rules'
                ? 'border-emerald-600 text-emerald-700 bg-white px-3 rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 px-2'
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>10 กฎเหล็กการให้รหัส สปสช.</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-slate-800">
          {/* TAB 1: ACTIVE CASE RECOMMENDATIONS */}
          {activeTab === 'recommendations' && (
            <div className="space-y-4">
              {/* Summary Status Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-300">เคสปัจจุบัน: โรคหลัก</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 font-mono font-bold text-xs">
                        {pdx || 'ยังไม่ระบุ'}
                      </span>
                      <span className="text-xs text-slate-300">• โรคร่วม/แทรก: {secondaryDx.length} รายการ</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      ระบบตรวจพบข้อเสนอแนะ <strong>{recommendations.length} รายการ</strong> (ข้อผิดพลาดร้ายแรง {criticalCount} รายการ, ข้อแนะนำ {recommendedCount} รายการ)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-3xs font-medium">
                  <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    CR1: ป้องกันปฏิเสธ
                  </span>
                  <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    CR37: ยาสอดคล้องโรค
                  </span>
                </div>
              </div>

              {/* No recommendations (All clean) */}
              {recommendations.length === 0 ? (
                <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-emerald-950 text-base">
                    การให้รหัสของเคสนี้สอดคล้องกับเกณฑ์ สปสช. ครบถ้วน!
                  </h3>
                  <p className="text-xs text-emerald-800 max-w-lg mx-auto">
                    ไม่พบข้อผิดพลาดด้านการเลือกโรคหลัก (CR1) รายการยาและการวินิจฉัยมีความสอดคล้องกัน (CR37) และไม่มีรหัสต้องห้าม
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {recommendations.map((rec) => {
                    const isApplied = appliedRecIds.has(rec.id);
                    const isCritical = rec.priority === 'CRITICAL';

                    return (
                      <div
                        key={rec.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isCritical
                            ? 'border-rose-300 bg-rose-50/40 shadow-xs'
                            : 'border-amber-300 bg-amber-50/40'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                isCritical
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {isCritical ? (
                                <AlertCircle className="w-5 h-5" />
                              ) : (
                                <Lightbulb className="w-5 h-5" />
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-3xs font-bold uppercase ${
                                    isCritical
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {rec.priority === 'CRITICAL' ? '🚨 ต้องแก้ไขด่วน (CRITICAL)' : '💡 ข้อแนะนำเพิ่มเติม'}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold text-xs">
                                  {rec.type} {rec.code}
                                </span>
                                <span className="text-xs font-semibold text-slate-800">
                                  {rec.nameTh}
                                </span>
                                <span className="text-3xs text-slate-500">
                                  ({rec.recommendedRole})
                                </span>
                              </div>

                              <p className="text-xs text-slate-700 leading-relaxed">
                                {rec.reason}
                              </p>

                              {/* NHSO Audit Criteria */}
                              <div className="mt-2.5 p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1">
                                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>เงื่อนไข สปสช. & เกณฑ์การตรวจประเมิน (Audit Criteria):</span>
                                </p>
                                <ul className="list-disc list-inside text-3xs text-slate-600 space-y-0.5 pl-1">
                                  {rec.auditCriteria.map((crit, idx) => (
                                    <li key={idx}>{crit}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Required Medical Records */}
                              {rec.requiredDocumentation.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-3xs text-slate-600">
                                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                                    <FileCheck className="w-3 h-3 text-blue-600" />
                                    <span>เวชระเบียนที่ต้องมี:</span>
                                  </span>
                                  {rec.requiredDocumentation.map((doc, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                    >
                                      {doc}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          {rec.actionPayload && (
                            <div className="shrink-0 self-end sm:self-center">
                              {isApplied ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-300">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  <span>นำไปใช้แล้ว</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleApply(rec)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                                    isCritical
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                                  }`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>นำรหัสไปใช้กับเคสนี้</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ICD-10 DIRECTORY & AUDIT RULES */}
          {activeTab === 'icd10' && (
            <div className="space-y-4">
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหารหัส ICD-10 เช่น A41.9, R57.2, N39.0 หรือชื่อโรค..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'sepsis', label: 'Sepsis' },
                    { id: 'shock', label: 'Shock' },
                    { id: 'infection', label: 'Infections' },
                    { id: 'renal', label: 'Renal / AKI' },
                    { id: 'electrolyte', label: 'Electrolytes' },
                    { id: 'banned', label: 'รหัสต้องห้าม' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedIcd10Cat(cat.id)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-3xs font-semibold ${
                        selectedIcd10Cat === cat.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ICD-10 Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredIcd10List.map((item) => (
                  <div
                    key={item.code}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold text-xs">
                            {item.code}
                          </span>
                          <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                            {item.categoryTh}
                          </span>
                        </div>
                        <span className="text-3xs font-semibold text-slate-500">
                          {item.defaultRole}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 leading-snug">
                        {item.nameTh}
                      </h4>
                      <p className="text-3xs text-slate-500 font-medium">
                        {item.nameEn}
                      </p>

                      <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {item.nhsoCondition}
                      </p>

                      {/* Audit Key Points */}
                      <div className="mt-2 space-y-1 text-3xs text-slate-600">
                        <span className="font-semibold text-slate-800 block">เกณฑ์การ Audit:</span>
                        <ul className="list-disc list-inside space-y-0.5 pl-0.5">
                          {item.auditKeyPoints.map((pt, idx) => (
                            <li key={idx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-500">
                      <span>บทบาทที่อนุญาต: {item.allowedRoles.join(', ')}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanCode = item.code.replace('.', '');
                          const isPdx = item.defaultRole === 'PDx';
                          handleApply({
                            id: `apply_${cleanCode}`,
                            type: 'ICD-10',
                            code: item.code,
                            nameTh: item.nameTh,
                            nameEn: item.nameEn,
                            category: item.categoryTh,
                            recommendedRole: item.defaultRole,
                            nhsoCondition: item.nhsoCondition,
                            priority: 'RECOMMENDED',
                            reason: `นำรหัส ${item.code} ไปใช้ในเคส`,
                            auditCriteria: item.auditKeyPoints,
                            requiredDocumentation: item.requiredDocumentation,
                            actionPayload: isPdx
                              ? { actionType: 'SET_PDX', code: cleanCode }
                              : {
                                  actionType: 'ADD_SDX',
                                  code: cleanCode,
                                  diagType: item.defaultRole === 'Complication' ? 'complication' : 'comorbid',
                                },
                          });
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <span>ใช้รหัสนี้</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ICD-9-CM PROCEDURES DIRECTORY */}
          {activeTab === 'icd9' && (
            <div className="space-y-4">
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหารหัส ICD-9-CM เช่น 96.71, 96.04, 86.22, 39.95 หรือชื่อหัตถการ..."
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1 text-xs">
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: 'airway_vent', label: 'เครื่องช่วยหายใจ' },
                    { id: 'vascular_cvp', label: 'สายสวน CVP/A-line' },
                    { id: 'dialysis', label: 'การฟอกไต' },
                    { id: 'surgery_wound', label: 'ผ่าตัดล้างแผล' },
                    { id: 'transfusion', label: 'ให้เลือด' },
                    { id: 'drainage_puncture', label: 'เจาะระบายน้ำ' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedIcd9Cat(cat.id)}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-3xs font-semibold ${
                        selectedIcd9Cat === cat.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ICD-9 Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredIcd9List.map((item) => (
                  <div
                    key={item.code}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xs transition-all space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 border border-indigo-200 font-mono font-bold text-xs">
                            {item.code}
                          </span>
                          <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                            {item.categoryTh}
                          </span>
                        </div>
                        <span
                          className={`text-3xs px-2 py-0.5 rounded font-bold ${
                            item.auditRisk === 'HIGH'
                              ? 'bg-rose-100 text-rose-800'
                              : item.auditRisk === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          Audit Risk: {item.auditRisk}
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 leading-snug">
                        {item.nameTh}
                      </h4>
                      <p className="text-3xs text-slate-500 font-medium">
                        {item.nameEn}
                      </p>

                      <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {item.nhsoCondition}
                      </p>

                      {/* Calculation Rules */}
                      {item.calculationRules && item.calculationRules.length > 0 && (
                        <div className="mt-2 space-y-1 text-3xs text-slate-600">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-600" />
                            <span>กฎการคำนวณเวลา:</span>
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 pl-0.5">
                            {item.calculationRules.map((r, idx) => (
                              <li key={idx}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Pitfalls & Traps */}
                      {item.pitfalls.length > 0 && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-50/70 border border-rose-200 text-3xs text-rose-800 space-y-0.5">
                          <span className="font-bold flex items-center gap-1 text-rose-900">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>ข้อควรระวังการถูกเรียกเงินคืน (Audit Pitfalls):</span>
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 pl-0.5">
                            {item.pitfalls.map((p, idx) => (
                              <li key={idx}>{p}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-500">
                      <span>ผลต่อ DRG: {item.drgImpact.substring(0, 35)}...</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cleanCode = item.code.replace('.', '');
                          handleApply({
                            id: `apply_proc_${cleanCode}`,
                            type: 'ICD-9-CM',
                            code: item.code,
                            nameTh: item.nameTh,
                            nameEn: item.nameEn,
                            category: item.categoryTh,
                            recommendedRole: item.procType === 'principal' ? 'Principal_Proc' : 'Secondary_Proc',
                            nhsoCondition: item.nhsoCondition,
                            priority: 'RECOMMENDED',
                            reason: `นำรหัสหัตถการ ${item.code} ไปใช้ในเคส`,
                            auditCriteria: item.calculationRules || [item.nhsoCondition],
                            requiredDocumentation: item.requiredDocumentation,
                            actionPayload: {
                              actionType: 'ADD_PROCEDURE',
                              code: cleanCode,
                              procType: item.procType === 'principal' ? 'principal' : 'secondary',
                            },
                          });
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <span>เพิ่มหัตถการนี้</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: 10 GOLDEN CODING RULES */}
          {activeTab === 'golden_rules' && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-emerald-700 shrink-0" />
                <p className="font-semibold">
                  10 กฎเหล็กและข้อปฏิบัติการให้รหัสโรคและการตรวจประเมินเวชระเบียน (Clinical Audit) สปสช.
                </p>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    num: '01',
                    title: 'กฎเหล็ก Septic Shock (R57.2) ห้ามเป็นโรคหลักเด็ดขาด!',
                    content: 'รหัส R57.2 ถูกจัดอยู่ในกลุ่ม Symptoms/Signs (Chapter XVIII) ตามหลักสากลและ สปสช. ห้ามใช้เป็น Principal Diagnosis (PDx) โดยเด็ดขาด และต้องให้ประเภทเป็น "โรคแทรก (Complication - dxType 3)" เท่านั้น หากลงผิดจะติดสถานะ DENY [CR1] ทันที',
                  },
                  {
                    num: '02',
                    title: 'เงื่อนไข CR37: การให้รหัส R57.2 ต้องมีรายการ Vasopressor ในแฟ้ม DRU',
                    content: 'ผู้ป่วย Septic shock ตามเกณฑ์ Consensus ต้องมีหลักฐานการได้รับยากระตุ้นความดัน (เช่น Norepinephrine, Dopamine, Adrenaline) ทางหลอดเลือดดำ หากมีการลงรหัส R57.2 แต่ไม่พบยาในแฟ้ม DRU.txt จะถูกระบบ AI Pre-Audit สปสช. กักเตือนทันที',
                  },
                  {
                    num: '03',
                    title: 'การสรุป Urosepsis: ต้องให้ A41.9 คู่กับ N39.0',
                    content: 'แม้แพทย์จะเขียนสรุปว่า Urosepsis แต่ในการให้รหัส e-Claim ห้ามลง N39.0 โดดๆ เป็นโรคหลัก ให้ใช้ A41.9 หรือ A41.5 เป็นโรคหลัก (PDx) และให้ N39.0 เป็นโรคร่วม (Comorbid) เพื่อให้สะท้อนค่าน้ำหนัก DRG ที่แท้จริง',
                  },
                  {
                    num: '04',
                    title: 'การนับชั่วโมงเครื่องช่วยหายใจ 96.71 vs 96.72',
                    content: 'ต้องนับชั่วโมงเฉพาะช่วงที่ต่อเข้าเครื่องช่วยหายใจต่อเนื่อง (Consecutive hours) จริง โดยอิงตาม Ventilator Flowsheet ห้ามนับช่วงทำ T-piece trial เกินจำเป็น และหากมีช่วง Off vent เกิน 2-4 ชม. ต้องเริ่มนับรอบเวลาใหม่',
                  },
                  {
                    num: '05',
                    title: 'กับดักการ Audit อันดับ 1: รหัส 86.22 vs 86.28 (Excisional Debridement)',
                    content: 'รหัส 86.22 (Excisional debridement) ค่าน้ำหนัก DRG สูงมาก สปสช. สุ่มตรวจอย่างเคร่งครัด Operative Note ต้องมีคำว่า: ตัดเฉือนด้วยของมีคม (Scalpel/Scissors) ถึงชั้นเนื้อเยื่อมีชีวิต (Fascia/Muscle) หากระบุเพียงการล้างแผลหรือถูด้วยกอซ จะถูกลดรหัสเป็น 86.28 และเรียกเงินคืน',
                  },
                  {
                    num: '06',
                    title: 'รหัสต้องห้าม R65.0 และ R65.1 ในเคส Sepsis',
                    content: 'รหัส R65.0 (SIRS non-infectious) และ R65.1 (SIRS infectious without organ failure) สปสช. ห้ามใช้ในเคสติดเชื้อหรือ Sepsis เพราะถือว่าซ้ำซ้อนกับกลุ่มรหัส A41.- การใส่รหัสนี้จะทำให้ระบบ Audit แจ้งเตือนข้อผิดพลาด',
                  },
                  {
                    num: '07',
                    title: 'เกณฑ์การให้รหัส Acidosis (E87.2) ตามเงื่อนไขข้อ 3 สปสช.',
                    content: 'ต้องมีผลแล็บ ABG (pH < 7.35) หรือ Serum Bicarbonate < 18-20 mEq/L และต้องมีบันทึกการรักษาจำเพาะ เช่น การให้ 7.5% Sodium Bicarbonate IV ในแฟ้ม DRU.txt หากไม่มีการรักษาเฉพาะ ห้ามสรุปเป็นโรคร่วม',
                  },
                  {
                    num: '08',
                    title: 'การสรุปโรคไตวายเฉียบพลัน (AKI - N17.9) ตามเกณฑ์ KDIGO',
                    content: 'ต้องมีผล Creatinine เปรียบเทียบอย่างน้อย 2 ค่า โดยเพิ่มขึ้น ≥ 0.3 mg/dL หรือ 1.5 เท่า และมีการรักษาภาวะไตวาย ห้ามสรุปซ้ำซ้อนในเคส CKD ระยะสุดท้ายที่เป็นเพียงภาวะแทรกซ้อนทั่วไปที่ไม่มีการรักษาแยกเฉพาะ',
                  },
                  {
                    num: '09',
                    title: 'เกณฑ์การเบิกฟอกเลือดไตเทียมฉุกเฉินในผู้ป่วยใน (39.95)',
                    content: 'ต้องมีข้อบ่งชี้วิกฤตฉุกเฉิน (AEIOU Criteria): Acidosis ดื้อยา, K > 6.5 มีคลื่นหัวใจผิดปกติ, Ingestion, Overload น้ำท่วมปอดไม่ตอบสนองต่อยาขับปัสสาวะ, Uremic complications พร้อมแนบ Hemodialysis record',
                  },
                  {
                    num: '10',
                    title: 'การเก็บหลักฐานเวชระเบียนเพื่อป้องกันการถูกเรียกเงินคืน (Post-Audit Defense)',
                    content: 'เวชระเบียนที่ต้องครบถ้วน: 1. ใบบันทึกสัญญาณชีพและ ICU chart 2. ใบสั่งยาและบันทึกการบริหารยา (Kardex/IV flow) 3. ผลตรวจทางห้องปฏิบัติการ (Hemoculture, ABG, Cr, Electrolytes) 4. Operative Note ระบุเทคนิคละเอียด และ 5. Ventilator Flowsheet',
                  },
                ].map((rule) => (
                  <div key={rule.num} className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-slate-900 text-white font-mono font-bold text-3xs flex items-center justify-center">
                        {rule.num}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">{rule.title}</h4>
                    </div>
                    <p className="text-3xs text-slate-600 pl-8 leading-relaxed">{rule.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <Info className="w-4 h-4 text-slate-400" />
            <span>อ้างอิง: คู่มือการให้รหัสโรค ICD-10 & ICD-9-CM ฉบับปรับปรุง สปสช.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
