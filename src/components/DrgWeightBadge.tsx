import React, { useState, useRef, useEffect } from 'react';
import { getDrgImpactForIcd10, DrgImpactInfo } from '../utils/drgImpact';
import { Info, HelpCircle, AlertCircle, ArrowUpRight } from 'lucide-react';

interface DrgWeightBadgeProps {
  code: string;
  size?: 'xs' | 'sm' | 'md';
  showDetailsOnHover?: boolean;
  interactive?: boolean;
  className?: string;
  customId?: string;
}

export const DrgWeightBadge: React.FC<DrgWeightBadgeProps> = ({
  code,
  size = 'xs',
  showDetailsOnHover = true,
  interactive = true,
  className = '',
  customId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const info = getDrgImpactForIcd10(code);

  // Close popup when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const sizeStyles = {
    xs: 'text-3xs px-1.5 py-0.5 gap-1',
    sm: 'text-2xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
  }[size];

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      <button
        id={customId || `drg-badge-${code}`}
        type="button"
        onClick={(e) => {
          if (interactive) {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }
        }}
        title={`${info.titleTh} - ${info.priorityLabelTh} (${info.rwImpactEstimateTh})`}
        className={`inline-flex items-center font-medium rounded-md border transition-all select-none ${sizeStyles} ${info.style.badgeBg} ${info.style.badgeText} ${info.style.badgeBorder} ${
          interactive ? 'cursor-pointer hover:shadow-2xs focus:outline-hidden focus:ring-1 ' + info.style.hoverRing : 'cursor-default'
        }`}
      >
        <span
          className={`rounded-full shrink-0 ${dotSizes} ${info.style.dotBg} ${
            info.tier === 'MCC' ? 'animate-pulse' : ''
          }`}
        />
        <span className="font-bold tracking-tight">{info.badgeLabel}</span>
        <span className="opacity-80 font-normal hidden sm:inline text-3xs">
          {info.shortLabel}
        </span>
      </button>

      {/* Popover explaining DRG weight impact and review priority */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="DRG Impact Details"
          className="absolute z-50 bottom-full left-0 mb-2 w-72 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl text-left animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${info.style.dotBg} ${
                    info.tier === 'MCC' ? 'animate-pulse' : ''
                  }`}
                />
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                  ICD-10: {code}
                </span>
                <span
                  className={`text-3xs font-bold px-1.5 py-0.2 rounded border ${info.style.badgeBg} ${info.style.badgeText} ${info.style.badgeBorder}`}
                >
                  {info.badgeLabel}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                {info.titleTh}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 pt-2 text-3xs">
            {/* CCL Level and Priority Tag */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">ระดับความรุนแรง (CCL):</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                CCL {info.ccl} / 4
              </span>
            </div>

            {/* Audit Review Priority */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">ลำดับความสำคัญในการ Audit:</span>
              <span
                className={`font-bold ${
                  info.priorityLevel === 1
                    ? 'text-rose-600 dark:text-rose-400'
                    : info.priorityLevel === 2
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {info.priorityLabelTh}
              </span>
            </div>

            {/* Estimated DRG Relative Weight Impact */}
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-medium">
                ผลต่อค่าน้ำหนักสัมพัทธ์ (Relative Weight):
              </span>
              <div className="font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/60">
                {info.rwImpactEstimateTh}
              </div>
            </div>

            {/* Audit Scrutiny Warning */}
            <div className="text-slate-600 dark:text-slate-300 bg-amber-50/60 dark:bg-amber-950/30 p-2 rounded border border-amber-200/60 dark:border-amber-800/40 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>{info.auditScrutinyTh}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
