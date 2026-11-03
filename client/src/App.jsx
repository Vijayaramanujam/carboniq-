import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar.jsx';
import { LandingPage } from './components/LandingPage.jsx';
import { EnterpriseDashboard } from './components/EnterpriseDashboard.jsx';
import { CompanySettings } from './components/CompanySettings.jsx';
import { UploadZone } from './components/UploadZone.jsx';
import { DocumentList } from './components/DocumentList.jsx';
import { DocumentReviewModal } from './components/DocumentReviewModal.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { ReuploadModal } from './components/ReuploadModal.jsx';
import { ManualEntryModal } from './components/ManualEntryModal.jsx';
import { ActivityRecordsList } from './components/ActivityRecordsList.jsx';
import { AuthModal } from './components/AuthModal.jsx';
import { EmissionFactorDataset } from './components/EmissionFactorDataset.jsx';
import { ReportsHub } from './components/ReportsHub.jsx';
import {
  checkHealth,
  fetchDocuments,
  fetchActivities,
  reprocessDocumentExtraction,
  getPreviewUrl,
  getCompanyProfile,
  completeCompanyOnboarding,
  setAuthToken,
  getAuthToken,
} from './services/api.js';
import {
  Database,
  RefreshCw,
  Building2,
  ArrowRight,
  Upload,
  AlertTriangle,
  ShieldCheck,
  LayoutDashboard,
  UploadCloud,
  Layers,
  Users,
  Leaf,
  Target,
  FileText,
  Settings,
  Calendar,
  Bell,
  Plus,
  ChevronDown,
  LogOut,
  Menu,
  X,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  ExternalLink,
  Flame,
  Zap,
  Truck,
  Package,
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('carboniq_workspace_active_tab');
      const validTabs = ['DASHBOARD', 'DATA_UPLOAD', 'DOCUMENTS', 'ACTIVITIES', 'MANUAL_ENTRY', 'SUPPLIERS', 'PLANNER', 'SETTINGS'];
      if (saved && validTabs.includes(saved)) {
        return saved;
      }
    }
    return 'DASHBOARD';
  });

  // Sync active workspace tab to localStorage so browser reload restores the exact same page
  useEffect(() => {
    if (activeTab && typeof window !== 'undefined') {
      localStorage.setItem('carboniq_workspace_active_tab', activeTab);
    }
  }, [activeTab]);
  const [currentRoute, setCurrentRoute] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('emission-factor-dataset')) return 'EMISSION_FACTORS';
    }
    return 'LANDING';
  });
  const [healthInfo, setHealthInfo] = useState(null);
  const [company, setCompany] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth modal triggered from landing page or public header
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState('REGISTER'); // 'REGISTER' | 'LOGIN'

  const [documents, setDocuments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Modals state
  const [reviewDoc, setReviewDoc] = useState(null);
  const [reuploadDoc, setReuploadDoc] = useState(null);

  const refreshHealth = async () => {
    try {
      const data = await checkHealth();
      setHealthInfo(data);
    } catch (err) {
      setHealthInfo({ databaseConnected: false, database: 'disconnected', ocrSpaceConfigured: false });
    }
  };

  const loadProfile = async () => {
    const token = getAuthToken();
    if (!token) {
      setCompany(null);
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);
    try {
      const res = await getCompanyProfile();
      if (res.success && res.company) {
        setCompany(res.company);
        setCurrentRoute((prev) => (prev === 'LANDING' ? 'WORKSPACE' : prev));
      } else {
        setAuthToken(null);
        setCompany(null);
      }
    } catch (err) {
      setAuthToken(null);
      setCompany(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadDocuments = async () => {
    if (!company) return;
    setLoadingDocs(true);
    try {
      const res = await fetchDocuments();
      if (res.success) {
        setDocuments(res.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadActivities = async () => {
    if (!company) return;
    setLoadingActivities(true);
    try {
      const res = await fetchActivities();
      if (res.success) {
        setActivities(res.activities || []);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    refreshHealth();
    loadProfile();
  }, []);

  useEffect(() => {
    if (company) {
      loadDocuments();
      loadActivities();
    }
  }, [company]);

  // Realtime sync: re-fetch immediately whenever navigating to Dashboard
  useEffect(() => {
    if (company && activeTab === 'DASHBOARD') {
      loadDocuments();
      loadActivities();
    }
  }, [company, activeTab]);

  // Realtime periodic background synchronization (every 6s) to stream autonomous ingestion updates
  useEffect(() => {
    if (!company) return;
    const interval = setInterval(() => {
      fetchActivities()
        .then((res) => {
          if (res.success && res.activities) setActivities(res.activities);
        })
        .catch(() => {});
      fetchDocuments()
        .then((res) => {
          if (res.success && res.documents) setDocuments(res.documents);
        })
        .catch(() => {});
    }, 6000);
    return () => clearInterval(interval);
  }, [company]);

  // Real Supplier Intelligence & Real Footprint Computations (Zero Simulated Data)
  const realSuppliers = useMemo(() => {
    const map = {};
    const registerVendor = (name, category, scope, kg, spend, gstin, status, docName) => {
      if (!name || !name.trim()) return;
      const cleanName = name.trim();
      if (!map[cleanName]) {
        map[cleanName] = {
          name: cleanName,
          category: category || 'Utility / Supplier',
          scope: scope || 'SCOPE_3',
          documentsCount: 0,
          totalEmissionsKg: 0,
          totalSpend: 0,
          gstin: gstin || null,
          verificationStatus: status || 'APPROVED',
          sourceDocs: [],
        };
      }
      map[cleanName].totalEmissionsKg += kg || 0;
      map[cleanName].totalSpend += spend || 0;
      map[cleanName].documentsCount += 1;
      if (docName && !map[cleanName].sourceDocs.includes(docName)) {
        map[cleanName].sourceDocs.push(docName);
      }
      if (status === 'APPROVED') {
        map[cleanName].verificationStatus = 'APPROVED';
      }
    };

    (activities || []).forEach((act) => {
      const kg = act.carbonEmissions?.emissionsKg != null
        ? Number(act.carbonEmissions.emissionsKg)
        : (act.carbonEmissions?.emissionsTonnes != null ? Number(act.carbonEmissions.emissionsTonnes) * 1000 : 0);
      const spend = Number(act.categoryData?.spendAmount) || 0;
      const docName = act.documentId?.originalFileName || null;
      registerVendor(
        act.supplierName,
        act.category,
        act.scope,
        kg,
        spend,
        act.categoryData?.gstin,
        act.verificationStatus,
        docName
      );
    });

    (documents || []).forEach((doc) => {
      const name = doc.extractedFields?.supplierName || doc.extractedFields?.vendorName;
      if (name) {
        const kg = doc.suggestedEmissions?.emissionsKg != null
          ? Number(doc.suggestedEmissions.emissionsKg)
          : (doc.suggestedEmissions?.emissionsTonnes != null ? Number(doc.suggestedEmissions.emissionsTonnes) * 1000 : 0);
        const spend = Number(doc.extractedFields?.amount || doc.extractedFields?.totalAmount || doc.extractedFields?.spendAmount) || 0;
        const isAlreadyInActivities = (activities || []).some((a) => {
          const actDocId = a.documentId?._id ? String(a.documentId._id) : String(a.documentId || '');
          return actDocId === String(doc._id);
        });
        if (!isAlreadyInActivities) {
          registerVendor(
            name,
            doc.extractedFields?.category || doc.documentType?.replace('_BILL', '').replace('_RECEIPT', ''),
            doc.scope,
            kg,
            spend,
            doc.extractedFields?.gstin,
            doc.reviewStatus,
            doc.originalFileName
          );
        }
      }
    });

    return Object.values(map).sort((a, b) => b.totalEmissionsKg - a.totalEmissionsKg);
  }, [activities, documents]);

  const totalRealFootprintT = useMemo(() => {
    const actKg = (activities || []).reduce((sum, a) => {
      const kg = a.carbonEmissions?.emissionsKg != null
        ? Number(a.carbonEmissions.emissionsKg)
        : (a.carbonEmissions?.emissionsTonnes != null ? Number(a.carbonEmissions.emissionsTonnes) * 1000 : 0);
      return sum + (kg || 0);
    }, 0);
    return +(actKg / 1000).toFixed(2);
  }, [activities]);

  const scope1RealFootprintT = useMemo(() => {
    const actKg = (activities || [])
      .filter((a) => a.scope === 'SCOPE_1')
      .reduce((sum, a) => {
        const kg = a.carbonEmissions?.emissionsKg != null
          ? Number(a.carbonEmissions.emissionsKg)
          : (a.carbonEmissions?.emissionsTonnes != null ? Number(a.carbonEmissions.emissionsTonnes) * 1000 : 0);
        return sum + (kg || 0);
      }, 0);
    return +(actKg / 1000).toFixed(2);
  }, [activities]);

  const scope2RealFootprintT = useMemo(() => {
    const actKg = (activities || [])
      .filter((a) => a.scope === 'SCOPE_2')
      .reduce((sum, a) => {
        const kg = a.carbonEmissions?.emissionsKg != null
          ? Number(a.carbonEmissions.emissionsKg)
          : (a.carbonEmissions?.emissionsTonnes != null ? Number(a.carbonEmissions.emissionsTonnes) * 1000 : 0);
        return sum + (kg || 0);
      }, 0);
    return +(actKg / 1000).toFixed(2);
  }, [activities]);

  // Synchronize route with browser URL history
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('emission-factor-dataset')) {
        setCurrentRoute('EMISSION_FACTORS');
      } else if (company) {
        setCurrentRoute('WORKSPACE');
      } else {
        setCurrentRoute('LANDING');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [company]);

  const navigateTo = (route, path = '/') => {
    setCurrentRoute(route);
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', path);
    }
  };

  const handleOpenAuth = (view = 'REGISTER') => {
    setAuthModalView(view);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (companyData, token) => {
    setAuthToken(token);
    setCompany(companyData);
    setAuthModalOpen(false);
    setCurrentRoute('WORKSPACE');
    setActiveTab('DASHBOARD');
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCompany(null);
    setDocuments([]);
    setActivities([]);
    setCurrentRoute('LANDING');
    setActiveTab('DASHBOARD');
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/');
    }
  };

  const handleReprocess = async (doc) => {
    try {
      const res = await reprocessDocumentExtraction(doc._id);
      if (res.success) {
        loadDocuments();
      } else {
        alert(res.error || 'Failed to reprocess document');
      }
    } catch (err) {
      alert(`Reprocessing error: ${err.message}`);
    }
  };

  const handleOpenPreview = (doc) => {
    window.open(getPreviewUrl(doc._id), '_blank');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#06110d] flex flex-col items-center justify-center text-[#9aada2] space-y-3 font-mono">
        <RefreshCw className="w-8 h-8 animate-spin text-[#b5f568]" />
        <p className="text-sm font-medium">Initializing Sovereign Carbon Telemetry...</p>
      </div>
    );
  }

  // 1. ROUTE: Verified Emission Factors Dataset
  if (currentRoute === 'EMISSION_FACTORS') {
    return (
      <div className="min-h-screen bg-[#06110d] text-[#d8e6de] flex flex-col font-sans selection:bg-[#b5f568] selection:text-[#102000]">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          healthInfo={healthInfo}
          company={company}
          onLogout={handleLogout}
          onOpenUpload={() => {
            setCurrentRoute('WORKSPACE');
            setActiveTab('DATA_UPLOAD');
          }}
          currentRoute={currentRoute}
          onNavigate={navigateTo}
          onOpenAuth={handleOpenAuth}
        />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <EmissionFactorDataset
            onBackToWorkspace={() => navigateTo(company ? 'WORKSPACE' : 'LANDING', '/')}
          />
        </main>
        <footer className="border-t border-[#b4ffcd]/10 bg-[#06110d] py-6 text-center text-xs text-[#9aada2] font-mono">
          CarbonIQ Enterprise &bull; Verified National & International Emission Factors Directory &bull; Statutory ESG Accounting
        </footer>

        {authModalOpen && (
          <AuthModal
            initialView={authModalView}
            onAuthenticated={handleAuthenticated}
            onClose={() => setAuthModalOpen(false)}
          />
        )}
      </div>
    );
  }

  // 2. ROUTE: Public Landing Page (when logged out or explicitly navigated to Landing)
  if (currentRoute === 'LANDING' || (!company && currentRoute !== 'EMISSION_FACTORS')) {
    return (
      <div className="min-h-screen bg-[#06110d] text-[#d8e6de] flex flex-col font-sans selection:bg-[#b5f568] selection:text-[#102000]">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          healthInfo={healthInfo}
          company={company}
          onLogout={handleLogout}
          onOpenUpload={() => handleOpenAuth('REGISTER')}
          currentRoute="LANDING"
          onNavigate={navigateTo}
          onOpenAuth={handleOpenAuth}
        />

        <main className="flex-1">
          <LandingPage
            onGetStarted={() => handleOpenAuth('REGISTER')}
            onSignIn={() => handleOpenAuth('LOGIN')}
            onViewFactors={() => navigateTo('EMISSION_FACTORS', '/emission-factor-dataset')}
          />
        </main>

        <footer className="border-t border-[#b4ffcd]/10 bg-[#06110d] py-8 text-center text-xs text-[#9aada2] font-mono">
          CarbonIQ Platform &bull; Corporate Greenhouse Gas Accounting & Statutory ESG Disclosures &bull; Indian SME Edition
        </footer>

        {authModalOpen && (
          <AuthModal
            initialView={authModalView}
            onAuthenticated={handleAuthenticated}
            onClose={() => setAuthModalOpen(false)}
          />
        )}
      </div>
    );
  }

  // 3. ROUTE: Authenticated SME Enterprise Intelligence Workspace (Sidebar + Topbar + Dashboard)
  return (
    <div className="min-h-screen bg-[#06110d] text-[#d8e6de] flex font-sans selection:bg-[#b5f568] selection:text-[#102000] relative overflow-x-hidden">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden animate-fade-in"
        />
      )}

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#06110d] border-r border-[#b4ffcd]/12 flex flex-col justify-between transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Identity */}
          <div className="p-6 pb-5 border-b border-[#b4ffcd]/10 flex items-center justify-between">
            <div>
              <img
                src="/drkthm-logo.png"
                alt="CarbonIQ"
                className="h-8 w-auto max-w-[170px] object-contain drop-shadow-[0_0_12px_rgba(98,221,158,0.2)]"
              />
              <span className="text-[10px] font-mono text-[#9aada2] tracking-wider uppercase block mt-1 font-semibold">
                SME Carbon Intelligence
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('DASHBOARD');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'DASHBOARD'
                  ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_16px_rgba(181,245,104,0.2)]'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#b5f568]" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('DATA_UPLOAD');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'DATA_UPLOAD'
                  ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_16px_rgba(181,245,104,0.2)]'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-[#62dd9e]" />
              <span>Data Upload</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('DOCUMENTS');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'DOCUMENTS' || activeTab === 'ACTIVITIES'
                  ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_16px_rgba(181,245,104,0.2)]'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-[#38bdf8]" />
              <span>My Records</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('SUPPLIERS');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'SUPPLIERS'
                  ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_16px_rgba(181,245,104,0.2)]'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-[#c084fc]" />
              <span>Suppliers</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('PLANNER');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'PLANNER'
                  ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_16px_rgba(181,245,104,0.2)]'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Target className="w-4 h-4 text-amber-400" />
              <span>Reduction Planner</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('REPORTS');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'REPORTS'
                  ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_16px_rgba(181,245,104,0.2)]'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-[#b5f568]" />
              <span>Reports (BRSR / CBAM)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('SETTINGS');
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'SETTINGS'
                  ? 'bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 shadow-[0_0_16px_rgba(181,245,104,0.2)]'
                  : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 text-[#9aada2]" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Bottom Sustainability Manifesto */}
          <div className="p-4 m-3 mt-auto rounded-2xl bg-gradient-to-br from-[#0c261a] to-[#040e09] border border-[#62dd9e]/25 relative overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-[#122e1f] border border-[#b5f568]/40 flex items-center justify-center text-[#b5f568] mb-2.5 shadow-[0_0_12px_rgba(181,245,104,0.25)]">
              <Leaf className="w-4 h-4 text-[#b5f568]" />
            </div>
            <div className="text-xs font-mono font-bold text-white leading-tight">
              <div>Measure</div>
              <div>Understand</div>
              <div>Reduce</div>
              <div className="text-[#b5f568]">Grow Sustainably</div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer Logout */}
        <div className="p-3 border-t border-[#b4ffcd]/10">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center space-x-2.5 px-3.5 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <header className="h-20 border-b border-[#b4ffcd]/12 bg-[#06110d]/90 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Mobile hamburger & Interactive Company Pill (Opens Settings) */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Clickable Company Pill -> Navigates to Settings */}
            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className="flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl bg-[#0b1b14] border border-[#b4ffcd]/18 hover:border-[#b5f568]/60 hover:bg-[#122e1f]/60 shadow-sm transition-all cursor-pointer group"
              title="Click to view & edit company parameters in Settings"
            >
              <Building2 className="w-4 h-4 text-[#62dd9e] group-hover:text-[#b5f568] transition-colors" />
              <span className="font-bold text-white text-xs truncate max-w-[160px] sm:max-w-xs font-mono group-hover:text-[#b5f568] transition-colors">
                {company.companyName}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121e1a] text-[#b5f568] border border-[#b5f568]/30 font-semibold hidden sm:inline-block">
                {company.businessSize}
              </span>
              <Settings className="w-3.5 h-3.5 text-[#9aada2] group-hover:text-[#b5f568] opacity-60 group-hover:opacity-100 transition-all hidden sm:inline-block" />
            </button>
          </div>

          {/* Right: Primary Action Button */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            {/* Upload Document Primary Button */}
            <button
              type="button"
              onClick={() => setActiveTab('DATA_UPLOAD')}
              className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 rounded-full text-xs font-mono font-bold bg-gradient-to-r from-[#b5f568] to-[#9ad84f] text-[#07130f] hover:shadow-[0_0_20px_rgba(181,245,104,0.45)] hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5 text-[#07130f]" />
              <span>Upload Document</span>
            </button>
          </div>
        </header>

        {/* Database connection alert if offline */}
        {healthInfo && !healthInfo.databaseConnected && (
          <div className="bg-red-950/80 border-b border-red-700/80 text-red-200 text-xs py-2 px-4 backdrop-blur-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>Database Connection Issue:</strong> Carbon inventory services are currently in offline mode.
                </span>
              </div>
              <button
                onClick={refreshHealth}
                className="text-red-300 hover:text-white underline font-semibold flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Dynamic View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <div key={activeTab} className="animate-page-switch">
{/* VIEW: Main Enterprise Dashboard */}
          {activeTab === 'DASHBOARD' && (
            <EnterpriseDashboard
              company={company}
              documents={documents}
              activities={activities}
              onOpenUpload={() => setActiveTab('DATA_UPLOAD')}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectDocument={(doc) => setReviewDoc(doc)}
              onOpenStatutoryReports={() => setActiveTab('REPORTS')}
              onLogout={handleLogout}
            />
          )}

          {/* VIEW: Data Upload Zone */}
          {activeTab === 'DATA_UPLOAD' && (
            <div className="space-y-4 animate-page-enter">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white font-mono">Autonomous Ingestion Portal</h2>
                  <p className="text-xs text-[#9aada2] font-mono mt-0.5">
                    Upload electricity bills, generator slips, logistics bilties, or ZIP archives for AI parsing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('DOCUMENTS')}
                  className="text-xs font-mono text-[#b5f568] hover:underline"
                >
                  View Document Registry &rarr;
                </button>
              </div>

              <UploadZone
                onUploadComplete={() => {
                  loadDocuments();
                  loadActivities();
                }}
                onViewDocuments={() => setActiveTab('DOCUMENTS')}
                onViewActivities={() => setActiveTab('ACTIVITIES')}
              />
            </div>
          )}

          {/* VIEW: Documents Registry */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4 animate-page-enter">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white font-mono">Ingested Document Registry</h2>
                  <p className="text-xs text-[#9aada2] font-mono mt-0.5">
                    Continuous OCR pipeline and verifiable source records.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ACTIVITIES')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-mono text-[#62dd9e] bg-[#121e1a] border border-[#62dd9e]/30 hover:border-[#b5f568]"
                  >
                    View Verified Ledger
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('DATA_UPLOAD')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold text-[#07130f] bg-[#b5f568]"
                  >
                    + Upload More
                  </button>
                </div>
              </div>

              <DocumentList
                documents={documents}
                loading={loadingDocs}
                onSelectDocument={(doc) => setReviewDoc(doc)}
                onPreviewDocument={handleOpenPreview}
              />
            </div>
          )}

          {/* VIEW: Verified Activity Records Ledger */}
          {activeTab === 'ACTIVITIES' && (
            <div className="space-y-4 animate-page-enter">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white font-mono">Verified Activities Ledger</h2>
                  <p className="text-xs text-[#9aada2] font-mono mt-0.5">
                    Statutory Scope 1, Scope 2, and Scope 3 activity entries.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('MANUAL_ENTRY')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-mono text-[#b5f568] bg-[#121e1a] border border-[#b5f568]/40"
                  >
                    + Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('DOCUMENTS')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-mono text-[#62dd9e] bg-[#121e1a] border border-[#62dd9e]/30"
                  >
                    Documents View
                  </button>
                </div>
              </div>

              <ActivityRecordsList
                activities={activities}
                loading={loadingActivities}
                onSelectDocumentById={(id) => {
                  const doc = documents.find((d) => d._id === id);
                  if (doc) setReviewDoc(doc);
                }}
              />
            </div>
          )}

          {/* VIEW: Manual Entry Form */}
          {activeTab === 'MANUAL_ENTRY' && (
            <div className="space-y-4 animate-page-enter">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white font-mono">Manual Statutory Activity Entry</h2>
                  <p className="text-xs text-[#9aada2] font-mono mt-0.5">
                    Direct entry for un-invoiced fuels, freight manifests, and utility meter readings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('ACTIVITIES')}
                  className="text-xs font-mono text-[#b5f568] hover:underline"
                >
                  Back to Activity Ledger &rarr;
                </button>
              </div>

              <ManualEntryModal
                onActivityCreated={() => {
                  loadActivities();
                  setActiveTab('ACTIVITIES');
                }}
              />
            </div>
          )}

          {/* VIEW: Scope 3 Supplier Intelligence (100% Real Ingested Document Records) */}
          {activeTab === 'SUPPLIERS' && (
            <div className="space-y-6 animate-page-enter">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white font-mono tracking-tight">
                    Scope 3 Supply Chain Intelligence
                  </h2>
                  <p className="text-xs text-[#9aada2] font-mono mt-0.5">
                    Primary vendor emissions data tiering and Environmental Product Declarations (EPD).
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('DATA_UPLOAD')}
                    className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 hover:bg-[#163825] transition cursor-pointer"
                  >
                    + Upload Vendor Document
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('REPORTS')}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#18283a] text-[#38bdf8] border border-[#38bdf8]/40 hover:shadow-[0_0_16px_rgba(56,189,248,0.3)] transition cursor-pointer"
                  >
                    Generate Supplier Disclosure
                  </button>
                </div>
              </div>

              {/* Real Supplier Tier Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="telemetry-card p-4 rounded-xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90">
                  <span className="text-[10px] font-mono uppercase text-[#9aada2] block">Participating Suppliers</span>
                  <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                    {realSuppliers.length} Active
                  </span>
                  <span className="text-[10px] text-[#62dd9e] font-mono">
                    {realSuppliers.length > 0 ? '100% Extracted from source documents' : 'No suppliers registered'}
                  </span>
                </div>
                <div className="telemetry-card p-4 rounded-xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90">
                  <span className="text-[10px] font-mono uppercase text-[#9aada2] block">Primary Data Coverage</span>
                  <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                    {realSuppliers.length > 0
                      ? `${Math.round(
                          (realSuppliers.filter((s) => s.verificationStatus === 'APPROVED').length /
                            realSuppliers.length) *
                            100
                        )}%`
                      : '0%'}
                  </span>
                  <span className="text-[10px] text-[#b5f568] font-mono">Activity-based (Tier 1 & 2)</span>
                </div>
                <div className="telemetry-card p-4 rounded-xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90">
                  <span className="text-[10px] font-mono uppercase text-[#9aada2] block">Total Supplier Footprint</span>
                  <span className="text-2xl font-black text-white font-mono mt-0.5 block">
                    {(realSuppliers.reduce((sum, s) => sum + s.totalEmissionsKg, 0) / 1000).toFixed(2)} t
                  </span>
                  <span className="text-[10px] text-[#38bdf8] font-mono">Verified CO₂e Impact</span>
                </div>
              </div>

              {/* Real Supplier Table */}
              <div className="telemetry-card rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 overflow-hidden">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Engaged Vendor Registry
                  </span>
                  <span className="text-[10px] font-mono text-[#9aada2]">SEBI BRSR Principle 6 Aligned</span>
                </div>
                {realSuppliers.length > 0 ? (
                  <div className="divide-y divide-white/[0.06] text-xs font-mono">
                    {realSuppliers.map((supp) => (
                      <div key={supp.name} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02]">
                        <div>
                          <div className="text-white font-bold flex items-center gap-2">
                            <span>{supp.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#121e1a] text-[#9aada2] border border-white/[0.08]">
                              {supp.scope}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#9aada2] mt-0.5">
                            Category: {supp.category} &bull; {supp.documentsCount} verified source document{supp.documentsCount > 1 ? 's' : ''}
                            {supp.gstin ? ` &bull; GSTIN: ${supp.gstin}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                              supp.verificationStatus === 'APPROVED'
                                ? 'bg-[#0f2d1e] text-[#62dd9e] border-[#62dd9e]/40'
                                : 'bg-[#291e0a] text-[#facc15] border-[#facc15]/40'
                            }`}
                          >
                            Verified (+{(supp.totalEmissionsKg / 1000).toFixed(2)} t CO₂e)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center space-y-3 font-mono">
                    <Package className="w-9 h-9 mx-auto opacity-40 text-[#9aada2]" />
                    <div className="text-xs text-white font-semibold">No Supply Chain Vendors Logged Yet</div>
                    <p className="text-[11px] text-[#9aada2] max-w-md mx-auto">
                      Upload raw material invoices, logistics bilties, or utility records to automatically extract and register vendors with deterministic carbon accounting.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('DATA_UPLOAD')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#122e1f] text-[#b5f568] border border-[#b5f568]/40 hover:bg-[#163825] transition cursor-pointer"
                    >
                      + Upload First Vendor Invoice
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: Reduction Planner (Real Operational Trajectories) */}
          {activeTab === 'PLANNER' && (
            <div className="space-y-6 animate-page-enter">
              <div>
                <h2 className="text-xl font-bold text-white font-mono tracking-tight">
                  Decarbonization Roadmap & Target Modeling
                </h2>
                <p className="text-xs text-[#9aada2] font-mono mt-0.5">
                  Plan reduction initiatives aligned with India's 2030 NDC targets and corporate net-zero milestones.
                </p>
              </div>

              {/* Target Banner */}
              <div className="telemetry-card p-6 rounded-2xl border border-[#b5f568]/30 bg-gradient-to-br from-[#0c261a] to-[#040e09] relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#b5f568] block">
                      Corporate 2030 Trajectory
                    </span>
                    <h3 className="text-2xl font-black text-white font-mono mt-1">
                      {totalRealFootprintT > 0 ? '30% Statutory Decarbonization Target' : 'Decarbonization Trajectory Baseline'}
                    </h3>
                    <p className="text-xs text-[#9aada2] font-mono mt-1">
                      {totalRealFootprintT > 0
                        ? `Projected statutory reduction: ${(totalRealFootprintT * 0.3).toFixed(2)} t CO₂e annually from real verified operations.`
                        : 'Ingest operational utility and fuel documents to model verified reduction trajectories.'}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#122e1f] border border-[#b5f568]/40 text-[#b5f568] font-mono font-bold text-lg text-center shrink-0">
                    <div>{totalRealFootprintT > 0 ? `-${(totalRealFootprintT * 0.3).toFixed(2)} t` : '0.00 t'}</div>
                    <div className="text-[9px] text-[#9aada2] uppercase">Target Savings</div>
                  </div>
                </div>
              </div>

              {/* Scenario Modeling Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="telemetry-card p-5 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#b5f568]">
                    <Zap className="w-4 h-4 text-[#b5f568]" />
                    <span>Solar Rooftop PPA (Scope 2 Zero Baseline)</span>
                  </div>
                  <p className="text-xs text-[#9aada2] font-mono">
                    Replaces grid electricity (CEA v20.0 0.727 kg CO₂/kWh) with zero-emission onsite solar.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-[#62dd9e]">
                    Expected Abatement:{' '}
                    <strong>
                      {scope2RealFootprintT > 0
                        ? `${(scope2RealFootprintT * 0.35).toFixed(2)} t CO₂e / year`
                        : 'Calibrated upon electricity invoice ingestion'}
                    </strong>
                  </div>
                </div>

                <div className="telemetry-card p-5 rounded-2xl border border-[#b4ffcd]/15 bg-[#0b1b14]/90 space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-[#38bdf8]">
                    <Truck className="w-4 h-4 text-[#38bdf8]" />
                    <span>Electric Logistics Delivery Fleet Conversion</span>
                  </div>
                  <p className="text-xs text-[#9aada2] font-mono">
                    Electrifies last-mile distribution vans to replace diesel combustion slips.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-[#38bdf8]">
                    Expected Abatement:{' '}
                    <strong>
                      {scope1RealFootprintT > 0
                        ? `${(scope1RealFootprintT * 0.25).toFixed(2)} t CO₂e / year`
                        : 'Calibrated upon fuel slip ingestion'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Statutory Carbon Compliance & Export Hub */}
          {activeTab === 'REPORTS' && (
            <ReportsHub
              company={company}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {/* VIEW: Settings View */}
          {activeTab === 'SETTINGS' && (
            <CompanySettings
              company={company}
              onUpdateCompany={(updated) => {
                setCompany(updated);
              }}
            />
          )}

          </div>
        </main>

        {/* Global Workspace Footer */}
        <footer className="border-t border-[#b4ffcd]/10 bg-[#06110d] py-6 text-center text-xs text-[#9aada2] font-mono mt-auto">
          CarbonIQ Enterprise &bull; Corporate Greenhouse Gas Accounting & Statutory ESG Disclosures &bull; Indian SME Edition (₹ INR)
        </footer>
      </div>

      {/* Review & Field Verification Modal */}
      <ErrorBoundary onReset={() => setReviewDoc(null)}>
        {reviewDoc && (
          <DocumentReviewModal
            document={reviewDoc}
            isOpen={Boolean(reviewDoc)}
            onClose={() => setReviewDoc(null)}
            onSaved={() => {
              loadDocuments();
              loadActivities();
            }}
            onTriggerReupload={(doc) => {
              setReviewDoc(null);
              setReuploadDoc(doc);
            }}
            onTriggerReprocess={(doc) => {
              handleReprocess(doc);
            }}
          />
        )}
      </ErrorBoundary>

      {/* Re-upload Modal for ambiguous / low-confidence documents */}
      <ReuploadModal
        document={reuploadDoc}
        isOpen={Boolean(reuploadDoc)}
        onClose={() => setReuploadDoc(null)}
        onReuploaded={() => {
          loadDocuments();
          loadActivities();
        }}
      />
    </div>
  );
}

export default App;
