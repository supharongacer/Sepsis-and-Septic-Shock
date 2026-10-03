import React, { useState } from 'react';
import {
  Cloud,
  Database,
  Trash2,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Shield,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { SavedAuditRecord } from '../services/auditStorageService';

interface SavedAuditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedRecords: SavedAuditRecord[];
  onLoadRecord: (record: SavedAuditRecord) => void;
  onDeleteRecord: (recordId: string) => Promise<void>;
  currentUserId?: string;
  userEmail?: string;
}

export const SavedAuditsModal: React.FC<SavedAuditsModalProps> = ({
  isOpen,
  onClose,
  savedRecords,
  onLoadRecord,
  onDeleteRecord,
  userEmail,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async (id: string) => {
    if (!confirm('คุณต้องการลบประวัติการตรวจบันทึกนี้ใช่หรือไม่?')) return;
    try {
      setDeletingId(id);
      await onDeleteRecord(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>บันทึกผลการตรวจบน Cloud (Firebase Firestore)</span>
                <span className="text-3xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal border border-emerald-500/30">
                  Real-time Sync
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                ผู้ใช้งาน: <span className="font-mono text-emerald-300">{userEmail || 'กำลังเชื่อมต่อ'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Records List Container */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {savedRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Database className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 opacity-60" />
              <div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  ยังไม่มีประวัติการบันทึกผลตรวจสอบบน Cloud
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  คุณสามารถกดปุ่ม "บันทึกลง Cloud (Firestore)" ที่ผลการตรวจประเมิน เพื่อเก็บเคส AN/HN และผลวิเคราะห์ไว้เรียกดูได้ตลอดเวลา
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-between px-1">
                <span>รายการบันทึกทั้งหมด ({savedRecords.length} รายการ)</span>
                <span>ซิงค์ข้อมูลกับ Firebase Firestore</span>
              </div>

              {savedRecords.map((rec) => {
                const isDeny = rec.verdict === 'DENY';
                const isWarn = rec.verdict === 'WARNING';

                return (
                  <div
                    key={rec.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          AN: {rec.an}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          HN: {rec.hn} ({rec.patientName})
                        </span>
                        <span
                          className={`text-3xs px-2 py-0.5 rounded-full font-bold border ${
                            isDeny
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                              : isWarn
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {rec.verdict}
                        </span>
                        {rec.ruleId && (
                          <span className="text-3xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                            {rec.ruleId}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                        โรคหลัก: <span className="font-mono font-bold text-slate-900 dark:text-white">{rec.pdx}</span> | {rec.primaryIssue || 'ผ่านเกณฑ์มาตรฐาน'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-3xs text-slate-500 dark:text-slate-400">
                        <span>ยอดเบิก: ฿{rec.estimatedClaim.toLocaleString()}</span>
                        {rec.atRiskClaim > 0 && (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">
                            เสี่ยงถูกตัด: ฿{rec.atRiskClaim.toLocaleString()}
                          </span>
                        )}
                        <span>โรคร่วม: {rec.comorbidCount} | โรคแทรก: {rec.complicationCount}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadRecord(rec);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>โหลดเคส</span>
                      </button>

                      <button
                        type="button"
                        disabled={deletingId === rec.id}
                        onClick={() => handleDelete(rec.id)}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Firestore ABAC Rule Active (อ่าน-เขียนเฉพาะข้อมูลของตนเอง)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
