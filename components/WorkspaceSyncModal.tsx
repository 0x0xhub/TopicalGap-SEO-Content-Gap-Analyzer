'use client';

import React, { useState } from 'react';
import {
  X,
  FolderPlus,
  FileSpreadsheet,
  FileText,
  CheckSquare,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { FullAnalysisResult, WorkspaceSyncResult } from '../lib/types';
import { syncAnalysisToGoogleWorkspace } from '../lib/google-workspace';

interface WorkspaceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: FullAnalysisResult;
  accessToken: string | null;
  onNeedAuth: () => void;
  lang: 'ar' | 'en';
}

export default function WorkspaceSyncModal({
  isOpen,
  onClose,
  analysis,
  accessToken,
  onNeedAuth,
  lang
}: WorkspaceSyncModalProps) {
  const isAr = lang === 'ar';
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [syncResult, setSyncResult] = useState<WorkspaceSyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartSync = async () => {
    if (!accessToken) {
      onNeedAuth();
      return;
    }

    try {
      setIsSyncing(true);
      setErrorMsg(null);
      const res = await syncAnalysisToGoogleWorkspace(accessToken, analysis, (step) => {
        setCurrentStep(step);
      });
      setSyncResult(res);
    } catch (err: any) {
      console.error('Sync failed:', err);
      setErrorMsg(err?.message || 'Error occurred while syncing with Google Workspace.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isAr ? 'مزامنة التحليل مع Google Drive و Workspace' : 'Sync Analysis with Google Workspace'}
              </h2>
              <p className="text-xs text-slate-500">
                {analysis.projectName}
              </p>
            </div>
          </div>
          {!isSyncing && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="py-5 space-y-4">
          {!syncResult ? (
            <>
              {/* Mandatory explicit user confirmation description */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
                <p className="font-semibold mb-1 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  {isAr ? 'تأكيد إنشاء الملفات والمجلدات في حسابك على Google' : 'Confirm Google Workspace Resource Creation'}
                </p>
                <p className="text-amber-800 leading-relaxed">
                  {isAr
                    ? 'سيقوم النظام بإنشاء مجلد رئيسي باسم "TopicalGap SEO Analysis" على Google Drive الخاص بك، ومجلد فرعي لهذا المشروع، بالإضافة لجدول بيانات Google Sheets ومستند Google Docs وقائمة مهام Google Tasks.'
                    : 'The app will create a root folder named "TopicalGap SEO Analysis" in your Google Drive, a dedicated project subfolder, a Google Spreadsheet with all tables, a Google Doc strategy brief, and a Google Task list.'}
                </p>
              </div>

              {/* Items summary */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <FolderOpen className="w-5 h-5 text-amber-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      {isAr ? 'مجلد المشروع على Google Drive' : 'Google Drive Project Folder'}
                    </span>
                    <span className="text-slate-500">
                      TopicalGap SEO Analysis / {analysis.projectName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      {isAr ? 'جدول بيانات Google Sheets تفصيلي' : 'Google Sheets Matrix'}
                    </span>
                    <span className="text-slate-500">
                      {isAr
                        ? `يتضمن ${analysis.clusters.length} كتلة دلالية، ${analysis.ctrDiagnostics.length} تشخيص CTR، ومخاطر الالتهام.`
                        : `Includes ${analysis.clusters.length} clusters, CTR diagnostics, and cannibalization data.`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      {isAr ? 'تقرير استراتيجي في Google Docs' : 'Google Docs Strategic Brief'}
                    </span>
                    <span className="text-slate-500">
                      {isAr
                        ? 'مخطط المحتوى الجديد، شروط الإثبات (Proof & Promise)، وخطط المكاسب السريعة 90 يوماً.'
                        : 'Actionable briefs with Promise & Proof checklist and 90-day quick wins.'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <CheckSquare className="w-5 h-5 text-purple-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      {isAr ? 'مهام Google Tasks التنفيذية' : 'Google Tasks Action Items'}
                    </span>
                    <span className="text-slate-500">
                      {isAr
                        ? `إنشاء قائمة مهام منفصلة تضم ${analysis.topQuickWins.length + analysis.topNewContentPieces.length} مهمة محددة.`
                        : `Action checklist containing ${analysis.topQuickWins.length + analysis.topNewContentPieces.length} actionable items.`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress or error */}
              {isSyncing && (
                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-indigo-900">{currentStep}</p>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                  {errorMsg}
                </div>
              )}
            </>
          ) : (
            /* Success State */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold text-emerald-900">
                  {isAr ? 'تمت المزامنة بنجاح وحفظ كافة الملفات!' : 'Synced Successfully to Google Workspace!'}
                </h3>
                <p className="text-xs text-emerald-700">
                  {isAr
                    ? 'تم إنشاء المجلد والملفات في حسابك مباشرة، ويمكنك فتحها بالضغط على الروابط أدناه:'
                    : 'Your files are ready in your Google account. Click below to view them directly:'}
                </p>
              </div>

              <div className="space-y-2">
                {syncResult.folderUrl && (
                  <a
                    href={syncResult.folderUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="w-5 h-5 text-amber-600" />
                      <span className="text-xs font-semibold text-slate-800">
                        {isAr ? 'فتح مجلد المشروع في Google Drive' : 'Open Project Folder in Drive'}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </a>
                )}

                {syncResult.spreadsheetUrl && (
                  <a
                    href={syncResult.spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-semibold text-slate-800">
                        {isAr ? 'فتح جدول البيانات في Google Sheets' : 'Open Matrix in Google Sheets'}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </a>
                )}

                {syncResult.documentUrl && (
                  <a
                    href={syncResult.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-800">
                        {isAr ? 'فتح التقرير الاستراتيجي في Google Docs' : 'Open Strategy Brief in Google Docs'}
                      </span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
          {!syncResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSyncing}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleStartSync}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isAr ? 'جارِ التصدير والمزامنة...' : 'Syncing...'}</span>
                  </>
                ) : (
                  <span>{isAr ? 'تأكيد والمزامنة إلى Google Workspace' : 'Confirm & Sync to Workspace'}</span>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors"
            >
              {isAr ? 'إغلاق النافذة' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
