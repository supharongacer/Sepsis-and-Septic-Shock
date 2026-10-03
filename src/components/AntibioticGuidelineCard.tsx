import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pill,
  Clock,
  TestTube,
  Sparkles,
  ArrowRight,
  Info,
  Check,
  Zap,
} from 'lucide-react';
import { AntibioticGuidelineMatchResult } from '../types';

interface AntibioticGuidelineCardProps {
  matchResult: AntibioticGuidelineMatchResult;
  onApplyAction?: (action: NonNullable<AntibioticGuidelineMatchResult['suggestedCodingActions']>[0]) => void;
  onOpenAddModal: () => void;
}

export const AntibioticGuidelineCard: React.FC<AntibioticGuidelineCardProps> = ({
  matchResult,
  onApplyAction,
  onOpenAddModal,
}) => {
  const isConcordant = matchResult.concordanceStatus === 'CONCORDANT';
  const isPartial = matchResult.concordanceStatus === 'PARTIAL';
  const isDiscordant = matchResult.concordanceStatus === 'DISCORDANT';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Header Banner */}
      <div
        className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDiscordant
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : isPartial
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDiscordant
                ? 'bg-rose-600 text-white'
                : isPartial
                ? 'bg-amber-500 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isDiscordant ? (
              <ShieldAlert className="w-5 h-5" />
            ) : isPartial ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base">
                {isDiscordant
                  ? 'ผลเทียบเกณฑ์: พบจุดขัดแย้งกับ Sepsis Guidelines (DISCORDANT)'
                  : isPartial
                  ? 'ผลเทียบเกณฑ์: สอดคล้องบางส่วนแต่มีข้อพึงระวัง (PARTIAL)'
                  : 'ผลเทียบเกณฑ์: สอดคล้องตามเกณฑ์ Sepsis Guidelines (CONCORDANT)'}
              </h3>
              <span
                className={`text-2xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  isDiscordant
                    ? 'bg-rose-200 text-rose-800'
                    : isPartial
                    ? 'bg-amber-200 text-amber-900'
                    : 'bg-emerald-200 text-emerald-800'
                }`}
              >
                คะแนนความสอดคล้อง {matchResult.scorePercent}%
              </span>
            </div>
            <p className="text-3xs sm:text-xs text-slate-600 mt-0.5">
              เปรียบเทียบระหว่างยาปฏิชีวนะที่บริหารจริง vs รหัสโรค ICD-10, ผลเพาะเชื้อ, และเกณฑ์ชั่วโมงทอง สปสช.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
        >
          <Pill className="w-3.5 h-3.5" />
          <span>+ บันทึกยาเพิ่ม</span>
        </button>
      </div>

      {/* 4 Key Pillar Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-slate-50/60 border-b border-slate-200 text-xs">
        {/* Metric 1: Hour-1 Bundle */}
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-3xs">
          <span className="text-3xs text-slate-400 font-medium block">1. ชั่วโมงทองแรกรับ</span>
          <div className="flex items-center gap-1.5 mt-1 font-bold">
            {matchResult.hour1BundleMet ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-900 text-xs">Hour-1 Bundle ผ่าน</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-amber-900 text-xs">เริ่มยาล่าช้า</span>
              </>
            )}
          </div>
        </div>

        {/* Metric 2: Blood Culture Timing */}
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-3xs">
          <span className="text-3xs text-slate-400 font-medium block">2. ลำดับ Hemoculture</span>
          <div className="flex items-center gap-1.5 mt-1 font-bold">
            {matchResult.bloodCultureTimingMet ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-900 text-xs">เจาะก่อนให้ยา</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span className="text-rose-900 text-xs">เจาะหลังยา/ไม่ได้ส่ง</span>
              </>
            )}
          </div>
        </div>

        {/* Metric 3: Route (CR37) */}
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-3xs">
          <span className="text-3xs text-slate-400 font-medium block">3. เส้นทางให้ยา (CR37)</span>
          <div className="flex items-center gap-1.5 mt-1 font-bold">
            {matchResult.routeMet ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-900 text-xs">IV ฉีดหลอดเลือดดำ</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span className="text-rose-900 text-xs">ยารับประทาน (Oral)</span>
              </>
            )}
          </div>
        </div>

        {/* Metric 4: Spectrum vs Pathogen */}
        <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-3xs">
          <span className="text-3xs text-slate-400 font-medium block">4. ความครอบคลุมเชื้อ</span>
          <div className="flex items-center gap-1.5 mt-1 font-bold">
            {matchResult.spectrumMatchesCulture ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-900 text-xs">ตรงผลเพาะเชื้อ</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-rose-600" />
                <span className="text-rose-900 text-xs">ไม่ครอบคลุมเชื้อ</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Checklist of guideline validations */}
      <div className="p-5 space-y-3">
        <h4 className="text-xs font-bold text-slate-800">
          รายการตรวจสอบความสอดคล้องตามเกณฑ์คลินิก & สปสช. (Guideline Verification):
        </h4>

        <div className="space-y-2.5">
          {matchResult.checks.map((chk) => {
            const isPass = chk.status === 'PASS';
            const isWarn = chk.status === 'WARNING';
            const isFail = chk.status === 'FAIL';

            return (
              <div
                key={chk.id}
                className={`p-3.5 rounded-xl border text-xs transition-all ${
                  isFail
                    ? 'bg-rose-50/70 border-rose-200'
                    : isWarn
                    ? 'bg-amber-50/70 border-amber-200'
                    : 'bg-slate-50/80 border-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {isFail ? (
                      <XCircle className="w-4 h-4 text-rose-600" />
                    ) : isWarn ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{chk.title}</span>
                      <span className="text-3xs px-2 py-0.5 rounded font-mono font-semibold bg-white border border-slate-200 text-slate-600">
                        {chk.guidelineRef}
                      </span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-3xs sm:text-xs">
                      {chk.description}
                    </p>
                    {chk.recommendation && (
                      <div className="mt-1 text-3xs font-semibold text-slate-700 flex items-center gap-1">
                        <span className="text-purple-700 font-bold">คำแนะนำสำหรับเวชระเบียน:</span>
                        <span>{chk.recommendation}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Suggested Coding Actions if applicable */}
        {matchResult.suggestedCodingActions && matchResult.suggestedCodingActions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <h5 className="text-xs font-bold text-purple-900 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>รหัสโรค ICD-10 แนะนำเพิ่มตามยาปฏิชีวนะที่ให้จริง:</span>
            </h5>
            <div className="space-y-2">
              {matchResult.suggestedCodingActions.map((act, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-purple-50/60 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <span className="text-xs font-bold text-purple-950 block">{act.label}</span>
                    <span className="text-3xs text-purple-700 block">{act.reason}</span>
                  </div>
                  {onApplyAction && (
                    <button
                      type="button"
                      onClick={() => onApplyAction(act)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-3xs font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Check className="w-3 h-3" />
                      <span>เพิ่มรหัส {act.code} ในแบบฟอร์มทันที</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
