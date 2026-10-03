import React from 'react';
import {
  Pill,
  Clock,
  Calendar,
  Trash2,
  Copy,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  TestTube,
  Sparkles,
  Plus,
} from 'lucide-react';
import { AntibioticAdministrationLog } from '../types';

interface AntibioticTimelineListProps {
  antibioticLogs: AntibioticAdministrationLog[];
  onOpenAddModal: () => void;
  onEditLog: (log: AntibioticAdministrationLog) => void;
  onDeleteLog: (logId: string) => void;
  onCloneToNextDay: (log: AntibioticAdministrationLog) => void;
  onAutoPopulateFromMeds?: () => void;
}

export const AntibioticTimelineList: React.FC<AntibioticTimelineListProps> = ({
  antibioticLogs,
  onOpenAddModal,
  onEditLog,
  onDeleteLog,
  onCloneToNextDay,
  onAutoPopulateFromMeds,
}) => {
  // Sort logs by dayNumber and time
  const sortedLogs = [...antibioticLogs].sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return (a.time || '').localeCompare(b.time || '');
  });

  // Group by Day
  const groupedLogs = sortedLogs.reduce((acc, log) => {
    if (!acc[log.dayNumber]) acc[log.dayNumber] = [];
    acc[log.dayNumber].push(log);
    return acc;
  }, {} as Record<number, AntibioticAdministrationLog[]>);

  const days = Object.keys(groupedLogs)
    .map(Number)
    .sort((a, b) => a - b);

  if (antibioticLogs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
          <Pill className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h4 className="text-sm font-bold text-slate-900">
            ยังไม่มีบันทึกการบริหารยาปฏิชีวนะระหว่างนอนโรงพยาบาล
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกรายการยาปฏิชีวนะชนิดฉีด วันที่ และเวลาที่ให้ เพื่อตรวจสอบความสอดคล้องตามเกณฑ์ Sepsis Bundle (Hour-1, Hemoculture sequence, และความครอบคลุมเชื้อ)
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ บันทึกยาปฏิชีวนะ</span>
          </button>
          {onAutoPopulateFromMeds && (
            <button
              type="button"
              onClick={onAutoPopulateFromMeds}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>ดึงจากรายการยาในบิล (Auto-sync)</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-slate-800">
            รายการยาปฏิชีวนะที่บันทึกตามลำดับวัน (Administered Antibiotics - {antibioticLogs.length} รายการ):
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {onAutoPopulateFromMeds && (
            <button
              type="button"
              onClick={onAutoPopulateFromMeds}
              className="text-3xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>รีเฟรชจากบิลยา</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-3xs font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>+ เพิ่มรายการยา</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((dayNum) => {
          const logsInDay = groupedLogs[dayNum] || [];
          return (
            <div key={dayNum} className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden">
              {/* Day Sub-header */}
              <div className="px-4 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-800 flex items-center justify-center font-mono text-3xs">
                    D{dayNum}
                  </span>
                  <span>วันที่ {dayNum} ของการนอน รพ.</span>
                  {dayNum === 1 && (
                    <span className="text-3xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                      วันแรกรับ (Admission Day)
                    </span>
                  )}
                </div>
                <span className="text-3xs text-slate-500 font-medium">
                  {logsInDay.length} รายการยา
                </span>
              </div>

              {/* Logs in this day */}
              <div className="divide-y divide-slate-100">
                {logsInDay.map((log) => {
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{log.antibioticName}</span>
                          <span className="text-3xs px-2 py-0.5 rounded font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            {log.dosage}
                          </span>
                          <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {log.route}
                          </span>
                          <span className="text-3xs text-slate-500 font-mono">
                            {log.frequency}
                          </span>
                        </div>

                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 flex-wrap text-3xs">
                          {log.time && (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {log.time} น.
                            </span>
                          )}

                          {log.isHour1Bundle && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Hour-1 Bundle Met
                            </span>
                          )}

                          {log.bloodCultureSequence === 'BEFORE_ANTIBIOTIC' ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium border border-blue-200 flex items-center gap-1">
                              <TestTube className="w-3 h-3 text-blue-600" />
                              เจาะ Hemoculture ก่อนให้ยา
                            </span>
                          ) : log.bloodCultureSequence === 'AFTER_ANTIBIOTIC' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              เจาะหลังให้ยา
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              ไม่ได้เจาะเพาะเชื้อ
                            </span>
                          )}

                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-medium">
                            {log.indicationType === 'EMPIRIC_BROAD_SPECTRUM'
                              ? 'Empirical Broad-Spectrum'
                              : log.indicationType === 'TARGETED_PATHOGEN'
                              ? 'Targeted Pathogen'
                              : log.indicationType === 'DE_ESCALATION'
                              ? 'De-escalation'
                              : 'Prophylaxis'}
                          </span>
                        </div>

                        {log.notes && (
                          <p className="text-3xs text-slate-500 italic mt-0.5">
                            หมายเหตุ: {log.notes}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => onCloneToNextDay(log)}
                          title="คัดลอกยานี้ไปยังวันถัดไป"
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>จำลองวันถัดไป (D{log.dayNumber + 1})</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditLog(log)}
                          title="แก้ไขข้อมูลยานี้"
                          className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLog(log.id)}
                          title="ลบรายการยานี้"
                          className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
  );
};
