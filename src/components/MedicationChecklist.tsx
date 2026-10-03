import React from 'react';
import { MedicationItem } from '../types';
import { Pill, AlertCircle, CheckCircle2, ShieldAlert, Plus } from 'lucide-react';
import { COMMON_MEDICATIONS } from '../data/rulesData';

interface MedicationChecklistProps {
  medications: MedicationItem[];
  onToggleMedication: (id: string) => void;
  onAddMedication: (med: MedicationItem) => void;
}

export const MedicationChecklist: React.FC<MedicationChecklistProps> = ({
  medications = [],
  onToggleMedication,
  onAddMedication,
}) => {
  const safeMeds = medications || [];
  const selectedMeds = safeMeds.filter((m) => m?.isSelected);
  const hasVasopressor = selectedMeds.some((m) => m.category === 'vasopressor');
  const hasIvAntibiotic = selectedMeds.some((m) => m.category === 'iv_antibiotic');
  
  // Calculate total fluid ml
  const totalFluidMl = selectedMeds
    .filter((m) => m.category === 'iv_fluid')
    .reduce((sum, m) => {
      let vol = 0;
      const mName = m?.name || '';
      if (mName.includes('1,000 ml') || mName.includes('1000 ml')) vol = 1000;
      else if (mName.includes('500 ml')) vol = 500;
      else if (mName.includes('100 ml')) vol = 100;
      return sum + vol * (m.quantity || 1);
    }, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
            2
          </span>
          <h2 className="font-semibold text-slate-800 text-base">
            รายการยาและสารน้ำที่ให้ผู้ป่วย (Medications & Fluids)
          </h2>
        </div>
        <div className="text-xs text-slate-500">
          ตรงตามใบสั่งยา / บัญชียา e-Claim
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Status Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Vasopressor Status */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
              hasVasopressor
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/60 border-rose-200 text-rose-900'
            }`}
          >
            {hasVasopressor ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-bold flex items-center gap-1">
                <span>ยากระตุ้นความดัน (Vasopressor)</span>
              </div>
              <p className="text-slate-600 mt-0.5">
                {hasVasopressor
                  ? 'พบยากระตุ้นความดัน (สามารถเบิก R57.2 ได้)'
                  : 'ไม่พบในบิลยา ❌ ห้ามลง R57.2 Septic shock'}
              </p>
            </div>
          </div>

          {/* IV Antibiotics Status */}
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 transition-colors ${
              hasIvAntibiotic
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/60 border-rose-200 text-rose-900'
            }`}
          >
            {hasIvAntibiotic ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-bold">ยาปฏิชีวนะฉีด (IV Antibiotic)</div>
              <p className="text-slate-600 mt-0.5">
                {hasIvAntibiotic
                  ? 'พบยาฉีดฆ่าเชื้อ (รองรับโรคหลัก Sepsis)'
                  : 'ไม่พบยาฉีดฆ่าเชื้อ ❌ ขัดแย้งกับ Sepsis'}
              </p>
            </div>
          </div>

          {/* Fluid volume status */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 flex items-start gap-2.5">
            <Pill className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold">ปริมาณสารน้ำรวม (IV Fluid)</div>
              <p className="text-slate-600 mt-0.5">
                รวมประมาณ <span className="font-bold text-slate-900">{totalFluidMl} ml</span>{' '}
                {totalFluidMl < 1000 ? '(ปริมาณผสมยา ไม่พอสำหรับ Shock)' : '(ปริมาณกู้ชีพ)'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Add Inotropes if missing */}
        {!hasVasopressor && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                หากคนไข้รายนี้ได้รับยา <strong>Norepinephrine (Levophed)</strong> จริง ให้คลิกเพิ่มยาเพื่อทดสอบ:
              </span>
            </div>
            <button
              type="button"
              id="btn-add-norepi-quick"
              onClick={() => {
                const levophed = COMMON_MEDICATIONS.find((m) => m.id === 'med_norepi');
                if (levophed) onAddMedication({ ...levophed, isSelected: true });
              }}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shrink-0 transition-colors cursor-pointer"
            >
              + เพิ่ม Norepinephrine (Levophed)
            </button>
          </div>
        )}

        {/* Table of Medications */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">เลือกเบิก</th>
                <th className="py-2.5 px-3 w-28">Working Code</th>
                <th className="py-2.5 px-3">ชื่อยา (Drug Name)</th>
                <th className="py-2.5 px-3 w-32">หมวดหมู่ทางคลินิก</th>
                <th className="py-2.5 px-3 w-20 text-center">จำนวน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {medications.map((med, idx) => {
                const isVasopressor = med.category === 'vasopressor';
                return (
                  <tr
                    key={med.id}
                    className={`transition-colors hover:bg-slate-50 ${
                      med.isSelected ? (isVasopressor ? 'bg-purple-50/40' : 'bg-white') : 'opacity-40 bg-slate-50/30'
                    }`}
                  >
                    <td className="py-2 px-3 text-center">
                      <input
                        id={`check-med-${med.id}`}
                        type="checkbox"
                        checked={med.isSelected}
                        onChange={() => onToggleMedication(med.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer border-slate-300"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600 font-medium">
                      {med.workingCode}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`font-medium ${med.isSelected ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                        {med.name}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-3xs font-semibold ${
                          med.category === 'vasopressor'
                            ? 'bg-purple-100 text-purple-800'
                            : med.category === 'iv_antibiotic'
                            ? 'bg-blue-100 text-blue-800'
                            : med.category === 'iv_fluid'
                            ? 'bg-cyan-100 text-cyan-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {med.category === 'vasopressor'
                          ? 'ยากระตุ้นความดัน'
                          : med.category === 'iv_antibiotic'
                          ? 'ยาปฏิชีวนะฉีด'
                          : med.category === 'iv_fluid'
                          ? 'สารน้ำ IV'
                          : med.category === 'electrolyte'
                          ? 'เกลือแร่ฉีด'
                          : 'ยาประคับประคอง'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-medium text-slate-700">
                      {med.quantity}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
