import { useState, useEffect, useMemo, useRef, createContext, useContext, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/design-system/Toast';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Cases } from './pages/Cases';
import { CaseNew } from './pages/CaseNew';
import { CaseDetail } from './pages/CaseDetail';
import { Reports } from './pages/Reports';
import { ReportRuns } from './pages/ReportRuns';
import { FinanceInputs } from './pages/FinanceInputs';
import { HospitalMISMonthly } from './pages/dashboards/HospitalMISMonthly';
import { DailyMISPrograms } from './pages/dashboards/DailyMISPrograms';
import { LeadershipMonthly } from './pages/dashboards/LeadershipMonthly';
import { AccountsMISDaily } from './pages/dashboards/AccountsMISDaily';
import { Users } from './pages/admin/Users';
import { Hospitals } from './pages/admin/Hospitals';
import { HospitalProcessMap } from './pages/admin/HospitalProcessMap';
import { DocumentTypes } from './pages/admin/DocumentTypes';
import { DocumentRequirements } from './pages/admin/DocumentRequirements';
import { FollowupMetrics } from './pages/admin/FollowupMetrics';
import { BgrcCycles } from './pages/admin/BgrcCycles';
import { BeneficiaryExport } from './pages/admin/BeneficiaryExport';
import { RejectionExport } from './pages/admin/RejectionExport';
import { DataHealth } from './pages/admin/DataHealth';
import { ReportingAdmin } from './pages/admin/ReportingAdmin';
import { KpiCatalogPage } from './pages/admin/KpiCatalog';
import { DatasetRegistryPage } from './pages/admin/DatasetRegistry';
import { TemplateRegistryPage } from './pages/admin/TemplateRegistry';
import { TemplateBindingsPage } from './pages/admin/TemplateBindings';
import { ReportRunsExceptionsPage } from './pages/admin/ReportRunsExceptions';
import { providerFactory } from './data/providers/ProviderFactory';
import { getAuthState, isAuthenticated } from './utils/auth';
import { canAccessRoute, getDefaultRouteForAuth } from './utils/roleAccess';
import type { DataMode, DataProvider } from './data/providers/DataProvider';

interface AppContextValue {
  mode: DataMode;
  provider: DataProvider;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}

function RootRedirect() {
  const authState = getAuthState();
  return <Navigate to={isAuthenticated() ? getDefaultRouteForAuth(authState) : '/login'} replace />;
}

function AccessDenied() {
  return (
    <div className="min-h-screen bg-[var(--nfi-bg)] flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-[var(--nfi-border)] rounded-xl p-6 text-center">
        <h1 className="text-2xl font-semibold text-[var(--nfi-text)] mb-2">Access denied</h1>
        <p className="text-[var(--nfi-text-secondary)]">You do not have permission to view this page.</p>
      </div>
    </div>
  );
}

function GuardedRoute({
  pathKey,
  element,
}: {
  pathKey: string;
  element: ReactElement;
}) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const authState = getAuthState();
  const role = authState.activeRole;
  if (!canAccessRoute(role, pathKey)) {
    return <Navigate to={getDefaultRouteForAuth(authState)} replace />;
  }

  return element;
}

function App() {
  const [provider, setProvider] = useState<DataProvider | null>(null);
  const [mode, setMode] = useState<DataMode | null>(null);
  const initRef = useRef(false);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    providerFactory.initialize()
      .then((result) => {
        setProvider(result.provider);
        setMode(result.mode);
      })
      .catch(() => {
        localStorage.setItem('nfi_force_demo_mode', 'true');
        providerFactory.initialize().then((result) => {
          setProvider(result.provider);
          setMode(result.mode);
        });
      });
  }, []);

  const contextValue = useMemo<AppContextValue | null>(
    () => (provider && mode) ? { provider, mode } : null,
    [provider, mode]
  );

  if (!contextValue) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<GuardedRoute pathKey="/dashboard" element={<Dashboard />} />} />
            <Route path="/cases" element={<GuardedRoute pathKey="/cases" element={<Cases />} />} />
            <Route path="/cases/new" element={<GuardedRoute pathKey="/cases/new" element={<CaseNew />} />} />
            <Route path="/cases/:caseId/wizard" element={<GuardedRoute pathKey="/cases/:caseId/wizard" element={<CaseNew />} />} />
            <Route path="/cases/:caseId" element={<GuardedRoute pathKey="/cases/:caseId" element={<CaseDetail />} />} />
            <Route path="/reports" element={<GuardedRoute pathKey="/reports" element={<Reports />} />} />
            <Route path="/reports/runs" element={<GuardedRoute pathKey="/reports/runs" element={<ReportRuns />} />} />
            <Route path="/finance/inputs" element={<GuardedRoute pathKey="/finance/inputs" element={<FinanceInputs />} />} />
            <Route path="/reports/hospital-mis-monthly" element={<GuardedRoute pathKey="/reports/hospital-mis-monthly" element={<HospitalMISMonthly />} />} />
            <Route path="/reports/daily-mis-programs" element={<GuardedRoute pathKey="/reports/daily-mis-programs" element={<DailyMISPrograms />} />} />
            <Route path="/reports/leadership-monthly" element={<GuardedRoute pathKey="/reports/leadership-monthly" element={<LeadershipMonthly />} />} />
            <Route path="/reports/accounts-mis-daily" element={<GuardedRoute pathKey="/reports/accounts-mis-daily" element={<AccountsMISDaily />} />} />
            <Route path="/admin/users" element={<GuardedRoute pathKey="/admin/users" element={<Users />} />} />
            <Route path="/admin/masters/hospitals" element={<GuardedRoute pathKey="/admin/masters/hospitals" element={<Hospitals />} />} />
            <Route path="/admin/masters/hospital-process-map" element={<GuardedRoute pathKey="/admin/masters/hospital-process-map" element={<HospitalProcessMap />} />} />
            <Route path="/admin/masters/document-types" element={<GuardedRoute pathKey="/admin/masters/document-types" element={<DocumentTypes />} />} />
            <Route path="/admin/templates/document-requirements" element={<GuardedRoute pathKey="/admin/templates/document-requirements" element={<DocumentRequirements />} />} />
            <Route path="/admin/templates/followup-metrics" element={<GuardedRoute pathKey="/admin/templates/followup-metrics" element={<FollowupMetrics />} />} />
            <Route path="/admin/bgrc-cycles" element={<GuardedRoute pathKey="/admin/bgrc-cycles" element={<BgrcCycles />} />} />
            <Route path="/admin/data-health" element={<GuardedRoute pathKey="/admin/data-health" element={<DataHealth />} />} />
            <Route path="/admin/exports/beneficiary-master" element={<GuardedRoute pathKey="/admin/exports/beneficiary-master" element={<BeneficiaryExport />} />} />
            <Route path="/admin/exports/rejection-master" element={<GuardedRoute pathKey="/admin/exports/rejection-master" element={<RejectionExport />} />} />
            <Route path="/admin/reporting" element={<GuardedRoute pathKey="/admin/reporting" element={<ReportingAdmin />} />} />
            <Route path="/admin/reporting/kpi-catalog" element={<GuardedRoute pathKey="/admin/reporting/kpi-catalog" element={<KpiCatalogPage />} />} />
            <Route path="/admin/reporting/dataset-registry" element={<GuardedRoute pathKey="/admin/reporting/dataset-registry" element={<DatasetRegistryPage />} />} />
            <Route path="/admin/reporting/template-registry" element={<GuardedRoute pathKey="/admin/reporting/template-registry" element={<TemplateRegistryPage />} />} />
            <Route path="/admin/reporting/template-bindings" element={<GuardedRoute pathKey="/admin/reporting/template-bindings" element={<TemplateBindingsPage />} />} />
            <Route path="/admin/reporting/report-runs" element={<GuardedRoute pathKey="/admin/reporting/report-runs" element={<ReportRunsExceptionsPage />} />} />
            <Route path="/access-denied" element={<AccessDenied />} />
            <Route path="/" element={<RootRedirect />} />
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
