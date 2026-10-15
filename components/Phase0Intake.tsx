'use client';

import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Building,
  HelpCircle,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  Globe,
  Smartphone,
  Eye,
  LineChart,
  Filter,
  Check,
  FolderArchive
} from 'lucide-react';
import JSZip from 'jszip';
import { parseSitemapXml } from '../lib/sitemap-parser';
import {
  RawQueryRow,
  RawPageRow,
  SiteProfile,
  Phase0Answers,
  GscExportBundle
} from '../lib/types';
import { detectAndValidateCsv, classifySiteArchitecture, parseGscBundle } from '../lib/seo-engine';
import {
  ARABIC_SAMPLE_QUERIES,
  ARABIC_SAMPLE_PAGES,
  ARABIC_SAMPLE_ANSWERS,
  ENGLISH_SAMPLE_QUERIES,
  ENGLISH_SAMPLE_PAGES,
  ENGLISH_SAMPLE_ANSWERS
} from '../lib/sample-data';

interface Phase0IntakeProps {
  lang: 'ar' | 'en';
  onRunPhase1: (
    queries: RawQueryRow[],
    pages: RawPageRow[],
    profile: SiteProfile,
    answers: Phase0Answers,
    companionBundle?: Partial<GscExportBundle>
  ) => void;
}

export default function Phase0Intake({ lang, onRunPhase1 }: Phase0IntakeProps) {
  const isAr = lang === 'ar';

  const [bundle, setBundle] = useState<GscExportBundle>({
    queries: [],
    pages: [],
    detectedFilesCount: 0,
    fileNames: []
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [siteProfile, setSiteProfile] = useState<SiteProfile | null>(null);

  // Phase 0 questions state
  const [answers, setAnswers] = useState<Phase0Answers>({
    q0_profileCorrection: '',
    q1_brandTerms: [],
    q2_confirmedServicesAndCities: '',
    q3_businessModel: '',
    q4_knownFacts: '',
    q5_extraExportsNotes: '',
    q6_scopeExclusions: [],
    q7_hasSitemapOrCrawl: false
  });

  const [brandTermsText, setBrandTermsText] = useState('');
  const [exclusionsText, setExclusionsText] = useState('');

  // Universal File Processor (supports CSV files and ZIP bundles from GSC)
  const processFiles = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    setValidationErrors([]);
    const parsedFiles: { name: string; data: Record<string, unknown>[] }[] = [];

    const readAndParseCsv = (content: string, name: string): { name: string; data: Record<string, unknown>[] } => {
      const results = Papa.parse(content, { header: true, skipEmptyLines: true });
      return { name, data: results.data as Record<string, unknown>[] };
    };

    const readFileAsText = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file, 'utf-8');
      });
    };

    try {
      const filesArray = Array.from(fileList);

      for (const file of filesArray) {
        const lowerName = file.name.toLowerCase();
        const isZip = lowerName.endsWith('.zip') || file.type.includes('zip');
        const isXml = lowerName.endsWith('.xml') || lowerName.endsWith('.xml.gz') || file.type.includes('xml');

        if (isXml) {
          await processSitemapFile(file);
          continue;
        }

        if (isZip) {
          try {
            const zip = await JSZip.loadAsync(file);
            const entries = Object.keys(zip.files);
            for (const filename of entries) {
              const zipEntry = zip.files[filename];
              if (!zipEntry.dir) {
                if (filename.toLowerCase().endsWith('.csv')) {
                  const text = await zipEntry.async('string');
                  const cleanName = filename.split('/').pop() || filename;
                  parsedFiles.push(readAndParseCsv(text, cleanName));
                } else if (filename.toLowerCase().endsWith('.xml')) {
                  const text = await zipEntry.async('string');
                  const fakeFile = new File([text], filename, { type: 'text/xml' });
                  await processSitemapFile(fakeFile);
                }
              }
            }
          } catch (zipErr: any) {
            setValidationErrors(prev => [...prev, `فشل فك ضغط ملف ZIP: ${zipErr.message}`]);
          }
        } else {
          // Regular CSV file
          const text = await readFileAsText(file);
          parsedFiles.push(readAndParseCsv(text, file.name));
        }
      }

      if (parsedFiles.length === 0) {
        setValidationErrors([isAr ? 'لم يتم العثور على أي ملفات CSV صالحة للتحليل.' : 'No valid CSV files found in upload.']);
        return;
      }

      const newBundle = parseGscBundle(parsedFiles);

      // Merge with state
      setBundle(prev => {
        const merged: GscExportBundle = {
          queries: newBundle.queries.length > 0 ? newBundle.queries : prev.queries,
          pages: newBundle.pages.length > 0 ? newBundle.pages : prev.pages,
          countries: newBundle.countries || prev.countries,
          devices: newBundle.devices || prev.devices,
          searchAppearance: newBundle.searchAppearance || prev.searchAppearance,
          filters: newBundle.filters || prev.filters,
          dateRange: newBundle.dateRange || prev.dateRange,
          trendChart: newBundle.trendChart || prev.trendChart,
          detectedFilesCount: (newBundle.queries.length > 0 ? 1 : 0) +
            (newBundle.pages.length > 0 ? 1 : 0) +
            (newBundle.countries ? 1 : 0) +
            (newBundle.devices ? 1 : 0) +
            (newBundle.searchAppearance ? 1 : 0) +
            (newBundle.filters ? 1 : 0) +
            (newBundle.trendChart ? 1 : 0),
          fileNames: Array.from(new Set([...prev.fileNames, ...newBundle.fileNames]))
        };

        if (merged.pages.length > 0) {
          const profile = classifySiteArchitecture(merged.pages);
          setSiteProfile(profile);
        }

        return merged;
      });

      if (newBundle.queries.length === 0 && newBundle.pages.length === 0 && parsedFiles.length > 0) {
        setValidationErrors([
          isAr
            ? 'تم التعرف على بعض الملفات المساعدة ولكن لم يتم العثور على ملفات "طلبات البحث" أو "الصفحات". يرجى التأكد من رفع ملفي طلبات البحث والصفحات.'
            : 'Some companion files were detected, but Queries or Pages file is missing. Please ensure you upload Queries and Pages.'
        ]);
      }
    } catch (err: any) {
      setValidationErrors([`File read error: ${err.message}`]);
    }
  };

  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      await processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  // Direct import of workspace uploaded files
  const handleLoadWorkspaceFiles = async () => {
    setIsLoadingWorkspace(true);
    setValidationErrors([]);
    try {
      const res = await fetch('/api/load-workspace-gsc');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load workspace files');

      const loadedBundle = data.bundle as GscExportBundle;
      setBundle(loadedBundle);

      if (loadedBundle.pages.length > 0) {
        const profile = classifySiteArchitecture(loadedBundle.pages);
        setSiteProfile(profile);
      }
    } catch (err: any) {
      setValidationErrors([`تعذر استيراد الملفات: ${err.message}`]);
    } finally {
      setIsLoadingWorkspace(false);
    }
  };

  // Sitemap XML processor
  const processSitemapFile = async (file: File) => {
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file, 'utf-8');
      });

      const parsedSitemap = parseSitemapXml(text, file.name);
      setBundle(prev => ({
        ...prev,
        sitemap: parsedSitemap,
        detectedFilesCount: prev.detectedFilesCount + 1,
        fileNames: Array.from(new Set([...prev.fileNames, file.name]))
      }));
      setAnswers(prev => ({ ...prev, q7_hasSitemapOrCrawl: true }));
    } catch (err: any) {
      setValidationErrors(prev => [...prev, `فشل قراءة خريطة الموقع XML: ${err.message}`]);
    }
  };

  // Load sample dataset
  const handleLoadSample = (sampleType: 'arabic' | 'english') => {
    if (sampleType === 'arabic') {
      const bundleData: GscExportBundle = {
        queries: ARABIC_SAMPLE_QUERIES,
        pages: ARABIC_SAMPLE_PAGES,
        dateRange: { startDate: '2024-07-15', endDate: '2024-10-15' },
        devices: [
          { name: 'الجوال (Mobile)', clicks: 3200, impressions: 72000, ctr: 0.044, position: 4.8 },
          { name: 'أجهزة الكمبيوتر (Desktop)', clicks: 950, impressions: 18000, ctr: 0.052, position: 3.9 }
        ],
        countries: [
          { name: 'المملكة العربية السعودية (SA)', clicks: 3950, impressions: 85000, ctr: 0.046, position: 4.5 }
        ],
        detectedFilesCount: 7,
        fileNames: ['طلبات البحث.csv', 'الصفحات.csv', 'الفلاتر.csv', 'الأجهزة.csv', 'البلدان.csv', 'شكل الظهور.csv', 'رسم بياني.csv']
      };
      setBundle(bundleData);
      const profile = classifySiteArchitecture(ARABIC_SAMPLE_PAGES);
      setSiteProfile(profile);
      setAnswers(ARABIC_SAMPLE_ANSWERS);
      setBrandTermsText(ARABIC_SAMPLE_ANSWERS.q1_brandTerms.join(', '));
      setExclusionsText((ARABIC_SAMPLE_ANSWERS.q6_scopeExclusions || []).join(', '));
    } else {
      const bundleData: GscExportBundle = {
        queries: ENGLISH_SAMPLE_QUERIES,
        pages: ENGLISH_SAMPLE_PAGES,
        dateRange: { startDate: '2024-07-01', endDate: '2024-09-30' },
        devices: [
          { name: 'Desktop', clicks: 2100, impressions: 45000, ctr: 0.046, position: 4.2 },
          { name: 'Mobile', clicks: 750, impressions: 18000, ctr: 0.041, position: 5.1 }
        ],
        countries: [
          { name: 'United States', clicks: 1800, impressions: 38000, ctr: 0.047, position: 4.1 },
          { name: 'United Kingdom', clicks: 650, impressions: 14000, ctr: 0.046, position: 4.6 }
        ],
        detectedFilesCount: 4,
        fileNames: ['Queries.csv', 'Pages.csv', 'Countries.csv', 'Devices.csv']
      };
      setBundle(bundleData);
      const profile = classifySiteArchitecture(ENGLISH_SAMPLE_PAGES);
      setSiteProfile(profile);
      setAnswers(ENGLISH_SAMPLE_ANSWERS);
      setBrandTermsText(ENGLISH_SAMPLE_ANSWERS.q1_brandTerms.join(', '));
      setExclusionsText((ENGLISH_SAMPLE_ANSWERS.q6_scopeExclusions || []).join(', '));
    }
    setValidationErrors([]);
  };

  const handleRun = (useDefaults: boolean = false) => {
    if (bundle.queries.length === 0 || bundle.pages.length === 0 || !siteProfile) {
      setValidationErrors([
        isAr ? 'يرجى تحميل ملفي طلبات البحث والصفحات أولاً، أو اختيار نموذج جاهز للمعاينة الفورية.' : 'Please upload both Queries and Pages files first, or select a demo dataset.'
      ]);
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    const brandArray = brandTermsText.split(',').map(s => s.trim()).filter(Boolean);
    const exclusionArray = exclusionsText.split(',').map(s => s.trim()).filter(Boolean);

    const finalAnswers: Phase0Answers = useDefaults ? {
      q1_brandTerms: [],
      q2_confirmedServicesAndCities: undefined,
      q3_businessModel: undefined,
      q4_knownFacts: undefined,
      q5_extraExportsNotes: undefined,
      q6_scopeExclusions: [],
      q7_hasSitemapOrCrawl: false
    } : {
      ...answers,
      q1_brandTerms: brandArray,
      q6_scopeExclusions: exclusionArray
    };

    const finalProfile: SiteProfile = {
      ...siteProfile,
      isConfirmed: !useDefaults
    };

    onRunPhase1(bundle.queries, bundle.pages, finalProfile, finalAnswers, bundle);
  };

  const hasQueries = bundle.queries.length > 0;
  const hasPages = bundle.pages.length > 0;

  return (
    <div className="space-y-8" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Intro Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAr ? 'المرحلة 0: التحقق، التصنيف، ومعمارية Koray الدلالية' : 'Phase 0: Validation, Intake & Koray Semantic Engine'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">
            {isAr
              ? 'تحليل فجوات المحتوى ومعمارية Koray الدلالية (Search Console)'
              : 'Topical Content Gap & Koray Semantic SEO Framework'}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">
            {isAr
              ? 'ارفع ملفات تصدير Search Console دفعة واحدة (يدعم الملفات السبعة العربية بالكامل: طلبات البحث، الصفحات، البلدان، الأجهزة، الفلاتر). يقوم النظام بفحص أصالة المحتوى وتمايز المدن وفق منهجية Koray Tuğberk Gübür لمنع الصفحات المكررة وتوليد وعود محتوى قابلة للفهرسة.'
              : 'Upload your Google Search Console export files (supports all 7 Arabic/English CSV exports simultaneously). The engine applies Koray Tuğberk Gübür semantic principles, auditing local differentiation and OriginalContentScore.'}
          </p>

          {/* Quick Demo Preloads */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400 font-medium">
              {isAr ? 'أو جرب بيانات واقعية فورية بنقرة واحدة:' : 'Or load instant demo data:'}
            </span>
            <button
              onClick={() => handleLoadSample('arabic')}
              className="px-3 py-1.5 bg-indigo-600/60 hover:bg-indigo-600 border border-indigo-400/30 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105"
            >
              🇸🇦 {isAr ? 'شركة خدمات وصيانة (الرياض وجدة)' : 'Saudi Services Demo'}
            </button>
            <button
              onClick={() => handleLoadSample('english')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-all hover:scale-105"
            >
              🌍 {isAr ? 'شركة برمجيات B2B SaaS' : 'B2B SaaS Agency Demo'}
            </button>
          </div>
        </div>
      </div>

      {/* 0.1 Universal Multi-File Upload Zone */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 mb-4 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <span>0.1 {isAr ? 'رفع ملفات Search Console السبعة (يدعم السحب المتعدد)' : 'Upload Search Console Exports (Multi-File Ingestion)'}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAr
                ? 'يمكنك تحديد أو سحب ملفات Search Console السبعة معاً دفعة واحدة. يتعرف المحرك الذكي على كل ملف تلقائياً.'
                : 'Drag and drop all 7 GSC CSV files simultaneously. The engine automatically classifies and links each dataset.'}
            </p>
          </div>

          {bundle.dateRange?.startDate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
              <Calendar className="w-4 h-4" />
              <span>{bundle.dateRange.startDate} ➔ {bundle.dateRange.endDate}</span>
            </div>
          )}
        </div>

        {/* Big Drag-and-Drop Dropzone with ZIP support */}
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`block p-6 sm:p-8 border-2 border-dashed rounded-2xl cursor-pointer text-center transition-all mb-4 ${
            isDragging
              ? 'border-indigo-600 bg-indigo-100/50 scale-[1.01]'
              : 'border-indigo-300 hover:border-indigo-500 bg-indigo-50/20 hover:bg-indigo-50/40'
          }`}
        >
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Upload className={`w-6 h-6 transition-transform ${isDragging ? 'scale-125' : ''}`} />
            </div>
          </div>
          <span className="text-sm font-bold text-slate-900 block mb-1">
            {isAr
              ? 'اضغط هنا أو اسحب وأفلت ملفات CSV أو ملف ZIP الخاص بـ Search Console'
              : 'Click to select or drag & drop GSC CSV files or ZIP bundle'}
          </span>
          <span className="text-xs text-slate-500 block max-w-lg mx-auto leading-relaxed">
            {isAr
              ? 'يدعم: طلبات البحث.csv، الصفحات.csv، الفلاتر.csv، الأجهزة.csv، البلدان.csv، شكل الظهور.csv، رسم بياني.csv، أو ملف ZIP من Search Console مباشرة'
              : 'Supports all 7 GSC exports: Queries, Pages, Filters, Devices, Countries, Appearance, Trends Chart, or ZIP'}
          </span>
          <input
            type="file"
            accept=".csv,.zip,application/zip,application/x-zip-compressed"
            multiple
            onChange={handleMultipleFilesUpload}
            className="hidden"
          />
        </label>

        {/* Quick action: Load currently uploaded workspace files */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <FolderArchive className="w-4 h-4 text-indigo-600" />
            <span>
              {isAr
                ? 'هل تريد تجربة الملفات السبعة المحملة في المشروع مباشرة؟'
                : 'Want to test with the project\'s existing 7 uploaded GSC files?'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLoadWorkspaceFiles}
            disabled={isLoadingWorkspace}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isLoadingWorkspace ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{isAr ? 'جارِ التحميل...' : 'Loading...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isAr
                    ? 'استيراد الملفات السبعة المرفوعة (812 استعلام · 822 صفحة)'
                    : 'Import the 7 uploaded files (812 queries · 822 pages)'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* 7-Files Status Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* File 1: Queries */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            hasQueries ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {isAr ? 'طلبات البحث' : 'Queries'}
              </span>
              {hasQueries ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <span className="text-[10px] text-rose-500 font-bold">* مطلوب</span>}
            </div>
            <p className="text-[11px] truncate">
              {hasQueries ? `${bundle.queries.length.toLocaleString()} ${isAr ? 'استعلام' : 'rows'}` : (isAr ? 'غير مرفوع' : 'Pending')}
            </p>
          </div>

          {/* File 2: Pages */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            hasPages ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" />
                {isAr ? 'الصفحات' : 'Pages'}
              </span>
              {hasPages ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <span className="text-[10px] text-rose-500 font-bold">* مطلوب</span>}
            </div>
            <p className="text-[11px] truncate">
              {hasPages ? `${bundle.pages.length.toLocaleString()} ${isAr ? 'صفحة' : 'pages'}` : (isAr ? 'غير مرفوع' : 'Pending')}
            </p>
          </div>

          {/* File 3: Filters & Dates */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            bundle.filters ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                {isAr ? 'الفلاتر والتواريخ' : 'Filters / Dates'}
              </span>
              {bundle.filters && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] truncate">
              {bundle.dateRange?.startDate ? `${bundle.dateRange.startDate} ...` : (isAr ? 'اختياري' : 'Optional')}
            </p>
          </div>

          {/* File 4: Countries */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            bundle.countries ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                {isAr ? 'البلدان' : 'Countries'}
              </span>
              {bundle.countries && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] truncate">
              {bundle.countries ? `${bundle.countries.length} ${isAr ? 'دولة' : 'regions'}` : (isAr ? 'اختياري' : 'Optional')}
            </p>
          </div>

          {/* File 5: Devices */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            bundle.devices ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" />
                {isAr ? 'الأجهزة' : 'Devices'}
              </span>
              {bundle.devices && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] truncate">
              {bundle.devices ? `${bundle.devices.length} ${isAr ? 'أنواع أجهزة' : 'devices'}` : (isAr ? 'اختياري' : 'Optional')}
            </p>
          </div>

          {/* File 6: Appearance */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            bundle.searchAppearance ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {isAr ? 'شكل الظهور' : 'Appearance'}
              </span>
              {bundle.searchAppearance && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] truncate">
              {bundle.searchAppearance ? `${bundle.searchAppearance.length} ${isAr ? 'عناصر' : 'items'}` : (isAr ? 'اختياري' : 'Optional')}
            </p>
          </div>

          {/* File 7: Trends Chart */}
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            bundle.trendChart ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold flex items-center gap-1">
                <LineChart className="w-3.5 h-3.5" />
                {isAr ? 'رسم بياني زمني' : 'Trends Chart'}
              </span>
              {bundle.trendChart && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            </div>
            <p className="text-[11px] truncate">
              {bundle.trendChart ? `${bundle.trendChart.length} ${isAr ? 'نقاط زمنية' : 'points'}` : (isAr ? 'اختياري' : 'Optional')}
            </p>
          </div>
        </div>

        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            {validationErrors.map((err, i) => (
              <p key={i} className="text-xs text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {err}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* 0.2 Inferred Site Profile Card (Labeled Probable) */}
      {siteProfile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              <span>0.2 {isAr ? 'ملف تعريف الموقع المستنتج (Site Profile)' : 'Inferred Site Profile'}</span>
            </h2>
            <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              [Probable] {isAr ? 'محتمل (في انتظار تأكيدك)' : 'Probable until confirmed'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                {isAr ? 'نوع الموقع (Site Type)' : 'Site Type'}
              </span>
              <span className="text-sm font-extrabold text-slate-900 capitalize">
                {siteProfile.siteType}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                {isAr ? 'نموذج المعمارية (Architecture)' : 'Architecture Model'}
              </span>
              <span className="text-sm font-extrabold text-indigo-700 block">
                {siteProfile.architectureModel}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                {isAr ? 'المدن والمناطق المرصودة' : 'Detected Cities'}
              </span>
              <div className="flex flex-wrap gap-1">
                {siteProfile.cities.length > 0 ? (
                  siteProfile.cities.map((c, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                      {c.name} ({c.confidence})
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">{isAr ? 'غير محددة في الروابط' : 'None detected in slugs'}</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                {isAr ? 'الخدمات المرصودة' : 'Detected Services'}
              </span>
              <div className="flex flex-wrap gap-1">
                {siteProfile.services.length > 0 ? (
                  siteProfile.services.slice(0, 4).map((s, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                      {s.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">{isAr ? 'غير محددة' : 'None detected'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Evidence */}
          <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 mb-2">
            <span className="font-bold text-slate-800 block mb-1">
              {isAr ? 'أدلة التصنيف المستنتجة من المسارات:' : 'Evidence for classification:'}
            </span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-600">
              {siteProfile.evidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 0.3 Questions Intake (Structured Q0 to Q7) */}
      {siteProfile && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <span>0.3 {isAr ? 'الأسئلة الاستراتيجية للمرحلة 0 (Intake Questions)' : 'Strategic Intake Questions (Max 7)'}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAr
                  ? 'إجاباتك هنا تعلو وتصحح أي استنتاجات تلقائية من ملفات Search Console.'
                  : 'Your inputs override inferred defaults. You can edit or proceed with defaults.'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Q0 */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Q0. {isAr ? 'تأكيد أو تصحيح ملف تعريف الموقع (Site Profile)' : 'Confirm or correct Site Profile'}
              </label>
              <input
                type="text"
                value={answers.q0_profileCorrection || ''}
                onChange={(e) => setAnswers({ ...answers, q0_profileCorrection: e.target.value })}
                placeholder={isAr ? 'موافق على المعمارية المستنتجة، أو اكتب التعديل هنا...' : 'Confirmed as inferred, or enter override...'}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Q1: Brand Terms */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Q1. {isAr ? 'الكلمات والعلامات التجارية (Brand Terms)' : 'Brand terms (every spelling & transliteration)'}
              </label>
              <input
                type="text"
                value={brandTermsText}
                onChange={(e) => setBrandTermsText(e.target.value)}
                placeholder={isAr ? 'مثال: gc-cleaning, صيانة المستقبل, gc clean' : 'e.g. omnigap, omnigap.io, omni gap'}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Q2: Actual Services and Cities */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Q2. {isAr ? 'الخدمات والمدن الفعلية المقدمة (Services & Cities)' : 'Actual Services and Cities Served'}
              </label>
              <input
                type="text"
                value={answers.q2_confirmedServicesAndCities || ''}
                onChange={(e) => setAnswers({ ...answers, q2_confirmedServicesAndCities: e.target.value })}
                placeholder={isAr ? 'مثال: صيانة غسالات ومكيفات وثلاجات في شرورة وصبيا وأبو عريش وحفر الباطن' : 'e.g. B2B SEO software in US and Global markets'}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Q3: Business Model & Conversion */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Q3. {isAr ? 'نموذج العمل وإجراء التحويل الأساسي (Business Model & Conversion)' : 'Business Model & Main Conversion Action'}
              </label>
              <input
                type="text"
                value={answers.q3_businessModel || ''}
                onChange={(e) => setAnswers({ ...answers, q3_businessModel: e.target.value })}
                placeholder={isAr ? 'مثال: صيانة منزلية وميدانية، التحويل عبر الاتصال الهاتفي وواتساب الفوري' : 'e.g. SaaS subscription, primary conversion is free trial'}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Q4: Proprietary Facts (Prices, Timelines, Proof) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Q4. {isAr ? 'حقائق حصرية لرفع مؤشر الأصالة (OriginalContentScore) ومنع المحتوى العام' : 'Proprietary Facts for OriginalContentScore Lift'}
              </label>
              <p className="text-[11px] text-slate-500 mb-2">
                {isAr
                  ? 'وفق دراسة Koray Tuğberk Gübür: الأسعار الحقيقية، فترة الضمان، ومواصفات الفحص تحمي صفحاتك من خطر التجاهل وعدم الفهرسة.'
                  : 'Essential to establish genuine information gain and avoid duplicate boilerplate penalty.'}
              </p>
              <textarea
                rows={2}
                value={answers.q4_knownFacts || ''}
                onChange={(e) => setAnswers({ ...answers, q4_knownFacts: e.target.value })}
                placeholder={isAr ? 'مثال: كشف مجاني مع الإصلاح، ضمان 6 أشهر على قطع الغيار الأصلية، فنيين معتمدين، وصول خلال ساعتين...' : 'e.g. Pricing starts at $99/mo, 14-day refund, SOC2 certified...'}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Q6: Scope Exclusions */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Q6. {isAr ? 'استبعادات النطاق (Scope Exclusions)' : 'Scope exclusions'}
              </label>
              <input
                type="text"
                value={exclusionsText}
                onChange={(e) => setExclusionsText(e.target.value)}
                placeholder={isAr ? 'خدمات توقفت عن تقديمها، مفصولة بفواصل' : 'Discontinued services, separated by comma'}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            {/* Q7: Sitemap / Crawl */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <input
                type="checkbox"
                id="sitemapCheck"
                checked={answers.q7_hasSitemapOrCrawl || false}
                onChange={(e) => setAnswers({ ...answers, q7_hasSitemapOrCrawl: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="sitemapCheck" className="cursor-pointer">
                Q7. {isAr ? 'يتوفر خريطة موقع XML أو زحف للموقع (تحليل الروابط سيعتبر Needs-input إذا لم يتوفر)' : 'Crawl export or Sitemap XML available'}
              </label>
            </div>
          </div>

          {/* Action Launch Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => handleRun(true)}
              className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              {isAr ? 'تخطي واستخدام القيم الافتراضية (Run Now with Defaults)' : 'Skip and run now with defaults'}
            </button>

            <button
              onClick={() => handleRun(false)}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <span>{isAr ? 'تأكيد البيانات وبدء تحليل المعمارية (Run Phase 1)' : 'Confirm & Run Phase 1 Analysis'}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
