import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Pill,
  Stethoscope,
  Activity,
  TestTube,
  LogIn,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  ArrowRight,
  Filter,
  ShieldAlert,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Info,
  Layers,
  Wrench,
  Check,
  Plus,
  Compass,
  FlaskConical,
} from 'lucide-react';
import {
  AntibioticAdministrationLog,
  ClinicalProfile,
  ClinicalTimelineEvent,
  DiagnosisEntry,
  MedicationItem,
  ProcedureEntry,
  TimelineCodingGapSummary,
} from '../types';
import { generateClinicalTimeline } from '../utils/clinicalTimelineGenerator';
import { matchAntibioticsAgainstGuidelines } from '../utils/antibioticGuidelineMatcher';
import { AntibioticLogModal } from './AntibioticLogModal';
import { AntibioticGuidelineCard } from './AntibioticGuidelineCard';
import { AntibioticTimelineList } from './AntibioticTimelineList';

interface ClinicalTimelineViewProps {
  pdx: string;
  secondaryDx: DiagnosisEntry[];
  medications: MedicationItem[];
  clinicalProfile: ClinicalProfile;
  procedures?: ProcedureEntry[];
  antibioticLogs?: AntibioticAdministrationLog[];
  onAntibioticLogsChange?: (logs: AntibioticAdministrationLog[]) => void;
  onClinicalProfileChange?: (updated: ClinicalProfile) => void;
  dateAdm?: string;
  timeAdm?: string;
  dateDsc?: string;
  timeDsc?: string;
  onApplyCodingFix?: (action: {
    actionType: 'SET_PDX' | 'ADD_SDX' | 'CHANGE_TYPE' | 'ADD_PROCEDURE';
    code?: string;
    diagType?: 'comorbid' | 'complication';
    procType?: 'principal' | 'secondary';
  }) => void;
  onAddMedication?: (med: MedicationItem) => void;
  onClose?: () => void;
}

export const ClinicalTimelineView: React.FC<ClinicalTimelineViewProps> = ({
  pdx,
  secondaryDx,
  medications,
  clinicalProfile,
  procedures = [],
  antibioticLogs,
  onAntibioticLogsChange,
  onClinicalProfileChange,
  dateAdm,
  timeAdm,
  dateDsc,
  timeDsc,
  onApplyCodingFix,
  onAddMedication,
  onClose,
}) => {
  // Top-level sub-view mode
  const [activeSubTab, setActiveSubTab] = useState<'TIMELINE' | 'ANTIBIOTIC_LOGS' | 'SEPSIS_GUIDELINES'>('TIMELINE');

  // Timeline category & day filters
  const [filterCategory, setFilterCategory] = useState<
    'ALL' | 'GAPS_ONLY' | 'DRUGS' | 'DIAGNOSES' | 'PROCEDURES' | 'LABS'
  >('ALL');
  const [selectedDay, setSelectedDay] = useState<number | 'ALL'>('ALL');
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);

  // Modal states for logging antibiotics
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<AntibioticAdministrationLog | null>(null);

  // Sepsis Mandatory Labs Diagnostic Check states
  const [customLactateInput, setCustomLactateInput] = useState<string>('');
  const [showLabQuickPanel, setShowLabQuickPanel] = useState<boolean>(true);

  // Internal logs state fallback
  const [internalLogs, setInternalLogs] = useState<AntibioticAdministrationLog[]>([
    {
      id: 'anti_seed_1',
      antibioticName: 'cefTRIAXone (Ceftriaxone)',
      genericName: 'Ceftriaxone',
      dosage: '2 g',
      route: 'IV_DRIP',
      frequency: 'OD (q 24 hr)',
      dayNumber: 1,
      time: '09:30',
      isHour1Bundle: true,
      bloodCultureSequence: 'BEFORE_ANTIBIOTIC',
      indicationType: 'EMPIRIC_BROAD_SPECTRUM',
      suspectedSource: 'INTRA_ABDOMINAL',
      status: 'GIVEN',
      notes: 'บริหารเข็มแรก ณ ER ภายใน 45 นาทีหลังแรกรับ (Hour-1 Bundle Met)',
    },
    {
      id: 'anti_seed_2',
      antibioticName: 'metroNIDAZOLE (Metronidazole)',
      genericName: 'Metronidazole',
      dosage: '500 mg',
      route: 'IV_DRIP',
      frequency: 'q 8 hr',
      dayNumber: 1,
      time: '09:45',
      isHour1Bundle: true,
      bloodCultureSequence: 'BEFORE_ANTIBIOTIC',
      indicationType: 'EMPIRIC_BROAD_SPECTRUM',
      suspectedSource: 'INTRA_ABDOMINAL',
      status: 'GIVEN',
      notes: 'ครอบคลุมเชื้อ Anaerobe ในช่องท้องร่วมกับ Ceftriaxone',
    },
    {
      id: 'anti_seed_3',
      antibioticName: 'cefTRIAXone (Ceftriaxone)',
      genericName: 'Ceftriaxone',
      dosage: '2 g',
      route: 'IV_DRIP',
      frequency: 'OD (q 24 hr)',
      dayNumber: 2,
      time: '09:30',
      isHour1Bundle: false,
      bloodCultureSequence: 'BEFORE_ANTIBIOTIC',
      indicationType: 'EMPIRIC_BROAD_SPECTRUM',
      suspectedSource: 'INTRA_ABDOMINAL',
      status: 'GIVEN',
    },
    {
      id: 'anti_seed_4',
      antibioticName: 'metroNIDAZOLE (Metronidazole)',
      genericName: 'Metronidazole',
      dosage: '500 mg',
      route: 'IV_DRIP',
      frequency: 'q 8 hr',
      dayNumber: 2,
      time: '09:45',
      isHour1Bundle: false,
      bloodCultureSequence: 'BEFORE_ANTIBIOTIC',
      indicationType: 'EMPIRIC_BROAD_SPECTRUM',
      suspectedSource: 'INTRA_ABDOMINAL',
      status: 'GIVEN',
    },
  ]);

  const activeAntibioticLogs = useMemo(() => {
    return antibioticLogs && antibioticLogs.length > 0 ? antibioticLogs : internalLogs;
  }, [antibioticLogs, internalLogs]);

  const handleUpdateLogs = (newLogs: AntibioticAdministrationLog[]) => {
    setInternalLogs(newLogs);
    if (onAntibioticLogsChange) {
      onAntibioticLogsChange(newLogs);
    }
  };

  // Generate timeline events and audit gaps
  const timelineData = useMemo(() => {
    return generateClinicalTimeline({
      pdx,
      secondaryDx,
      medications,
      clinicalProfile,
      procedures,
      antibioticLogs: activeAntibioticLogs,
      dateAdm,
      timeAdm,
      dateDsc,
      timeDsc,
    });
  }, [pdx, secondaryDx, medications, clinicalProfile, procedures, activeAntibioticLogs, dateAdm, timeAdm, dateDsc, timeDsc]);

  const {
    events = [],
    gapsSummary,
    admissionDateDisplay,
    dischargeDateDisplay,
    lengthOfStayDays,
  } = timelineData || {};

  // Real-time Guideline matching against Sepsis criteria
  const matchResult = useMemo(() => {
    return matchAntibioticsAgainstGuidelines({
      antibioticLogs: activeAntibioticLogs,
      pdx,
      secondaryDx,
      clinicalProfile,
      procedures,
      lengthOfStayDays,
    });
  }, [activeAntibioticLogs, pdx, secondaryDx, clinicalProfile, procedures, lengthOfStayDays]);

  // Handlers for Antibiotic Logs CRUD
  const handleOpenAddModal = () => {
    setEditingLog(null);
    setIsLogModalOpen(true);
  };

  const handleEditLog = (log: AntibioticAdministrationLog) => {
    setEditingLog(log);
    setIsLogModalOpen(true);
  };

  const handleSaveLog = (log: AntibioticAdministrationLog, syncToMedications: boolean) => {
    let updated: AntibioticAdministrationLog[];
    if (editingLog) {
      updated = activeAntibioticLogs.map((l) => (l.id === log.id ? log : l));
    } else {
      updated = [...activeAntibioticLogs, log];
    }
    handleUpdateLogs(updated);

    // Sync to medications if requested
    if (syncToMedications && onAddMedication) {
      const workingCode = log.genericName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      onAddMedication({
        id: `med_synced_${log.id}`,
        workingCode,
        name: log.antibioticName,
        category: 'iv_antibiotic',
        dosage: log.dosage,
        quantity: 1,
        isSelected: true,
      });
    }
  };

  const handleDeleteLog = (logId: string) => {
    const updated = activeAntibioticLogs.filter((l) => l.id !== logId);
    handleUpdateLogs(updated);
  };

  const handleCloneToNextDay = (log: AntibioticAdministrationLog) => {
    const nextDayLog: AntibioticAdministrationLog = {
      ...log,
      id: `anti_clone_${Date.now()}`,
      dayNumber: log.dayNumber + 1,
      isHour1Bundle: false,
    };
    handleUpdateLogs([...activeAntibioticLogs, nextDayLog]);
  };

  const handleAutoPopulateFromMeds = () => {
    const antiMeds = (medications || []).filter(
      (m) =>
        m.category === 'iv_antibiotic' ||
        ['ceftriaxone', 'metronidazole', 'meropenem', 'piperacillin', 'vancomycin', 'cefotaxime'].some((k) =>
          m.name.toLowerCase().includes(k)
        )
    );

    if (antiMeds.length === 0) return;

    const newLogs: AntibioticAdministrationLog[] = [];
    antiMeds.forEach((m, idx) => {
      const isFirst = idx === 0;
      const lower = m.name.toLowerCase();
      let genericName = 'Ceftriaxone';
      let dosage = m.dosage || '2 g';
      let route: AntibioticAdministrationLog['route'] = 'IV_DRIP';
      let freq = 'OD (q 24 hr)';
      let source: AntibioticAdministrationLog['suspectedSource'] = 'BLOODSTREAM_SEPSIS';

      if (lower.includes('metro')) {
        genericName = 'Metronidazole';
        dosage = m.dosage || '500 mg';
        freq = 'q 8 hr';
        source = 'INTRA_ABDOMINAL';
      } else if (lower.includes('mero')) {
        genericName = 'Meropenem';
        dosage = m.dosage || '1 g';
        freq = 'q 8 hr';
      } else if (lower.includes('piptazo') || lower.includes('piperacillin')) {
        genericName = 'Piperacillin/Tazobactam';
        dosage = m.dosage || '4.5 g';
        freq = 'q 6 hr';
      } else if (lower.includes('vanco')) {
        genericName = 'Vancomycin';
        dosage = m.dosage || '1 g';
        freq = 'q 12 hr';
      }

      // Day 1
      newLogs.push({
        id: `anti_synced_d1_${m.id || idx}`,
        antibioticName: m.name,
        genericName,
        dosage,
        route,
        frequency: freq,
        dayNumber: 1,
        time: isFirst ? '09:30' : '09:45',
        isHour1Bundle: true,
        bloodCultureSequence: 'BEFORE_ANTIBIOTIC',
        indicationType: 'EMPIRIC_BROAD_SPECTRUM',
        suspectedSource: source,
        status: 'GIVEN',
        notes: 'นำเข้าอัตโนมัติจากรายการยาใน DRU.txt',
      });

      // Day 2
      newLogs.push({
        id: `anti_synced_d2_${m.id || idx}`,
        antibioticName: m.name,
        genericName,
        dosage,
        route,
        frequency: freq,
        dayNumber: 2,
        time: isFirst ? '09:30' : '09:45',
        isHour1Bundle: false,
        bloodCultureSequence: 'BEFORE_ANTIBIOTIC',
        indicationType: 'EMPIRIC_BROAD_SPECTRUM',
        suspectedSource: source,
        status: 'GIVEN',
      });
    });

    handleUpdateLogs(newLogs);
  };

  // Filter events according to user filter
  const filteredEvents = useMemo(() => {
    return (events || []).filter((evt) => {
      // Day filter
      if (selectedDay !== 'ALL' && evt.dayNumber !== selectedDay) {
        return false;
      }

      // Category filter
      if (filterCategory === 'GAPS_ONLY') {
        return Boolean(evt.codingGap);
      }
      if (filterCategory === 'DRUGS') {
        return evt.category === 'DRUG_ADMINISTRATION';
      }
      if (filterCategory === 'DIAGNOSES') {
        return evt.category === 'DIAGNOSIS' || evt.category === 'ADMISSION';
      }
      if (filterCategory === 'PROCEDURES') {
        return evt.category === 'PROCEDURE';
      }
      if (filterCategory === 'LABS') {
        return evt.category === 'LAB_SAMPLE';
      }
      return true;
    });
  }, [events, filterCategory, selectedDay]);

  // Group filtered events by Day
  const groupedEvents = useMemo(() => {
    const groups = new Map<number, ClinicalTimelineEvent[]>();
    for (const evt of filteredEvents) {
      if (!groups.has(evt.dayNumber)) {
        groups.set(evt.dayNumber, []);
      }
      groups.get(evt.dayNumber)!.push(evt);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a - b);
  }, [filteredEvents]);

  // Key event highlights for drug administration vs sepsis diagnosis
  const sepsisEvent = events.find((e) => e.subCategory === 'SEPSIS_PDX');
  const firstVasoEvent = events.find((e) => e.subCategory === 'VASOPRESSOR');
  const firstAntibioticEvent = events.find((e) => e.subCategory === 'ANTIBIOTIC');

  // Sepsis Diagnostic & Mandatory Lab Checks (CR1 Audit Rule)
  const cleanPdxUpper = (pdx || '').trim().toUpperCase().replace('.', '');
  const isSepsisPdx = cleanPdxUpper.startsWith('A40') || cleanPdxUpper.startsWith('A41') || cleanPdxUpper === 'A021';
  const hasSdxSepsis = secondaryDx.some((s) => {
    const c = (s?.code || '').trim().toUpperCase().replace('.', '');
    return c.startsWith('A40') || c.startsWith('A41') || c === 'A021';
  });
  const hasSepticShock =
    secondaryDx.some((s) => (s?.code || '').trim().toUpperCase().replace('.', '') === 'R572') ||
    cleanPdxUpper.startsWith('R57');
  const isFlaggedWithSepsis =
    isSepsisPdx ||
    hasSdxSepsis ||
    hasSepticShock ||
    (clinicalProfile.clinicalSummary || '').toLowerCase().includes('sepsis') ||
    (clinicalProfile.clinicalSummary || '').toLowerCase().includes('urosepsis');

  // Mandatory Lab Checks:
  const isMissingBloodCulture = clinicalProfile.hemoculture === 'not_sent';
  const isMissingLactate =
    (clinicalProfile.lactateLevel === undefined || clinicalProfile.lactateLevel === null) &&
    (!clinicalProfile.lactateStatus || clinicalProfile.lactateStatus === 'not_sent');
  const hasMissingMandatoryLabs = isFlaggedWithSepsis && (isMissingBloodCulture || isMissingLactate);

  const handleUpdateHemoculture = (status: 'positive' | 'negative' | 'pending', organism?: string) => {
    if (onClinicalProfileChange) {
      onClinicalProfileChange({
        ...clinicalProfile,
        hemoculture: status,
        cultureOrganism: organism !== undefined ? organism : clinicalProfile.cultureOrganism || (status === 'positive' ? 'Klebsiella pneumoniae' : undefined),
      });
    }
  };

  const handleUpdateLactate = (status: 'normal' | 'high' | 'critical', val: number) => {
    if (onClinicalProfileChange) {
      onClinicalProfileChange({
        ...clinicalProfile,
        lactateStatus: status,
        lactateLevel: val,
      });
    }
  };

  const handleSaveCustomLactate = () => {
    const parsed = parseFloat(customLactateInput);
    if (!isNaN(parsed) && parsed >= 0) {
      const status = parsed >= 4.0 ? 'critical' : parsed >= 2.0 ? 'high' : 'normal';
      handleUpdateLactate(status, parsed);
      setCustomLactateInput('');
    }
  };

  const getEventCategoryIcon = (category: ClinicalTimelineEvent['category'], subCategory?: string) => {
    if (subCategory === 'VASOPRESSOR') return <AlertOctagon className="w-4 h-4 text-rose-600" />;
    if (subCategory === 'ANTIBIOTIC') return <Pill className="w-4 h-4 text-purple-600" />;
    if (category === 'ADMISSION') return <LogIn className="w-4 h-4 text-blue-600" />;
    if (category === 'DISCHARGE') return <LogOut className="w-4 h-4 text-emerald-600" />;
    if (category === 'DIAGNOSIS') return <Stethoscope className="w-4 h-4 text-sky-600" />;
    if (category === 'DRUG_ADMINISTRATION') return <Pill className="w-4 h-4 text-amber-600" />;
    if (category === 'PROCEDURE') return <Wrench className="w-4 h-4 text-indigo-600" />;
    if (category === 'LAB_SAMPLE') return <TestTube className="w-4 h-4 text-teal-600" />;
    return <Activity className="w-4 h-4 text-slate-600" />;
  };

  const getSourceBadgeColor = (source: ClinicalTimelineEvent['sourceFile']) => {
    switch (source) {
      case 'IPD.txt':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DRU.txt':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'IDX.txt':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'IOP.txt':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'LABFU.txt':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Banner Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 text-purple-300 flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  ลำดับเวลาคลินิก & บันทึกยาปฏิชีวนะ (Clinical Timeline & Antibiotics Log)
                </h2>
                <span className="text-3xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 font-medium">
                  อ้างอิงแฟ้ม 18 แฟ้ม & Sepsis Guidelines
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                บันทึกการบริหารยาปฏิชีวนะฉีด เทียบเกณฑ์ชั่วโมงทอง (Hour-1 Bundle) ผลเพาะเชื้อ และเกณฑ์ CR37 สปสช.
              </p>
            </div>
          </div>

          {/* Quick Action & Metrics */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ บันทึกยาปฏิชีวนะ</span>
            </button>

            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <div className="text-left">
                <span className="text-3xs text-slate-400 block leading-none">ระยะเวลานอน รพ.</span>
                <span className="text-xs font-bold text-white">{lengthOfStayDays} วัน</span>
              </div>
            </div>

            {matchResult.concordanceStatus === 'CONCORDANT' ? (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <span className="text-3xs text-emerald-300 block leading-none">Sepsis Guidelines</span>
                  <span className="text-xs font-bold text-emerald-200">สอดคล้อง 100%</span>
                </div>
              </div>
            ) : matchResult.concordanceStatus === 'PARTIAL' ? (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <span className="text-3xs text-amber-300 block leading-none">Sepsis Guidelines</span>
                  <span className="text-xs font-bold text-amber-200">มีข้อสังเกต ({matchResult.scorePercent}%)</span>
                </div>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />
                <div className="text-left">
                  <span className="text-3xs text-rose-300 block leading-none">Sepsis Guidelines</span>
                  <span className="text-xs font-bold text-rose-200">ขัดเกณฑ์ ({matchResult.scorePercent}%)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Temporal Cross-Check Highlight: Drug Admin vs Sepsis Diagnosis vs Mandatory Labs */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Sepsis Diagnosis */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <Stethoscope className="w-3 h-3" /> 1. วันวินิจฉัย Sepsis (IDX)
              </span>
              <span className="text-3xs font-mono bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-800">
                {sepsisEvent ? sepsisEvent.code : pdx}
              </span>
            </div>
            <div className="text-xs font-bold text-white">
              {sepsisEvent ? `${sepsisEvent.displayDate} (${sepsisEvent.time})` : `${admissionDateDisplay} (วันแรกรับ)`}
            </div>
            <p className="text-3xs text-slate-300 mt-1 line-clamp-1">
              {sepsisEvent?.description || 'บันทึกการวินิจฉัยโรคหลักในแฟ้ม IDX.txt'}
            </p>
          </div>

          {/* Card 2: 1st Dose Antibiotic & Guidelines Status */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                <Pill className="w-3 h-3" /> 2. การบริหารยาปฏิชีวนะ (DRU)
              </span>
              <span className="text-3xs font-mono bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800">
                {activeAntibioticLogs.length} รายการ
              </span>
            </div>
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>
                {activeAntibioticLogs.length > 0 ? (
                  activeAntibioticLogs[0].antibioticName
                ) : firstAntibioticEvent ? (
                  firstAntibioticEvent.title
                ) : (
                  <span className="text-rose-400 font-normal">ยังไม่มีบันทึกยาปฏิชีวนะฉีด</span>
                )}
              </span>
              {activeAntibioticLogs.some((l) => l.isHour1Bundle) && (
                <span className="text-3xs px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                  Hour-1 ✓
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-700/50">
              <span className="text-3xs text-slate-300">
                {matchResult.routeMet ? 'ทางหลอดเลือดดำ (IV) ถูกเกณฑ์ CR37' : 'เสี่ยงผิดเกณฑ์ CR37'}
              </span>
              <button
                type="button"
                onClick={() => setActiveSubTab('SEPSIS_GUIDELINES')}
                className="text-3xs text-purple-300 hover:text-white font-semibold underline cursor-pointer"
              >
                ดูผลเทียบเกณฑ์ &gt;
              </button>
            </div>
          </div>

          {/* Card 3: Vasopressor Onset */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <AlertOctagon className="w-3 h-3" /> 3. ยากระตุ้นความดัน Vasopressor (DRU)
              </span>
              {firstVasoEvent ? (
                <span className="text-3xs font-mono bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800">
                  Day {firstVasoEvent.dayNumber}
                </span>
              ) : (
                <span className="text-3xs text-slate-400">ไม่ได้ให้ยา</span>
              )}
            </div>
            <div className="text-xs font-bold text-white">
              {firstVasoEvent ? (
                `${firstVasoEvent.displayDate} (${firstVasoEvent.time})`
              ) : (
                <span className="text-slate-400 font-normal">ไม่พบการให้ Vasopressor</span>
              )}
            </div>
            <p className="text-3xs text-slate-300 mt-1 line-clamp-1">
              {firstVasoEvent
                ? secondaryDx.some((s) => s.code.replace('.', '') === 'R572')
                  ? secondaryDx.find((s) => s.code.replace('.', '') === 'R572')?.diagType === 'complication'
                    ? '✓ มีรหัส R57.2 เป็นโรคแทรก (ถูกต้องตาม CR1)'
                    : '⚠️ R57.2 ถูกบันทึกเป็นโรคร่วม (ผิดเกณฑ์ CR1!)'
                  : '⚠️ ขาดรหัส R57.2 Septic shock (Under-coding!)'
                : 'ผู้ป่วยไม่อยู่ในภาวะ Septic shock'}
            </p>
          </div>

          {/* Card 4: Mandatory Sepsis Labs (LABFU.txt) */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/70">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-3xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <TestTube className="w-3 h-3" /> 4. ผลตรวจแล็บจำเป็น (LABFU)
              </span>
              {isFlaggedWithSepsis ? (
                !isMissingBloodCulture && !isMissingLactate ? (
                  <span className="text-3xs font-mono bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                    ครบถ้วน ✓
                  </span>
                ) : (
                  <span className="text-3xs font-mono bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800 animate-pulse font-bold">
                    ขาดผลแล็บ ⚠️
                  </span>
                )
              ) : (
                <span className="text-3xs text-slate-400">ทั่วไป</span>
              )}
            </div>
            <div className="text-xs font-bold text-white flex items-center justify-between">
              <span>
                Hemo: {clinicalProfile.hemoculture === 'positive' ? (
                  <span className="text-emerald-300">พบเชื้อ (+)</span>
                ) : clinicalProfile.hemoculture === 'negative' ? (
                  <span className="text-sky-300">ไม่พบเชื้อ (-)</span>
                ) : clinicalProfile.hemoculture === 'pending' ? (
                  <span className="text-amber-300">รอผล</span>
                ) : (
                  <span className="text-rose-400">ยังไม่ส่ง ❌</span>
                )}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-200 mt-0.5">
              Lactate:{' '}
              {clinicalProfile.lactateLevel !== undefined ? (
                <span className={clinicalProfile.lactateLevel >= 4.0 ? 'text-rose-400' : clinicalProfile.lactateLevel >= 2.0 ? 'text-amber-300' : 'text-emerald-300'}>
                  {clinicalProfile.lactateLevel} mmol/L
                </span>
              ) : clinicalProfile.lactateStatus && clinicalProfile.lactateStatus !== 'not_sent' ? (
                <span className="text-emerald-300">ส่งตรวจแล้ว</span>
              ) : (
                <span className="text-rose-400 font-normal">ยังไม่ตรวจ ❌</span>
              )}
            </div>
            <p className="text-3xs text-slate-300 mt-1 line-clamp-1">
              {isFlaggedWithSepsis
                ? (!isMissingBloodCulture && !isMissingLactate
                    ? '✓ ผ่านเกณฑ์ Mandatory Labs (CR1)'
                    : '⚠️ ขาดผลแล็บ เสี่ยงติดเตือน CR1')
                : 'ผู้ป่วยไม่มีรหัสกลุ่ม Sepsis'}
            </p>
          </div>
        </div>
      </div>

      {/* Sepsis Mandatory Labs Diagnostic Check Alert Banner */}
      {hasMissingMandatoryLabs && (
        <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-amber-950/70 border-2 border-rose-500/80 shadow-lg text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/30 border border-rose-400/50 text-rose-200 flex items-center justify-center shrink-0 shadow-xs animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-300" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    การตรวจสอบทางคลินิก (Diagnostic Check): ขาดผลตรวจทางห้องปฏิบัติการจำเป็นสำหรับกลุ่ม Sepsis
                  </h3>
                  <span className="text-3xs font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-200 border border-rose-400/50">
                    [CR1#การให้รหัสโรคในกลุ่ม Sepsis ผิดหลักการ]
                  </span>
                  <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
                    Surviving Sepsis Campaign (SSC)
                  </span>
                </div>
                <p className="text-xs text-rose-100/90 leading-relaxed max-w-4xl">
                  ผู้ป่วยถูกระบุรหัสในกลุ่ม Sepsis หรือ Septic Shock ({[isSepsisPdx ? pdx : null, ...secondaryDx.map((s) => s.code)].filter(Boolean).join(', ')}) แต่ตรวจพบว่า
                  <strong className="text-white underline decoration-rose-400 ml-1">
                    {isMissingBloodCulture && isMissingLactate
                      ? 'ยังไม่ได้ส่งตรวจทั้งเพาะเชื้อในเลือด (Blood Culture) และระดับกรดแลคติก (Serum Lactate)'
                      : isMissingBloodCulture
                      ? 'ยังไม่ได้ส่งตรวจเพาะเชื้อในเลือด (Blood Culture missing)'
                      : 'ยังไม่ได้ตรวจวัดระดับกรดแลคติกในเลือด (Serum Lactate missing)'}
                  </strong>{' '}
                  ตามแนวทางเวชปฏิบัติและคู่มือการตรวจประเมินเวชระเบียน สปสช. หากไม่มีผลตรวจแล็บจำเป็นเหล่านี้ จะเสี่ยงต่อการถูก Audit สุ่มตรวจ ปฏิเสธการเบิกจ่าย หรือปรับลดค่าน้ำหนัก AdjRW
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLabQuickPanel(!showLabQuickPanel)}
              className="text-xs text-rose-200 hover:text-white px-2.5 py-1 rounded-lg bg-rose-900/50 hover:bg-rose-900/80 border border-rose-700/60 font-medium cursor-pointer shrink-0 transition-colors"
            >
              {showLabQuickPanel ? 'ย่อแผงคีย์ด่วน ▴' : 'เปิดแผงคีย์ด่วน ▾'}
            </button>
          </div>

          {/* Interactive Diagnostic Lab Resolution Panel */}
          {showLabQuickPanel && (
            <div className="mt-3 pt-3 border-t border-rose-700/50 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Box 1: Blood Culture (Hemoculture) */}
              <div className={`p-3 rounded-xl border transition-all ${
                isMissingBloodCulture
                  ? 'bg-rose-900/50 border-rose-400/60 text-rose-100'
                  : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-100'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <TestTube className={`w-4 h-4 ${isMissingBloodCulture ? 'text-rose-400' : 'text-emerald-400'}`} />
                    <span>1. การเพาะเชื้อในเลือด (Hemoculture)</span>
                  </div>
                  {isMissingBloodCulture ? (
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-rose-800/80 text-rose-200 border border-rose-600">
                      ⚠️ ยังไม่ได้ส่งตรวจ (Missing)
                    </span>
                  ) : (
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-emerald-800/80 text-emerald-200 border border-emerald-600">
                      ✓ บันทึกแล้ว ({clinicalProfile.hemoculture === 'positive' ? `พบเชื้อ: ${clinicalProfile.cultureOrganism || 'ระบุเชื้อ'}` : 'ไม่พบเชื้อ'})
                    </span>
                  )}
                </div>
                <p className="text-3xs text-slate-200 leading-normal mb-2">
                  *สปสช. และ Hour-1 Bundle กำหนดให้เจาะ Hemoculture x 2 bottles ก่อนเริ่มยาปฏิชีวนะชนิดฉีด เพื่อยืนยันชนิดเชื้อและสนับสนุนรหัส Sepsis (A40.-, A41.-)
                </p>
                {onClinicalProfileChange && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-3xs font-medium text-slate-300">คลิกบันทึกทันที:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateHemoculture('positive', 'Klebsiella pneumoniae')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-3xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      + พบเชื้อ (Positive)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateHemoculture('negative')}
                      className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-3xs font-medium border border-slate-500 transition-colors cursor-pointer"
                    >
                      + ไม่พบเชื้อ (Negative)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateHemoculture('pending')}
                      className="px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-3xs font-medium transition-colors cursor-pointer"
                    >
                      รอผล (Pending)
                    </button>
                  </div>
                )}
              </div>

              {/* Box 2: Serum Lactate Level */}
              <div className={`p-3 rounded-xl border transition-all ${
                isMissingLactate
                  ? 'bg-rose-900/50 border-rose-400/60 text-rose-100'
                  : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-100'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <FlaskConical className={`w-4 h-4 ${isMissingLactate ? 'text-amber-400' : 'text-emerald-400'}`} />
                    <span>2. ระดับกรดแลคติกในเลือด (Serum Lactate)</span>
                  </div>
                  {isMissingLactate ? (
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-rose-800/80 text-rose-200 border border-rose-600">
                      ⚠️ ยังไม่ตรวจวัด (Missing)
                    </span>
                  ) : (
                    <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-emerald-800/80 text-emerald-200 border border-emerald-600">
                      ✓ บันทึกแล้ว ({clinicalProfile.lactateLevel ?? 'มีผล'} mmol/L)
                    </span>
                  )}
                </div>
                <p className="text-3xs text-slate-200 leading-normal mb-2">
                  *ค่า ≥ 2.0 mmol/L บ่งชี้ Tissue Hypoperfusion, ค่า ≥ 4.0 mmol/L บ่งชี้ Septic Shock และต้องให้สารน้ำกู้ชีพ ≥ 30 ml/kg ทันที
                </p>
                {onClinicalProfileChange && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-3xs font-medium text-slate-300">เลือกค่าด่วน:</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateLactate('normal', 1.4)}
                        className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-3xs font-medium transition-colors cursor-pointer"
                      >
                        ปกติ 1.4
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLactate('high', 3.2)}
                        className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-3xs font-bold transition-colors cursor-pointer"
                      >
                        สูง 3.2
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateLactate('critical', 4.5)}
                        className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-3xs font-bold transition-colors cursor-pointer"
                      >
                        วิกฤต 4.5
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="25"
                        value={customLactateInput}
                        onChange={(e) => setCustomLactateInput(e.target.value)}
                        placeholder="ระบุค่า Lactate (mmol/L)..."
                        className="w-36 text-xs px-2.5 py-1 rounded-lg bg-slate-900/90 text-white border border-slate-600 focus:outline-none focus:border-amber-400 placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleSaveCustomLactate}
                        disabled={!customLactateInput}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-3xs transition-colors cursor-pointer"
                      >
                        บันทึกผล
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Banner when all mandatory labs are present */}
      {isFlaggedWithSepsis && !hasMissingMandatoryLabs && (
        <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>ผ่านการตรวจสอบทางคลินิก (Diagnostic Check Passed):</strong> ผลตรวจแล็บจำเป็นสำหรับ Sepsis (Blood Culture & Serum Lactate = {clinicalProfile.lactateLevel ?? 'ปกติ'} mmol/L) ครบถ้วนตามมาตรฐาน สปสช. CR1 และ Surviving Sepsis Campaign
            </span>
          </div>
          <span className="text-3xs font-mono px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
            Audit Ready
          </span>
        </div>
      )}

      {/* Sub-Navigation Tabs Bar */}
      <div className="px-6 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('TIMELINE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'TIMELINE'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>ภาพรวมไทม์ไลน์คลินิก ({events.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ANTIBIOTIC_LOGS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ANTIBIOTIC_LOGS'
                ? 'bg-white text-purple-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-purple-600" />
            <span>บันทึกการให้ยาปฏิชีวนะ ({activeAntibioticLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('SEPSIS_GUIDELINES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'SEPSIS_GUIDELINES'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>เทียบเกณฑ์ Sepsis Guidelines</span>
            <span
              className={`text-3xs font-mono font-bold px-1.5 py-0.2 rounded-full ${
                matchResult.scorePercent === 100
                  ? 'bg-emerald-100 text-emerald-800'
                  : matchResult.scorePercent >= 70
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {matchResult.scorePercent}%
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === 'ANTIBIOTIC_LOGS' && (
            <button
              type="button"
              onClick={handleAutoPopulateFromMeds}
              className="text-3xs px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>ซิงค์จาก DRU.txt</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="text-xs px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ บันทึกยาใหม่</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: SEPSIS GUIDELINES TAB */}
      {activeSubTab === 'SEPSIS_GUIDELINES' && (
        <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
          <AntibioticGuidelineCard
            matchResult={matchResult}
            onOpenAddModal={handleOpenAddModal}
            onApplyAction={(act) => {
              if (onApplyCodingFix) {
                onApplyCodingFix({
                  actionType: act.actionType,
                  code: act.code,
                  diagType: act.diagType,
                });
              }
            }}
          />

          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-800 mb-3">
              รายการยาปฏิชีวนะที่นำมาเทียบเกณฑ์ในเคสนี้:
            </h4>
            <AntibioticTimelineList
              antibioticLogs={activeAntibioticLogs}
              onOpenAddModal={handleOpenAddModal}
              onEditLog={handleEditLog}
              onDeleteLog={handleDeleteLog}
              onCloneToNextDay={handleCloneToNextDay}
              onAutoPopulateFromMeds={handleAutoPopulateFromMeds}
            />
          </div>
        </div>
      )}

      {/* VIEW 2: ANTIBIOTIC LOGS TAB */}
      {activeSubTab === 'ANTIBIOTIC_LOGS' && (
        <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
          {/* Quick Summary Card */}
          <AntibioticGuidelineCard
            matchResult={matchResult}
            onOpenAddModal={handleOpenAddModal}
            onApplyAction={(act) => {
              if (onApplyCodingFix) {
                onApplyCodingFix({
                  actionType: act.actionType,
                  code: act.code,
                  diagType: act.diagType,
                });
              }
            }}
          />

          <AntibioticTimelineList
            antibioticLogs={activeAntibioticLogs}
            onOpenAddModal={handleOpenAddModal}
            onEditLog={handleEditLog}
            onDeleteLog={handleDeleteLog}
            onCloneToNextDay={handleCloneToNextDay}
            onAutoPopulateFromMeds={handleAutoPopulateFromMeds}
          />
        </div>
      )}

      {/* VIEW 3: FULL CLINICAL TIMELINE TAB */}
      {activeSubTab === 'TIMELINE' && (
        <>
          {/* Identified Coding Gaps Summary Accordion */}
          {gapsSummary.totalGaps > 0 && (
            <div className="border-b border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      ตรวจพบข้อผิดพลาด/ช่องว่างในการให้รหัส ({gapsSummary.totalGaps} รายการ)
                    </h3>
                    <p className="text-3xs text-slate-500">
                      เปรียบเทียบจากลำดับเวลาการรักษาจริงและการบริหารยาเพื่อป้องกัน DENY และ Under-coding
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-3xs font-medium">
                    {gapsSummary.criticalGaps > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold border border-rose-200">
                        {gapsSummary.criticalGaps} วิกฤต
                      </span>
                    )}
                    {gapsSummary.warningGaps > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                        {gapsSummary.warningGaps} เตือน
                      </span>
                    )}
                    {gapsSummary.opportunityGaps > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold border border-blue-200">
                        {gapsSummary.opportunityGaps} แนะนำเพิ่ม
                      </span>
                    )}
                  </div>
                  <button className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                    {isSummaryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {isSummaryExpanded && (
                <div className="mt-3 space-y-2.5 pt-3 border-t border-slate-200/80">
                  {gapsSummary.items.map((gap) => {
                    const isCritical = gap.severity === 'CRITICAL';
                    const isWarning = gap.severity === 'WARNING';
                    return (
                      <div
                        key={gap.id}
                        className={`p-3 rounded-xl border transition-all text-xs ${
                          isCritical
                            ? 'bg-rose-50/70 border-rose-200'
                            : isWarning
                            ? 'bg-amber-50/70 border-amber-200'
                            : 'bg-blue-50/70 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-bold ${
                                  isCritical ? 'text-rose-900' : isWarning ? 'text-amber-900' : 'text-blue-900'
                                }`}
                              >
                                {gap.title}
                              </span>
                              <span className="text-3xs font-mono px-2 py-0.2 rounded font-semibold bg-white border border-slate-200 text-slate-700">
                                {gap.nhsoRule}
                              </span>
                            </div>
                            <p className="text-3xs sm:text-xs text-slate-600 leading-relaxed">
                              {gap.description}
                            </p>
                            <p className="text-3xs font-semibold text-slate-700">
                              คำแนะนำ: <span className="font-normal text-slate-600">{gap.recommendation}</span>
                            </p>
                          </div>

                          {gap.actionPayload && onApplyCodingFix && (
                            <button
                              onClick={() => onApplyCodingFix(gap.actionPayload!)}
                              className={`shrink-0 text-3xs font-bold px-3 py-1.5 rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer ${
                                isCritical
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>แก้ไขรหัสทันที</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Antibiotic Fast Log Callout in Timeline view */}
          <div className="px-6 py-3 bg-purple-50/60 border-b border-purple-200/80 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-purple-600" />
              <div className="text-xs">
                <span className="font-bold text-purple-950 mr-1">
                  ประวัติการบริหารยาปฏิชีวนะ ({activeAntibioticLogs.length} รายการ):
                </span>
                <span className="text-purple-700 text-3xs">
                  {matchResult.hour1BundleMet ? 'ผ่านเกณฑ์ Hour-1 Bundle' : 'เริ่มยาล่าช้า'} | {matchResult.routeMet ? 'เส้นทาง IV ถูกต้องตาม CR37' : 'เสี่ยงผิดเกณฑ์ CR37'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSubTab('ANTIBIOTIC_LOGS')}
                className="text-3xs px-2.5 py-1 rounded-md bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold cursor-pointer"
              >
                จัดการรายการยา &gt;
              </button>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="text-3xs px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>+ เพิ่มยา</span>
              </button>
            </div>
          </div>

          {/* Controls Bar: Filters & Grouping */}
          <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-medium mr-1 flex items-center gap-1 text-3xs">
                <Filter className="w-3 h-3" /> กรองหมวดหมู่:
              </span>

              {[
                { id: 'ALL', label: 'ทั้งหมด' },
                { id: 'GAPS_ONLY', label: 'เฉพาะจุดเสี่ยง Audit' },
                { id: 'DRUGS', label: 'ยา (DRU)' },
                { id: 'DIAGNOSES', label: 'การวินิจฉัย (IDX)' },
                { id: 'PROCEDURES', label: 'หัตถการ (IOP)' },
                { id: 'LABS', label: 'ผลตรวจแลป' },
              ].map((cat) => {
                const isSelected = filterCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCategory(cat.id as typeof filterCategory)}
                    className={`px-2.5 py-1 rounded-lg font-medium text-3xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Day Filter Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-slate-400 font-medium mr-1 text-3xs">วัน:</span>
              <button
                onClick={() => setSelectedDay('ALL')}
                className={`px-2 py-0.5 rounded text-3xs font-medium cursor-pointer ${
                  selectedDay === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                ทุกวัน
              </button>
              {Array.from({ length: lengthOfStayDays }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`px-2 py-0.5 rounded text-3xs font-medium font-mono cursor-pointer ${
                    selectedDay === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  D{d}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Stream Content */}
          <div className="p-6 bg-slate-50/50 space-y-6 max-h-[calc(100vh-320px)] overflow-y-auto">
            {groupedEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">ไม่พบเหตุการณ์ตามตัวกรองที่ระบุ</p>
                <button
                  onClick={() => {
                    setFilterCategory('ALL');
                    setSelectedDay('ALL');
                  }}
                  className="mt-2 text-3xs text-blue-600 hover:underline cursor-pointer"
                >
                  รีเซ็ตตัวกรองทั้งหมด
                </button>
              </div>
            ) : (
              groupedEvents.map(([dayNum, dayEvents]) => {
                const dayDateDisplay = dayEvents[0]?.displayDate || `Day ${dayNum}`;
                const hasDayGap = dayEvents.some((e) => Boolean(e.codingGap));

                return (
                  <div key={dayNum} className="space-y-3">
                    {/* Day Separator / Sticky Header */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>วันที่ {dayNum} ({dayDateDisplay})</span>
                        {dayNum === 1 && (
                          <span className="text-3xs px-2 py-0.2 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                            วันแรกรับ (Admission)
                          </span>
                        )}
                        {dayNum === lengthOfStayDays && (
                          <span className="text-3xs px-2 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                            วันจำหน่าย (Discharge)
                          </span>
                        )}
                      </div>

                      {hasDayGap && (
                        <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          พบจุดเสี่ยง Audit ในวันนี้
                        </span>
                      )}
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* Events List for this Day */}
                    <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {dayEvents.map((evt) => {
                        const isCriticalGap = evt.codingGap?.severity === 'CRITICAL';
                        const isWarningGap = evt.codingGap?.severity === 'WARNING';
                        const isAntibioticEvent = evt.subCategory === 'ANTIBIOTIC';

                        return (
                          <div
                            key={evt.id}
                            className={`relative p-4 rounded-xl border bg-white shadow-3xs transition-all hover:border-slate-300 ${
                              isCriticalGap
                                ? 'ring-1 ring-rose-400 border-rose-300 bg-rose-50/20'
                                : isWarningGap
                                ? 'ring-1 ring-amber-400 border-amber-300 bg-amber-50/20'
                                : isAntibioticEvent
                                ? 'border-purple-200 bg-purple-50/15'
                                : 'border-slate-200'
                            }`}
                          >
                            {/* Dot on Timeline vertical spine */}
                            <div
                              className={`absolute -left-[27px] top-4 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs ${
                                isCriticalGap
                                  ? 'bg-rose-600 ring-2 ring-rose-200'
                                  : isWarningGap
                                  ? 'bg-amber-500 ring-2 ring-amber-200'
                                  : isAntibioticEvent
                                  ? 'bg-purple-600'
                                  : 'bg-slate-700'
                              }`}
                            />

                            {/* Event Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="p-1 rounded bg-slate-100">
                                  {getEventCategoryIcon(evt.category, evt.subCategory)}
                                </span>
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{evt.title}</span>
                                {evt.code && (
                                  <span className="font-mono text-3xs font-bold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                                    {evt.code}
                                  </span>
                                )}
                                {evt.badge && (
                                  <span
                                    className={`text-3xs font-semibold px-2 py-0.5 rounded-full ${
                                      evt.badgeColor === 'purple'
                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : evt.badgeColor === 'rose'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                        : evt.badgeColor === 'amber'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : evt.badgeColor === 'emerald'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                    }`}
                                  >
                                    {evt.badge}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-3xs font-mono text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {evt.time || '08:30 น.'}
                                </span>
                                <span
                                  className={`text-3xs px-2 py-0.5 rounded font-mono font-medium border ${getSourceBadgeColor(
                                    evt.sourceFile
                                  )}`}
                                >
                                  {evt.sourceFile}
                                </span>
                              </div>
                            </div>

                            {/* Event Description */}
                            <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>

                            {/* Coding Gap Warning Alert Box */}
                            {evt.codingGap && (
                              <div
                                className={`mt-3 p-3 rounded-xl border ${
                                  isCriticalGap
                                    ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                                    : isWarningGap
                                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                                    : 'bg-blue-50/90 border-blue-200 text-blue-900'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5 shrink-0">
                                      {isCriticalGap ? (
                                        <AlertOctagon className="w-4 h-4 text-rose-600" />
                                      ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-xs">{evt.codingGap.title}</span>
                                        <span className="text-3xs px-1.5 py-0.2 rounded font-mono font-medium bg-white/70 border border-rose-200 text-rose-800">
                                          {evt.codingGap.nhsoRule}
                                        </span>
                                      </div>
                                      <p className="text-3xs sm:text-xs mt-1 leading-relaxed text-slate-700">
                                        {evt.codingGap.description}
                                      </p>
                                    </div>
                                  </div>

                                  {evt.codingGap.suggestedAction && onApplyCodingFix && (
                                    <button
                                      onClick={() => onApplyCodingFix(evt.codingGap!.suggestedAction!)}
                                      className="shrink-0 text-3xs px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" />
                                      {evt.codingGap.suggestedAction.label}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Footer info */}
      <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-3xs text-slate-500">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
          <span>แฟ้มข้อมูลที่ตรวจสอบ: IPD, DRU, IDX, IOP, LABFU (มาตรฐาน 18 แฟ้ม สปสช. & Surviving Sepsis Campaign)</span>
        </div>
        <div>
          <span>ตรวจพบ {gapsSummary.totalGaps} จุดเสี่ยงทางเวชระเบียน | {activeAntibioticLogs.length} บันทึกยา</span>
        </div>
      </div>

      {/* Modal for adding/editing antibiotic log */}
      <AntibioticLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onSaveLog={handleSaveLog}
        lengthOfStayDays={lengthOfStayDays}
        initialLog={editingLog}
      />
    </div>
  );
};
