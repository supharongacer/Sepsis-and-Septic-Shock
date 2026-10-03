import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Stethoscope,
  Binary,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Activity,
  HeartPulse,
  Scale,
  FileText,
  Clock,
  BookOpen,
  CheckSquare,
  Square,
  AlertOctagon,
} from 'lucide-react';
import {
  AUDIT_4_PILLARS,
  SURVEILLANCE_4_GROUPS,
  AUDIT_TRAPS,
  ALIGNMENT_CHECKLISTS,
  GOLDEN_RULE,
  AuditTrapItem,
} from '../data/nhsoAuditBlueprint';
import { NHSO_47_CONDITIONS } from '../data/nhso47Conditions';

interface NhsoAuditBlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset?: (presetId: string) => void;
  onFilterConditionCategory?: (categoryId: string) => void;
}

export const NhsoAuditBlueprintModal: React.FC<NhsoAuditBlueprintModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
}) => {
  const [activeTab, setActiveTab] = useState<'pillars' | 'surveillance' | 'traps' | 'alignment'>('pillars');
  const [selectedTrapId, setSelectedTrapId] = useState<string>('trap_necrotizing');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectedTrap = AUDIT_TRAPS.find((t) => t.id === selectedTrapId) || AUDIT_TRAPS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md ring-2 ring-amber-400/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  ถอดรหัส Audit 47 ข้อ: พิมพ์เขียวป้องกัน Deny Claim จาก สปสช.
                </h2>
                <span className="hidden sm:inline-block text-3xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/40">
                  Audit Blueprint 2024-2025
                </span>
              </div>
              <p className="text-xs text-slate-300 font-normal">
                "ผู้ป่วยอาการหนักจริง ไม่ได้แปลว่าจะเบิกจ่ายได้เสมอไป — หากไร้หลักฐานการรักษา สปสช. ถือว่าเกินจริงทันที"
              </p>
            </div>
          </div>
          <button
            id="btn-close-blueprint-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 pt-2 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            id="tab-blueprint-pillars"
            onClick={() => setActiveTab('pillars')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'pillars'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 font-bold shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>4 เสาหลัก & บทสรุปทองคำ (Pillars)</span>
          </button>

          <button
            id="tab-blueprint-surveillance"
            onClick={() => setActiveTab('surveillance')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'surveillance'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 font-bold shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>4 กลุ่มโรคเฝ้าระวัง 47 ข้อ</span>
          </button>

          <button
            id="tab-blueprint-traps"
            onClick={() => setActiveTab('traps')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'traps'
                ? 'border-rose-600 dark:border-rose-400 text-rose-700 dark:text-rose-300 bg-white dark:bg-slate-800 font-bold shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <AlertOctagon className="w-4 h-4 text-rose-500" />
            <span>9 จุดดักจับและจุดตาย Audit (The Traps)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-3xs font-black animate-pulse">
              HOT
            </span>
          </button>

          <button
            id="tab-blueprint-alignment"
            onClick={() => setActiveTab('alignment')}
            className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'alignment'
                ? 'border-indigo-600 dark:border-indigo-400 text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 font-bold shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <FileCheck2 className="w-4 h-4 text-amber-500" />
            <span>Alignment Checklist (แพทย์ vs ผู้ให้รหัส)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40">
          {/* TAB 1: 4 PILLARS & GOLDEN RULE */}
          {activeTab === 'pillars' && (
            <div className="space-y-6">
              {/* Golden Rule Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-orange-500/15 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700/50">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-amber-950 dark:text-amber-200">
                      {GOLDEN_RULE.title}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-800 font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>"{GOLDEN_RULE.quote1}"</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-800 font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span>"{GOLDEN_RULE.quote2}"</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                      {GOLDEN_RULE.conclusion}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 Pillars Grid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>4 เสาหลักแห่งความสมบูรณ์ของเวชระเบียน (The 4 Pillars of Audit)</span>
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ครบ 4 เสา = ผ่านเกณฑ์ชดเชย 100%
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {AUDIT_4_PILLARS.map((pillar) => {
                    const colorStyles =
                      pillar.id === 'documentation'
                        ? {
                            headerBg: 'bg-blue-600 text-white',
                            cardBorder: 'border-blue-200 dark:border-blue-800',
                            cardBg: 'bg-blue-50/50 dark:bg-blue-950/20',
                            bullet: 'bg-blue-600 text-white',
                          }
                        : pillar.id === 'evidence'
                        ? {
                            headerBg: 'bg-emerald-600 text-white',
                            cardBorder: 'border-emerald-200 dark:border-emerald-800',
                            cardBg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
                            bullet: 'bg-emerald-600 text-white',
                          }
                        : pillar.id === 'treatment'
                        ? {
                            headerBg: 'bg-amber-600 text-white',
                            cardBorder: 'border-amber-200 dark:border-amber-800',
                            cardBg: 'bg-amber-50/50 dark:bg-amber-950/20',
                            bullet: 'bg-amber-600 text-white',
                          }
                        : {
                            headerBg: 'bg-purple-600 text-white',
                            cardBorder: 'border-purple-200 dark:border-purple-800',
                            cardBg: 'bg-purple-50/50 dark:bg-purple-950/20',
                            bullet: 'bg-purple-600 text-white',
                          };

                    return (
                      <div
                        key={pillar.id}
                        className={`rounded-xl border ${colorStyles.cardBorder} ${colorStyles.cardBg} overflow-hidden shadow-xs flex flex-col`}
                      >
                        <div className={`px-3.5 py-2.5 ${colorStyles.headerBg} font-bold text-xs flex items-center justify-between`}>
                          <span>{pillar.nameTh}</span>
                          <span className="text-3xs opacity-80 uppercase tracking-wider">{pillar.nameEn}</span>
                        </div>
                        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                          <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {pillar.description}
                          </p>
                          <div className="space-y-1.5 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                            {pillar.checklistItems.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <span className={`w-4 h-4 rounded-full ${colorStyles.bullet} text-3xs font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                                  {idx + 1}
                                </span>
                                <span>{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 4 SURVEILLANCE GROUPS */}
          {activeTab === 'surveillance' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-indigo-950 dark:text-indigo-100">
                    แผนผังกลุ่มโรคเฝ้าระวัง 4 กลุ่มเป้าหมาย (47 ข้อ สปสช.)
                  </h4>
                  <p className="text-xs text-indigo-800 dark:text-indigo-300">
                    สปสช. แบ่งการตรวจสอบออกเป็น 4 กลุ่มใหญ่ โดยแต่ละกลุ่มมีจุดเน้นของเอกสารและกฎเฉพาะตัว
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-2xs">
                  47 เงื่อนไขตรวจจับ
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SURVEILLANCE_4_GROUPS.map((group) => {
                  return (
                    <div
                      key={group.id}
                      className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm">
                            {group.id}
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {group.nameTh}
                            </h4>
                            <span className="text-3xs text-slate-500 dark:text-slate-400">
                              {group.nameEn}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {group.range} ({group.conditionsCount} ข้อ)
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                        <span className="text-2xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block mb-1">
                          จุดเน้นสำคัญของ Audit:
                        </span>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {group.focusTh}
                        </p>
                      </div>

                      <div>
                        <span className="text-2xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                          ตัวอย่างเงื่อนไขในกลุ่มนี้:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {group.examples.map((ex, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                            >
                              • {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: 9 AUDIT TRAPS & THE TRAP (NECROTIZING FASCIITIS) */}
          {activeTab === 'traps' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Trap List on Left */}
              <div className="lg:col-span-5 space-y-2 max-h-[68vh] overflow-y-auto pr-1">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 pb-1">
                  เลือกหัวข้อจุดดักจับ Audit เพื่อดูรายละเอียด:
                </div>
                {AUDIT_TRAPS.map((trap) => {
                  const isSelected = trap.id === selectedTrapId;
                  const isNecrotizing = trap.id === 'trap_necrotizing';

                  return (
                    <button
                      key={trap.id}
                      id={`btn-select-trap-${trap.id}`}
                      onClick={() => setSelectedTrapId(trap.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-600 shadow-xs ring-1 ring-rose-400/30'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {isNecrotizing ? (
                            <span className="text-3xs px-1.5 py-0.2 rounded-sm bg-rose-600 text-white font-black animate-pulse">
                              จุดตาย THE TRAP
                            </span>
                          ) : (
                            <span className="text-3xs px-1.5 py-0.2 rounded-sm bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                              สไลด์ {trap.slideRef}
                            </span>
                          )}
                          <span className="text-3xs text-slate-500 dark:text-slate-400">
                            {trap.category}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {trap.title}
                        </h4>
                        <p className="text-2xs text-slate-600 dark:text-slate-400 line-clamp-1">
                          {trap.subTitle}
                        </p>
                      </div>
                      <ChevronRight className={`w-4 h-4 mt-2 shrink-0 ${isSelected ? 'text-rose-600' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Trap Detail View on Right */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold border border-rose-300 dark:border-rose-800">
                        สไลด์หน้า {selectedTrap.slideRef} • {selectedTrap.category}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
                      {selectedTrap.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {selectedTrap.subTitle}
                    </p>
                  </div>

                  {/* Preset Case Quick-Trigger */}
                  {onSelectPreset && (
                    <button
                      id={`btn-load-preset-for-${selectedTrap.id}`}
                      onClick={() => {
                        if (selectedTrap.id === 'trap_necrotizing') onSelectPreset('case_necrotizing_trap');
                        else if (selectedTrap.id === 'trap_combination_codes') onSelectPreset('case_combination_code_fail');
                        else if (selectedTrap.id === 'trap_stroke_sequelae') onSelectPreset('case_stroke_sequelae_fail');
                        else if (selectedTrap.id === 'trap_electrolyte_lab_no_treatment') onSelectPreset('case_electrolyte_upcoding_warning');
                        else onSelectPreset('case_necrotizing_trap');
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shrink-0 cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>ทดลองเคสนี้ในระบบ</span>
                    </button>
                  )}
                </div>

                {/* THE TRAP DECISION TREE (If Necrotizing Fasciitis) */}
                {selectedTrap.decisionTree && (
                  <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                      <AlertOctagon className="w-4 h-4 text-rose-400" />
                      <span>ผังการตัดสินของ Auditor สปสช. (Decision Tree)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-semibold text-center text-slate-200">
                      ❓ {selectedTrap.decisionTree.question}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* YES PATH */}
                      <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-emerald-400">
                          <span>✅ YES: ทำใน OR</span>
                          <span className="px-2 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-black text-3xs">
                            APPROVED
                          </span>
                        </div>
                        <p className="text-slate-300 text-2xs">
                          {selectedTrap.decisionTree.yesPath}
                        </p>
                      </div>

                      {/* NO PATH */}
                      <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs space-y-1">
                        <div className="flex items-center justify-between font-bold text-rose-400">
                          <span>❌ NO: สั่งแค่ยา / ทำแผลเตียง</span>
                          <span className="px-2 py-0.2 rounded-full bg-rose-600 text-white font-black text-3xs">
                            IMMEDIATE FAIL
                          </span>
                        </div>
                        <p className="text-slate-300 text-2xs">
                          {selectedTrap.decisionTree.noPath}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clinical Perception vs Mandatory Evidence */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 space-y-1.5">
                    <span className="text-2xs uppercase tracking-wider font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span>สิ่งที่ทำให้เสี่ยงโดน DENY (กับดัก):</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {selectedTrap.denyRiskDescription}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
                    <span className="text-2xs uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>หลักฐานบังคับเพื่อผ่านเกณฑ์ (PASS):</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {selectedTrap.mandatoryEvidence}
                    </p>
                  </div>
                </div>

                {/* Suggested Action */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950 dark:text-amber-200 block">
                      คำแนะนำทางเวชปฏิบัติและผู้ให้รหัส (Action Plan):
                    </span>
                    <p className="text-amber-900 dark:text-amber-300 mt-0.5">
                      {selectedTrap.suggestedAction}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ALIGNMENT CHECKLIST (DOCTOR VS CODER) */}
          {activeTab === 'alignment' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    <span>Alignment Checklist: เมื่อแพทย์และผู้ให้รหัสต้องทำงานร่วมกัน</span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    ลดการติด Deny Claim ได้ 90% หากตรวจสอบครบทั้ง 8 ข้อก่อนกดส่งข้อมูลเบิกจ่าย
                  </p>
                </div>
                <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-emerald-300 font-semibold shrink-0">
                  ตรวจสอบแล้ว {Object.values(checkedItems).filter(Boolean).length} / 8 ข้อ
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {ALIGNMENT_CHECKLISTS.map((list) => {
                  const isDoctor = list.role === 'doctor';

                  return (
                    <div
                      key={list.role}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                    >
                      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                            isDoctor
                              ? 'bg-blue-600 text-white'
                              : 'bg-purple-600 text-white'
                          }`}
                        >
                          {isDoctor ? <Stethoscope className="w-4 h-4" /> : <Binary className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {list.roleTh}
                          </h4>
                          <span className="text-3xs text-slate-500 dark:text-slate-400">
                            {isDoctor ? 'Clinical Documentation Requirements' : 'Coding Compliance Auditing'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {list.tasks.map((task) => {
                          const isChecked = Boolean(checkedItems[task.id]);

                          return (
                            <div
                              key={task.id}
                              onClick={() => toggleCheck(task.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                                isChecked
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100'
                              }`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <p
                                  className={`text-xs font-bold ${
                                    isChecked
                                      ? 'text-emerald-900 dark:text-emerald-200 line-through opacity-80'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {task.text}
                                </p>
                                <p className="text-2xs text-slate-600 dark:text-slate-400">
                                  ตัวอย่าง: {task.example}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              คู่มือ สปสช. ฉบับถอดรหัส 47 ข้อ
            </span>
          </div>
          <button
            id="btn-close-blueprint-footer"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
