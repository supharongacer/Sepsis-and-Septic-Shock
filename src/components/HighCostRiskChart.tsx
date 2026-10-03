import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import { HighCostAnalysis } from '../utils/highCostProbability';
import {
  Coins,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Activity,
  ShieldAlert,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HighCostRiskChartProps {
  analysis: HighCostAnalysis;
}

export const HighCostRiskChart: React.FC<HighCostRiskChartProps> = ({ analysis }) => {
  const [chartView, setChartView] = useState<'FACTORS' | 'HISTORICAL'>('FACTORS');

  const {
    probability,
    riskLevel,
    estimatedCostMin,
    estimatedCostMax,
    isOver50kThreshold,
    factors,
    historicalBenchmark,
    auditMitigationChecklist,
  } = analysis;

  const getRiskBadgeColor = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'bg-rose-600 text-white';
      case 'HIGH':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'MODERATE':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
  };

  const getRiskLabelTh = () => {
    switch (riskLevel) {
      case 'CRITICAL':
        return 'วิกฤต: ตรวจสอบ Pre-Payment 100%';
      case 'HIGH':
        return 'เสี่ยงสูง: เข้าเกณฑ์สุ่มตรวจเข้มข้น (> ฿50k)';
      case 'MODERATE':
        return 'เฝ้าระวัง: ติดตามความสมบูรณ์เวชระเบียน';
      default:
        return 'ปกติ: อัตราการเบิกจ่ายตามเกณฑ์มาตรฐาน';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-4">
      {/* Header & Main Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
              isOver50kThreshold ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                แนวโน้มความเสี่ยงเคสมูลค่าสูง (High-Cost Claim Probability)
              </h3>
              <span className={`text-3xs px-2 py-0.5 rounded-full font-bold border ${getRiskBadgeColor()}`}>
                {riskLevel}
              </span>
            </div>
            <p className="text-3xs text-slate-500 dark:text-slate-400">
              วิเคราะห์จากประวัติการเบิกจ่ายและหลักฐานทางคลินิก (SOFA / ยา / หัตถการ / สถานะจำหน่าย)
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setChartView('FACTORS')}
            className={`px-2.5 py-1 rounded-md text-3xs font-semibold transition-all cursor-pointer ${
              chartView === 'FACTORS'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            5 ปัจจัยความเสี่ยง
          </button>
          <button
            type="button"
            onClick={() => setChartView('HISTORICAL')}
            className={`px-2.5 py-1 rounded-md text-3xs font-semibold transition-all cursor-pointer ${
              chartView === 'HISTORICAL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            เทียบประวัติเบิก สปสช.
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Probability Gauge */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-3xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              โอกาสเป็นเคสมูลค่าสูง (Probability)
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span
                className={`text-2xl font-black font-mono ${
                  probability >= 70
                    ? 'text-rose-600 dark:text-rose-400'
                    : probability >= 40
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {probability}%
              </span>
              <span className="text-3xs text-slate-600 dark:text-slate-300 font-medium">
                {getRiskLabelTh()}
              </span>
            </div>
            {/* Visual Progress bar */}
            <div className="w-44 sm:w-48 bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  probability >= 70
                    ? 'bg-rose-600'
                    : probability >= 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${probability}%` }}
              />
            </div>
          </div>
          <Coins className="w-8 h-8 text-slate-300 dark:text-slate-600 shrink-0" />
        </div>

        {/* Estimated Cost Range */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-3xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              ประมาณการค่ารักษาพยาบาล (Estimated Claim)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                ฿{estimatedCostMin.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">-</span>
              <span className="text-lg font-black font-mono text-slate-900 dark:text-white">
                ฿{estimatedCostMax.toLocaleString()}
              </span>
            </div>
            <p className="text-3xs text-slate-500 dark:text-slate-400 mt-1">
              {isOver50kThreshold ? (
                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                  ⚠️ เกินเกณฑ์เฝ้าระวัง ฿50,000 (สปสช. Pre-Audit Group)
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  ✓ อยู่ในเกณฑ์มาตรฐานไม่เกิน ฿50,000
                </span>
              )}
            </p>
          </div>
          <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 shrink-0" />
        </div>
      </div>

      {/* Interactive Recharts Visualization */}
      <div className="bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-slate-800">
        <div className="h-48 w-full">
          {chartView === 'FACTORS' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={factors}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 10, fill: '#64748B' }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                  width={95}
                />
                <Tooltip
                  formatter={(value: any, name: any, item: any) => [
                    `${value}% (${item.payload.detail})`,
                    'ระดับความรุนแรง',
                  ]}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                  {factors.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.score >= 60
                          ? '#E11D48'
                          : entry.score >= 30
                          ? '#F59E0B'
                          : '#10B981'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={historicalBenchmark}
                margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#64748B' }} />
                <YAxis
                  unit="%"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                />
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val}% (ค่าเฉลี่ย ฿${item.payload.avgCost.toLocaleString()} | Audit: ${item.payload.auditIntensity})`,
                    'ความน่าจะเป็น',
                  ]}
                  contentStyle={{
                    backgroundColor: '#1E293B',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                  }}
                  itemStyle={{ color: '#F8FAFC' }}
                />
                <Area
                  type="monotone"
                  dataKey="probability"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCost)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Risk Factors Detail & Mitigation Checklist */}
      {auditMitigationChecklist.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
            <FileCheck2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>แนวทางป้องกันข้อโต้แย้งสำหรับเคสกลุ่มนี้ (สปสช. Audit Mitigation):</span>
          </div>
          <ul className="space-y-1 text-2xs text-amber-950 dark:text-amber-100 font-medium">
            {auditMitigationChecklist.map((item, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
