'use client';

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Phase0Intake from '../components/Phase0Intake';
import Phase1Dashboard from '../components/Phase1Dashboard';
import SettingsModal from '../components/SettingsModal';
import WorkspaceSyncModal from '../components/WorkspaceSyncModal';
import {
  RawQueryRow,
  RawPageRow,
  SiteProfile,
  Phase0Answers,
  FullAnalysisResult
} from '../lib/types';
import { runPhase1Analysis } from '../lib/seo-engine';
import { initAuth, googleSignIn, logout, getAccessToken } from '../lib/firebase-auth';
import { User } from 'firebase/auth';

export default function Home() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('topicalgap_ai_key') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('topicalgap_model') || 'gemini-3.8-flash';
      } catch {
        return 'gemini-3.8-flash';
      }
    }
    return 'gemini-3.8-flash';
  });
  const [useThinking, setUseThinking] = useState<boolean>(false);

  // Analysis state
  const [phase, setPhase] = useState<'phase0' | 'phase1'>('phase0');
  const [analysisResult, setAnalysisResult] = useState<FullAnalysisResult | null>(null);

  // Workspace Sync Modal
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authNotification, setAuthNotification] = useState<string | null>(null);

  // Init Firebase Auth
  useEffect(() => {
    initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
  }, []);

  const handleSignIn = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setAuthNotification(null);

    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
      }
    } catch (err: any) {
      if (
        err?.code !== 'auth/cancelled-popup-request' &&
        err?.code !== 'auth/popup-closed-by-user' &&
        err?.code !== 'auth/user-cancelled'
      ) {
        setAuthNotification(
          lang === 'ar'
            ? `تعذر إكمال تسجيل الدخول: ${err.message || 'يرجى إعادة المحاولة'}`
            : `Sign in error: ${err.message || 'Please try again'}`
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  };

  const handleSaveApiKey = (key: string) => {
    setUserApiKey(key);
    try {
      localStorage.setItem('topicalgap_ai_key', key);
    } catch {
      // ignore
    }
  };

  const handleSelectModel = (model: string) => {
    setSelectedModel(model);
    try {
      localStorage.setItem('topicalgap_model', model);
    } catch {
      // ignore
    }
  };

  // Run Phase 1
  const handleRunPhase1 = (
    queries: RawQueryRow[],
    pages: RawPageRow[],
    profile: SiteProfile,
    answers: Phase0Answers
  ) => {
    const result = runPhase1Analysis(queries, pages, profile, answers);
    setAnalysisResult(result);
    setPhase('phase1');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetToPhase0 = () => {
    setPhase('phase0');
  };

  return (
    <div className={`min-h-screen bg-slate-50 text-slate-900 font-sans ${lang === 'ar' ? 'font-arabic' : ''}`}>
      {/* App Header */}
      <Header
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        lang={lang}
        onToggleLang={() => setLang(prev => (prev === 'ar' ? 'en' : 'ar'))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        hasDriveAccess={Boolean(accessToken)}
        isLoggingIn={isLoggingIn}
      />

      {/* Dismissible Auth Notification Banner */}
      {authNotification && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
            <span>{authNotification}</span>
            <button
              onClick={() => setAuthNotification(null)}
              className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {phase === 'phase0' && (
          <Phase0Intake
            lang={lang}
            onRunPhase1={handleRunPhase1}
          />
        )}

        {phase === 'phase1' && analysisResult && (
          <Phase1Dashboard
            analysis={analysisResult}
            lang={lang}
            onOpenSyncModal={() => {
              if (!accessToken) {
                handleSignIn();
              } else {
                setIsSyncModalOpen(true);
              }
            }}
            onResetToPhase0={handleResetToPhase0}
            userApiKey={userApiKey}
            selectedModel={selectedModel}
            useThinking={useThinking}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        lang={lang}
        userApiKey={userApiKey}
        onSaveApiKey={handleSaveApiKey}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        useThinking={useThinking}
        onToggleThinking={setUseThinking}
      />

      {/* Google Workspace Sync Modal */}
      {analysisResult && (
        <WorkspaceSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          analysis={analysisResult}
          accessToken={accessToken}
          onNeedAuth={handleSignIn}
          lang={lang}
        />
      )}
    </div>
  );
}
