import React, { useState } from 'react';
import {
  Pill,
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  TestTube,
  Check,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { AntibioticAdministrationLog } from '../types';
import { ANTIBIOTIC_DATABASE } from '../data/antibioticDatabase';

interface AntibioticLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLog: (log: AntibioticAdministrationLog, syncToMedications: boolean) => void;
  lengthOfStayDays: number;
  initialLog?: AntibioticAdministrationLog | null;
}

export const AntibioticLogModal: React.FC<AntibioticLogModalProps> = ({
  isOpen,
  onClose,
  onSaveLog,
  lengthOfStayDays,
  initialLog,
}) => {
  const [selectedAntibioticId, setSelectedAntibioticId] = useState<string>(
    initialLog
      ? ANTIBIOTIC_DATABASE.find((a) => a.name === initialLog.antibioticName)?.id || 'anti_ceftriaxone'
      : 'anti_ceftriaxone'
  );

  const selectedRef = ANTIBIOTIC_DATABASE.find((a) => a.id === selectedAntibioticId) || ANTIBIOTIC_DATABASE[0];

  const [customName, setCustomName] = useState<string>(initialLog?.antibioticName || selectedRef.name);
  const [dosage, setDosage] = useState<string>(initialLog?.dosage || selectedRef.standardDose);
  const [route, setRoute] = useState<AntibioticAdministrationLog['route']>(initialLog?.route || selectedRef.standardRoute);
  const [frequency, setFrequency] = useState<string>(initialLog?.frequency || selectedRef.standardFrequency);
  const [dayNumber, setDayNumber] = useState<number>(initialLog?.dayNumber || 1);
  const [time, setTime] = useState<string>(initialLog?.time || '09:30');
  const [isHour1Bundle, setIsHour1Bundle] = useState<boolean>(initialLog?.isHour1Bundle ?? (dayNumber === 1));
  const [bloodCultureSequence, setBloodCultureSequence] = useState<AntibioticAdministrationLog['bloodCultureSequence']>(
    initialLog?.bloodCultureSequence || 'BEFORE_ANTIBIOTIC'
  );
  const [indicationType, setIndicationType] = useState<AntibioticAdministrationLog['indicationType']>(
    initialLog?.indicationType || 'EMPIRIC_BROAD_SPECTRUM'
  );
  const [suspectedSource, setSuspectedSource] = useState<AntibioticAdministrationLog['suspectedSource']>(
    initialLog?.suspectedSource || 'BLOODSTREAM_SEPSIS'
  );
  const [notes, setNotes] = useState<string>(initialLog?.notes || '');
  const [syncToMedications, setSyncToMedications] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleSelectPreset = (refId: string) => {
    const item = ANTIBIOTIC_DATABASE.find((a) => a.id === refId);
    if (!item) return;
    setSelectedAntibioticId(item.id);
    setCustomName(item.name);
    setDosage(item.standardDose);
    setRoute(item.standardRoute);
    setFrequency(item.standardFrequency);
    if (item.preferredIndications.length > 0) {
      setSuspectedSource(item.preferredIndications[0]);
    }
  };

  const handleSave = () => {
    const log: AntibioticAdministrationLog = {
      id: initialLog?.id || `anti_log_${Date.now()}`,
      antibioticName: customName || selectedRef.name,
      genericName: selectedRef.genericName,
      dosage,
      route,
      frequency,
      dayNumber,
      time,
      isHour1Bundle,
      bloodCultureSequence,
      indicationType,
      suspectedSource,
      status: 'GIVEN',
      notes,
    };

    onSaveLog(log, syncToMedications);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-300 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {initialLog ? 'แก้ไขบันทึกการบริหารยาปฏิชีวนะ' : 'บันทึกการบริหารยาปฏิชีวนะ (Log Antibiotic Administration)'}
              </h3>
              <p className="text-3xs text-slate-300">
                บันทึกลงใน Clinical Timeline เพื่อตรวจสอบความสอดคล้องตามเกณฑ์ Sepsis Bundle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Quick Select Preset Antibiotics */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>เลือกรายการยาปฏิชีวนะมาตรฐาน (Standard Sepsis Antibiotics):</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ANTIBIOTIC_DATABASE.map((ref) => {
                const isSelected = selectedAntibioticId === ref.id;
                return (
                  <button
                    key={ref.id}
                    type="button"
                    onClick={() => handleSelectPreset(ref.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{ref.genericName}</span>
                    <span className="text-3xs opacity-80">({ref.standardDose})</span>
                  </button>
                );
              })}
            </div>

            {/* Audit warning / spectrum note for selected drug */}
            {selectedRef && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-purple-50/70 border border-purple-200 text-purple-900 text-3xs flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">{selectedRef.drugClass}:</span> {selectedRef.nhsoAuditNotes}
                  {selectedRef.requiresRenalAdjustment && (
                    <span className="block text-amber-800 font-semibold mt-0.5">
                      ⚠️ ต้องปรับขนาดยาตาม CrCl / eGFR ในผู้ป่วยไตวาย (AKI)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Drug Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชื่อยา (Drug Name / Strength)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                placeholder="เช่น cefTRIAXone inj 2 g"
              />
            </div>

            {/* Dosage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ขนาดยา (Dosage)
              </label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500"
                placeholder="เช่น 2 g, 1 g, 4.5 g"
              />
            </div>

            {/* Route */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                เส้นทางการให้ (Route - เกณฑ์ CR37)
              </label>
              <select
                value={route}
                onChange={(e) => setRoute(e.target.value as AntibioticAdministrationLog['route'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="IV_DRIP">IV Drip (หยดเข้าหลอดเลือดดำ - แนะนำ)</option>
                <option value="IV_PUSH">IV Push / Bolus</option>
                <option value="IV">IV (Intravenous ทั่วไป)</option>
                <option value="ORAL">Oral (ยารับประทาน - เสี่ยงผิดเกณฑ์ CR37)</option>
              </select>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ความถี่ในการบริหารยา (Frequency)
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="OD (q 24 hr)">OD (วันละครั้ง / q 24 hr)</option>
                <option value="q 8 hr">q 8 hr (ทุก 8 ชั่วโมง)</option>
                <option value="q 6 hr">q 6 hr (ทุก 6 ชั่วโมง)</option>
                <option value="q 12 hr">q 12 hr (ทุก 12 ชั่วโมง)</option>
                <option value="q 4 hr">q 4 hr (ทุก 4 ชั่วโมง)</option>
                <option value="stat dose">Stat Dose (ครั้งเดียวเร่งด่วน)</option>
              </select>
            </div>

            {/* Day of Admission & Time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  วันนอน รพ. (Day)
                </label>
                <select
                  value={dayNumber}
                  onChange={(e) => {
                    const d = Number(e.target.value);
                    setDayNumber(d);
                    if (d === 1) setIsHour1Bundle(true);
                    else setIsHour1Bundle(false);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  {Array.from({ length: Math.max(7, lengthOfStayDays) }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Day {i + 1} {i === 0 ? '(วันแรกรับ)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เวลาที่ให้ (Time)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Hour-1 Bundle Switch */}
            <div className="sm:col-span-2 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHour1Bundle}
                  onChange={(e) => setIsHour1Bundle(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    ชั่วโมงทอง Sepsis: ให้ยาภายใน 1 ชั่วโมงแรกรับ (Hour-1 Bundle Met)
                  </span>
                  <span className="text-3xs text-emerald-700 leading-relaxed block">
                    แนวทาง Surviving Sepsis Campaign (SSC) กำหนดให้เริ่มยาปฏิชีวนะเร็วที่สุดภายใน 1 ชม. หลังจากคัดกรองพบ Sepsis เพื่อลดอัตราเสียชีวิต
                  </span>
                </div>
              </label>
            </div>

            {/* Blood Culture Sequence */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <TestTube className="w-3.5 h-3.5 text-amber-600" />
                <span>ลำดับการเจาะเลือดเพาะเชื้อ (Blood Culture Sequence):</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setBloodCultureSequence('BEFORE_ANTIBIOTIC')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    bloodCultureSequence === 'BEFORE_ANTIBIOTIC'
                      ? 'bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold block">✓ เจาะก่อนให้ยา</span>
                  <span className="text-3xs text-slate-500 block mt-0.5">Gold Standard สปสช.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBloodCultureSequence('AFTER_ANTIBIOTIC')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    bloodCultureSequence === 'AFTER_ANTIBIOTIC'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold block">⚠️ เจาะหลังให้ยา</span>
                  <span className="text-3xs text-slate-500 block mt-0.5">เสี่ยง False Negative</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBloodCultureSequence('NO_CULTURE')}
                  className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                    bloodCultureSequence === 'NO_CULTURE'
                      ? 'bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold block">✕ ไม่ได้เจาะเพาะเชื้อ</span>
                  <span className="text-3xs text-slate-500 block mt-0.5">เสี่ยงถูก Audit เวชระเบียน</span>
                </button>
              </div>
            </div>

            {/* Indication / Stage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ระยะของการรักษา (Indication Type)
              </label>
              <select
                value={indicationType}
                onChange={(e) => setIndicationType(e.target.value as AntibioticAdministrationLog['indicationType'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="EMPIRIC_BROAD_SPECTRUM">Empirical Broad-Spectrum (ครอบคลุมกว้างเบื้องต้น)</option>
                <option value="TARGETED_PATHOGEN">Targeted Therapy (ตามผลเพาะเชื้อเลือด/แลป)</option>
                <option value="DE_ESCALATION">De-escalation / Step-down (ปรับลดยาตามความไวเชื้อ)</option>
                <option value="PROPHYLAXIS">Prophylaxis (ป้องกันการติดเชื้อ)</option>
              </select>
            </div>

            {/* Suspected Source */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                แหล่งกำเนิดการติดเชื้อที่สงสัย (Infection Source)
              </label>
              <select
                value={suspectedSource}
                onChange={(e) => setSuspectedSource(e.target.value as AntibioticAdministrationLog['suspectedSource'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="BLOODSTREAM_SEPSIS">ไม่ระบุตำแหน่งชัดเจน / ในกระแสเลือด (A419 / A415)</option>
                <option value="URINARY_TRACT">ทางเดินปัสสาวะ / Urosepsis (N390 / N10)</option>
                <option value="INTRA_ABDOMINAL">ในช่องท้อง / ลำไส้อักเสบ (A090 / K650 / K358)</option>
                <option value="RESPIRATORY">ระบบทางเดินหายใจ / ปอดอักเสบ (J189)</option>
                <option value="SKIN_SOFT_TISSUE">ผิวหนังและเนื้อเยื่ออ่อน (L039 / M726)</option>
                <option value="CNS">ระบบประสาทส่วนกลาง (G009)</option>
                <option value="UNKNOWN">ไม่ทราบสาเหตุ</option>
              </select>
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                หมายเหตุเพิ่มเติม / ข้อสังเกตเวชระเบียน (Clinical Notes)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-purple-500"
                placeholder="เช่น ปรับลดขนาดยาตาม eGFR = 28 ml/min หรือบันทึกส่ง TDM level"
              />
            </div>

            {/* Option to sync to medications */}
            <div className="sm:col-span-2 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToMedications}
                  onChange={(e) => setSyncToMedications(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs text-slate-700 font-medium">
                  ซิงค์รายการยานี้เข้าสู่รายการยาหลัก (DRU.txt / Medication Checklist) อัตโนมัติ
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{initialLog ? 'บันทึกการแก้ไข' : 'บันทึกลง Timeline & เทียบเกณฑ์'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
