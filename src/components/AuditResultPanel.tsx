import React, { useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Sparkles,
  TrendingUp,
  BarChart3,
  Cloud,
  Save,
} from 'lucide-react';
import {
  AuditResultItem,
  DiagnosisEntry,
  ProcedureEntry,
  MedicationItem,
  ClinicalProfile,
  Nhso17FilePatientCase,
} from '../types';
import { ValidationSummary } from '../utils/auditValidator';
import { calculateHighCostProbability } from '../utils/highCostProbability';
import { HighCostRiskChart } from './HighCostRiskChart';

interface AuditResultPanelProps {
  summary: ValidationSummary;
  pdx: string;
  secondaryDx?: DiagnosisEntry[];
  procedures?: ProcedureEntry[];
  medications?: MedicationItem[];
  clinicalProfile?: ClinicalProfile;
  activePatientCase?: Nhso17FilePatientCase | null;
  onApplyAction: (action: NonNullable<AuditResultItem['recommendedAction']>) => void;
  onFixAll: () => void;
  onOpenGuidelines: () => void;
  onOpenDashboard?: () => void;
  onSaveAuditToFirebase?: () => void;
  isSavingAudit?: boolean;
}

export const AuditResultPanel: React.FC<AuditResultPanelProps> = ({
  summary,
  pdx,
  secondaryDx = [],
  procedures = [],
  medications = [],
  clinicalProfile,
  activePatientCase,
  onApplyAction,
  onFixAll,
  onOpenGuidelines,
  onOpenDashboard,
  onSaveAuditToFirebase,
  isSavingAudit = false,
}) => {
  const [copied, setCopied] = React.useState(false);

  const results = summary?.results || [];
  const actionableItems = results.filter(
    (r) => r.severity === 'DENY' && r.recommendedAction
  );

  const cleanPdx = pdx.replace(/\./g, '');

  // High-Cost Claim Probability & Risk Trend using recharts engine
  const highCostAnalysis = useMemo(() => {
    return calculateHighCostProbability({
      pdx: cleanPdx,
      secondaryDx,
      procedures,
      medications,
      clinicalProfile,
      activePatientCase,
    });
  }, [cleanPdx, secondaryDx, procedures, medications, clinicalProfile, activePatientCase]);

  const handleCopyCodes = () => {
    const text = `ผลการตรวจสอบรหัสโรค สปสช.:\nสถานะ: ${summary.status}\nโรคหลัก: ${cleanPdx}\nความเสี่ยง High-Cost Claim: ${highCostAnalysis.probability}% (${highCostAnalysis.riskLevel})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-20 space-y-4 transition-colors">
      {/* Verdict Header */}
      <div
        className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          summary.status === 'DENY'
            ? 'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-700/80 shadow-2xs dark:shadow-[0_0_15px_rgba(244,63,94,0.25)]'
            : summary.status === 'WARNING'
            ? 'bg-amber-50 dark:bg-amber-950/90 border-amber-200 dark:border-amber-700/80'
            : 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-700/80'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
              summary.status === 'DENY'
                ? 'bg-rose-600 dark:bg-rose-500 text-white ring-2 ring-rose-400/50'
                : summary.status === 'WARNING'
                ? 'bg-amber-500 text-white ring-2 ring-amber-400/50'
                : 'bg-emerald-600 text-white ring-2 ring-emerald-400/50'
            }`}
          >
            {summary.status === 'DENY' ? (
              <ShieldAlert className="w-6 h-6" />
            ) : summary.status === 'WARNING' ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                className={`font-extrabold text-base sm:text-lg ${
                  summary.status === 'DENY'
                    ? 'text-rose-950 dark:text-rose-100'
                    : summary.status === 'WARNING'
                    ? 'text-amber-950 dark:text-amber-100'
                    : 'text-emerald-950 dark:text-emerald-100'
                }`}
              >
                {summary.status === 'DENY'
                  ? 'ติดข้อผิดพลาด: ปฏิเสธการเบิกจ่าย (DENY)'
                  : summary.status === 'WARNING'
                  ? 'มีข้อสังเกตความเสี่ยง (WARNING)'
                  : 'ผ่านการตรวจสอบเงื่อนไข (PASS)'}
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider shadow-2xs ${
                  summary.status === 'DENY'
                    ? 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-600 ring-1 ring-rose-400/30'
                    : summary.status === 'WARNING'
                    ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-600'
                    : 'bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-600'
                }`}
              >
                {summary.status}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {summary.status === 'DENY'
                ? `พบข้อผิดพลาดที่ระบบ AI Pre-Audit ปฏิเสธ ${summary.errorCount} รายการ`
                : summary.status === 'WARNING'
                ? `มีคำเตือนที่ควรระวัง ${summary.warningCount} รายการ`
                : 'ชุดรหัสโรคและการรักษาสอดคล้องกันตามหลักเกณฑ์ สปสช.'}
            </p>
          </div>
        </div>

        {/* Action Buttons: Fix-All & Cloud Save */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onSaveAuditToFirebase && (
            <button
              type="button"
              id="btn-save-audit-to-cloud"
              disabled={isSavingAudit}
              onClick={onSaveAuditToFirebase}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="บันทึกผลการตรวจสอบเคสนี้ลงฐานข้อมูล Firebase Firestore"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{isSavingAudit ? 'กำลังบันทึก...' : 'บันทึกลง Cloud (Firestore)'}</span>
            </button>
          )}

          {actionableItems.length > 0 && (
            <button
              type="button"
              id="btn-fix-all-issues"
              onClick={onFixAll}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer ring-1 ring-rose-400/50"
            >
              <Sparkles className="w-4 h-4" />
              <span>แก้ไขอัตโนมัติทั้งหมด ({actionableItems.length})</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-5 space-y-4">
        {/* High-Cost Claim Probability Recharts Component */}
        <HighCostRiskChart analysis={highCostAnalysis} />
      </div>

      {/* Results List */}
      <div className="p-5 space-y-4 max-h-[calc(100vh-420px)] overflow-y-auto">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            รายการตรวจสอบความถูกต้องรหัสโรค (Audit Checks - {results.length} รายการ)
          </span>
          <button
            type="button"
            onClick={handleCopyCodes}
            className="text-3xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'คัดลอกผลแล้ว' : 'คัดลอกสรุปผล'}</span>
          </button>
        </div>

        {results.map((result, idx) => {
          const isDeny = result.severity === 'DENY';
          const isWarning = result.severity === 'WARNING';
          const isPass = result.severity === 'PASS';

          return (
            <div
              key={`res_${idx}`}
              className={`p-4 rounded-xl border transition-all ${
                isDeny
                  ? 'bg-rose-50/70 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/80 shadow-xs'
                  : isWarning
                  ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/70'
                  : 'bg-emerald-50/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  {/* Error Tag matching e-Claim (CR37, CR1, etc.) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {result.errorTag ? (
                      <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/90 text-rose-900 dark:text-rose-100 border border-rose-300 dark:border-rose-600 shadow-2xs ring-1 ring-rose-400/40">
                        {result.errorTag}
                      </span>
                    ) : (
                      <span
                        className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                          isPass
                            ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200'
                            : isWarning
                            ? 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200'
                            : 'bg-rose-100 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200'
                        }`}
                      >
                        {result.ruleCode}
                      </span>
                    )}
                    <h3
                      className={`text-sm font-bold ${
                        isDeny
                          ? 'text-rose-950 dark:text-rose-100'
                          : isWarning
                          ? 'text-amber-950 dark:text-amber-100'
                          : 'text-emerald-950 dark:text-emerald-100'
                      }`}
                    >
                      {result.title}
                    </h3>
                  </div>

                  {/* Description / Root Cause */}
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {result.description}
                  </p>

                  {/* How to fix */}
                  {result.howToFix && (
                    <div className="mt-2 text-xs bg-white/90 dark:bg-slate-800/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-start gap-2 shadow-2xs">
                      <Wrench className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-white">วิธีแก้ไข:</span>{' '}
                        <span>{result.howToFix}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button for this specific issue */}
              {result.recommendedAction && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onApplyAction(result.recommendedAction!)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 shadow-2xs hover:border-slate-400 dark:hover:border-slate-500 transition-colors cursor-pointer"
                  >
                    <span>
                      {result.recommendedAction.actionType === 'CHANGE_TYPE'
                        ? `คลิกเปลี่ยน ${result.recommendedAction.targetCode.replace(/\./g, '')} เป็น "${
                            result.recommendedAction.newType === 'complication'
                              ? 'โรคแทรก'
                              : 'โรคร่วม'
                          }"`
                        : result.recommendedAction.actionType === 'REMOVE_CODE'
                        ? `คลิกลบรหัส ${result.recommendedAction.targetCode.replace(/\./g, '')} ออกทันที`
                        : result.recommendedAction.actionType === 'REPLACE_PDX'
                        ? `คลิกเปลี่ยนโรคหลักเป็น ${result.recommendedAction.pdx?.replace(/\./g, '')}`
                        : 'ปรับรหัสตามคำแนะนำ'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Executive Dashboard Shortcut Button */}
      {onOpenDashboard && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl mx-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <div className="text-3xs">
              <span className="font-bold text-white block">Audit Executive Dashboard</span>
              <span className="text-slate-300">ดูกราฟสัดส่วนโรครอง & วิเคราะห์มูลค่าเสี่ยงถูกปฏิเสธ</span>
            </div>
          </div>
          <button
            type="button"
            id="btn-panel-open-executive-dashboard"
            onClick={onOpenDashboard}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-3xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
          >
            <span>เปิด Dashboard</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Footer advice */}
      <div className="bg-slate-50 dark:bg-slate-800/70 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>อ้างอิงตามเกณฑ์ Audit สปสช. ปีงบประมาณ 2568 - 2569</span>
        </div>
        <button
          type="button"
          onClick={onOpenGuidelines}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1 cursor-pointer"
        >
          <span>เปิดอ่านเกณฑ์ฉบับเต็ม</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
