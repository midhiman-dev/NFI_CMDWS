import { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
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
import { isAuthenticated } from './utils/auth';
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
  return <Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />;
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
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/new" element={<CaseNew />} />
            <Route path="/cases/:caseId" element={<CaseDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/runs" element={<ReportRuns />} />
            <Route path="/finance/inputs" element={<FinanceInputs />} />
            <Route path="/reports/hospital-mis-monthly" element={<HospitalMISMonthly />} />
            <Route path="/reports/daily-mis-programs" element={<DailyMISPrograms />} />
            <Route path="/reports/leadership-monthly" element={<LeadershipMonthly />} />
            <Route path="/reports/accounts-mis-daily" element={<AccountsMISDaily />} />
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/masters/hospitals" element={<Hospitals />} />
            <Route path="/admin/masters/hospital-process-map" element={<HospitalProcessMap />} />
            <Route path="/admin/masters/document-types" element={<DocumentTypes />} />
            <Route path="/admin/templates/document-requirements" element={<DocumentRequirements />} />
            <Route path="/admin/templates/followup-metrics" element={<FollowupMetrics />} />
            <Route path="/admin/bgrc-cycles" element={<BgrcCycles />} />
            <Route path="/admin/data-health" element={<DataHealth />} />
            <Route path="/admin/exports/beneficiary-master" element={<BeneficiaryExport />} />
            <Route path="/admin/exports/rejection-master" element={<RejectionExport />} />
            <Route path="/admin/reporting" element={<ReportingAdmin />} />
            <Route path="/admin/reporting/kpi-catalog" element={<KpiCatalogPage />} />
            <Route path="/admin/reporting/dataset-registry" element={<DatasetRegistryPage />} />
            <Route path="/admin/reporting/template-registry" element={<TemplateRegistryPage />} />
            <Route path="/admin/reporting/template-bindings" element={<TemplateBindingsPage />} />
            <Route path="/admin/reporting/report-runs" element={<ReportRunsExceptionsPage />} />
            <Route path="/" element={<RootRedirect />} />
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
