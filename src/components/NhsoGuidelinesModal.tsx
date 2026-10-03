import React, { useState, useMemo } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Check,
  Zap,
  Activity,
  HeartPulse,
  Syringe,
  FileSpreadsheet,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { NHSO_47_CONDITIONS, SEPSIS_FLOWCHART_PATHWAYS, NhsoCondition } from '../data/nhso47Conditions';

interface NhsoGuidelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCodes?: (pdx: string, sdxList: string[]) => void;
  onOpenBlueprint?: () => void;
}

export const NhsoGuidelinesModal: React.FC<NhsoGuidelinesModalProps> = ({
  isOpen,
  onClose,
  onApplyCodes,
  onOpenBlueprint,
}) => {
  const [activeTab, setActiveTab] = useState<'flowchart' | 'conditions47' | 'crRules'>('flowchart');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<NhsoCondition | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  // Filter 47 conditions
  const filteredConditions = useMemo(() => {
    return (NHSO_47_CONDITIONS || []).filter((item) => {
      const matchSearch =
        searchTerm === '' ||
        (item?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item?.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        item?.no?.toString() === searchTerm.trim() ||
        (item?.relatedIcd10 && item.relatedIcd10.some((c) => (c || '').toLowerCase().includes(searchTerm.toLowerCase())));

      const matchGroup = selectedGroup === 'all' || item?.categoryGroup === selectedGroup;

      return matchSearch && matchGroup;
    });
  }, [searchTerm, selectedGroup]);

  if (!isOpen) return null;

  const handleApplyPathway = (pathwayId: number, pdxCode: string, sdxCode: string) => {
    if (onApplyCodes) {
      const sdxArray = sdxCode ? [sdxCode] : [];
      onApplyCodes(pdxCode, sdxArray);
      setAppliedNotice(`นำรหัสรูปแบบที่ ${pathwayId} (${pdxCode}) เข้าสู่แบบฟอร์มแล้ว`);
      setTimeout(() => setAppliedNotice(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="relative bg-white rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  เกณฑ์การตรวจสอบและให้รหัสโรค สปสช. (NHSO Audit Criteria)
                </h2>
                <span className="text-3xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-semibold">
                  Official 47 เงื่อนไข + CR1/CR37
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                อ้างอิงเอกสารประกอบการอบรมหลักสูตรกรรมการตรวจประเมินเวชระเบียน กรณีผู้ป่วยใน สปสช.
              </p>
            </div>
          </div>
          <button
            id="btn-close-guidelines"
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <button
              id="tab-flowchart-sepsis"
              type="button"
              onClick={() => setActiveTab('flowchart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'flowchart'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>ผังการให้รหัส Sepsis & Shock (CR1, CR37)</span>
            </button>

            <button
              id="tab-47-conditions"
              type="button"
              onClick={() => setActiveTab('conditions47')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'conditions47'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>เงื่อนไขตรวจสอบผู้ป่วยใน 47 ข้อ</span>
              <span className="text-3xs px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800">
                {NHSO_47_CONDITIONS.length}
              </span>
            </button>

            <button
              id="tab-cr-rules"
              type="button"
              onClick={() => setActiveTab('crRules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'crRules'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>เจาะลึกข้อห้าม CR1 & CR37</span>
            </button>

            {onOpenBlueprint && (
              <button
                id="btn-guidelines-open-blueprint-tab"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBlueprint();
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>พิมพ์เขียว Audit 47 ข้อ (จุดตาย สปสช.)</span>
              </button>
            )}
          </div>

          {appliedNotice && (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md flex items-center gap-1.5 font-medium animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{appliedNotice}</span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* TAB 1: Sepsis & Septic Shock Flowchart (Exact representation of Image 5) */}
          {activeTab === 'flowchart' && (
            <div className="space-y-6">
              {/* Banner Explanation */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-blue-500/30 text-blue-200 font-mono font-bold text-xs border border-blue-400/30">
                      สปสช. กรมการแพทย์
                    </span>
                    <h3 className="font-bold text-white text-base">
                      SEPSIS & SEPTIC SHOCK (CR1, CR37)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 max-w-2xl">
                    แผนผังการสรุปและให้รหัสโรคสำหรับการเบิกจ่าย e-Claim ตามเกณฑ์ Quick SOFA score ≥ 2 ข้อ ร่วมกับภาวะติดเชื้อ และการจำแนกตามตำแหน่งอวัยวะ / ผลเพาะเชื้อ
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-white/10 border border-white/20 text-xs shrink-0 text-slate-100">
                  <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Quick SOFA Score ≥ 2 ข้อ</span>
                  </div>
                  <div className="text-3xs text-slate-200 mt-0.5 space-y-0.5">
                    <div>1. RR ≥ 22 /min</div>
                    <div>2. SBP ≤ 100 mmHg</div>
                    <div>3. Altered mental status (GCS &lt; 15)</div>
                  </div>
                </div>
              </div>

              {/* 5 Pathways Grid matching Image 5 */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  <span>5 แนวทางการให้รหัสโรคหลัก (PDx) และโรครอง (Sdx) ในกลุ่ม Sepsis</span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {SEPSIS_FLOWCHART_PATHWAYS.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left side: Condition */}
                      <div className="md:w-5/12 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {p.id}
                          </span>
                          <div className="font-bold text-slate-900 text-sm">
                            {p.conditionTh}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 pl-8">
                          {p.conditionDescription}
                        </p>
                      </div>

                      {/* Center: Quick SOFA requirement indicator */}
                      <div className="hidden lg:flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-3xs text-slate-600 shrink-0 text-center font-medium">
                        <span>+ Quick SOFA ≥ 2</span>
                        <span className="text-emerald-700 font-bold">+ มีภาวะติดเชื้อ</span>
                      </div>

                      {/* Right side: Coding Rule */}
                      <div className="md:w-5/12 space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                        <div className="text-xs font-semibold text-slate-800">
                          <span className="text-blue-700 font-bold">โรคหลัก (PDx): </span>
                          <span className="font-mono bg-blue-100/70 text-blue-900 px-1.5 py-0.5 rounded text-3xs font-bold">
                            {p.pdxCode || 'ตามเชื้อ/อวัยวะ'}
                          </span>{' '}
                          <span className="whitespace-pre-line">{p.pdxRule}</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-700">
                          <span className="text-emerald-700 font-bold">โรครอง (Sdx): </span>
                          <span className="whitespace-pre-line">{p.sdxRule}</span>
                        </div>
                      </div>

                      {/* Action Button */}
                      {onApplyCodes && (
                        <div className="shrink-0 flex items-center md:justify-end">
                          <button
                            type="button"
                            onClick={() => handleApplyPathway(p.id, p.pdxCode, p.sdxCode)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>ลองใช้รหัส</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Criteria Boxes from Image 5 (Red Box + Green Box) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
                {/* Red Box: Septic Shock Criterion */}
                <div className="md:col-span-7 rounded-xl border-2 border-rose-400 bg-rose-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></span>
                      <h4 className="font-bold text-rose-900 text-sm">
                        เกณฑ์การวินิจฉัย Septic Shock (R57.2) สปสช.
                      </h4>
                    </div>
                    <span className="text-3xs px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold">
                      CR37 Rule
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-rose-950">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 font-bold flex items-center justify-center shrink-0 text-3xs mt-0.5">
                        1
                      </div>
                      <div>
                        <strong>เข้าเกณฑ์การวินิจฉัย Shock & poor tissue perfusion:</strong> มีความดันโลหิตต่ำ หรืออวัยวะขาดเลือดไปเลี้ยง
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 font-bold flex items-center justify-center shrink-0 text-3xs mt-0.5">
                        2
                      </div>
                      <div>
                        <strong>ไม่ตอบสนองต่อ IV fluid (Fluid-refractory):</strong> ต้องให้ยา <strong>Vasopressor</strong> (เช่น Norepinephrine / Levophed, Dopamine, Adrenaline) เพื่อรักษา SBP สูงกว่า 90 mmHg หรือรักษา MAP &gt; 65 mmHg
                      </div>
                    </div>

                    <div className="flex items-start gap-2 bg-white/80 p-2.5 rounded-lg border border-rose-200">
                      <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-3xs leading-normal">
                        <strong>ผลตรวจเลือดประกอบ:</strong> Serum Lactate ในเลือด &gt; 2 มิลลิโมล/ลิตร (หรือ &gt; 18 มก./ดล.) หลังจากได้รับสารน้ำอย่างเพียงพอแล้ว
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-rose-600 text-white rounded-lg text-xs font-semibold flex items-center justify-between">
                    <span>รหัสที่สรุปให้:</span>
                    <span className="font-mono bg-white text-rose-900 px-2 py-0.5 rounded font-bold">
                      Septic shock (R57.2)
                    </span>
                  </div>
                </div>

                {/* Green Box: Organ Failure Criterion */}
                <div className="md:col-span-5 rounded-xl border-2 border-emerald-400 bg-emerald-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-600"></span>
                      <h4 className="font-bold text-emerald-900 text-sm">
                        เมื่อพบ Organ Failure ตามระบบ
                      </h4>
                    </div>
                    <span className="text-3xs px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold">
                      Sdx Coding
                    </span>
                  </div>

                  <p className="text-xs text-emerald-900">
                    หากผู้ป่วยมีภาวะอวัยวะล้มเหลวตามระบบ ให้สรุปและให้รหัส <strong>Organ failure เป็นโรครอง (Sdx)</strong> ตามระบบนั้นๆ:
                  </p>

                  <div className="space-y-1.5 text-xs text-emerald-950">
                    <div className="p-2 rounded bg-white/90 border border-emerald-200 flex items-center justify-between">
                      <span>• ไตวายเฉียบพลัน (Renal)</span>
                      <span className="font-mono font-bold text-emerald-800">N17.9 (AKI)</span>
                    </div>
                    <div className="p-2 rounded bg-white/90 border border-emerald-200 flex items-center justify-between">
                      <span>• หายใจล้มเหลวเฉียบพลัน (Resp)</span>
                      <span className="font-mono font-bold text-emerald-800">J96.0 (ARF)</span>
                    </div>
                    <div className="p-2 rounded bg-white/90 border border-emerald-200 flex items-center justify-between">
                      <span>• เกล็ดเลือดต่ำ / เลือดแข็งตัวผิดปกติ</span>
                      <span className="font-mono font-bold text-emerald-800">D69.6 / D65</span>
                    </div>
                    <div className="p-2 rounded bg-white/90 border border-emerald-200 flex items-center justify-between">
                      <span>• ภาวะเลือดเป็นกรด (Metabolic acidosis)</span>
                      <span className="font-mono font-bold text-emerald-800">E87.2</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 47 Audit Conditions (Exact representation of Images 1, 2, 3, 4) */}
          {activeTab === 'conditions47' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ค้นหาชื่อเงื่อนไข, รหัส ICD-10, หรือข้อ No..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter categories */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 sm:pb-0 text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                  {[
                    { id: 'all', label: 'ทั้งหมด (47)' },
                    { id: 'sepsis', label: 'Sepsis (1-2)' },
                    { id: 'shock', label: 'Shock (22)' },
                    { id: 'electrolyte', label: 'Electrolyte (3-7)' },
                    { id: 'cardio', label: 'Cardio (8-13)' },
                    { id: 'pulmonary', label: 'Pulmonary (16-21)' },
                    { id: 'hemato', label: 'Hemato (23-31)' },
                    { id: 'dm_ckd', label: 'DM & CKD (35-38)' },
                    { id: 'gi_liver', label: 'GI & Liver (39-44)' },
                    { id: 'wound_surgery', label: 'Wound (45-47)' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedGroup(g.id)}
                      className={`px-2.5 py-1 rounded-md text-3xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                        selectedGroup === g.id
                          ? 'bg-slate-900 text-white font-bold'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table of 47 Conditions */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-900 text-white text-3xs uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 w-14 text-center">No.</th>
                        <th className="py-2.5 px-3 w-36">กลุ่มโรค</th>
                        <th className="py-2.5 px-4">ชื่อเงื่อนไขการตรวจสอบ (สปสช.)</th>
                        <th className="py-2.5 px-3 w-32">รหัสที่เกี่ยวข้อง</th>
                        <th className="py-2.5 px-3 w-28 text-center">การรองรับในแอป</th>
                        <th className="py-2.5 px-3 w-20 text-center">รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredConditions.map((item) => (
                        <tr
                          key={item.no}
                          onClick={() => setSelectedCondition(item)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                            selectedCondition?.no === item.no ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900">
                            {item.no}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-3xs">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-slate-900 font-medium">
                            <div className="line-clamp-2">{item.name}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {item.relatedIcd10?.map((code) => (
                                <span
                                  key={code}
                                  className="font-mono text-3xs px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                  {code}
                                </span>
                              )) || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {item.isCoveredInApp ? (
                              <span className="inline-flex items-center gap-1 text-3xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ตรวจอัตโนมัติ</span>
                              </span>
                            ) : (
                              <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                เกณฑ์เอกสาร
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCondition(item);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                            >
                              ดูเกณฑ์
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredConditions.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    ไม่พบเงื่อนไขที่ตรงกับคำค้นหา "{searchTerm}"
                  </div>
                )}
              </div>

              {/* Selected Condition Detail Card */}
              {selectedCondition && (
                <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3 animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-bold text-xs">
                          เงื่อนไขที่ {selectedCondition.no}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          หมวด: {selectedCondition.category}
                        </span>
                        {selectedCondition.relatedCrRule && (
                          <span className="text-3xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                            {selectedCondition.relatedCrRule}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {selectedCondition.name}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCondition(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedCondition.description}
                  </p>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>จุดตรวจประเมินของ Auditor สปสช. (Audit Key Points):</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600 list-disc list-inside">
                      {selectedCondition.auditKeyPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="text-slate-600">
                      <strong>คำแนะนำ Coder:</strong> {selectedCondition.suggestedAction}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CR Rules Deep Dive */}
          {activeTab === 'crRules' && (
            <div className="space-y-6">
              {/* CR37 Shock Deep Dive */}
              <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-rose-600 text-white font-mono font-bold text-xs">
                    CR37
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    กฎ [CR37] : การสรุปกลุ่มอาการ Shock ผิดหลักการ
                  </h3>
                </div>

                <p className="text-slate-600">
                  ข้อผิดพลาดนี้เกิดขึ้นเมื่อมีการให้รหัสในกลุ่ม Shock (R57.-) ขัดกับหลักเกณฑ์การให้รหัสสากล หรือขาดหลักฐานการรักษาทางคลินิกที่สมเหตุสมผล
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>1. ห้ามลง R57.2 เป็น "โรคร่วม (Co-morbid)"</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Septic shock เกิดขึ้นสืบเนื่องมาจากการติดเชื้อที่ลุกลาม จึงต้องระบุประเภทโรครองเป็น <strong>"โรคแทรก / ภาวะแทรกซ้อน (Complication)" เท่านั้น</strong> หากลงเป็นโรคร่วม ระบบจะ Deny ทันที
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>2. ต้องมี "ยากระตุ้นความดัน" (Vasopressor)</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      ผู้ป่วยต้องมีภาวะความดันต่ำที่ดื้อต่อน้ำเกลือ (Fluid-refractory) และ <strong>ต้องได้รับยากระตุ้นความดัน</strong> เช่น Norepinephrine, Levophed, Dopamine, Adrenaline หากฟื้นด้วยน้ำเกลือโดยไม่ใช้ยา จะไม่ถือเป็น Septic shock
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>3. ห้ามใช้ Shock เป็นโรคหลัก (Principal Dx)</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      รหัส R57.- ทุกตัว (R57.0, R57.1, R57.2, R57.9) ห้ามเป็นโรคหลัก ต้องให้โรคต้นเหตุ (เช่น A41.9 หรือ A09.0) เป็นโรคหลักเสมอ
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>4. เกณฑ์ Hypovolemic Shock (R57.1)</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      ต้องมีประวัติการเสียเลือดหรือขาดน้ำรุนแรง และได้รับการกู้ชีพด้วยสารน้ำ IV Fluid ปริมาณมาก (≥ 1,000–2,000 ml)
                    </p>
                  </div>
                </div>
              </div>

              {/* CR1 Sepsis Deep Dive */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-mono font-bold text-xs">
                    CR1
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">
                    กฎ [CR1] : การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">
                      1. กรณีแพทย์วินิจฉัย "Urosepsis"
                    </div>
                    <p className="text-xs text-slate-600">
                      • <span className="text-rose-600 font-semibold">ห้าม:</span> ลงรหัส N39.0 (UTI) หรือ N10 (Pyelonephritis) เพียงรหัสเดียวโดดๆ เมื่อแพทย์ระบุว่ามี Urosepsis<br />
                      • <span className="text-emerald-600 font-semibold">วิธีที่ถูกต้อง:</span> ให้ลง <strong>A41.9</strong> (หรือ A41.5 หากเพาะเชื้อพบแกรมลบ) เป็น <strong>โรคหลัก</strong> และลง <strong>N39.0</strong> หรือ <strong>N10</strong> เป็น <strong>โรคร่วม</strong>
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">
                      2. ยกเลิกรหัส R65.0 (SIRS) โดยเด็ดขาด
                    </div>
                    <p className="text-xs text-slate-600">
                      สปสช. ประกาศยกเลิกการใช้รหัส R65.0 แล้ว หากมีการลงรหัสนี้ในชาร์ต จะถูกปฏิเสธ (Deny) ทันที
                    </p>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-900">
                      3. ต้องมีหลักฐานการได้รับยาปฏิชีวนะชนิดฉีด (IV Antibiotic)
                    </div>
                    <p className="text-xs text-slate-600">
                      ผู้ป่วยที่เบิกด้วยโรคหลัก Sepsis จะต้องมีรายการยาปฏิชีวนะฉีดในระบบยา (เช่น Ceftriaxone, Metronidazole, Meropenem, Cefoperazone/Sulbactam) และควรมีผลการส่งตรวจ Hemoculture ยืนยัน
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            เอกสารอ้างอิง: สำนักตรวจสอบการชดเชยและคุณภาพบริการ (สปสช.)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            เข้าใจแล้ว ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
