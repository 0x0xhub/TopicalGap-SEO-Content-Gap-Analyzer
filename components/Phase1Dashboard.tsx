'use client';

import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Download,
  FolderSync,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingDown,
  AlertTriangle,
  HelpCircle,
  Award,
  Zap,
  ShieldAlert,
  FileText,
  Building,
  CheckCircle,
  Eye,
  BarChart3,
  Calendar,
  X,
  Loader2
} from 'lucide-react';
import {
  FullAnalysisResult,
  QueryCluster,
  CTRDiagnosticItem,
  CannibalizationItem,
  QuestionQueryItem,
  TopContentPiece,
  TopQuickWin,
  PriorityLevel,
  FrameType,
  GapType,
  DestinationType
} from '../lib/types.ts';

interface Phase1DashboardProps {
  analysis: FullAnalysisResult;
  lang: 'ar' | 'en';
  onOpenSyncModal: () => void;
  onResetToPhase0: () => void;
  userApiKey: string;
  selectedModel: string;
  useThinking: boolean;
}

export default function Phase1Dashboard({
  analysis,
  lang,
  onOpenSyncModal,
  onResetToPhase0,
  userApiKey,
  selectedModel,
  useThinking
}: Phase1DashboardProps) {
  const isAr = lang === 'ar';

  const [activeTab, setActiveTab] = useState<
    'clusters' | 'ctr' | 'cannibalization' | 'questions' | 'newPieces' | 'quickWins' | 'audit' | 'profile' | 'queue' | 'limits'
  >('clusters');

  // Search and filters for Clusters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedGapType, setSelectedGapType] = useState<string>('all');
  const [selectedFrame, setSelectedFrame] = useState<string>('all');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');

  // Active cluster modal for drill-down
  const [activeClusterModal, setActiveClusterModal] = useState<QueryCluster | null>(null);

  // AI Deep Strategy state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsightText, setAiInsightText] = useState<string | null>(null);

  // Filtered clusters
  const filteredClusters = analysis.clusters.filter((c) => {
    const matchesSearch =
      c.clusterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.exampleQueries.some((q) => q.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.matchedUrl.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = selectedPriority === 'all' || c.priority === selectedPriority;
    const matchesGap = selectedGapType === 'all' || c.gapType === selectedGapType;
    const matchesFrame = selectedFrame === 'all' || c.frame === selectedFrame;
    const matchesDest = selectedDestination === 'all' || c.destination === selectedDestination;

    return matchesSearch && matchesPriority && matchesGap && matchesFrame && matchesDest;
  });

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Cluster Name',
      'Example Queries',
      'Frame',
      'Buyer Type',
      'Total Impressions',
      'Total Clicks',
      'Weighted Avg Position',
      'Gap Type',
      'Matched URL',
      'Destination',
      'Priority',
      'Evidence'
    ];

    const rows = analysis.clusters.map((c) => [
      `"${c.clusterName.replace(/"/g, '""')}"`,
      `"${c.exampleQueries.join(' | ').replace(/"/g, '""')}"`,
      c.frame,
      c.buyerType,
      c.totalImpressions,
      c.totalClicks,
      c.weightedAvgPosition,
      c.gapType,
      `"${c.matchedUrl}"`,
      `"${c.destination}"`,
      c.priority,
      c.evidenceLabel
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${analysis.projectName.replace(/\s+/g, '_')}_ContentGaps.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Run AI deep strategy prompt
  const handleRunAiDeepStrategy = async () => {
    setIsAiLoading(true);
    setAiInsightText(null);

    const prompt = `
ROLE: Senior Topical Authority & Technical SEO Architect
TASK: Provide an elite strategic roadmap for content gaps on: ${analysis.projectName}
SITE ARCHITECTURE: ${analysis.siteProfile.architectureModel}
TOTAL ANALYZED CLUSTERS: ${analysis.clusters.length}
HIGH PRIORITY CLUSTERS: ${analysis.clusters.filter((c) => c.priority === 'High').map((c) => c.clusterName).slice(0, 5).join(', ')}
UNDERPERFORMING CTR QUERIES: ${analysis.ctrDiagnostics.slice(0, 5).map((q) => `${q.queryOrPage} (pos: ${q.position}, ctr: ${(q.ctr * 100).toFixed(1)}%)`).join(', ')}
PROPRIETARY FACTS PROVIDED: ${analysis.siteProfile.notes || 'Standard parameters'}

OUTPUT FORMAT:
1. Architectural Hub & Spoke Action Plan (Which URLs to expand vs create).
2. Snippet & Title Engineering Hooks for the Top 3 CTR Underperformers.
3. Local/Service Entity Differentiation Strategy to avoid search engine cannibalization.
4. Concrete 90-Day KPI targets.
`;

    try {
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          useThinking,
          userApiKey: userApiKey || undefined
        })
      });
      const data = await res.json();
      if (data.text) {
        setAiInsightText(data.text);
      } else {
        setAiInsightText(data.error || 'Failed to generate AI insights.');
      }
    } catch (err: any) {
      setAiInsightText(`Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Top Banner / Project Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Phase 1 Active
              </span>
              <span className="text-xs text-slate-400">
                {new Date(analysis.analyzedAt).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {analysis.projectName}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {analysis.siteProfile.architectureModel} • {analysis.audit.analyzedQueriesCount.toLocaleString()} {isAr ? 'استعلام مؤهل' : 'eligible queries'} • {analysis.clusters.length} {isAr ? 'كتلة دلالية' : 'clusters'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenSyncModal}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2"
            >
              <FolderSync className="w-4 h-4" />
              <span>{isAr ? 'مزامنة مع Google Drive & Sheets' : 'Sync to Google Workspace'}</span>
            </button>

            <button
              onClick={handleRunAiDeepStrategy}
              disabled={isAiLoading}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
            >
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> : <Sparkles className="w-4 h-4 text-purple-600" />}
              <span>{isAr ? 'استراتيجية الذكاء الاصطناعي' : 'AI Deep Strategy'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              title="Export CSV"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>{isAr ? 'تصدير CSV' : 'Export'}</span>
            </button>

            <button
              onClick={onResetToPhase0}
              className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              {isAr ? 'تعديل المدخلات (Phase 0)' : 'Edit Phase 0'}
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              {isAr ? 'الكتل الدلالية' : 'Clusters'}
            </span>
            <span className="text-lg font-black text-slate-900">{analysis.clusters.length}</span>
          </div>

          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
            <span className="text-[10px] font-bold uppercase text-rose-700 block">
              {isAr ? 'أولوية قصوى (High)' : 'High Priority'}
            </span>
            <span className="text-lg font-black text-rose-700">
              {analysis.clusters.filter((c) => c.priority === 'High').length}
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <span className="text-[10px] font-bold uppercase text-amber-800 block">
              {isAr ? 'فرص قريبة (8-20)' : 'Striking Distance'}
            </span>
            <span className="text-lg font-black text-amber-800">
              {analysis.clusters.filter((c) => c.gapType === 'Striking distance').length}
            </span>
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <span className="text-[10px] font-bold uppercase text-indigo-700 block">
              {isAr ? 'محتوى مفقود (Missing)' : 'Missing Gaps'}
            </span>
            <span className="text-lg font-black text-indigo-700">
              {analysis.clusters.filter((c) => c.gapType === 'Missing').length}
            </span>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="text-[10px] font-bold uppercase text-blue-700 block">
              {isAr ? 'ضعف النقر (Low CTR)' : 'CTR Deficits'}
            </span>
            <span className="text-lg font-black text-blue-700">{analysis.ctrDiagnostics.length}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">
              {isAr ? 'التهام الكلمات' : 'Cannibalization'}
            </span>
            <span className="text-lg font-black text-slate-800">
              {analysis.cannibalizationRisks.length}
            </span>
          </div>
        </div>
      </div>

      {/* AI Deep Strategy Panel (if triggered) */}
      {aiInsightText && (
        <div className="bg-purple-900 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-purple-800/80 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-300" />
              <h2 className="text-sm font-bold text-purple-100">
                {isAr ? 'التحليل المعماري الذكي (Gemini Strategic Architecture Report)' : 'Gemini Strategic Architecture Report'}
              </h2>
            </div>
            <button
              onClick={() => setAiInsightText(null)}
              className="text-purple-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-xs text-purple-100 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto pr-2">
            {aiInsightText}
          </div>
        </div>
      )}

      {/* Navigation Tabs (Sections A to K) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('clusters')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'clusters'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          C. {isAr ? 'الكتل الدلالية (Clusters)' : 'Master Clusters'} ({analysis.clusters.length})
        </button>

        <button
          onClick={() => setActiveTab('newPieces')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'newPieces'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          G. {isAr ? 'أفضل 5 مقالات جديدة (Promise & Proof)' : 'Top 5 New Pieces'}
        </button>

        <button
          onClick={() => setActiveTab('quickWins')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'quickWins'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          H. {isAr ? 'أفضل 5 مكاسب سريعة (Quick Wins)' : 'Top 5 Quick Wins'}
        </button>

        <button
          onClick={() => setActiveTab('ctr')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'ctr'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          D. {isAr ? 'تشخيص معدل النقر (CTR)' : 'CTR Diagnostics'} ({analysis.ctrDiagnostics.length})
        </button>

        <button
          onClick={() => setActiveTab('cannibalization')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'cannibalization'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          E. {isAr ? 'مخاطر الالتهام' : 'Cannibalization'} ({analysis.cannibalizationRisks.length})
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          F. {isAr ? 'الأسئلة والمقارنات' : 'Questions & Comparisons'} ({analysis.questionQueries.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          B. {isAr ? 'فحص البيانات والأساس' : 'Data Audit'}
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          A. {isAr ? 'معمارية الموقع' : 'Site Profile'}
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          I. {isAr ? 'قائمة المراجعة اليدوية' : 'Review Queue'}
        </button>

        <button
          onClick={() => setActiveTab('limits')}
          className={`px-3 py-2 rounded-t-xl transition-all whitespace-nowrap ${
            activeTab === 'limits'
              ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          J&K. {isAr ? 'حدود البيانات والقرارات' : 'Limits & Decisions'}
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* TAB C: Master Cluster Table */}
      {activeTab === 'clusters' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-2.5 rtl:right-3 ltr:left-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث في الكتل أو الكلمات أو الروابط...' : 'Search clusters, queries, or URLs...'}
                className="w-full text-xs py-2 rtl:pr-9 ltr:pl-9 rtl:pl-3 ltr:pr-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Priority Filter */}
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">{isAr ? 'كل الأولويات' : 'All Priorities'}</option>
                <option value="High">{isAr ? 'أولوية عالية (High)' : 'High Priority'}</option>
                <option value="Med">{isAr ? 'أولوية متوسطة (Med)' : 'Med Priority'}</option>
                <option value="Low">{isAr ? 'أولوية منخفضة (Low)' : 'Low Priority'}</option>
              </select>

              {/* Gap Type Filter */}
              <select
                value={selectedGapType}
                onChange={(e) => setSelectedGapType(e.target.value)}
                className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">{isAr ? 'كل الفجوات' : 'All Gap Types'}</option>
                <option value="Missing">{isAr ? 'مفقود (Missing)' : 'Missing'}</option>
                <option value="Striking distance">{isAr ? 'فرصة قريبة (Striking)' : 'Striking distance'}</option>
                <option value="Covered">{isAr ? 'مغطى (Covered)' : 'Covered'}</option>
              </select>

              {/* Frame Filter */}
              <select
                value={selectedFrame}
                onChange={(e) => setSelectedFrame(e.target.value)}
                className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">{isAr ? 'كل الأطر (Frames)' : 'All Frames'}</option>
                <option value="transactional">transactional</option>
                <option value="comparative">comparative</option>
                <option value="procedural">procedural</option>
                <option value="diagnostic">diagnostic</option>
                <option value="local">local</option>
                <option value="definitional">definitional</option>
              </select>

              {/* Destination Filter */}
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
              >
                <option value="all">{isAr ? 'كل الوجهات (Destinations)' : 'All Destinations'}</option>
                <option value="Update existing URL">{isAr ? 'تحديث الرابط الحالي' : 'Update existing URL'}</option>
                <option value="New section (H2/H3)">{isAr ? 'إضافة قسم جديد (H2/H3)' : 'New section (H2/H3)'}</option>
                <option value="New standalone page">{isAr ? 'صفحة جديدة مستقلة' : 'New standalone page'}</option>
                <option value="Title or snippet rewrite">{isAr ? 'إعادة كتابة العنوان والوصف' : 'Title or snippet rewrite'}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'الكتلة / الكلمات' : 'Cluster / Queries'}</th>
                    <th className="py-3 px-3">{isAr ? 'الإطار والمشتري' : 'Frame & Buyer'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الظهور' : 'Impressions'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'النقرات' : 'Clicks'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الترتيب المرجح' : 'Weighted Pos'}</th>
                    <th className="py-3 px-3">{isAr ? 'نوع الفجوة' : 'Gap Type'}</th>
                    <th className="py-3 px-3">{isAr ? 'الرابط المتطابق' : 'Matched URL'}</th>
                    <th className="py-3 px-3">{isAr ? 'الوجهة المقترحة' : 'Destination'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الأولوية' : 'Priority'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الدليل' : 'Evidence'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClusters.length > 0 ? (
                    filteredClusters.map((cluster) => (
                      <tr
                        key={cluster.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => setActiveClusterModal(cluster)}
                      >
                        <td className="py-3 px-4 max-w-xs">
                          <span className="font-bold text-slate-900 block truncate">
                            {cluster.clusterName}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {cluster.exampleQueries.join(', ')}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 block mb-0.5 w-max">
                            {cluster.frame}
                          </span>
                          <span className="text-[10px] text-slate-500 capitalize">
                            {cluster.buyerType}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {cluster.totalImpressions.toLocaleString()}
                        </td>

                        <td className="py-3 px-3 text-center text-slate-600">
                          {cluster.totalClicks.toLocaleString()}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              cluster.weightedAvgPosition <= 3
                                ? 'bg-emerald-100 text-emerald-800'
                                : cluster.weightedAvgPosition <= 10
                                ? 'bg-blue-100 text-blue-800'
                                : cluster.weightedAvgPosition <= 20
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {cluster.weightedAvgPosition}
                          </span>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cluster.gapType === 'Missing'
                                ? 'bg-rose-100 text-rose-800'
                                : cluster.gapType === 'Striking distance'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {cluster.gapType}
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-[180px]">
                          <span className="text-[11px] text-slate-700 truncate block font-mono">
                            {cluster.matchedUrl.split('/').filter(Boolean).pop() || cluster.matchedUrl}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            [{cluster.matchLabel}]
                          </span>
                        </td>

                        <td className="py-3 px-3 max-w-[180px]">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {cluster.destination}
                          </span>
                          {cluster.requiresSerpOverlapCheck && (
                            <span className="text-[9px] text-rose-600 font-bold block">
                              * SERP overlap check required
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              cluster.priority === 'High'
                                ? 'bg-rose-600 text-white'
                                : cluster.priority === 'Med'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {cluster.priority}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="text-[10px] font-mono text-slate-500">
                            {cluster.evidenceLabel}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400">
                        {isAr ? 'لا توجد كتل تطابق الفلاتر المحددة' : 'No clusters match the active filters.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB G: Top 5 New Content Pieces (Promise and Proof Discipline) */}
      {activeTab === 'newPieces' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-3">
            <Award className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">
                {isAr ? 'منهجية الوعد والإثبات (Promise & Proof Discipline)' : 'Promise & Proof Discipline'}
              </p>
              <p className="text-indigo-800 leading-relaxed">
                {isAr
                  ? 'يجب أن يقدم العنوان المقترح وعداً قابلاً للتحقق في الشاشة الأولى للمستخدم. وكل قطعة تتطلب إثباتاً ملموساً (رقم محدد، جدول أسعار معلن، أو فترة ضمان) وتُوسم بـ [Needs-input] إذا لم تكن واردة في إجاباتك.'
                  : 'Titles must state a verifiable promise visible above the fold. Generic filler is banned; each piece specifies required checkable proof.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {analysis.topNewContentPieces.map((piece, i) => (
              <div key={piece.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {piece.suggestedTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      {piece.destination}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {piece.evidenceLabel}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      {isAr ? 'نية الباحث المستهدفة (Search Intent):' : 'Search Intent:'}
                    </span>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {piece.searchIntent}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      {isAr ? 'الاستعلامات المستهدفة (من ملفات GSC):' : 'Target Queries:'}
                    </span>
                    <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {piece.targetQueries.map((tq, qIdx) => (
                        <span key={qIdx} className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 text-[11px]">
                          {tq}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sub-questions answered in-page */}
                <div className="text-xs">
                  <span className="font-bold text-slate-700 block mb-1">
                    {isAr ? 'الأسئلة الفرعية المدمجة في نفس الصفحة (بدون تفريع):' : 'In-page Sub-questions:'}
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-2">
                    {piece.subQuestions.map((sq, sIdx) => (
                      <li key={sIdx}>{sq}</li>
                    ))}
                  </ul>
                </div>

                {/* Proof requirement */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 block mb-0.5">
                    {isAr ? 'الإثبات المطلوب لمنع المحتوى الضعيف (Required Proof):' : 'Required Proof (Anti-Generic):'}
                  </span>
                  <p className="text-amber-800">{piece.requiredProof}</p>
                </div>

                {/* Koray Tuğberk Gübür Semantic SEO Blueprint */}
                {piece.korayBlueprint && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 bg-gradient-to-br from-indigo-50/40 via-purple-50/20 to-slate-50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white">
                          Koray Gübür Semantic Framework
                        </span>
                        <span className="text-[11px] font-bold text-slate-800">
                          {isAr ? 'مخطط الكيانات الدلالية وقابلية الفهرسة' : 'Semantic Entity & Prose Blueprint'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          OriginalContentScore: {piece.korayBlueprint.originalityScoreEstimate.score} ({piece.korayBlueprint.originalityScoreEstimate.scale})
                        </span>
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          piece.korayBlueprint.localDifferentiationRisk === 'High'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isAr ? 'مخاطر تكرار القوالب:' : 'Template Duplication Risk:'} {piece.korayBlueprint.localDifferentiationRisk}
                        </span>
                      </div>
                    </div>

                    {/* Local Differentiation Advice */}
                    <div className="text-[11px] bg-white p-2.5 rounded-lg border border-indigo-100 text-slate-700 leading-relaxed">
                      <strong className="text-indigo-900 block mb-0.5">
                        {isAr ? '⚠️ فحص تمايز المدن وتجنب الصفحات المكررة (Local Differentiation):' : 'Local Differentiation Test:'}
                      </strong>
                      {piece.korayBlueprint.localDifferentiationAdvice}
                    </div>

                    {/* 2 Prose Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Section 1 */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">
                          {isAr ? 'القسم النثري 1 (H2)' : 'Prose Section 1 (H2)'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs">
                          {piece.korayBlueprint.proseSection1.heading}
                        </h4>
                        <p className="text-slate-600 text-[11px]">
                          <strong>{isAr ? 'الهدف:' : 'Objective:'}</strong> {piece.korayBlueprint.proseSection1.objective}
                        </p>
                        <div className="text-[10px] text-indigo-900 bg-indigo-50/60 p-1.5 rounded">
                          <strong>{isAr ? 'ميزة كسب المعلومات (Information Gain):' : 'Information Gain:'}</strong> {piece.korayBlueprint.proseSection1.informationGain}
                        </div>
                      </div>

                      {/* Section 2 */}
                      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">
                          {isAr ? 'القسم النثري 2 (H2)' : 'Prose Section 2 (H2)'}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs">
                          {piece.korayBlueprint.proseSection2.heading}
                        </h4>
                        <p className="text-slate-600 text-[11px]">
                          <strong>{isAr ? 'الهدف:' : 'Objective:'}</strong> {piece.korayBlueprint.proseSection2.objective}
                        </p>
                        <div className="text-[10px] text-purple-900 bg-purple-50/60 p-1.5 rounded">
                          <strong>{isAr ? 'ميزة كسب المعلومات (Information Gain):' : 'Information Gain:'}</strong> {piece.korayBlueprint.proseSection2.informationGain}
                        </div>
                      </div>
                    </div>

                    {/* Structured Comparison Table */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-2">
                      <span className="font-bold text-slate-900 text-xs block">
                        📊 {piece.korayBlueprint.comparisonTable.title}
                      </span>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] text-left rtl:text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                              {piece.korayBlueprint.comparisonTable.columns.map((col, cIdx) => (
                                <th key={cIdx} className="py-1.5 px-2 font-bold">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {piece.korayBlueprint.comparisonTable.sampleRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50/50">
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="py-1.5 px-2 text-slate-700">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Unique Internal Anchor Texts */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs space-y-2">
                      <span className="font-bold text-slate-900 text-xs block">
                        🔗 {isAr ? 'نصوص الروابط الداخلية الفريدة الموصى بها:' : 'Recommended Unique Internal Anchor Texts:'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {piece.korayBlueprint.uniqueAnchorTexts.map((anchorItem, aIdx) => (
                          <div key={aIdx} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-indigo-700">«{anchorItem.anchor}»</span>
                              <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">{anchorItem.targetUrl}</span>
                            </div>
                            <p className="text-slate-500 text-[10px] italic">{anchorItem.context}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB H: Top 5 Quick Wins on Existing Pages */}
      {activeTab === 'quickWins' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
            <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">
                {isAr ? 'مكاسب سريعة على الصفحات الحالية (Striking Distance: 8–20)' : 'Quick Wins on Existing URLs (Striking Distance: 8-20)'}
              </p>
              <p className="text-emerald-800 leading-relaxed">
                {isAr
                  ? 'صفحات موجودة بالفعل وحققت ظهوراً كبيراً في الترتيب (8-20). إضافة قسم إجابة مباشرة أو جدول أسعار يرفع الصفحة للصفحة الأولى بدون كتابة مقال جديد.'
                  : 'High impression pages currently in striking distance. Expanding existing sections lifts them to Top 3 without creating redundant URLs.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {analysis.topQuickWins.map((win, i) => (
              <div key={win.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="font-mono text-xs text-indigo-700 font-bold truncate">
                      {win.url}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    {win.changeType}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      {isAr ? 'السبب من بيانات Search Console:' : 'Reason from Data:'}
                    </span>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      {win.reasonFromData}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      {isAr ? 'معيار القياس خلال 90 يوماً ضد صفحة ضابطة:' : '90-Day Measurement vs Control Page:'}
                    </span>
                    <p className="text-emerald-800 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      {win.measureIn90Days}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB D: CTR Diagnostics */}
      {activeTab === 'ctr' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900">
            <p className="font-bold mb-1">
              {isAr ? 'تشخيص نسبة النقر المرجحة بالظهور (Impression-Weighted CTR Baselines)' : 'Impression-Weighted CTR Baselines'}
            </p>
            <p className="text-blue-800 leading-relaxed">
              {isAr
                ? 'تم حساب خط الأساس لكل نطاق ترتيب (1-3، 4-7، 8-10، 11-20) من الملف نفسه بعد استبعاد العلامة التجارية. الاستعلامات أدناه تحقق أقل من 50% من خط الأساس.'
                : 'Baselines computed directly from this export after brand removal. Displaying queries performing below 50% of their bucket baseline.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'الاستعلام / الكلمة' : 'Query'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الظهور' : 'Impressions'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الترتيب' : 'Position'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'CTR الفعلي' : 'Actual CTR'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'خط الأساس للنطاق' : 'Bucket Baseline'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'النسبة' : 'Ratio'}</th>
                    <th className="py-3 px-4">{isAr ? 'السبب المرجح' : 'Probable Cause'}</th>
                    <th className="py-3 px-4">{isAr ? 'الإصلاح المقترح' : 'Suggested Fix'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.ctrDiagnostics.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{item.queryOrPage}</td>
                      <td className="py-3 px-3 text-center text-slate-700">{item.impressions.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{item.position}</td>
                      <td className="py-3 px-3 text-center text-rose-600 font-bold">
                        {(item.ctr * 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {(item.bucketBaselineCtr * 100).toFixed(1)}% ({item.bucket})
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-rose-700">
                        {item.ratio}x
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] max-w-xs">{item.probableCause}</td>
                      <td className="py-3 px-4 text-emerald-700 font-semibold text-[11px] max-w-xs">
                        {item.suggestedFix}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB E: Cannibalization Risks */}
      {activeTab === 'cannibalization' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
            <p className="font-bold mb-1">
              {isAr ? 'مخاطر التهام الكلمات بين الصفحات (Cannibalization Risks)' : 'Keyword Cannibalization Risks'}
            </p>
            <p className="text-amber-800 leading-relaxed">
              {isAr
                ? 'صفحتان أو أكثر تستهدفان نفس الكيان والمسار في الروابط. تُوسم بـ [Probable] حتى يتم تأكيدها بملف Query×Page.'
                : 'Identifies multiple URLs targeting identical entities in slugs and titles. Labeled [Probable] until Query×Page confirms.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Page A</th>
                    <th className="py-3 px-4">Page B</th>
                    <th className="py-3 px-3">{isAr ? 'الكيان المشترك' : 'Shared Entity'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الدليل' : 'Evidence'}</th>
                    <th className="py-3 px-4">{isAr ? 'الإجراء المقترح' : 'Suggested Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.cannibalizationRisks.length > 0 ? (
                    analysis.cannibalizationRisks.map((item, i) => (
                      <tr key={i} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800 max-w-xs truncate">{item.pageA}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800 max-w-xs truncate">{item.pageB}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{item.sharedEntityAndPredicate}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700">
                            [{item.evidence}]
                          </span>
                        </td>
                        <td className="py-3 px-4 text-indigo-700 text-[11px]">{item.suggestedAction}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {isAr ? 'لم يتم رصد تكرار ملحوظ للكيانات في الروابط.' : 'No major slug cannibalization detected.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB F: Question and Comparison Queries */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            {isAr
              ? 'الاستعلامات التي تحتوي على أسئلة ومقارنات (how, what, why, vs, cost, كيف، ما هو، مقارنة، أفضل...).'
              : 'Question and comparison queries mapped to recommended presentation formats.'}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'الاستعلام' : 'Query'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الظهور' : 'Impressions'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الترتيب' : 'Position'}</th>
                    <th className="py-3 px-4">{isAr ? 'الرابط المتطابق' : 'Matched URL'}</th>
                    <th className="py-3 px-4">{isAr ? 'التنسيق المقترح' : 'Suggested Format'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.questionQueries.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{item.query}</td>
                      <td className="py-3 px-3 text-center text-slate-700">{item.impressions.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{item.position}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-xs truncate">{item.matchedUrl}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.suggestedFormat}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: Data Audit */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                {isAr ? 'سجل تصفية البيانات والصفوف (Data Check)' : 'Data Check & Filtering Audit'}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">{isAr ? 'صفوف ملف Queries.csv' : 'Queries File Total Rows'}:</span>
                  <span className="font-bold text-slate-900">{analysis.audit.queriesFileRows}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">{isAr ? 'صفوف ملف Pages.csv' : 'Pages File Total Rows'}:</span>
                  <span className="font-bold text-slate-900">{analysis.audit.pagesFileRows}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">{isAr ? 'صفوف العلامة التجارية المستبعدة' : 'Brand Rows Removed'}:</span>
                  <span className="font-bold text-rose-600">{analysis.audit.brandRowsRemoved}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">{isAr ? 'استعلامات نية العلامة (مفصولة)' : 'Brand-Intent Rows Separated'}:</span>
                  <span className="font-bold text-indigo-600">{analysis.audit.brandIntentRowsSeparated}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">{isAr ? 'صفوف أقل من 10 مرات ظهور (مستبعدة)' : 'Rows with < 10 Impressions Removed'}:</span>
                  <span className="font-bold text-slate-600">{analysis.audit.lowImpressionRowsRemoved}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">{isAr ? 'استبعاد خارج النطاق (Q6)' : 'Out of Scope Rows Excluded'}:</span>
                  <span className="font-bold text-slate-600">{analysis.audit.outOfScopeRowsRemoved}</span>
                </div>
                <div className="flex justify-between py-1 pt-2 border-t border-slate-200">
                  <span className="font-bold text-slate-800">{isAr ? 'إجمالي الاستعلامات المحللة فعلياً' : 'Total Analyzed Queries'}:</span>
                  <span className="font-extrabold text-emerald-700">{analysis.audit.analyzedQueriesCount}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">
                {isAr ? 'خط الأساس المحسوب لـ CTR لكل نطاق ترتيب' : 'Calculated Bucket CTR Baselines'}
              </h3>
              <p className="text-xs text-slate-500">
                {isAr
                  ? 'محسوب بدقة من الملف المرفوع بعد حذف العلامة التجارية ومرجح بمرات الظهور (Weighted).'
                  : 'Computed directly from the uploaded file, weighted by impressions.'}
              </p>
              <div className="space-y-2.5">
                {analysis.audit.bucketBaselines.map((b, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 text-xs block">
                        Position Bucket: {b.bucket}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {b.sampleSize} {isAr ? 'استعلام' : 'queries in bucket'}
                      </span>
                    </div>
                    <div className="text-right rtl:text-left">
                      <span className="text-sm font-black text-indigo-700">{b.baselineCtr}%</span>
                      <span className="text-[10px] text-slate-400 block">{isAr ? 'خط الأساس' : 'Baseline'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB A: Confirmed Site Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600" />
              <span>{isAr ? 'ملف تعريف الموقع والمعمارية المعتمدة' : 'Confirmed Site Profile & Architecture'}</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {analysis.siteProfile.isConfirmed ? 'Confirmed' : 'Probable'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <span className="font-bold text-slate-700 block">
                {isAr ? 'نموذج المعمارية المطبق:' : 'Architecture Model:'}
              </span>
              <p className="text-indigo-800 font-extrabold text-sm">{analysis.siteProfile.architectureModel}</p>
              <p className="text-slate-500">{analysis.siteProfile.siteType}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-2">
              <span className="font-bold text-slate-700 block">
                {isAr ? 'قواعد المعمارية المطبقة في التحليل:' : 'Model Specific Rules Applied:'}
              </span>
              <p className="text-slate-600 leading-relaxed">
                {analysis.siteProfile.architectureModel.includes('Model 4')
                  ? 'تم إلزام التحليل بشرط التمايز الجغرافي (Local Differentiation Test) قبل التوصية بأي صفحة جديدة لكل خدمة ومدينة لمنع التكرار.'
                  : analysis.siteProfile.architectureModel.includes('Model 3')
                  ? 'تم توجيه الفجوات لامتصاصها داخل أقسام (H2/H3) في صفحات الخدمات الحالية قبل التوصية بصفحة جديدة.'
                  : 'تم تقييم الفجوات وفق معايير المركز الرئيسي الواحد.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB I: Manual Review Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            {isAr
              ? 'قائمة الاستعلامات التي صُنفت بدرجة [Guess] أو [Unmatched] أو [Probable] للمراجعة البشرية والتأكد من عدم التكرار.'
              : 'Queries classified as Guess, Probable, or Unmatched requiring human validation.'}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">{isAr ? 'الاستعلام' : 'Query'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الظهور' : 'Impressions'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'الترتيب' : 'Position'}</th>
                    <th className="py-3 px-3 text-center">{isAr ? 'درجة التطابق' : 'Match Level'}</th>
                    <th className="py-3 px-4">{isAr ? 'الرابط التقريبي' : 'Matched URL'}</th>
                    <th className="py-3 px-4">{isAr ? 'ملاحظة الفحص' : 'Review Note'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analysis.unmatchedAndGuessReviewQueue.map((item, i) => (
                    <tr key={i} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-bold text-slate-900">{item.query}</td>
                      <td className="py-3 px-3 text-center text-slate-700">{item.impressions.toLocaleString()}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{item.position}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.matchLabel === 'Unmatched' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.matchLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 max-w-xs truncate">{item.matchedUrl || 'None'}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{item.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB J & K: Data Limits & Strategic Decisions */}
      {activeTab === 'limits' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>J. {isAr ? 'حدود بيانات Search Console وما لا تظهره الملفات' : 'Data Limits & GSC Boundaries'}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {analysis.dataLimits.map((limit, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-900 block">{limit.item}</span>
                  <p className="text-slate-600">{limit.description}</p>
                  <p className="text-indigo-700 font-semibold pt-1 border-t border-slate-200/60">
                    💡 {limit.howToCloseGap}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              <span>K. {isAr ? 'الأسئلة الاستراتيجية لتحديد القرارات' : 'Strategic Decision Questions'}</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              {analysis.strategicQuestions.map((q, i) => (
                <div key={i} className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-2">
                  <span className="font-bold text-indigo-700 shrink-0">{i + 1}.</span>
                  <p className="text-slate-800">{q}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cluster Details Modal (Drilldown) */}
      {activeClusterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{activeClusterModal.clusterName}</h3>
                <span className="text-xs text-slate-500">
                  {activeClusterModal.queries.length} {isAr ? 'استعلام داخل هذه الكتلة' : 'queries in this cluster'}
                </span>
              </div>
              <button
                onClick={() => setActiveClusterModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-2">
              <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">{isAr ? 'إجمالي الظهور' : 'Impressions'}</span>
                  <span className="font-bold text-slate-900">{activeClusterModal.totalImpressions.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">{isAr ? 'إجمالي النقرات' : 'Clicks'}</span>
                  <span className="font-bold text-slate-900">{activeClusterModal.totalClicks.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">{isAr ? 'الترتيب المرجح' : 'Weighted Pos'}</span>
                  <span className="font-bold text-indigo-700">{activeClusterModal.weightedAvgPosition}</span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-1">
                <span className="font-bold text-indigo-900 block">{isAr ? 'الوجهة المقترحة والسبب:' : 'Suggested Destination:'}</span>
                <p className="text-indigo-800">{activeClusterModal.destination} — {activeClusterModal.destinationReason}</p>
              </div>

              <h4 className="font-bold text-slate-800 pt-2">{isAr ? 'قائمة الاستعلامات الكاملة:' : 'Query List:'}</h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {activeClusterModal.queries.map((q, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                    <span className="font-semibold text-slate-800">{q.query}</span>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>{q.impressions.toLocaleString()} imp</span>
                      <span>pos {q.position}</span>
                      <span>{(q.ctr * 100).toFixed(1)}% CTR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveClusterModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
