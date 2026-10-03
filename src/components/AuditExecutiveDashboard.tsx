import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Building2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Coins,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  AlertOctagon,
  FileCheck2,
  CheckCircle2,
  Filter,
  PieChart as PieChartIcon,
  BarChart3,
  User,
  Users,
  Activity,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  DiagnosisEntry,
  ProcedureEntry,
  MedicationItem,
  ClinicalProfile,
  Nhso18FilePatientCase,
} from '../types';
import {
  calculateExecutiveMetrics,
  HospitalExecutiveMetrics,
  CaseExecutiveSummary,
} from '../utils/auditExecutiveMetrics';

interface AuditExecutiveDashboardProps {
  activePdx: string;
  activeSecondaryDx: DiagnosisEntry[];
  activeMedications: MedicationItem[];
  activeClinicalProfile?: ClinicalProfile;
  activeProcedures?: ProcedureEntry[];
  activePatientCase?: Nhso18FilePatientCase | null;
  importedCases?: Nhso18FilePatientCase[];
  onSelectCase?: (caseItem: Nhso18FilePatientCase) => void;
  onFixAll?: () => void;
  onOpenImport?: () => void;
  onSwitchToForm?: () => void;
  onSwitchToTimeline?: () => void;
}

export const AuditExecutiveDashboard: React.FC<AuditExecutiveDashboardProps> = ({
  activePdx,
  activeSecondaryDx,
  activeMedications,
  activeClinicalProfile,
  activeProcedures,
  activePatientCase,
  importedCases = [],
  onSelectCase,
  onFixAll,
  onOpenImport,
  onSwitchToForm,
  onSwitchToTimeline,
}) => {
  // Scope selection: Hospital Overview vs Active Patient Case
  const [scopeView, setScopeView] = useState<'HOSPITAL' | 'ACTIVE_CASE'>('HOSPITAL');
  // Secondary Dx chart mode: Comorbid vs Complication or DRG Tiers
  const [sdxChartMode, setSdxChartMode] = useState<'ROLE' | 'DRG_TIER'>('ROLE');
  // Copied executive summary notification
  const [copied, setCopied] = useState(false);

  // Compute live executive metrics
  const metrics: HospitalExecutiveMetrics = useMemo(() => {
    return calculateExecutiveMetrics({
      activePdx,
      activeSecondaryDx,
      activeMedications,
      activeClinicalProfile,
      activeProcedures,
      activePatientCase,
      importedCases,
      forceViewScope: scopeView,
    });
  }, [
    activePdx,
    activeSecondaryDx,
    activeMedications,
    activeClinicalProfile,
    activeProcedures,
    activePatientCase,
    importedCases,
    scopeView,
  ]);

  // Data for Secondary Dx Pie/Donut Chart
  const pieData = useMemo(() => {
    if (sdxChartMode === 'ROLE') {
      const stats = metrics.secondaryDxStats;
      return [
        {
          name: 'โรคร่วม (Comorbid Dx)',
          value: stats.comorbidCount,
          percent: stats.comorbidPercent,
          color: '#3B82F6', // Blue
          description: 'โรคเดิมหรือโรคร่วมที่ผู้ป่วยมีก่อนรับไว้รักษาใน รพ.',
        },
        {
          name: 'โรคแทรก (Complication Dx)',
          value: stats.complicationCount,
          percent: stats.complicationPercent,
          color: '#E11D48', // Rose / Red
          description: 'ภาวะแทรกซ้อนที่เกิดขึ้นระหว่างนอน รพ. (สปสช. ตรวจสอบเข้มงวดที่สุด)',
        },
      ];
    } else {
      const stats = metrics.secondaryDxStats;
      return [
        {
          name: 'MCC (Major CC)',
          value: stats.mccCount,
          percent: stats.mccPercent,
          color: '#E11D48', // Rose
          description: 'ภาวะแทรกซ้อนรุนแรงสูงสุด (เพิ่ม AdjRW มากที่สุด ตรวจเข้มงวดอันดับ 1)',
        },
        {
          name: 'CC (Significant CC)',
          value: stats.ccCount,
          percent: stats.ccPercent,
          color: '#F59E0B', // Amber
          description: 'โรคร่วมที่มีผลต่อน้ำหนักสัมพัทธ์ปานกลาง',
        },
        {
          name: 'Minor CC',
          value: stats.minorCount,
          percent: stats.totalCount > 0 ? Math.round((stats.minorCount / stats.totalCount) * 100) : 0,
          color: '#3B82F6', // Blue
          description: 'โรคร่วมที่มีผลต่อน้ำหนักสัมพัทธ์เล็กน้อย',
        },
        {
          name: 'Non-CC',
          value: stats.nonCcCount,
          percent: stats.totalCount > 0 ? Math.round((stats.nonCcCount / stats.totalCount) * 100) : 0,
          color: '#64748B', // Slate
          description: 'โรคร่วมทั่วไปที่ไม่มีผลเพิ่มค่าน้ำหนัก DRG',
        },
      ];
    }
  }, [metrics.secondaryDxStats, sdxChartMode]);

  // Data for Financial Risk by Rule Category (Recharts Stacked Bar)
  const barData = useMemo(() => {
    return metrics.financialRiskCategories.map((item) => ({
      name: item.name.split(' (')[0],
      fullName: item.name,
      'ยอดปลอดภัย (อนุมัติ)': item.safeAmount,
      'มูลค่าเสี่ยงถูกปฏิเสธ (At-Risk)': item.atRiskAmount,
      total: item.safeAmount + item.atRiskAmount,
      description: item.description,
      caseCount: item.caseCount,
    }));
  }, [metrics.financialRiskCategories]);

  // Copy Executive Summary for briefing
  const handleCopySummary = () => {
    const text = `=== สรุปผลการตรวจสอบและประเมินความเสี่ยงทางการเงิน (Audit Executive Briefing) ===
ขอบเขตข้อมูล: ${scopeView === 'HOSPITAL' ? 'ภาพรวมโรงพยาบาล' : `เคส AN: ${metrics.caseSummaries[0]?.an || '-'}`}
จำนวนเคสทั้งหมด: ${metrics.totalCases} ราย
อัตราการผ่านเกณฑ์: ${metrics.passRatePercent}% (ผ่าน: ${metrics.passCases}, เฝ้าระวัง: ${metrics.warningCases}, ปฏิเสธ: ${metrics.denyCases})
มูลค่าการเบิกจ่ายรวม: ฿${metrics.totalClaimAmount.toLocaleString()} บาท
มูลค่าที่เสี่ยงถูกปฏิเสธ (Financial Risk): ฿${metrics.atRiskClaimAmount.toLocaleString()} บาท (${metrics.riskPercent}%)
สัดส่วนโรครอง: โรคร่วม ${metrics.secondaryDxStats.comorbidCount} รายการ (${metrics.secondaryDxStats.comorbidPercent}%) | โรคแทรก ${metrics.secondaryDxStats.complicationCount} รายการ (${metrics.secondaryDxStats.complicationPercent}%)
รหัสความรุนแรงสูงสุด (MCC): ${metrics.secondaryDxStats.mccCount} รายการ
ประเด็นเสี่ยงสูงสุด: ${metrics.topRiskCases[0]?.primaryIssue || 'ไม่มีข้อขัดแย้งรุนแรง'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const hasImportedCases = importedCases.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Executive Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mb-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
                <Building2 className="w-3.5 h-3.5" />
                <span>Audit Executive Dashboard</span>
              </span>
              <span className="text-3xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                สปสช. IP Pre-Claim Analytics
              </span>
              {hasImportedCases && (
                <span className="text-3xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                  ข้อมูลจริงจาก 18 แฟ้ม ({importedCases.length} ราย)
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              รายงานวิเคราะห์ผลการตรวจสอบ & ความเสี่ยงทางการเงินของโรงพยาบาล
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              ภาพรวมสถานะการเคลม e-Claim, สัดส่วนโรคร่วม vs โรคแทรก, และมูลค่าการเบิกที่อาจถูกปฏิเสธ (Financial Clawback Risk) เพื่อวางแผนควบคุมคุณภาพเวชระเบียนและป้องกันความเสียหายของรายได้โรงพยาบาล
            </p>
          </div>

          {/* Scope View Toggle & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Toggle Scope: Hospital-wide vs Single Case */}
            <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-700/80 flex items-center shadow-inner">
              <button
                type="button"
                id="btn-scope-hospital"
                onClick={() => setScopeView('HOSPITAL')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scopeView === 'HOSPITAL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={hasImportedCases ? `ดูภาพรวมทั้ง 18 แฟ้ม (${importedCases.length} ราย)` : 'ดูภาพรวมเคสจำลองทั้งโรงพยาบาล'}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ภาพรวมทั้งโรงพยาบาล</span>
                <span className="text-3xs px-1.5 py-0.2 rounded-full bg-white/20">
                  {metrics.totalCases}
                </span>
              </button>

              <button
                type="button"
                id="btn-scope-active-case"
                onClick={() => setScopeView('ACTIVE_CASE')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  scopeView === 'ACTIVE_CASE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="เจาะลึกเฉพาะเคสผู้ป่วยที่กำลังเปิดอยู่ในปัจจุบัน"
              >
                <User className="w-3.5 h-3.5" />
                <span>เคสที่เปิดอยู่ (AN: {activePatientCase?.an || 'ปัจจุบัน'})</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-copy-exec-summary"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                title="คัดลอกข้อความสรุปผู้บริหารสำหรับส่ง Line หรือทำรายงานสรุป"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                    <span>สรุปผู้บริหาร</span>
                  </>
                )}
              </button>

              {onFixAll && metrics.denyCases > 0 && (
                <button
                  type="button"
                  id="btn-fix-all-from-dashboard"
                  onClick={onFixAll}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ring-1 ring-rose-400/50 animate-pulse"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>คลิกเดียวแก้ไขจุดผิดพลาด</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Approval Rate & Verdict Breakdown */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              อัตราการผ่านเกณฑ์ (Pass Rate)
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                metrics.passRatePercent >= 70
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : metrics.passRatePercent >= 40
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span
              className={`text-3xl font-black font-mono tracking-tight ${
                metrics.passRatePercent >= 70
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : metrics.passRatePercent >= 40
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {metrics.passRatePercent}%
            </span>
            <span className="text-3xs text-slate-500 font-medium">
              จากทั้งหมด {metrics.totalCases} เคส
            </span>
          </div>

          {/* Visual Mini Distribution Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 flex overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${metrics.passRatePercent}%` }}
              title={`ผ่านเกณฑ์: ${metrics.passCases} เคส`}
            />
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${metrics.warningRatePercent}%` }}
              title={`เฝ้าระวัง: ${metrics.warningCases} เคส`}
            />
            <div
              className="bg-rose-500 h-full transition-all"
              style={{ width: `${metrics.denyRatePercent}%` }}
              title={`เสี่ยงถูกตัดเงิน: ${metrics.denyCases} เคส`}
            />
          </div>

          <div className="flex items-center justify-between text-3xs font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-emerald-700 dark:text-emerald-400">
              ผ่าน: {metrics.passCases}
            </span>
            <span className="text-amber-700 dark:text-amber-400">
              เฝ้าระวัง: {metrics.warningCases}
            </span>
            <span className="text-rose-700 dark:text-rose-400">
              ปฏิเสธ: {metrics.denyCases}
            </span>
          </div>
        </div>

        {/* KPI 2: Potential Financial Risk (Denied Amount) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              มูลค่าเสี่ยงถูกปฏิเสธ (Financial Risk)
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-600 dark:text-rose-400 tracking-tight">
              ฿{metrics.atRiskClaimAmount.toLocaleString()}
            </span>
            <span className="text-3xs px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
              {metrics.riskPercent}% เสี่ยง
            </span>
          </div>

          <p className="text-3xs text-slate-500 dark:text-slate-400">
            {metrics.atRiskClaimAmount > 0 ? (
              <span className="text-rose-700 dark:text-rose-400 font-medium">
                ⚠️ เสี่ยงถูก สปสช. เรียกเงินคืน (Clawback) จากเกณฑ์ CR1 / CR37
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                ✓ ไม่มีมูลค่าที่เสี่ยงถูกปฏิเสธในปัจจุบัน
              </span>
            )}
          </p>

          <div className="text-3xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>มูลค่ายอดปลอดภัย:</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
              ฿{metrics.safeClaimAmount.toLocaleString()} บาท
            </span>
          </div>
        </div>

        {/* KPI 3: Total Estimated Claims Volume */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              มูลค่าการเบิกจ่ายรวม (Total Claim)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              <Coins className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              ฿{metrics.totalClaimAmount.toLocaleString()}
            </span>
            <span className="text-3xs text-slate-500">บาท</span>
          </div>

          <p className="text-3xs text-slate-500 dark:text-slate-400">
            ประมาณการจากค่าน้ำหนักสัมพัทธ์ (Relative Weight) และข้อมูลบิลยา/หัตถการ
          </p>

          <div className="text-3xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>อัตรา สปสช. ต่อ AdjRW:</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              ฿8,350 / RW
            </span>
          </div>
        </div>

        {/* KPI 4: Comorbid vs Complication & MCC Count */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-3xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              โครงสร้างโรครอง (Secondary Dx)
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {metrics.secondaryDxStats.totalCount}
            </span>
            <span className="text-3xs text-slate-500 font-medium">รหัสวินิจฉัยรอง</span>
          </div>

          <div className="flex items-center gap-2 text-3xs">
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
              โรคร่วม: {metrics.secondaryDxStats.comorbidCount} ({metrics.secondaryDxStats.comorbidPercent}%)
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
              โรคแทรก: {metrics.secondaryDxStats.complicationCount} ({metrics.secondaryDxStats.complicationPercent}%)
            </span>
          </div>

          <div className="text-3xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>กลุ่มเพิ่มน้ำหนักสูงสุด (MCC):</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {metrics.secondaryDxStats.mccCount} รายการ (อันดับ 1)
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Section (Using Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Secondary Diagnoses Distribution (Donut / Pie Chart) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <PieChartIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  สัดส่วนกลุ่มโรครอง (Secondary Diagnoses)
                </h3>
                <p className="text-3xs text-slate-500 dark:text-slate-400">
                  วิเคราะห์การกระจายตัวตามประเภทโรคร่วม vs โรคแทรก และระดับ DRG
                </p>
              </div>
            </div>

            {/* Sub-view Switcher: Role vs DRG Tier */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
              <button
                type="button"
                id="btn-chart-role"
                onClick={() => setSdxChartMode('ROLE')}
                className={`px-2.5 py-1 rounded-md text-3xs font-semibold transition-all cursor-pointer ${
                  sdxChartMode === 'ROLE'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                โรคร่วม vs โรคแทรก
              </button>
              <button
                type="button"
                id="btn-chart-drg-tier"
                onClick={() => setSdxChartMode('DRG_TIER')}
                className={`px-2.5 py-1 rounded-md text-3xs font-semibold transition-all cursor-pointer ${
                  sdxChartMode === 'DRG_TIER'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ระดับ DRG (MCC/CC)
              </button>
            </div>
          </div>

          {/* Donut Chart Container */}
          <div className="h-64 w-full flex items-center justify-center">
            {metrics.secondaryDxStats.totalCount === 0 ? (
              <div className="text-center text-slate-400 text-xs italic py-10">
                ยังไม่มีรายการการวินิจฉัยรองในชุดข้อมูลนี้
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value} รายการ (${item.payload.percent}%)`,
                      item.payload.name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderColor: '#334155',
                      borderRadius: '10px',
                      color: '#F8FAFC',
                      fontSize: '11px',
                    }}
                    itemStyle={{ color: '#F8FAFC' }}
                  />
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Executive Insight Note */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-3xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
              <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>เกณฑ์มาตรฐาน สปสช. สำหรับผู้บริหาร:</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              • <strong>โรคแทรก (Complication)</strong> ต้องเกิดขึ้นภายหลังการรับรักษาใน รพ. และมีผลกระทบโดยตรงต่อค่าน้ำหนักสัมพัทธ์ (DRG Relative Weight) เช่น ภาวะช็อก (R572)
              <br />
              • หากแพทย์หรือผู้ให้รหัสลง <strong>R572 เป็นโรคร่วม (Comorbid)</strong> จะถูกระบบ สปสช. ล็อคปฏิเสธการจ่ายทันทีตามเงื่อนไข [CR37]
            </p>
          </div>
        </div>

        {/* Chart 2: Financial Risk by Rule Category (Stacked Bar Chart) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  มูลค่าการเบิกที่อาจถูกปฏิเสธแยกตามหมวดกฎ สปสช. (Financial Risk by Category)
                </h3>
                <p className="text-3xs text-slate-500 dark:text-slate-400">
                  เปรียบเทียบยอดที่ผ่านเกณฑ์ปลอดภัย vs ยอดที่เสี่ยงถูกตัดเงินจากการตรวจประเมิน
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-3xs font-semibold">
              <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-600" />
                <span>เสี่ยงถูกตัด (At-Risk)</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" />
                <span>ปลอดภัย (Approved)</span>
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.15} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  angle={-10}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `฿${Number(value).toLocaleString()} บาท`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                    borderRadius: '10px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
                <Bar
                  dataKey="ยอดปลอดภัย (อนุมัติ)"
                  stackId="a"
                  fill="#10B981"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="มูลค่าเสี่ยงถูกปฏิเสธ (At-Risk)"
                  stackId="a"
                  fill="#E11D48"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Financial Risk Summary Footnote */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-3xs text-rose-900 dark:text-rose-200">
              <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">จุดเสี่ยงสูญเสียรายได้สูงสุด (Top Risk Driver):</span>
                <span>
                  เกณฑ์ <strong>CR37 (Sepsis & Shock)</strong> มีมูลค่าเสี่ยงตัดเงินสูงสุดเนื่องจากถูกลดขั้นจาก Septic Shock (AdjRW 4.5+) เหลือเพียง Sepsis ธรรมดา
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2 text-3xs text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">โอกาสกู้คืนรายได้ (Revenue Protection):</span>
                <span>
                  หากตรวจสอบและปรับปรุงรหัสตามข้อแนะนำก่อนส่งเบิก สามารถรักษาเงินชดเชยของโรงพยาบาลได้ถึง <strong>฿{metrics.atRiskClaimAmount.toLocaleString()} บาท</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table: Top At-Risk Patient Cases (Drill-down Table) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                รายชื่อเคสที่มีความเสี่ยงทางการเงินสูงสุด (Priority Cases for Pre-Claim Audit)
              </h3>
              <span className="text-3xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                {metrics.topRiskCases.length} เคสต้องทบทวนด่วน
              </span>
            </div>
            <p className="text-3xs text-slate-500 dark:text-slate-400 mt-0.5">
              จัดลำดับตามมูลค่าที่เสี่ยงถูกตัดเงิน เพื่อให้ทีม Audit และแพทย์ผู้รักษาเข้ามาทบทวนเวชระเบียนก่อนส่ง e-Claim
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToForm && (
              <button
                type="button"
                id="btn-goto-form-view"
                onClick={onSwitchToForm}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>เปิดแบบฟอร์มตรวจสอบ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenImport && (
              <button
                type="button"
                id="btn-import-more-cases"
                onClick={onOpenImport}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>นำเข้า 18 แฟ้มเพิ่มเติม</span>
              </button>
            )}
          </div>
        </div>

        {/* Case List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">ผู้ป่วย (AN / HN)</th>
                <th className="py-2.5 px-3">โรคหลัก (PDx)</th>
                <th className="py-2.5 px-3">สัดส่วนโรครอง (SDx)</th>
                <th className="py-2.5 px-3">ยอดเบิกประเมิน</th>
                <th className="py-2.5 px-3">ยอดเสี่ยงถูกตัด (Risk)</th>
                <th className="py-2.5 px-3">สถานะ & ข้อขัดแย้งหลัก</th>
                <th className="py-2.5 px-3 text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {metrics.caseSummaries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    ไม่พบข้อมูลเคสผู้ป่วยในระบบ
                  </td>
                </tr>
              ) : (
                metrics.caseSummaries.map((c, idx) => {
                  const isDeny = c.verdict === 'DENY';
                  const isWarn = c.verdict === 'WARNING';
                  const isPass = c.verdict === 'PASS';

                  return (
                    <tr
                      key={c.caseId || idx}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        isDeny ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      {/* Patient Details */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>AN: {c.an}</span>
                        </div>
                        <div className="text-3xs text-slate-500 font-mono">
                          HN: {c.hn} | {c.patientName}
                        </div>
                      </td>

                      {/* PDx */}
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-xs">
                          {c.pdx}
                        </span>
                      </td>

                      {/* Secondary Dx Breakdown */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 text-3xs font-medium">
                          <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            ร่วม: {c.comorbidCount}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            แทรก: {c.complicationCount}
                          </span>
                          {c.mccCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                              MCC: {c.mccCount}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Claim */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        ฿{c.totalCharge.toLocaleString()}
                      </td>

                      {/* At Risk Amount */}
                      <td className="py-3 px-3 font-mono font-bold">
                        {c.atRiskCharge > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            ฿{c.atRiskCharge.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ฿0 (ปลอดภัย)
                          </span>
                        )}
                      </td>

                      {/* Verdict & Reason */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-3xs font-bold px-2 py-0.5 rounded-full border ${
                              isDeny
                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                                : isWarn
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                            }`}
                          >
                            {c.verdict}
                          </span>
                        </div>
                        <p className="text-3xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-1 max-w-xs" title={c.primaryIssue}>
                          {c.primaryIssue}
                        </p>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectCase && importedCases.length > 0) {
                              const found = importedCases.find((ic) => ic.an === c.an);
                              if (found) {
                                onSelectCase(found);
                                if (onSwitchToForm) onSwitchToForm();
                              }
                            } else if (onSwitchToForm) {
                              onSwitchToForm();
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-3xs font-semibold shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>ตรวจสอบ</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hospital Policy & Preventive Recommendations */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 dark:from-slate-900 dark:via-slate-800/80 dark:to-slate-900 border border-blue-200 dark:border-slate-700/80 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            ข้อแนะนำเชิงนโยบายเพื่อป้องกันความเสี่ยงทางการเงินของโรงพยาบาล (Audit Policy Recommendations)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 space-y-1">
            <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              1. ระบบแจ้งเตือนแพทย์ก่อนสั่ง R572
            </span>
            <p className="text-3xs text-slate-600 dark:text-slate-400 leading-relaxed">
              ติดตั้งระบบเตือนใน HIS หากแพทย์บันทึก Septic Shock (R572) แต่ในใบสั่งยาไม่มีการให้ยากระตุ้นความดัน (Norepinephrine/Levophed) หรือลงผิดประเภทเป็นโรคร่วม
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 space-y-1">
            <span className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              2. บังคับบันทึกผลแล็บ Hemoculture & Lactate
            </span>
            <p className="text-3xs text-slate-600 dark:text-slate-400 leading-relaxed">
              เคสที่วินิจฉัย Sepsis ทุกรายต้องมีผลเจาะเลือดเพาะเชื้อและ Serum Lactate ตามเกณฑ์ Hour-1 Bundle เพื่อไม่ให้ถูก สปสช. ปฏิเสธตามเกณฑ์ [CR1]
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-blue-100 dark:border-slate-800 space-y-1">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              3. Pre-Claim Audit เคสเกิน ฿50,000
            </span>
            <p className="text-3xs text-slate-600 dark:text-slate-400 leading-relaxed">
              จัดทีมเวชสถิติและแพทย์พี่เลี้ยงตรวจประเมินเวชระเบียนทุกเคสที่มีมูลค่าสูง (&gt; ฿50k) ก่อนส่งข้อมูลเข้าสู่ e-Claim เพื่อลดอัตราการถูกสุ่มตรวจย้อนหลัง
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
