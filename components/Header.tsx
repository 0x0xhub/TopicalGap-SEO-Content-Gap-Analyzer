'use client';

import React from 'react';
import { Layers, Settings, Globe, FolderGit2, CheckCircle, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onOpenSettings: () => void;
  hasDriveAccess: boolean;
  isLoggingIn?: boolean;
}

export default function Header({
  user,
  onSignIn,
  onSignOut,
  lang,
  onToggleLang,
  onOpenSettings,
  hasDriveAccess,
  isLoggingIn = false
}: HeaderProps) {
  const isAr = lang === 'ar';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                TopicalGap
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                GSC 3M
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              {isAr ? 'تحليل فجوات المحتوى والمعمارية الدلالية' : 'Topical Content Gap Analysis'}
            </p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-slate-500" />
            <span>{isAr ? 'English' : 'العربية'}</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            title={isAr ? 'إعدادات الذكاء الاصطناعي والمفاتيح' : 'AI Settings & API Keys'}
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Google Auth Status / Button */}
          {user ? (
            <div className="flex items-center gap-2 bg-slate-50 p-1 pr-3 rounded-xl border border-slate-200">
              {user.photoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Google User'}
                  className="w-7 h-7 rounded-full border border-slate-300"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.email ? user.email[0].toUpperCase() : 'G'}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-medium text-slate-800 truncate max-w-[120px]">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-2.5 h-2.5" />
                  {isAr ? 'متصل بـ Drive' : 'Drive Active'}
                </span>
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                title={isAr ? 'تسجيل الخروج' : 'Sign Out'}
                aria-label="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              disabled={isLoggingIn}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold shadow-xs transition-colors shrink-0 ${
                isLoggingIn ? 'opacity-70 cursor-not-allowed' : 'hover:bg-slate-50'
              }`}
            >
              {isLoggingIn ? (
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span className="hidden sm:inline">
                {isLoggingIn
                  ? (isAr ? 'جارِ فتح النافذة...' : 'Opening sign-in...')
                  : (isAr ? 'ربط حساب جوجل (Drive & Sheets)' : 'Sign in with Google')}
              </span>
              <span className="inline sm:hidden font-bold">
                {isLoggingIn ? '...' : 'Google'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
