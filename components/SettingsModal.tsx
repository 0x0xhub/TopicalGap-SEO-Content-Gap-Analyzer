'use client';

import React, { useState } from 'react';
import { X, Key, Cpu, Sparkles, Check, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
  userApiKey: string;
  onSaveApiKey: (key: string) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  useThinking: boolean;
  onToggleThinking: (enabled: boolean) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  lang,
  userApiKey,
  onSaveApiKey,
  selectedModel,
  onSelectModel,
  useThinking,
  onToggleThinking
}: SettingsModalProps) {
  const isAr = lang === 'ar';
  const [keyInput, setKeyInput] = useState(userApiKey);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(keyInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Cpu className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {isAr ? 'إعدادات الذكاء الاصطناعي ومفاتيح API' : 'AI Intelligence & API Settings'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-5">
          {/* Custom API Key input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-slate-500" />
              {isAr ? 'مفتاح Gemini API مخصص (اختياري)' : 'Custom Gemini API Key (Optional)'}
            </label>
            <p className="text-xs text-slate-500 mb-2">
              {isAr
                ? 'إذا تركته فارغاً، ستستخدم المنصة مفتاح النظام المدمج تلقائياً. يمكنك وضع مفتاحك الخاص للتحكم في الحصص.'
                : 'If left empty, the platform will use the built-in system key automatically. You can paste your own key here.'}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
              />
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
              >
                {savedSuccess ? <Check className="w-4 h-4" /> : null}
                {isAr ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>

          {/* Model selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {isAr ? 'نموذج الذكاء الاصطناعي الافتراضي' : 'Default AI Model'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelectModel('gemini-3.8-flash')}
                className={`p-3 text-left rounded-xl border transition-all ${
                  selectedModel === 'gemini-3.8-flash'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">gemini-3.8-flash</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">سريع وذكي</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">
                  {isAr ? 'مثالي لتحليل الكلمات والأنماط المعمارية بسرعة فائقة.' : 'Fast and ideal for high-throughput SEO entity extraction.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => onSelectModel('gemini-4-argon')}
                className={`p-3 text-left rounded-xl border transition-all ${
                  selectedModel === 'gemini-4-argon'
                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-semibold ring-1 ring-indigo-600'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">gemini-4-argon</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">تفكير عميق</span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">
                  {isAr ? 'تفكير استراتيجي متقدم وصياغة وعود المحتوى والأدلة.' : 'Deep reasoning for complex strategy and promise-proof briefs.'}
                </p>
              </button>
            </div>
          </div>

          {/* High Thinking toggle */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  {isAr ? 'تفعيل وضع التفكير الاستراتيجي العالي (High Thinking)' : 'Enable High Thinking Mode'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {isAr
                    ? 'يستخدم نموذج gemini-4-argon مع ThinkingLevel.HIGH لتفكيك نية الباحث المعقدة.'
                    : 'Applies gemini-4-argon with deep reasoning loops for non-trivial SERP intent.'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useThinking}
                onChange={(e) => onToggleThinking(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {isAr ? 'إغلاق ومتابعة' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
