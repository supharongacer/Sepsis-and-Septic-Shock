import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Pill,
  ChevronRight,
  ShieldAlert,
  Coins,
  DollarSign,
  AlertOctagon,
  Calendar
} from 'lucide-react';
import { Nhso17FilePatientCase, Nhso17ImportResult } from '../types';
import { ICD10_DATABASE } from '../data/rulesData';
import { DrgWeightBadge } from './DrgWeightBadge';

interface Nhso17CaseBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  importResult: Nhso17ImportResult | null;
  activeAn: string;
  onSelectCase: (patientCase: Nhso17FilePatientCase) => void;
  onOpenImportModal: () => void;
  onSelectCaseAndOpenTimeline?: (patientCase: Nhso17FilePatientCase) => void;
}

export const Nhso17CaseBrowserModal: React.FC<Nhso17CaseBrowserModalProps> = ({
  isOpen,
  onClose,
  importResult,
  activeAn,
  onSelectCase,
  onOpenImportModal,
  onSelectCaseAndOpenTimeline,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CR37_MISMATCH' | 'HIGH_COST' | 'DENY' | 'PASS'>('ALL');

  if (!isOpen || !importResult) return null;

  // Compute counts
  const cases = importResult?.cases || [];
  const cr37MismatchCount = cases.filter((c) => c.auditAnalysis?.isCr37MedMismatch).length;
  const highCostCount = cases.filter((c) => c.auditAnalysis?.isHighCostClaim).length;
  const denyCount = cases.filter((c) => c.initialAuditStatus === 'DENY').length;
  const passCount = cases.filter((c) => c.initialAuditStatus === 'PASS').length;

  // Filter cases based on search and status
  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const secondaryDx = c.secondaryDx || [];
      const matchesSearch =
        (c.an || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.hn || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.patientName && c.patientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.pdx || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        secondaryDx.some((s) => (s?.code || '').toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'CR37_MISMATCH') return Boolean(c.auditAnalysis?.isCr37MedMismatch);
      if (statusFilter === 'HIGH_COST') return Boolean(c.auditAnalysis?.isHighCostClaim);
      if (statusFilter === 'DENY') return c.initialAuditStatus === 'DENY';
      if (statusFilter === 'PASS') return c.initialAuditStatus === 'PASS';
      return true;
    });
  }, [cases, searchTerm, statusFilter]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  ระบบตรวจสอบ (Auto-Audit) ผู้ป่วยใน 18 แฟ้ม สปสช.
                </h2>
                <span className="text-3xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-mono">
                  {importResult.fileName}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                พบ {importResult.cases.length} รายการผู้ป่วยใน | ตรวจสอบอัตโนมัติ: เคสยอดเบิกสูงผิดปกติ และเงื่อนไขการวินิจฉัยไม่สอดคล้องกับยา (CR37)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImportModal}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 font-medium text-slate-700 cursor-pointer"
            >
              นำเข้าแฟ้มใหม่
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/50 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                ทั้งหมด ({importResult.cases.length})
              </button>

              {/* CR37 Mismatch Button */}
              <button
                type="button"
                onClick={() => setStatusFilter('CR37_MISMATCH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'CR37_MISMATCH'
                    ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                    : cr37MismatchCount > 0
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                    : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>🚨 CR37 ยาไม่ตรงโรค ({cr37MismatchCount})</span>
              </button>

              {/* High Cost Claim Button */}
              <button
                type="button"
                onClick={() => setStatusFilter('HIGH_COST')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === 'HIGH_COST'
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                    : highCostCount > 0
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                    : 'bg-white border border-slate-200 text-slate-500'
                }`}
              >
                <Coins className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>💰 ยอดเบิกสูงผิดปกติ ({highCostCount})</span>
              </button>

              {/* Deny Button */}
              <button
                type="button"
                onClick={() => setStatusFilter('DENY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'DENY'
                    ? 'bg-red-700 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>ติด DENY ({denyCount})</span>
              </button>

              {/* Pass Button */}
              <button
                type="button"
                onClick={() => setStatusFilter('PASS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'PASS'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>ผ่านเกณฑ์ ({passCount})</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา AN, HN, ชื่อ หรือรหัสโรค..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Audit Rule Definition Footnote */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-3xs text-slate-500 pt-1 border-t border-slate-200/60">
            <span className="flex items-center gap-1 text-rose-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
              <strong>เกณฑ์ CR37:</strong> ตรวจสอบ Septic shock (R57.2) ต้องมี Vasopressor ใน DRU, ห้ามใส่ Shock เป็นโรคหลัก, และต้องเป็นโรคแทรกเท่านั้น
            </span>
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
              <strong>เกณฑ์ High-Cost Claim:</strong> ยอดค่ารักษาพยาบาลตั้งแต่ ฿50,000 ขึ้นไป สปสช. จะจัดเป็นเคสสุ่มตรวจเวชระเบียนเข้มข้น
            </span>
          </div>
        </div>

        {/* Case List */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-3">
          {filteredCases.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              ไม่พบรายการผู้ป่วยที่ตรงกับเงื่อนไขการค้นหา
            </div>
          ) : (
            filteredCases.map((c) => {
              const isActive = c.an === activeAn;
              const pdxName = ICD10_DATABASE[c.pdx]?.nameTh || c.pdx;
              const isCr37Mismatch = Boolean(c.auditAnalysis?.isCr37MedMismatch);
              const isHighCost = Boolean(c.auditAnalysis?.isHighCostClaim);
              const meds = c.medications || [];
              const hasVaso = meds.some((m) => m.isSelected !== false && m.category === 'vasopressor');
              const atbList = meds.filter((m) => m.isSelected !== false && m.category === 'iv_antibiotic');

              return (
                <div
                  key={c.an}
                  className={`p-4 rounded-xl transition-all border flex flex-col gap-3 ${
                    isCr37Mismatch
                      ? 'border-rose-400 bg-rose-50/40 shadow-xs'
                      : isHighCost
                      ? 'border-amber-300 bg-amber-50/30'
                      : isActive
                      ? 'bg-emerald-50/50 border-emerald-300'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {/* Top Bar: AN, HN, Demographics, and Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        AN: {c.an}
                      </span>
                      <span className="text-xs text-slate-500">
                        (HN: {c.hn})
                      </span>
                      <span className="font-semibold text-xs text-slate-800">
                        {c.patientName}
                      </span>
                      {c.age && (
                        <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {c.sex || ''} อายุ {c.age} ปี
                        </span>
                      )}
                      {c.insuranceType && (
                        <span className="text-3xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                          {c.insuranceType}
                        </span>
                      )}
                      {isActive && (
                        <span className="text-3xs px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold">
                          กำลังเปิดอยู่
                        </span>
                      )}
                    </div>

                    {/* Right side status chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isCr37Mismatch && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-3xs flex items-center gap-1 shadow-2xs">
                          <AlertTriangle className="w-3 h-3" />
                          <span>แจ้งเตือน CR37 ยาไม่ตรงโรค</span>
                        </span>
                      )}

                      {isHighCost && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-3xs flex items-center gap-1 shadow-2xs">
                          <Coins className="w-3 h-3" />
                          <span>ยอดเบิกสูง ฿{c.totalCharge?.toLocaleString()}</span>
                        </span>
                      )}

                      {c.initialAuditStatus === 'DENY' ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-3xs border border-rose-200">
                          ติด DENY
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-3xs border border-emerald-200">
                          ผ่านเกณฑ์ (PASS)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* PROMINENT RED WARNING BAR: CR37 Med Mismatch Notification */}
                  {isCr37Mismatch && c.auditAnalysis?.cr37MismatchReasons && (
                    <div className="p-3 rounded-lg bg-rose-100/90 border border-rose-300 text-rose-950 text-xs shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900 mb-1">
                        <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>แถบแจ้งเตือนเงื่อนไขไม่สอดคล้องตามเกณฑ์ CR37 (เสี่ยงปฏิเสธจ่าย DENY 100%):</span>
                      </div>
                      <ul className="space-y-1 pl-5 list-disc text-rose-900 text-3xs leading-relaxed font-medium">
                        {c.auditAnalysis.cr37MismatchReasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* HIGH-COST CLAIM ALERT BAR */}
                  {isHighCost && (
                    <div className="p-2.5 rounded-lg bg-amber-100/80 border border-amber-300 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-amber-700 shrink-0" />
                        <div>
                          <span className="font-bold">
                            มูลค่าการเบิกสูงผิดปกติ: ฿{c.totalCharge?.toLocaleString()} บาท
                          </span>
                          <span className="text-3xs text-amber-800 block">
                            (เกินเกณฑ์เฝ้าระวัง ฿50,000 — สปสช. จัดอยู่ในกลุ่มสุ่มตรวจประเมินเวชระเบียนเข้มข้น High-Cost Claim Audit)
                          </span>
                        </div>
                      </div>
                      <span className="text-3xs px-2 py-0.5 rounded bg-amber-700 text-white font-bold shrink-0">
                        {c.auditAnalysis?.highCostLevel === 'EXTREME' ? '🚨 เฝ้าระวังสูงสุด (> ฿100,000)' : '⚠️ เฝ้าระวังพิเศษ'}
                      </span>
                    </div>
                  )}

                  {/* Diagnoses and Drugs Details */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 border-t border-slate-200/60">
                    <div className="space-y-1.5 flex-1">
                      {/* Diagnoses Summary */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {/* PDX Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-3xs ${
                          ['R570', 'R571', 'R572', 'R578', 'R579'].includes(c.pdx.replace('.', ''))
                            ? 'bg-rose-200 text-rose-950 border border-rose-400 font-bold'
                            : 'bg-blue-100 text-blue-900'
                        }`}>
                          <span className="font-mono font-bold">โรคหลัก: {c.pdx}</span>
                          <span className="truncate max-w-[160px]">{pdxName}</span>
                        </span>

                        {/* Secondary Dx Badges with DRG Impact indicator */}
                        {c.secondaryDx.map((s) => {
                          const cleanCode = s.code.toUpperCase().replace('.', '');
                          const isShock = cleanCode.startsWith('R57');
                          const isBanned = cleanCode === 'R650';

                          return (
                            <span
                              key={s.id}
                              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-3xs font-mono font-medium ${
                                isShock && s.diagType === 'comorbid'
                                  ? 'bg-rose-100 text-rose-900 border border-rose-300 font-bold'
                                  : isBanned
                                  ? 'bg-rose-100 text-rose-800 line-through'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span>{s.code}</span>
                              <DrgWeightBadge code={cleanCode} size="xs" interactive={false} />
                              <span className="text-slate-500 font-sans text-[10px]">
                                ({s.diagType === 'complication' ? 'โรคแทรก' : 'โรคร่วม'})
                              </span>
                            </span>
                          );
                        })}
                      </div>

                      {/* Drugs & Key Findings */}
                      <div className="flex flex-wrap items-center gap-2 text-3xs text-slate-600">
                        <span className="flex items-center gap-1 font-medium">
                          <Pill className="w-3 h-3 text-slate-400" />
                          <span>ยาในแฟ้ม DRU ({c.rawMedicationsCount} รายการ):</span>
                        </span>
                        {hasVaso ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                            ✓ พบยากระตุ้นความดัน (Vasopressor)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                            ✕ ไม่พบ Vasopressor ใน DRU
                          </span>
                        )}
                        {atbList.length > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            ATB: {atbList.map((a) => a.name.split(' ')[0]).join(', ')}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                            ✕ ไม่พบยาปฏิชีวนะฉีด
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0 flex items-center justify-end gap-2">
                      {onSelectCaseAndOpenTimeline && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectCaseAndOpenTimeline(c);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded-xl font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-all cursor-pointer shadow-2xs"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          <span>ดู Timeline คลินิก</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCase(c);
                          onClose();
                        }}
                        className={`inline-flex items-center gap-1 text-xs px-3.5 py-2 rounded-xl font-semibold transition-all cursor-pointer shadow-xs ${
                          isCr37Mismatch
                            ? 'bg-rose-600 hover:bg-rose-700 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <span>{isCr37Mismatch ? 'เปิดตรวจสอบและแก้ไข' : 'ตรวจสอบเคสนี้'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            แสดง {filteredCases.length} จากทั้งหมด {importResult.cases.length} รายการ (พบ CR37 ไม่สอดคล้อง {cr37MismatchCount} ราย | ยอดเบิกสูง {highCostCount} ราย)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-semibold text-slate-700 cursor-pointer shadow-2xs"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
