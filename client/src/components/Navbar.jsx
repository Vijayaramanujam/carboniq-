import React, { useState } from 'react';
import {
  Database,
  FileText,
  PlusCircle,
  Layers,
  LogOut,
  Building2,
  Sparkles,
  ArrowRight,
  Menu,
  X,
  Gauge,
  Sliders,
  Compass,
} from 'lucide-react';

export function Navbar({
  activeTab,
  setActiveTab,
  healthInfo,
  company,
  onLogout,
  onOpenUpload,
  currentRoute = 'LANDING',
  onNavigate,
  onOpenAuth,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isDbConnected = healthInfo?.databaseConnected;

  const scrollToAnchor = (id) => {
    setMobileMenuOpen(false);
    if (currentRoute !== 'LANDING' && onNavigate) {
      onNavigate(company ? 'WORKSPACE' : 'LANDING', '/');
      setTimeout(() => {
        const elem = document.getElementById(id);
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const elem = document.getElementById(id);
      if (elem) elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWorkspaceTabClick = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setTimeout(() => {
      const elem = document.getElementById('workspace-tabs-content');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <header className="border-b border-[#b4ffcd]/12 bg-[#06110d]/85 backdrop-blur-2xl sticky top-0 z-50 font-sans selection:bg-[#b5f568] selection:text-[#102000]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Identity */}
          <div className="flex items-center space-x-6">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate(company ? 'WORKSPACE' : 'LANDING', '/')}
              className="flex items-center space-x-3 text-left group"
            >
              <img
                src="/drkthm-logo.png"
                alt="CarbonIQ"
                className="h-9 sm:h-10 w-auto max-w-[170px] sm:max-w-[210px] object-contain transition-all duration-300 group-hover:scale-105 drop-shadow-[0_0_12px_rgba(98,221,158,0.2)]"
              />
              <div>
                <div className="hidden sm:flex items-center space-x-2">
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#121e1a] border border-[#62dd9e]/30 text-[#62dd9e] font-mono">
                    Telemetry
                  </span>
                </div>
                {company && (
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                    <span className="font-medium text-[#62dd9e] truncate max-w-[160px] sm:max-w-xs">
                      {company.companyName}
                    </span>
                    {company.gstin && (
                      <span className="hidden sm:inline-block px-1.5 py-0.5 bg-[#0b1b14] border border-[#b4ffcd]/10 text-[10px] text-slate-400 font-mono rounded">
                        GSTIN: {company.gstin}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>

            {/* Public Anchor Links (when on landing page) */}
            {currentRoute === 'LANDING' && (
              <nav className="hidden lg:flex items-center space-x-1 pl-4 border-l border-[#b4ffcd]/10">
                <button
                  type="button"
                  onClick={() => scrollToAnchor('product-dashboard')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] transition"
                >
                  Platform
                </button>
                <button
                  type="button"
                  onClick={() => scrollToAnchor('how-it-works')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] transition"
                >
                  How It Works
                </button>
                <button
                  type="button"
                  onClick={() => scrollToAnchor('interactive-simulator')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] transition"
                >
                  Simulator
                </button>
                <button
                  type="button"
                  onClick={() => scrollToAnchor('scope-mechanics')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] transition"
                >
                  Scope Mechanics
                </button>
                <button
                  type="button"
                  onClick={() => scrollToAnchor('capabilities')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] transition"
                >
                  Capabilities
                </button>
              </nav>
            )}

            {/* Authenticated Workspace Navigation Tabs */}
            {company && currentRoute === 'WORKSPACE' && (
              <nav className="hidden md:flex space-x-1.5 pl-4 border-l border-[#b4ffcd]/10">
                <button
                  type="button"
                  onClick={() => handleWorkspaceTabClick('DOCUMENTS')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'DOCUMENTS'
                      ? 'bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_14px_rgba(181,245,104,0.22)] scale-[1.02]'
                      : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <FileText className={`w-3.5 h-3.5 ${activeTab === 'DOCUMENTS' ? 'text-[#b5f568]' : 'text-slate-400'}`} />
                  <span>Documents</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleWorkspaceTabClick('ACTIVITIES')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'ACTIVITIES'
                      ? 'bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_14px_rgba(181,245,104,0.22)] scale-[1.02]'
                      : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Layers className={`w-3.5 h-3.5 ${activeTab === 'ACTIVITIES' ? 'text-[#b5f568]' : 'text-slate-400'}`} />
                  <span>Verified Activities</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleWorkspaceTabClick('MANUAL_ENTRY')}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    activeTab === 'MANUAL_ENTRY'
                      ? 'bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_14px_rgba(181,245,104,0.22)] scale-[1.02]'
                      : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <PlusCircle className={`w-3.5 h-3.5 ${activeTab === 'MANUAL_ENTRY' ? 'text-[#b5f568]' : 'text-slate-400'}`} />
                  <span>Manual Entry</span>
                </button>
              </nav>
            )}
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center space-x-3 text-xs">
            {/* Emission Factors Navigator (available on landing or dataset page, hidden in workspace) */}
            {onNavigate && (!company || currentRoute !== 'WORKSPACE') && (
              <button
                type="button"
                onClick={() =>
                  currentRoute === 'EMISSION_FACTORS'
                    ? onNavigate(company ? 'WORKSPACE' : 'LANDING', '/')
                    : onNavigate('EMISSION_FACTORS', '/emission-factor-dataset')
                }
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                  currentRoute === 'EMISSION_FACTORS'
                    ? 'bg-[#121e1a] border-[#62dd9e] text-[#62dd9e] shadow-[0_0_12px_rgba(98,221,158,0.2)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border-[#b4ffcd]/12'
                }`}
                title="View Verified Emission Factors Dataset"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#62dd9e]" />
                <span>
                  {currentRoute === 'EMISSION_FACTORS'
                    ? company
                      ? 'Back to Workspace'
                      : 'Home'
                    : 'Factor Directory'}
                </span>
              </button>
            )}

            {/* Public Auth Buttons (when logged out) */}
            {!company && onOpenAuth && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('LOGIN')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/[0.08] active:scale-95 transition-all duration-200 border border-transparent hover:border-white/[0.1]"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('REGISTER')}
                  className="group flex items-center space-x-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#102000] shadow-[0_0_20px_rgba(181,245,104,0.35)] hover:shadow-[0_0_28px_rgba(181,245,104,0.55)] hover:scale-[1.03] active:scale-[0.96] transition-all duration-200 cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            )}

            {/* Authenticated Workspace Switcher & Logout */}
            {company && (
              <div className="flex items-center space-x-2">
                {currentRoute !== 'WORKSPACE' && onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate('WORKSPACE', '/')}
                    className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#b5f568] hover:bg-[#9ad84f] text-[#102000] transition shadow-sm font-semibold"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Workspace</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onLogout}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-white/[0.08] hover:border-rose-800/50 transition"
                  title="Logout Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#b4ffcd]/10 bg-[#06110d]/95 backdrop-blur-2xl px-4 py-4 space-y-2">
          {currentRoute === 'LANDING' && (
            <>
              <button
                type="button"
                onClick={() => scrollToAnchor('product-dashboard')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
              >
                Platform Console
              </button>
              <button
                type="button"
                onClick={() => scrollToAnchor('how-it-works')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToAnchor('interactive-simulator')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
              >
                Interactive Simulator
              </button>
              <button
                type="button"
                onClick={() => scrollToAnchor('scope-mechanics')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
              >
                Scope Mechanics
              </button>
              <button
                type="button"
                onClick={() => scrollToAnchor('capabilities')}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
              >
                Capabilities
              </button>
            </>
          )}

          {company && currentRoute === 'WORKSPACE' && (
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleWorkspaceTabClick('DOCUMENTS')}
                className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'DOCUMENTS' ? 'bg-[#121e1a] text-[#b5f568]' : 'text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <FileText className="w-4 h-4 text-[#b5f568]" />
                <span>Documents Registry</span>
              </button>
              <button
                type="button"
                onClick={() => handleWorkspaceTabClick('ACTIVITIES')}
                className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'ACTIVITIES' ? 'bg-[#121e1a] text-[#b5f568]' : 'text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <Layers className="w-4 h-4 text-[#b5f568]" />
                <span>Verified Activities</span>
              </button>
              <button
                type="button"
                onClick={() => handleWorkspaceTabClick('MANUAL_ENTRY')}
                className={`w-full flex items-center space-x-2 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activeTab === 'MANUAL_ENTRY' ? 'bg-[#121e1a] text-[#b5f568]' : 'text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <PlusCircle className="w-4 h-4 text-[#b5f568]" />
                <span>Manual Entry</span>
              </button>
            </div>
          )}
          {!company && onOpenAuth && (
            <div className="pt-3 border-t border-[#b4ffcd]/10 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('LOGIN');
                }}
                className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-white bg-white/[0.06]"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth('REGISTER');
                }}
                className="w-full py-2.5 rounded-xl text-center text-xs font-semibold bg-[#b5f568] text-[#102000]"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;
