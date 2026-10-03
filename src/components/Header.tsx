import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  BookOpen,
  RefreshCw,
  FileText,
  UploadCloud,
  FileSpreadsheet,
  Lightbulb,
  Calendar,
  Sun,
  Moon,
  BarChart3,
  Cloud,
  LogIn,
  LogOut,
  User,
} from 'lucide-react';
import { PRESET_CASES } from '../data/rulesData';

interface HeaderProps {
  onSelectPreset: (presetId: string) => void;
  activePresetId: string;
  onOpenGuidelines: () => void;
  onOpenBlueprint?: () => void;
  onReset: () => void;
  onOpenImport: () => void;
  importedCasesCount?: number;
  onOpenCaseBrowser?: () => void;
  onOpenCodingAdvisor?: () => void;
  advisorCount?: number;
  onOpenTimeline?: () => void;
  isTimelineActive?: boolean;
  timelineGapsCount?: number;
  onOpenDashboard?: () => void;
  isDashboardActive?: boolean;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  currentUser?: { uid: string; email?: string | null; displayName?: string | null } | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  onOpenSavedAudits?: () => void;
  savedAuditsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectPreset,
  activePresetId,
  onOpenGuidelines,
  onOpenBlueprint,
  onReset,
  onOpenImport,
  importedCasesCount = 0,
  onOpenCaseBrowser,
  onOpenCodingAdvisor,
  advisorCount = 0,
  onOpenTimeline,
  isTimelineActive = false,
  timelineGapsCount = 0,
  onOpenDashboard,
  isDashboardActive = false,
  isDarkMode: controlledIsDarkMode,
  onToggleDarkMode,
  currentUser,
  onSignIn,
  onSignOut,
  onOpenSavedAudits,
  savedAuditsCount = 0,
}) => {
  // Local fallback if not controlled from parent
  const [localIsDark, setLocalIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  const isDark = controlledIsDarkMode !== undefined ? controlledIsDarkMode : localIsDark;

  const handleToggleTheme = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const next = !isDark;
      setLocalIsDark(next);
      if (next) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
        localStorage.setItem('app_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        localStorage.setItem('app_theme', 'light');
      }
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shadow-xs font-semibold ring-1 ring-emerald-400/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  ระบบตรวจสอบรหัสโรค Sepsis & Shock สปสช.
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 font-medium">
                  IP Pre-Audit CR1 & CR37
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จำลองและตรวจสอบความถูกต้องของการให้รหัสโรคและการรักษาก่อนส่งเบิก e-Claim
              </p>
            </div>
          </div>

          {/* Quick Presets, 18-Files Import & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action: Import 18 Files */}
            <button
              id="btn-import-18-files"
              onClick={onOpenImport}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>นำเข้า 18 แฟ้ม สปสช.</span>
            </button>

            {importedCasesCount > 0 && onOpenCaseBrowser && (
              <button
                id="btn-open-case-browser"
                onClick={onOpenCaseBrowser}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white font-medium transition-colors shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>รายชื่อผู้ป่วยใน ({importedCasesCount})</span>
              </button>
            )}

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 mr-0.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              <span className="hidden sm:inline">เคสจำลอง:</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_CASES.map((preset) => (
                <button
                  key={preset.id}
                  id={`btn-preset-${preset.id}`}
                  onClick={() => onSelectPreset(preset.id)}
                  className={`text-xs px-2 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                    activePresetId === preset.id
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-500 dark:text-white shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700/80 dark:hover:border-slate-600'
                  }`}
                >
                  {preset.title.split(':')[0]}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            {onOpenDashboard && (
              <button
                id="btn-open-executive-dashboard"
                onClick={onOpenDashboard}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer shadow-2xs ${
                  isDashboardActive
                    ? 'bg-emerald-700 text-white border-emerald-800 ring-2 ring-emerald-300 dark:bg-emerald-600 dark:border-emerald-500 dark:ring-emerald-500/50'
                    : 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/60'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Executive Dashboard</span>
              </button>
            )}

            {onOpenTimeline && (
              <button
                id="btn-open-clinical-timeline"
                onClick={onOpenTimeline}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer shadow-2xs ${
                  isTimelineActive
                    ? 'bg-blue-700 text-white border-blue-800 ring-2 ring-blue-300 dark:bg-blue-600 dark:border-blue-500 dark:ring-blue-500/50'
                    : 'bg-blue-50 text-blue-950 border-blue-300 hover:bg-blue-100 dark:bg-blue-950/70 dark:text-blue-200 dark:border-blue-800 dark:hover:bg-blue-900/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>ลำดับเวลาคลินิก (Timeline)</span>
                {timelineGapsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-3xs font-bold animate-pulse">
                    {timelineGapsCount} จุดเสี่ยง
                  </span>
                )}
              </button>
            )}

            {onOpenCodingAdvisor && (
              <button
                id="btn-open-coding-advisor"
                onClick={onOpenCodingAdvisor}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800 dark:hover:bg-amber-900/60 font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>แนะนำรหัส สปสช.</span>
                {advisorCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-3xs font-bold">
                    {advisorCount}
                  </span>
                )}
              </button>
            )}

            <button
              id="btn-guidelines-modal"
              onClick={onOpenGuidelines}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900/60 font-semibold transition-colors cursor-pointer shadow-2xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>47 เงื่อนไข สปสช. & ผัง CR1/CR37</span>
            </button>

            {onOpenBlueprint && (
              <button
                id="btn-blueprint-modal"
                onClick={onOpenBlueprint}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-950 border border-indigo-300 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-800 dark:hover:bg-indigo-900/60 font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>พิมพ์เขียว Audit 47 ข้อ (จุดตาย สปสช.)</span>
              </button>
            )}

            {/* Firebase Cloud Saved Audits Button */}
            {onOpenSavedAudits && (
              <button
                id="btn-open-cloud-audits"
                type="button"
                onClick={onOpenSavedAudits}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-950 border border-sky-300 hover:bg-sky-100 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-800 dark:hover:bg-sky-900/60 font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>ผลตรวจบน Cloud</span>
                {savedAuditsCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-sky-600 text-white text-3xs font-bold">
                    {savedAuditsCount}
                  </span>
                )}
              </button>
            )}

            {/* Firebase Google Auth Button */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 pl-1">
                <div
                  className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-3xs text-emerald-800 dark:text-emerald-300 font-medium max-w-[150px] truncate"
                  title={currentUser.email || currentUser.displayName || 'ผู้ตรวจสอบ'}
                >
                  <User className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{currentUser.email || currentUser.displayName || 'ออนไลน์'}</span>
                </div>
                {onSignOut && (
                  <button
                    id="btn-firebase-signout"
                    type="button"
                    onClick={onSignOut}
                    title="ออกจากระบบ"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : onSignIn ? (
              <button
                id="btn-firebase-signin"
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>เข้าสู่ระบบ (Google)</span>
              </button>
            ) : null}

            <button
              id="btn-reset-form"
              onClick={onReset}
              title="ล้างข้อมูลและเริ่มต้นใหม่"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Dark Mode Theme Toggle Button */}
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block"></div>

            <button
              id="btn-theme-toggle"
              type="button"
              onClick={handleToggleTheme}
              title={isDark ? 'สลับเป็นโหมดสว่าง (Light Mode)' : 'สลับเป็นโหมดมืด (Dark Mode)'}
              aria-label={isDark ? 'สลับเป็นโหมดสว่าง (Light Mode)' : 'สลับเป็นโหมดมืด (Dark Mode)'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium text-xs transition-all shadow-2xs cursor-pointer bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-semibold text-amber-300">โหมดมืด</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-slate-600" />
                  <span className="font-semibold text-slate-700">โหมดสว่าง</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

