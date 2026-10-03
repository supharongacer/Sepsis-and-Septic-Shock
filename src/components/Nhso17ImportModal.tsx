import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileArchive,
  FileText,
  ClipboardPaste,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  Database,
  Info
} from 'lucide-react';
import {
  parseNhsoZipFile,
  parseNhso17Files,
  getSample17FilesData,
  getUser18FilesSampleResult,
  parseConcatenated18FilesText,
  SAMPLE_USER_18_FILES_RAW_TEXT,
  decodeThaiText,
} from '../utils/nhso17Parser';
import { Nhso17ImportResult } from '../types';

interface Nhso17ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (result: Nhso17ImportResult) => void;
}

export const Nhso17ImportModal: React.FC<Nhso17ImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'zip' | 'individual' | 'paste' | 'sample'>('paste');
  const [pasteMode, setPasteMode] = useState<'allInOne' | 'separate'>('allInOne');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  // All-in-one paste text state
  const [allInOneText, setAllInOneText] = useState(SAMPLE_USER_18_FILES_RAW_TEXT);

  // Paste text state
  const [idxText, setIdxText] = useState('');
  const [druText, setDruText] = useState('');
  const [ipdText, setIpdText] = useState('');
  const [patText, setPatText] = useState('');

  const zipInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle ZIP File Upload
  const handleZipFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('กรุณาเลือกไฟล์บีบอัดนามสกุล .zip (ชุด 18 แฟ้ม e-Claim)');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await parseNhsoZipFile(file);
      if (result.cases.length === 0) {
        setErrorMessage('ไม่พบข้อมูลการวินิจฉัย (IDX.txt) หรือข้อมูลผู้ป่วยในไฟล์ ZIP นี้ กรุณาตรวจสอบว่ามีไฟล์ IDX.txt อยู่ในแฟ้ม');
        setIsProcessing(false);
        return;
      }
      onImportSuccess(result);
      if (zipInputRef.current) zipInputRef.current.value = '';
      onClose();
    } catch (err) {
      console.error('Error parsing zip:', err);
      setErrorMessage('เกิดข้อผิดพลาดในการเปิดไฟล์ ZIP: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Multiple Individual Text Files (.txt)
  const handleIndividualFiles = async (files: FileList | File[]) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const fileMap = new Map<string, string>();
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const buffer = await f.arrayBuffer();
        const text = decodeThaiText(buffer);
        fileMap.set(f.name, text);
      }

      if (!fileMap.has('IDX.txt') && !fileMap.has('idx.txt')) {
        let hasIdx = false;
        for (const k of fileMap.keys()) {
          if (k.toLowerCase().startsWith('idx')) {
            hasIdx = true;
            break;
          }
        }
        if (!hasIdx) {
          setErrorMessage('ไม่พบแฟ้ม IDX.txt (แฟ้มการวินิจฉัยโรคผู้ป่วยใน) กรุณาเลือกไฟล์ IDX.txt เป็นอย่างน้อย');
          setIsProcessing(false);
          return;
        }
      }

      const result = parseNhso17Files(fileMap, 'Individual_Files_Upload');
      if (result.cases.length === 0) {
        setErrorMessage('ไม่พบข้อมูลผู้ป่วยหรือการวินิจฉัยในไฟล์ที่เลือก');
        setIsProcessing(false);
        return;
      }

      onImportSuccess(result);
      if (multiFileInputRef.current) multiFileInputRef.current.value = '';
      onClose();
    } catch (err) {
      console.error('Error parsing files:', err);
      setErrorMessage('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle All-in-One Paste
  const handleProcessAllInOneText = () => {
    if (!allInOneText.trim()) {
      setErrorMessage('กรุณาวางข้อความจากชุด 16/17/18 แฟ้ม สปสช.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const fileMap = parseConcatenated18FilesText(allInOneText);
      if (fileMap.size === 0) {
        setErrorMessage('ไม่พบส่วนหัวของแฟ้มมาตรฐาน สปสช. (เช่น AN|DIAG|DXTYPE หรือ HCODE|HN|AN|... หรือ HN|AN|...) กรุณาตรวจสอบข้อความที่วาง');
        setIsProcessing(false);
        return;
      }

      const result = parseNhso17Files(fileMap, 'AllInOne_18Files_Paste');
      if (result.cases.length === 0) {
        setErrorMessage('ไม่พบข้อมูลการวินิจฉัยโรค (IDX) ในข้อความที่วาง');
        setIsProcessing(false);
        return;
      }

      onImportSuccess(result);
      onClose();
    } catch (err) {
      setErrorMessage('เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Separate Paste Text
  const handleProcessPastedText = () => {
    if (!idxText.trim()) {
      setErrorMessage('กรุณาวางข้อความจากแฟ้ม IDX.txt อย่างน้อย 1 บรรทัด (เช่น 67012345|A415|1|1234)');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const fileMap = new Map<string, string>();
      fileMap.set('IDX.txt', idxText);
      if (druText.trim()) fileMap.set('DRU.txt', druText);
      if (ipdText.trim()) fileMap.set('IPD.txt', ipdText);
      if (patText.trim()) fileMap.set('PAT.txt', patText);

      const result = parseNhso17Files(fileMap, 'Pasted_Text_Data');
      if (result.cases.length === 0) {
        setErrorMessage('ไม่สามารถแยกข้อมูลการวินิจฉัยจากข้อความที่วางได้ กรุณาตรวจสอบรูปแบบคั่นด้วย pipe (|)');
        setIsProcessing(false);
        return;
      }

      onImportSuccess(result);
      onClose();
    } catch (err) {
      setErrorMessage('เกิดข้อผิดพลาด: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Sample 1-Click Load
  const handleLoadSample = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      const sample = getSample17FilesData();
      onImportSuccess(sample);
      setIsProcessing(false);
      onClose();
    }, 250);
  };

  // Handle Load User 18-Files Case (AN 690017568 - นายสิน เนินทราย)
  const handleLoadUserCase = () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setTimeout(() => {
      const sample = getUser18FilesSampleResult();
      onImportSuccess(sample);
      setIsProcessing(false);
      onClose();
    }, 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                นำเข้าไฟล์ 18 แฟ้ม สปสช. (e-Claim Standard)
              </h2>
              <p className="text-xs text-slate-500">
                อ่านข้อมูลการวินิจฉัย (IDX) และรายการยา (DRU) เข้าสู่ระบบตรวจสอบ AI Pre-Audit อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-2">
          <button
            type="button"
            id="tab-import-zip"
            onClick={() => setActiveTab('zip')}
            className={`flex items-center gap-1.5 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all mr-5 cursor-pointer ${
              activeTab === 'zip'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            <span>ไฟล์ ZIP 18 แฟ้ม</span>
          </button>

          <button
            type="button"
            id="tab-import-individual"
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-1.5 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all mr-5 cursor-pointer ${
              activeTab === 'individual'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>เลือกไฟล์แยก (.txt)</span>
          </button>

          <button
            type="button"
            id="tab-import-paste"
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-1.5 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all mr-5 cursor-pointer ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>วางข้อความ (Copy-Paste)</span>
          </button>

          <button
            type="button"
            id="tab-import-sample"
            onClick={() => setActiveTab('sample')}
            className={`flex items-center gap-1.5 pb-3 pt-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'sample'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>ชุดข้อมูลตัวอย่าง 18 แฟ้ม</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-bold">นำเข้าไม่สำเร็จ</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* TAB 1: ZIP FILE */}
          {activeTab === 'zip' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleZipFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => zipInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/60'
                }`}
              >
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleZipFile(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  ลากไฟล์ .ZIP ของ 18 แฟ้มมาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  รองรับไฟล์ส่งออก e-Claim 18 แฟ้ม จากระบบ รพ. เช่น HOSxP, Jhcis, SSB, HospitalOS (ANSI / TIS-620 / UTF-8)
                </p>
                <span className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-2xs">
                  เลือกไฟล์ .ZIP (18 แฟ้ม)
                </span>
              </div>

              {/* Supported Files Info - 18 Files standard */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-600" />
                  <span>รองรับมาตรฐาน 18 แฟ้ม สปสช. ครบถ้วนทุกหมวด:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-3xs text-slate-600">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700">🏥 ผู้ป่วยใน & ประชากร (5 แฟ้ม):</p>
                    <p>• <strong>PAT</strong> (ประชากร), <strong>IPD</strong> (ผู้ป่วยใน), <strong>INS</strong> (สิทธิการรักษา), <strong>IRF</strong> (ส่งต่อ IPD), <strong>LVD</strong> (ลากลับบ้าน)</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700">🩺 วินิจฉัย & หัตถการ (6 แฟ้ม):</p>
                    <p>• <strong>IDX</strong> (วินิจฉัย IPD), <strong>IOP</strong> (ผ่าตัด/หัตถการ IPD), <strong>OPD</strong>, <strong>ODX</strong>, <strong>OOP</strong>, <strong>ORF</strong></p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700">💊 ยา & ห้องปฏิบัติการ (3 แฟ้ม):</p>
                    <p>• <strong>DRU</strong> (ยา/เวชภัณฑ์), <strong>LABFU / LBF</strong> (ผลแล็บ), <strong>ADP</strong> (ค่าบริการ/หัตถการเพิ่ม)</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-700">💰 การเงิน & เรียกเก็บ (4 แฟ้ม):</p>
                    <p>• <strong>CHA</strong> (ค่าใช้จ่ายหมวด), <strong>CHT</strong> (ยอดรวมเรียกเก็บ), <strong>CHR</strong> (รายการเรียกเก็บ), <strong>AER</strong> (อุบัติเหตุฉุกเฉิน)</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INDIVIDUAL FILES */}
          {activeTab === 'individual' && (
            <div className="space-y-4">
              <div
                onClick={() => multiFileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-slate-50/60 rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center"
              >
                <input
                  ref={multiFileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleIndividualFiles(e.target.files);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  คลิกเพื่อเลือกไฟล์ข้อความ (.txt) แยกเป็นรายแฟ้มจากชุด 18 แฟ้ม
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  สามารถเลือกพร้อมกันหลายไฟล์ได้ (อย่างน้อยต้องมี <strong>IDX.txt</strong> และ <strong>DRU.txt</strong>)
                </p>
                <span className="mt-4 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-2xs">
                  เลือกไฟล์ .TXT
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => setPasteMode('allInOne')}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                    pasteMode === 'allInOne'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ✨ วางข้อความรวม 18 แฟ้ม (All-in-One)
                </button>
                <button
                  type="button"
                  onClick={() => setPasteMode('separate')}
                  className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer ${
                    pasteMode === 'separate'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  วางแยกรายแฟ้ม (IDX, DRU)
                </button>
              </div>

              {pasteMode === 'allInOne' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700">
                      วางข้อความรวม 18 แฟ้ม สปสช. (เช่น มี ADP, AER, CHA, CHT, DRU, IDX, IPD, PAT, CHR ฯลฯ)
                    </label>
                    <button
                      type="button"
                      onClick={() => setAllInOneText(SAMPLE_USER_18_FILES_RAW_TEXT)}
                      className="text-emerald-600 hover:text-emerald-700 font-semibold underline text-3xs cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      ใส่ตัวอย่าง 18 แฟ้ม เคส AN 690017568
                    </button>
                  </div>

                  <textarea
                    value={allInOneText}
                    onChange={(e) => setAllInOneText(e.target.value)}
                    placeholder={`วางข้อความจาก 18 แฟ้ม สปสช. ที่คั่นด้วย pipe (|) เช่น:\n\nHN|AN|DATEOPD|TYPE|CODE|QTY|RATE...\n000637440|690017568|20260719|15|30101|2|90.00...\n\nHCODE|HN|AN|CLINIC|PERSON_ID|DATE_SERV|DID|DIDNAME...\n10703|000637440|690017568|01|...|Noradrenaline inj...\n\nAN|DIAG|DXTYPE|DRDX\n690017568|A415|1|ว25870...`}
                    rows={8}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                  />

                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-3xs flex items-center justify-between">
                    <span>💡 ระบบจะแยกแฟ้มอัตโนมัติตาม Header มาตรฐาน สปสช. เช่น IDX, DRU, IPD, PAT, CHT</span>
                    <button
                      type="button"
                      onClick={handleLoadUserCase}
                      className="px-2 py-1 rounded bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors cursor-pointer"
                    >
                      โหลดเคส AN 690017568 ทันที
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessAllInOneText}
                    disabled={!allInOneText.trim() || isProcessing}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>ประมวลผลข้อความ 18 แฟ้ม และตรวจสอบ Auto-Audit</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      1. เนื้อหาจากแฟ้ม IDX.txt (การวินิจฉัยโรคผู้ป่วยใน) <span className="text-rose-500">*จำเป็น</span>
                    </label>
                    <textarea
                      value={idxText}
                      onChange={(e) => setIdxText(e.target.value)}
                      placeholder={`ตัวอย่าง:\n67012345|A415|1|14890\n67012345|R572|2|14890\n67012345|N390|2|14890`}
                      rows={4}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      2. เนื้อหาจากแฟ้ม DRU.txt (รายการยา)
                    </label>
                    <textarea
                      value={druText}
                      onChange={(e) => setDruText(e.target.value)}
                      placeholder={`ตัวอย่าง:\n10670|005421|67012345|01|1409900112233|20240901|1001|Ceftriaxone 1g inj|6|45.00|30.00|1001|VIAL\n10670|005421|67012345|01|1409900112233|20240901|2001|0.9% NSS 1,000 ml|2|35.00|22.00|2001|BOTTLE`}
                      rows={4}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessPastedText}
                    disabled={!idxText.trim() || isProcessing}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>ประมวลผลข้อความที่วาง</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAMPLE DATASET */}
          {activeTab === 'sample' && (
            <div className="space-y-4">
              {/* Featured Case from User: AN 690017568 */}
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-3xs">
                      เคสตัวอย่าง 18 แฟ้ม สปสช.
                    </span>
                    <span className="font-bold text-amber-950 text-xs">
                      AN: 690017568 (นายสิน เนินทราย, 72 ปี)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadUserCase}
                    disabled={isProcessing}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>นำเข้าเคสนี้ทันที (1-Click)</span>
                  </button>
                </div>
                <p className="text-xs text-amber-900 mt-1.5">
                  โรคหลัก <strong>A41.5</strong> (Gram-negative sepsis) + ได้รับ <strong>Noradrenaline 4mg/4ml (Levophed) 2 แอมป์</strong> แต่ <strong>ไม่มีรหัส R57.2 Septic shock</strong> ในแฟ้ม IDX
                </p>
                <div className="mt-2 flex items-center gap-2 text-3xs text-amber-800 font-medium">
                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">ตรวจจับ CR37: Under-coding / ข้อมูลยาขัดแย้ง</span>
                  <span>• สารน้ำ Acetate Ringer 3,000 ml</span>
                  <span>• CefTRIAXone + MetroNIDAZOLE</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>ชุดข้อมูลจำลองมาตรฐาน 18 แฟ้ม สปสช. (6 เคสครอบคลุมทุกมิติ Audit)</span>
                </div>
                <p className="text-emerald-800">
                  หากต้องการทดสอบหลายเคสพร้อมกัน สามารถโหลดชุด 6 เคสเพื่อทดสอบการคัดกรอง <strong>CR37, High-Cost Claim, และรหัสต้องห้าม</strong>:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl border border-rose-300 bg-rose-50/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-950">1. AN: 67012345 (นายสมศักดิ์ รักษาดี)</span>
                    <p className="text-3xs text-rose-800 mt-0.5">
                      โรคหลัก A41.5 + R57.2 (โรคร่วม) + ✕ ไม่พบ Vasopressor ใน DRU | ยอดเบิก ฿145,000 (สูงผิดปกติ)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-3xs">
                    🚨 ผิด CR37 + ยอดสูง
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-rose-300 bg-rose-50/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-rose-950">2. AN: 67012349 (นายชาญชัย วงศ์สว่าง)</span>
                    <p className="text-3xs text-rose-800 mt-0.5">
                      ใส่ R57.2 เป็นโรคหลัก (PDX) ผิดระเบียบ สปสช. + ✕ ไม่พบยาปฏิชีวนะและ Vasopressor
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-3xs">
                    🚨 ผิด CR37 (PDX)
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-amber-950">3. AN: 67012350 (นางวิไลวรรณ ธนะปรีชา)</span>
                    <p className="text-3xs text-amber-800 mt-0.5">
                      Sepsis A41.0 + R57.2 (โรคแทรก) + Norepinephrine + Meropenem | ยอดเบิก ฿185,000 (High-Cost Claim)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-3xs">
                    💰 ยอดเบิกสูง ฿185k
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">4. AN: 67012346 (นางสมศรี มีสุข)</span>
                    <p className="text-3xs text-slate-500 mt-0.5">
                      โรคหลัก A41.9 + R57.2 (โรคแทรก) + มี Norepinephrine 4mg/4ml (เคสผ่านเกณฑ์ 100%)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-3xs">
                    ผ่านเกณฑ์ PASS
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">5. AN: 67012347 (นายบุญมี เจริญสุข)</span>
                    <p className="text-3xs text-slate-500 mt-0.5">
                      โรคหลัก N39.0 + ใส่รหัสต้องห้าม R65.0 SIRS (เคสติด DENY [CR1])
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-3xs">
                    ติด CR1
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800">6. AN: 67012348 (นางอำไพ สดใส)</span>
                    <p className="text-3xs text-slate-500 mt-0.5">
                      โรคหลัก A09.0 + R57.1 (โรคแทรก) + สารน้ำ Acetar 3,000 ml (Hypovolemic shock ถูกต้อง)
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 font-bold text-3xs">
                    ผ่านเกณฑ์ PASS
                  </span>
                </div>
              </div>

              <button
                type="button"
                id="btn-load-sample-18-files"
                onClick={handleLoadSample}
                disabled={isProcessing}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>โหลดชุดข้อมูลตัวอย่าง 18 แฟ้ม ทั้ง 6 เคส</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>ระบบประมวลผลบนเครื่องของคุณอย่างปลอดภัย ไม่มีการส่งข้อมูลส่วนบุคคลออกภายนอก</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 font-medium text-slate-700 cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
};
