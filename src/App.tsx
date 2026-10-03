/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from './components/Header';
import { ClaimDiagnosisForm } from './components/ClaimDiagnosisForm';
import { MedicationChecklist } from './components/MedicationChecklist';
import { ClinicalProfileCard } from './components/ClinicalProfileCard';
import { AuditResultPanel } from './components/AuditResultPanel';
import { NhsoGuidelinesModal } from './components/NhsoGuidelinesModal';
import { NhsoAuditBlueprintModal } from './components/NhsoAuditBlueprintModal';
import { Nhso17ImportModal } from './components/Nhso17ImportModal';
import { Nhso17CaseBrowserModal } from './components/Nhso17CaseBrowserModal';
import { NhsoCodingAdvisorModal } from './components/NhsoCodingAdvisorModal';
import { ClinicalTimelineView } from './components/ClinicalTimelineView';
import { AuditExecutiveDashboard } from './components/AuditExecutiveDashboard';
import { SavedAuditsModal } from './components/SavedAuditsModal';
import { auth, signInWithGoogle, logOut } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  saveAuditRecordToFirebase,
  deleteAuditRecordFromFirebase,
  subscribeToUserAuditRecords,
  SavedAuditRecord,
} from './services/auditStorageService';
import { PRESET_CASES, COMMON_MEDICATIONS, ICD10_DATABASE } from './data/rulesData';
import { NHSO_ICD9_DATABASE, getCaseCodingRecommendations } from './data/nhsoCodingRules';
import { evaluateClaim } from './utils/auditValidator';
import { generateClinicalTimeline } from './utils/clinicalTimelineGenerator';
import {
  AntibioticAdministrationLog,
  DiagnosisEntry,
  MedicationItem,
  ClinicalProfile,
  ProcedureEntry,
  IcdRecommendation,
  AuditResultItem,
  Nhso17FilePatientCase,
  Nhso17ImportResult,
} from './types';
import {
  Check,
  Copy,
  Sparkles,
  FileSpreadsheet,
  Info,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  XCircle,
  UploadCloud,
  FileCode,
  AlertTriangle,
  AlertOctagon,
  Coins,
  Lightbulb,
  Clock,
  BarChart3,
} from 'lucide-react';

function createInitialAntibioticLogs(meds: MedicationItem[]): AntibioticAdministrationLog[] {
  const result: AntibioticAdministrationLog[] = [];
  const antiMeds = meds.filter((m) => m.category === 'iv_antibiotic');
  if (antiMeds.length === 0) return result;

  antiMeds.forEach((m, idx) => {
    const isFirst = idx === 0;
    const lower = m.name.toLowerCase();
    let genericName = 'Ceftriaxone';
    let dosage = m.dosage || '2 g';
    let freq = 'OD (q 24 hr)';
    let source: AntibioticAdministrationLog['suspectedSource'] = 'INTRA_ABDOMINAL';

    if (lower.includes('metro')) {
      genericName = 'Metronidazole';
      dosage = m.dosage || '500 mg';
      freq = 'q 8 hr';
      source = 'INTRA_ABDOMINAL';
    } else if (lower.includes('mero')) {
      genericName = 'Meropenem';
      dosage = m.dosage || '1 g';
      freq = 'q 8 hr';
      source = 'BLOODSTREAM_SEPSIS';
    } else if (lower.includes('piptazo') || lower.includes('piperacillin')) {
      genericName = 'Piperacillin/Tazobactam';
      dosage = m.dosage || '4.5 g';
      freq = 'q 6 hr';
      source = 'BLOODSTREAM_SEPSIS';
    }

    // Day 1
    result.push({
      id: `anti_init_d1_${m.id || idx}`,
      antibioticName: m.name,
      genericName,
      dosage,
      route: 'IV_DRIP',
      frequency: freq,
      dayNumber: 1,
      time: isFirst ? '09:30' : '09:45',
      isHour1Bundle: true,
      bloodCultureSequence: 'BEFORE_ANTIBIOTIC',
      indicationType: 'EMPIRIC_BROAD_SPECTRUM',
      suspectedSource: source,
      status: 'GIVEN',
      notes: isFirst ? 'บริหารเข็มแรกที่ห้องฉุกเฉิน (ER) ภายใน 45 นาทีหลังแรกรับ' : 'บริหารร่วมกันเพื่อคลุมเชื้อ Anaerobe ในช่องท้อง',
    });

    // Day 2
    result.push({
      id: `anti_init_d2_${m.id || idx}`,
      antibioticName: m.name,
      genericName,
      dosage,
      route: 'IV_DRIP',
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

  return result;
}

export default function App() {
  // Start with the user's actual case (Case 1: Denied Shock)
  const defaultPreset = PRESET_CASES[0];

  const [activePresetId, setActivePresetId] = useState<string>(defaultPreset.id);
  const [pdx, setPdx] = useState<string>(defaultPreset.pdx);
  const [secondaryDx, setSecondaryDx] = useState<DiagnosisEntry[]>(defaultPreset.secondaryDx);
  const [medications, setMedications] = useState<MedicationItem[]>(defaultPreset.medications);
  const [clinicalProfile, setClinicalProfile] = useState<ClinicalProfile>(defaultPreset.clinicalProfile);
  const [procedures, setProcedures] = useState<ProcedureEntry[]>(defaultPreset.procedures || []);
  const [antibioticLogs, setAntibioticLogs] = useState<AntibioticAdministrationLog[]>(() =>
    createInitialAntibioticLogs(defaultPreset.medications)
  );

  // Dark Mode Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('app_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('app_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('app_theme', 'light');
    }
  }, [isDarkMode]);

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Modals & 18-file imports
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCaseBrowserOpen, setIsCaseBrowserOpen] = useState(false);
  const [isCodingAdvisorOpen, setIsCodingAdvisorOpen] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'FORM' | 'TIMELINE' | 'DASHBOARD'>('FORM');
  const [importResult, setImportResult] = useState<Nhso17ImportResult | null>(null);
  const [activePatientCase, setActivePatientCase] = useState<Nhso17FilePatientCase | null>(null);

  // Firebase Authentication & Cloud Storage States
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isSavedAuditsOpen, setIsSavedAuditsOpen] = useState<boolean>(false);
  const [savedAuditRecords, setSavedAuditRecords] = useState<SavedAuditRecord[]>([]);
  const [isSavingAudit, setIsSavingAudit] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setSavedAuditRecords([]);
      return;
    }

    const unsubscribe = subscribeToUserAuditRecords(
      currentUser.uid,
      (records) => {
        setSavedAuditRecords(records);
      },
      (err) => {
        console.error('Failed to subscribe to audit records:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedIdxFormat, setCopiedIdxFormat] = useState(false);

  // Recommendations for ICD-10 & ICD-9-CM
  const codingRecommendations = useMemo(() => {
    return getCaseCodingRecommendations(pdx, secondaryDx, medications, clinicalProfile, procedures);
  }, [pdx, secondaryDx, medications, clinicalProfile, procedures]);

  const criticalRecCount = useMemo(() => {
    return codingRecommendations.filter((r) => r.priority === 'CRITICAL').length;
  }, [codingRecommendations]);

  // Evaluate claim reactively
  const auditSummary = useMemo(() => {
    return evaluateClaim(pdx, secondaryDx, medications, clinicalProfile, procedures);
  }, [pdx, secondaryDx, medications, clinicalProfile, procedures]);

  // Clinical timeline and audit gap analysis based on 18-files
  const timelineData = useMemo(() => {
    return generateClinicalTimeline({
      pdx,
      secondaryDx,
      medications,
      clinicalProfile,
      procedures,
      antibioticLogs,
      dateAdm: activePatientCase?.dateAdm,
      timeAdm: activePatientCase?.timeAdm,
      dateDsc: activePatientCase?.dateDsc,
      timeDsc: activePatientCase?.timeDsc,
    });
  }, [pdx, secondaryDx, medications, clinicalProfile, procedures, antibioticLogs, activePatientCase]);

  // Handle Preset Selection
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_CASES.find((p) => p.id === presetId);
    if (!preset) return;

    setActivePresetId(preset.id);
    setActivePatientCase(null);
    setPdx(preset.pdx);
    setSecondaryDx(preset.secondaryDx);
    setMedications(preset.medications);
    setClinicalProfile(preset.clinicalProfile);
    setProcedures(preset.procedures || []);
    setAntibioticLogs(createInitialAntibioticLogs(preset.medications));
  };

  // Handle 17-File Case Selection
  const handleSelectPatientCase = (patientCase: Nhso17FilePatientCase) => {
    setActivePatientCase(patientCase);
    setActivePresetId('');
    setPdx(patientCase.pdx);
    setSecondaryDx(patientCase.secondaryDx);
    setMedications(patientCase.medications);
    setClinicalProfile(patientCase.clinicalProfile);
    setProcedures(patientCase.procedures || []);
    setAntibioticLogs(createInitialAntibioticLogs(patientCase.medications));
  };

  // Handle 17-File Import Success - Reset state completely every time new data is imported
  const handleImportSuccess = (result: Nhso17ImportResult) => {
    // Reset previous states to clean slate
    setActivePresetId('');
    setActivePatientCase(null);
    setPdx('A419');
    setSecondaryDx([]);
    setProcedures([]);
    setMedications(COMMON_MEDICATIONS.map((m) => ({ ...m, isSelected: false })));
    setAntibioticLogs([]);
    setClinicalProfile({
      hemoculture: 'not_sent',
      sirsMetCount: 0,
      mapUnder65: false,
      fluidResuscitationMl: 0,
      hasOrganDysfunction: false,
      clinicalSummary: '',
    });

    setImportResult(result);
    if (result.cases.length > 0) {
      const firstCase = result.cases[0];
      handleSelectPatientCase(firstCase);
      // If batch contains multiple cases, open the case browser so the user can see overview
      if (result.cases.length > 1) {
        setIsCaseBrowserOpen(true);
      }
    }
  };

  // Handle applying codes directly from NHSO Guidelines / Flowchart
  const handleApplyCodesFromGuidelines = (newPdx: string, newSdxList: string[]) => {
    setPdx(newPdx);
    if (newSdxList.length > 0) {
      const addedSdx: DiagnosisEntry[] = newSdxList.map((code, idx) => {
        const info = ICD10_DATABASE[code.toUpperCase()];
        const isShock = code.toUpperCase().startsWith('R57');
        return {
          id: `sdx_guide_${Date.now()}_${idx}`,
          code: code,
          version: '2010',
          descriptionEn: info?.nameEn || code,
          descriptionTh: info?.nameTh || code,
          diagType: isShock ? 'complication' : 'comorbid',
        };
      });

      setSecondaryDx((prev) => {
        const existingCodes = new Set(prev.map((p) => p.code.toUpperCase()));
        const uniqueToAdd = addedSdx.filter((s) => !existingCodes.has(s.code.toUpperCase()));
        return [...prev, ...uniqueToAdd];
      });
    }
  };

  // Reset to clean slate
  const handleReset = () => {
    setActivePresetId('');
    setActivePatientCase(null);
    setPdx('A419');
    setSecondaryDx([]);
    setProcedures([]);
    setMedications(COMMON_MEDICATIONS.map((m) => ({ ...m, isSelected: false })));
    setClinicalProfile({
      hemoculture: 'not_sent',
      sirsMetCount: 0,
      mapUnder65: false,
      fluidResuscitationMl: 0,
      hasOrganDysfunction: false,
      clinicalSummary: '',
    });
  };

  // Apply Coding Advisor Recommendation
  const handleApplyCodingRecommendation = (rec: IcdRecommendation) => {
    if (!rec.actionPayload) return;
    const { actionType, code, diagType, procType } = rec.actionPayload;

    if (actionType === 'SET_PDX') {
      const cleanCode = code.toUpperCase().replace('.', '');
      // If previous PDx was R57.2 or similar shock, shift to secondaryDx as complication
      if (
        pdx.toUpperCase().startsWith('R57') &&
        !secondaryDx.some((s) => s.code.toUpperCase().replace('.', '') === pdx.toUpperCase().replace('.', ''))
      ) {
        const info = ICD10_DATABASE[pdx.toUpperCase().replace('.', '')];
        setSecondaryDx((prev) => [
          ...prev,
          {
            id: `sdx_shifted_${Date.now()}`,
            code: pdx.toUpperCase().replace('.', ''),
            version: '2010',
            descriptionEn: info?.nameEn || pdx,
            descriptionTh: info?.nameTh || pdx,
            diagType: 'complication',
          },
        ]);
      }
      setPdx(cleanCode);
    } else if (actionType === 'ADD_SDX') {
      const cleanCode = code.toUpperCase().replace('.', '');
      const info = ICD10_DATABASE[cleanCode];
      const existsIndex = secondaryDx.findIndex((s) => s.code.toUpperCase().replace('.', '') === cleanCode);
      if (existsIndex >= 0) {
        if (diagType) {
          setSecondaryDx((prev) =>
            prev.map((item, idx) => (idx === existsIndex ? { ...item, diagType } : item))
          );
        }
      } else {
        const newEntry: DiagnosisEntry = {
          id: `sdx_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          code: cleanCode,
          version: '2010',
          descriptionEn: info?.nameEn || rec.nameEn,
          descriptionTh: info?.nameTh || rec.nameTh,
          diagType: diagType || (cleanCode.startsWith('R57') ? 'complication' : 'comorbid'),
        };
        setSecondaryDx((prev) => [...prev, newEntry]);
      }
    } else if (actionType === 'ADD_PROCEDURE') {
      const cleanCode = code.toUpperCase().replace('.', '');
      const procInfo = NHSO_ICD9_DATABASE[cleanCode];
      if (!procedures.some((p) => p.code.toUpperCase().replace('.', '') === cleanCode)) {
        const newProc: ProcedureEntry = {
          id: `proc_rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          code: cleanCode,
          version: '2010',
          descriptionEn: procInfo?.nameEn || rec.nameEn,
          descriptionTh: procInfo?.nameTh || rec.nameTh,
          procType: procType || 'secondary',
          auditRisk: procInfo?.auditRisk || 'NORMAL',
          auditNote: procInfo?.nhsoCondition,
        };
        setProcedures((prev) => [...prev, newProc]);
      }
    }
  };

  // One-click fix for clinical timeline coding gaps
  const handleApplyTimelineFix = (action: {
    actionType: 'SET_PDX' | 'ADD_SDX' | 'CHANGE_TYPE' | 'ADD_PROCEDURE';
    code?: string;
    diagType?: 'comorbid' | 'complication';
    procType?: 'principal' | 'secondary';
  }) => {
    const { actionType, code, diagType, procType } = action;
    if (!code) return;
    const cleanCode = code.toUpperCase().replace('.', '');

    if (actionType === 'SET_PDX') {
      if (['R570', 'R571', 'R572', 'R578', 'R579'].includes(pdx.replace('.', ''))) {
        const info = ICD10_DATABASE[pdx.replace('.', '')];
        setSecondaryDx((prev) => [
          ...prev.filter((s) => s.code.replace('.', '') !== pdx.replace('.', '')),
          {
            id: `sdx_shifted_${Date.now()}`,
            code: pdx.replace('.', ''),
            version: '2010',
            descriptionEn: info?.nameEn || pdx,
            descriptionTh: info?.nameTh || pdx,
            diagType: 'complication',
          },
        ]);
      }
      setPdx(cleanCode);
    } else if (actionType === 'ADD_SDX') {
      const info = ICD10_DATABASE[cleanCode];
      const existsIndex = secondaryDx.findIndex((s) => s.code.toUpperCase().replace('.', '') === cleanCode);
      if (existsIndex >= 0) {
        if (diagType) {
          setSecondaryDx((prev) =>
            prev.map((item, idx) => (idx === existsIndex ? { ...item, diagType } : item))
          );
        }
      } else {
        const newEntry: DiagnosisEntry = {
          id: `sdx_timefix_${Date.now()}`,
          code: cleanCode,
          version: '2010',
          descriptionEn: info?.nameEn || cleanCode,
          descriptionTh: info?.nameTh || cleanCode,
          diagType: diagType || (cleanCode.startsWith('R57') ? 'complication' : 'comorbid'),
        };
        setSecondaryDx((prev) => [...prev, newEntry]);
      }
    } else if (actionType === 'CHANGE_TYPE') {
      setSecondaryDx((prev) =>
        prev.map((s) =>
          s.code.toUpperCase().replace('.', '') === cleanCode
            ? { ...s, diagType: diagType || 'complication' }
            : s
        )
      );
    } else if (actionType === 'ADD_PROCEDURE') {
      const procInfo = NHSO_ICD9_DATABASE[cleanCode];
      if (!procedures.some((p) => p.code.toUpperCase().replace('.', '') === cleanCode)) {
        const newProc: ProcedureEntry = {
          id: `proc_timefix_${Date.now()}`,
          code: cleanCode,
          version: '2010',
          descriptionEn: procInfo?.nameEn || cleanCode,
          descriptionTh: procInfo?.nameTh || cleanCode,
          procType: procType || 'secondary',
          auditRisk: procInfo?.auditRisk || 'NORMAL',
          auditNote: procInfo?.nhsoCondition,
        };
        setProcedures((prev) => [...prev, newProc]);
      }
    }
  };

  // Toggle medication checkbox
  const handleToggleMedication = (id: string) => {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isSelected: !m.isSelected } : m))
    );
  };

  // Add a medication
  const handleAddMedication = (med: MedicationItem) => {
    setMedications((prev) => {
      const existing = prev.find((m) => m.id === med.id);
      if (existing) {
        return prev.map((m) => (m.id === med.id ? { ...m, isSelected: true } : m));
      }
      return [...prev, med];
    });
  };

  // Single Action application
  const handleApplyAction = (action: NonNullable<AuditResultItem['recommendedAction']>) => {
    if (action.actionType === 'CHANGE_TYPE' && action.targetCode) {
      setSecondaryDx((prev) =>
        prev.map((item) => {
          if (item.code.toUpperCase().replace('.', '') === action.targetCode) {
            return {
              ...item,
              diagType: action.newType || item.diagType,
              code: action.newCode || item.code,
            };
          }
          return item;
        })
      );
    } else if (action.actionType === 'REMOVE_CODE' && action.targetCode) {
      setSecondaryDx((prev) =>
        prev.filter((item) => item.code.toUpperCase().replace('.', '') !== action.targetCode)
      );
    } else if (action.actionType === 'REPLACE_PDX' && action.pdx) {
      setPdx(action.pdx);
      if (action.newCode) {
        // also add the old pdx as secondary dx
        const info = ICD10_DATABASE[action.newCode];
        setSecondaryDx((prev) => [
          ...prev,
          {
            id: `sdx_${Date.now()}`,
            code: action.newCode!,
            version: '2010',
            descriptionEn: info ? info.nameEn : 'Secondary condition',
            descriptionTh: info ? info.nameTh : 'โรคร่วม',
            diagType: 'comorbid',
          },
        ]);
      }
    }
  };

  // Fix all issues automatically
  const handleFixAll = () => {
    const hasVasopressor = medications.some((m) => m.isSelected && m.category === 'vasopressor');

    // 1. Fix R572: If no vasopressor, remove it. If has vasopressor, set to complication.
    let updatedSdx = [...secondaryDx];
    if (!hasVasopressor) {
      updatedSdx = updatedSdx.filter((s) => !s.code.toUpperCase().startsWith('R57'));
    } else {
      updatedSdx = updatedSdx.map((s) =>
        s.code.toUpperCase().startsWith('R57') ? { ...s, diagType: 'complication' } : s
      );
    }

    // 2. Fix A099 -> A090
    updatedSdx = updatedSdx.map((s) =>
      s.code.toUpperCase().replace('.', '') === 'A099'
        ? {
            ...s,
            code: 'A090',
            descriptionEn: 'Other and unspecified gastroenteritis of infectious origin',
            descriptionTh: 'ลำไส้อักเสบจากการติดเชื้อ',
          }
        : s
    );

    // 3. Remove banned R650
    updatedSdx = updatedSdx.filter((s) => s.code.toUpperCase().replace('.', '') !== 'R650');

    // 4. Fix PDx if it was shock
    if (pdx.toUpperCase().startsWith('R57')) {
      setPdx('A419');
    }

    // 5. Fix Sepsis in secondary dx: Must be complication, never comorbid!
    updatedSdx = updatedSdx.map((s) => {
      const clean = s.code.toUpperCase().replace('.', '');
      if ((clean.startsWith('A40') || clean.startsWith('A41')) && s.diagType === 'comorbid') {
        return { ...s, diagType: 'complication' };
      }
      return s;
    });

    // 6. Fix R392 -> N179 complication
    updatedSdx = updatedSdx.map((s) => {
      const clean = s.code.toUpperCase().replace('.', '');
      if (clean === 'R392') {
        return {
          ...s,
          code: 'N179',
          descriptionEn: 'Acute kidney failure, unspecified',
          descriptionTh: 'ภาวะไตวายเฉียบพลัน',
          diagType: 'complication',
        };
      }
      return s;
    });

    setSecondaryDx(updatedSdx);

    // Update active patient case in batch if present
    if (activePatientCase && importResult) {
      const updatedCase: Nhso17FilePatientCase = {
        ...activePatientCase,
        pdx: pdx.toUpperCase().startsWith('R57') ? 'A419' : pdx,
        secondaryDx: updatedSdx,
        initialAuditStatus: 'PASS',
      };
      setActivePatientCase(updatedCase);
      setImportResult((prev) =>
        prev
          ? {
              ...prev,
              cases: prev.cases.map((c) => (c.an === updatedCase.an ? updatedCase : c)),
            }
          : null
      );
    }
  };

  // Copy Clean Code Table to Clipboard
  const handleCopyCleanCodes = () => {
    const lines = [
      `=== รหัสโรคพร้อมส่ง e-Claim (ผ่านการตรวจสอบ สปสช.) ===`,
      ...(activePatientCase
        ? [
            `ผู้ป่วย: ${activePatientCase.patientName || '-'} (HN: ${activePatientCase.hn}) | AN: ${activePatientCase.an}`,
            `สิทธิ: ${activePatientCase.insuranceType || 'e-Claim IPD'}`,
            ``,
          ]
        : []),
      `[การวินิจฉัยหลัก - Principal Dx]`,
      `• ${pdx} : ${ICD10_DATABASE[pdx.toUpperCase()]?.nameTh || pdx}`,
      ``,
      `[การวินิจฉัยรอง - Secondary Dx]`,
      ...secondaryDx.map(
        (s, idx) =>
          `• ${idx + 1}. ${s.code} (${
            s.diagType === 'complication' ? 'โรคแทรก / Complication' : 'โรคร่วม / Co-morbid'
          }) - ${s.descriptionTh || s.descriptionEn}`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Copy in standard 17-files IDX.txt format (AN|DIAG|DXTYPE|DRDX)
  const handleCopyIdxFormat = () => {
    const anNumber = activePatientCase ? activePatientCase.an : '67000001';
    const lines = [
      `// รูปแบบแฟ้ม IDX.txt (AN|DIAG|DXTYPE|DRDX)`,
      `${anNumber}|${pdx.toUpperCase().replace('.', '')}|1|`,
      ...secondaryDx.map((s) => {
        const dxType = s.diagType === 'complication' ? '3' : '2';
        return `${anNumber}|${s.code.toUpperCase().replace('.', '')}|${dxType}|${s.doctorLicense || ''}`;
      }),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedIdxFormat(true);
    setTimeout(() => setCopiedIdxFormat(false), 2000);
  };

  // Firebase Handlers
  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      alert(`ไม่สามารถเข้าสู่ระบบด้วย Google ได้: ${err.message || err}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const handleSaveAuditRecord = async () => {
    if (!currentUser) {
      const confirmLogin = confirm(
        'คุณต้องลงชื่อเข้าใช้ด้วยบัญชี Google เพื่อบันทึกผลการตรวจสอบลงฐานข้อมูล Cloud (Firestore) ต้องการเข้าสู่ระบบตอนนี้หรือไม่?'
      );
      if (confirmLogin) {
        handleSignIn();
      }
      return;
    }

    try {
      setIsSavingAudit(true);
      const anNum = activePatientCase?.an || `AN${Date.now().toString().slice(-6)}`;
      const hnNum = activePatientCase?.hn || 'HN-DEMO';
      const patientName = activePatientCase?.patientName || 'ผู้ป่วยตรวจสอบสิทธิ์';
      const cleanPdx = pdx.replace(/\./g, '');
      const recordId = `${anNum}_${cleanPdx}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, '_');

      const primaryIssue =
        auditSummary.results.find((r) => r.severity === 'DENY')?.title ||
        auditSummary.results.find((r) => r.severity === 'WARNING')?.title ||
        'ผ่านเกณฑ์ตรวจสอบ สปสช.';

      const triggeredRuleId =
        auditSummary.results.find((r) => r.errorTag)?.errorTag ||
        (auditSummary.status === 'PASS' ? 'PASS-ALL' : 'CR-CHECK');

      const estimatedClaim =
        activePatientCase?.claimAmount ||
        Math.round((activePatientCase?.adjrw || 2.14) * 8350);

      const atRiskClaim =
        auditSummary.status === 'DENY'
          ? Math.round(estimatedClaim * 0.45)
          : auditSummary.status === 'WARNING'
          ? Math.round(estimatedClaim * 0.15)
          : 0;

      const compCount = secondaryDx.filter((d) => d.diagType === 'complication').length;
      const coCount = secondaryDx.filter((d) => d.diagType === 'comorbid').length;

      await saveAuditRecordToFirebase({
        id: recordId,
        an: anNum,
        hn: hnNum,
        patientName,
        pdx: pdx.toUpperCase(),
        verdict: auditSummary.status,
        ruleId: triggeredRuleId,
        primaryIssue,
        estimatedClaim,
        atRiskClaim,
        secondaryDxCount: secondaryDx.length,
        complicationCount: compCount,
        comorbidCount: coCount,
        auditNotes: `ผลตรวจสอบระบบ AI Pre-Audit: ${auditSummary.status} (ข้อผิดพลาด ${auditSummary.errorCount}, คำเตือน ${auditSummary.warningCount})`,
      });

      alert(`บันทึกผลการตรวจสอบ AN: ${anNum} ลง Cloud Firestore เรียบร้อยแล้ว`);
    } catch (err: any) {
      alert(`เกิดข้อผิดพลาดในการบันทึกลง Cloud: ${err.message || err}`);
    } finally {
      setIsSavingAudit(false);
    }
  };

  const handleLoadSavedRecord = (record: SavedAuditRecord) => {
    setPdx(record.pdx);
    setActivePresetId('');
    setActivePatientCase({
      an: record.an,
      hn: record.hn,
      patientName: record.patientName,
      pdx: record.pdx,
      secondaryDx: secondaryDx,
      medications: medications,
      procedures: procedures,
      clinicalProfile: clinicalProfile,
      adjrw: Math.max(1, +(record.estimatedClaim / 8350).toFixed(4)),
      claimAmount: record.estimatedClaim,
      insuranceType: 'e-Claim IPD (Cloud Loaded)',
      initialAuditStatus: record.verdict,
    });
    setActiveViewMode('FORM');
  };

  const handleDeleteSavedRecord = async (recordId: string) => {
    await deleteAuditRecordFromFirebase(recordId);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-['Sarabun',sans-serif] transition-colors duration-200">
      {/* Top Navbar */}
      <Header
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
        onOpenGuidelines={() => setIsGuidelinesOpen(true)}
        onOpenBlueprint={() => setIsBlueprintOpen(true)}
        onReset={handleReset}
        onOpenImport={() => setIsImportModalOpen(true)}
        importedCasesCount={importResult?.cases.length || 0}
        onOpenCaseBrowser={() => setIsCaseBrowserOpen(true)}
        onOpenCodingAdvisor={() => setIsCodingAdvisorOpen(true)}
        advisorCount={codingRecommendations.length}
        onOpenDashboard={() => setActiveViewMode((prev) => (prev === 'DASHBOARD' ? 'FORM' : 'DASHBOARD'))}
        isDashboardActive={activeViewMode === 'DASHBOARD'}
        onOpenTimeline={() => setActiveViewMode((prev) => (prev === 'TIMELINE' ? 'FORM' : 'TIMELINE'))}
        isTimelineActive={activeViewMode === 'TIMELINE'}
        timelineGapsCount={timelineData.gapsSummary.totalGaps}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
        currentUser={currentUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenSavedAudits={() => setIsSavedAuditsOpen(true)}
        savedAuditsCount={savedAuditRecords.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Banner: Active Imported 18-Files Patient Case */}
        {activePatientCase ? (
          <div className="mb-5 flex flex-col gap-2">
            <div className="p-4 rounded-xl bg-slate-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-3xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                      ข้อมูลจาก 18 แฟ้ม สปสช.
                    </span>
                    <span className="text-xs text-slate-400">
                      แฟ้ม: {importResult?.fileName || '18-Files'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="font-bold text-sm text-white">
                      AN: {activePatientCase.an}
                    </span>
                    <span className="text-slate-300">
                      HN: {activePatientCase.hn}
                    </span>
                    <span className="text-slate-200 font-medium">
                      ผู้ป่วย: {activePatientCase.patientName}
                    </span>
                    {activePatientCase.age && (
                      <span className="text-slate-400">
                        ({activePatientCase.sex || ''} อายุ {activePatientCase.age} ปี)
                      </span>
                    )}
                    {activePatientCase.insuranceType && (
                      <span className="text-3xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                        {activePatientCase.insuranceType}
                      </span>
                    )}
                    {activePatientCase.totalCharge && (
                      <span className="text-3xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        ยอดเบิก {activePatientCase.totalCharge.toLocaleString()} บาท
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {importResult && importResult.cases.length > 1 && (
                  <button
                    type="button"
                    id="btn-switch-imported-patient"
                    onClick={() => setIsCaseBrowserOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>สลับผู้ป่วย ({importResult.cases.length} ราย)</span>
                  </button>
                )}

                <button
                  type="button"
                  id="btn-reimport-17-files"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>นำเข้าแฟ้มใหม่</span>
                </button>
              </div>
            </div>

            {/* Red Alert Banner: CR37 Condition / Medication Mismatch (HIGH CONTRAST DARK MODE) */}
            {activePatientCase.auditAnalysis?.isCr37MedMismatch && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/90 border-2 border-rose-400 dark:border-rose-500 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs dark:shadow-[0_0_18px_rgba(244,63,94,0.3)] animate-in fade-in duration-200">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-600 dark:bg-rose-500 text-white flex items-center justify-center shrink-0 font-extrabold mt-0.5 shadow-2xs ring-2 ring-rose-400/60">
                    <AlertOctagon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-rose-950 dark:text-rose-100">
                        แจ้งเตือนระบบตรวจสอบ (Auto-Audit): เงื่อนไขวินิจฉัยไม่สอดคล้องกับยา (เกณฑ์ CR37)
                      </h3>
                      <span className="text-3xs px-2 py-0.5 rounded-full bg-rose-600 dark:bg-rose-500 text-white font-extrabold shadow-2xs ring-1 ring-rose-300 dark:ring-rose-400">
                        เสี่ยงติด DENY 100%
                      </span>
                    </div>
                    <ul className="mt-1 list-disc list-inside text-xs text-rose-900 dark:text-rose-200 font-medium space-y-0.5">
                      {activePatientCase.auditAnalysis.cr37MismatchReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-auto-fix-cr37-imported"
                  onClick={handleFixAll}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-xs font-extrabold shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ring-1 ring-rose-400/50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>แก้ไขรหัสและยาให้ตรงเกณฑ์ทันที</span>
                </button>
              </div>
            )}

            {/* High-Cost Claim Warning Banner */}
            {activePatientCase.auditAnalysis?.isHighCostClaim && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600 text-amber-950 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold text-xs">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      เฝ้าระวังเคสมูลค่าการเบิกสูงผิดปกติ (High-Cost Claim): ฿{activePatientCase.totalCharge?.toLocaleString()} บาท
                    </span>
                    <p className="text-3xs text-amber-800 dark:text-amber-300">
                      ยอดค่าใช้จ่ายเกินเกณฑ์เฝ้าระวัง ฿50,000 (สปสช. จะนำเวชระเบียนเข้าสู่กระบวนการสุ่มตรวจประเมินเข้มข้น โปรดตรวจสอบบันทึกความก้าวหน้าและการให้ยาอย่างรัดกุม)
                    </p>
                  </div>
                </div>
                <span className="text-3xs px-2.5 py-1 rounded-md bg-amber-700 text-white font-bold shrink-0 text-center">
                  สปสช. Pre-Payment Audit Group
                </span>
              </div>
            )}
          </div>
        ) : activePresetId === 'case_user_shock_deny' ? (
          /* Banner Alert for Default User Case (HIGH CONTRAST DARK MODE CR37) */
          <div className="mb-5 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/90 border-2 border-rose-300 dark:border-rose-500 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs dark:shadow-[0_0_18px_rgba(244,63,94,0.3)]">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-600 dark:bg-rose-500 text-white flex items-center justify-center shrink-0 font-extrabold text-xs mt-0.5 ring-2 ring-rose-400/60 shadow-xs">
                CR37
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-rose-950 dark:text-rose-100">
                  กำลังจำลองเคสของคุณ: ติดเงื่อนไข [CR37#การสรุปกลุ่มอาการ Shock ผิดหลักการ]
                </h2>
                <p className="text-xs text-rose-800 dark:text-rose-200 mt-0.5 font-medium">
                  พบ 2 จุดผิดพลาด: <strong className="text-rose-950 dark:text-white underline decoration-rose-400">1. เลือก R572 เป็นโรคร่วม</strong> และ <strong className="text-rose-950 dark:text-white underline decoration-rose-400">2. ในบิลยาไม่มี "ยากระตุ้นความดัน" (Norepinephrine / Levophed)</strong>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                id="btn-quick-import-18"
                onClick={() => setIsImportModalOpen(true)}
                className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-rose-300 dark:border-rose-600 text-rose-900 dark:text-rose-200 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>นำเข้า 18 แฟ้ม รพ.</span>
              </button>
              <button
                type="button"
                id="btn-quick-fix-user-case"
                onClick={handleFixAll}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ring-1 ring-rose-400/50"
              >
                <Sparkles className="w-4 h-4" />
                <span>คลิกเดียวแก้ไขให้ถูกต้อง</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* View Mode Switcher: Form vs Dashboard vs Clinical Timeline */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              id="tab-view-form"
              onClick={() => setActiveViewMode('FORM')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'FORM'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-slate-200 dark:ring-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>แบบฟอร์มเวชระเบียน & ตรวจเคลม</span>
            </button>

            <button
              type="button"
              id="tab-view-dashboard"
              onClick={() => setActiveViewMode('DASHBOARD')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'DASHBOARD'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Audit Executive Dashboard</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-3xs font-bold ${
                  activeViewMode === 'DASHBOARD'
                    ? 'bg-white text-emerald-700'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
              >
                สถิติ & Financial Risk
              </span>
            </button>

            <button
              type="button"
              id="tab-view-timeline"
              onClick={() => setActiveViewMode('TIMELINE')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'TIMELINE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>ลำดับเวลาคลินิก (Timeline)</span>
              {timelineData.gapsSummary.totalGaps > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-3xs font-bold ${
                    activeViewMode === 'TIMELINE'
                      ? 'bg-white text-blue-700'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {timelineData.gapsSummary.totalGaps} จุดเสี่ยง
                </span>
              )}
            </button>
          </div>

          <div className="text-3xs text-slate-500 dark:text-slate-400 px-3 hidden lg:flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>กราฟสัดส่วน Comorbid vs Complication & ความเสี่ยงทางการเงิน สปสช.</span>
          </div>
        </div>

        {activeViewMode === 'DASHBOARD' ? (
          <AuditExecutiveDashboard
            activePdx={pdx}
            activeSecondaryDx={secondaryDx}
            activeMedications={medications}
            activeClinicalProfile={clinicalProfile}
            activeProcedures={procedures}
            activePatientCase={activePatientCase}
            importedCases={importResult?.cases || []}
            onSelectCase={(selectedCase) => {
              handleSelectPatientCase(selectedCase);
              setActiveViewMode('FORM');
            }}
            onFixAll={handleFixAll}
            onOpenImport={() => setIsImportModalOpen(true)}
            onSwitchToForm={() => setActiveViewMode('FORM')}
            onSwitchToTimeline={() => setActiveViewMode('TIMELINE')}
          />
        ) : activeViewMode === 'TIMELINE' ? (
          <ClinicalTimelineView
            pdx={pdx}
            secondaryDx={secondaryDx}
            medications={medications}
            clinicalProfile={clinicalProfile}
            procedures={procedures}
            antibioticLogs={antibioticLogs}
            onAntibioticLogsChange={setAntibioticLogs}
            onClinicalProfileChange={setClinicalProfile}
            dateAdm={activePatientCase?.dateAdm}
            timeAdm={activePatientCase?.timeAdm}
            dateDsc={activePatientCase?.dateDsc}
            timeDsc={activePatientCase?.timeDsc}
            onApplyCodingFix={handleApplyTimelineFix}
            onAddMedication={handleAddMedication}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left / Center Column: Forms (Diagnoses + Medications + Clinical) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Diagnosis Section */}
            <ClaimDiagnosisForm
              pdx={pdx}
              onPdxChange={setPdx}
              secondaryDx={secondaryDx}
              onSecondaryDxChange={setSecondaryDx}
              procedures={procedures}
              onProceduresChange={setProcedures}
              clinicalProfile={clinicalProfile}
              onOpenAdvisorModal={() => setIsCodingAdvisorOpen(true)}
              recommendationsCount={codingRecommendations.length}
              criticalRecommendationsCount={criticalRecCount}
            />

            {/* 2. Medications Section */}
            <MedicationChecklist
              medications={medications}
              onToggleMedication={handleToggleMedication}
              onAddMedication={handleAddMedication}
            />

            {/* 3. Clinical Profile Section */}
            <ClinicalProfileCard
              clinical={clinicalProfile}
              onChange={setClinicalProfile}
            />
          </div>

          {/* Right Column: Real-time Audit Verdict Panel */}
          <div className="lg:col-span-5 space-y-6">
            <AuditResultPanel
              summary={auditSummary}
              pdx={pdx}
              secondaryDx={secondaryDx}
              procedures={procedures}
              medications={medications}
              clinicalProfile={clinicalProfile}
              activePatientCase={activePatientCase}
              onApplyAction={handleApplyAction}
              onFixAll={handleFixAll}
              onOpenGuidelines={() => setIsGuidelinesOpen(true)}
              onOpenDashboard={() => setActiveViewMode('DASHBOARD')}
              onSaveAuditToFirebase={handleSaveAuditRecord}
              isSavingAudit={isSavingAudit}
            />

            {/* Quick Export / Summary Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    สรุปชุดรหัสโรคที่จะส่งเบิก
                  </h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    id="btn-copy-idx-format"
                    onClick={handleCopyIdxFormat}
                    title="คัดลอกในรูปแบบแฟ้ม IDX.txt (AN|DIAG|DXTYPE|DRDX)"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedIdxFormat ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">คัดลอก IDX แล้ว!</span>
                      </>
                    ) : (
                      <>
                        <FileCode className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>คัดลอกแบบ 18 แฟ้ม</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    id="btn-copy-summary"
                    onClick={handleCopyCleanCodes}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกสรุป</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Table of Final Codes */}
              <div className="space-y-2 text-xs">
                {/* Principal Dx */}
                <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/80 flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-blue-900 dark:text-blue-300 mr-2">{pdx}</span>
                    <span className="text-slate-700 dark:text-slate-300">
                      {ICD10_DATABASE[pdx.toUpperCase()]?.nameTh || 'การวินิจฉัยหลัก'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold text-3xs shadow-2xs">
                    โรคหลัก
                  </span>
                </div>

                {/* Secondary Dx */}
                {secondaryDx.map((s) => (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-lg border flex items-center justify-between ${
                      s.diagType === 'complication'
                        ? 'bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 mr-2">{s.code}</span>
                      <span className="text-slate-600 dark:text-slate-300">{s.descriptionTh || s.descriptionEn}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold text-3xs ${
                        s.diagType === 'complication'
                          ? 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {s.diagType === 'complication' ? 'โรคแทรก' : 'โรคร่วม'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-3xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500 mt-0.5" />
                <span>
                  ตรวจสอบให้แน่ใจว่าบันทึกประเภทโรครองในระบบ HIS / e-Claim ตรงกับตารางนี้ทุกประการ
                </span>
              </div>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* 17 Files Import Modal */}
      <Nhso17ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* 17 Files Case Browser Modal */}
      <Nhso17CaseBrowserModal
        isOpen={isCaseBrowserOpen}
        onClose={() => setIsCaseBrowserOpen(false)}
        importResult={importResult}
        activeAn={activePatientCase?.an || ''}
        onSelectCase={handleSelectPatientCase}
        onSelectCaseAndOpenTimeline={(patientCase) => {
          handleSelectPatientCase(patientCase);
          setActiveViewMode('TIMELINE');
        }}
        onOpenImportModal={() => {
          setIsCaseBrowserOpen(false);
          setIsImportModalOpen(true);
        }}
      />

      {/* Guidelines Modal (47 Conditions + Sepsis Flowchart) */}
      <NhsoGuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
        onApplyCodes={handleApplyCodesFromGuidelines}
        onOpenBlueprint={() => setIsBlueprintOpen(true)}
      />

      {/* Blueprint Modal (ถอดรหัส Audit 47 ข้อ: พิมพ์เขียวป้องกัน Deny Claim สปสช.) */}
      <NhsoAuditBlueprintModal
        isOpen={isBlueprintOpen}
        onClose={() => setIsBlueprintOpen(false)}
        onSelectPreset={handleSelectPreset}
      />

      {/* NHSO ICD-10 & ICD-9-CM Coding Advisor Modal */}
      <NhsoCodingAdvisorModal
        isOpen={isCodingAdvisorOpen}
        onClose={() => setIsCodingAdvisorOpen(false)}
        recommendations={codingRecommendations}
        onApplyRecommendation={handleApplyCodingRecommendation}
        pdx={pdx}
        secondaryDx={secondaryDx}
        medications={medications}
        clinicalProfile={clinicalProfile}
        procedures={procedures}
      />

      {/* Firebase Cloud Saved Audits Modal */}
      <SavedAuditsModal
        isOpen={isSavedAuditsOpen}
        onClose={() => setIsSavedAuditsOpen(false)}
        savedRecords={savedAuditRecords}
        onLoadRecord={handleLoadSavedRecord}
        onDeleteRecord={handleDeleteSavedRecord}
        currentUserId={currentUser?.uid}
        userEmail={currentUser?.email || currentUser?.displayName || ''}
      />
    </div>
  );
}

