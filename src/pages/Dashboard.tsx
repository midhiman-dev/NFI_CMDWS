import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { NfiBadge } from '../components/design-system/NfiBadge';
import { NfiCard } from '../components/design-system/NfiCard';
import type { CaseWithDetails } from '../data/providers/DataProvider';
import { CASE_SUBTITLE_SEPARATOR } from '../constants/ui';
import { useAppContext } from '../App';
import { getHospitalDisplayStatus, listCaseWorkflowEvents } from '../utils/caseWorkflow';
import { getAuthState } from '../utils/auth';
import { filterCasesForAuth } from '../utils/roleAccess';
import { normalizeSeparator } from '../utils/textNormalize';
import { MIS_KPI_LABELS, calculateConversionRatio } from '../utils/misReporting';
import type { CaseStatus, UserRole } from '../types';
import { translateCaseStatus } from '../i18n/helpers';
import { formatBabyDisplayName, isNewCase } from '../utils/casePresentation';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

interface DashboardCase extends CaseWithDetails {
  displayStatus: CaseStatus;
}

export function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { provider, mode } = useAppContext();
  const authState = getAuthState();
  const authScopeKey = `${authState.activeRole || 'none'}:${authState.activeUser?.userId || 'anon'}:${authState.activeUser?.hospitalId || 'all'}`;
  const [cases, setCases] = useState<DashboardCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (loadedRef.current) return;
      try {
        setError(null);
        const casesData = await provider.listCases();
        const scopedCases = filterCasesForAuth(authState, casesData);
        const withDisplayStatus: DashboardCase[] = scopedCases.map((c) => ({
          ...c,
          displayStatus: getHospitalDisplayStatus(c.caseStatus, listCaseWorkflowEvents(c.caseId)),
        }));
        if (!cancelled) {
          setCases(withDisplayStatus);
          loadedRef.current = true;
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(t('dashboard.loadFailed', { defaultValue: 'Failed to load dashboard data.' }));
          console.error('Dashboard load error:', err);
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [authScopeKey, provider]);

  const queueMetrics = getRoleQueueMetrics(authState.activeRole || 'admin', cases, t);
  const misMetrics = useMemo(() => {
    const totalEnquires = cases.length;
    const approvedCases = cases.filter((c) => c.displayStatus === 'Approved' || c.displayStatus === 'Closed' || c.caseStatus === 'Approved').length;
    const rejectedCases = cases.filter((c) => c.displayStatus === 'Rejected' || c.caseStatus === 'Rejected').length;
    return [
      { label: t('reports.kpis.totalEnquires', { defaultValue: MIS_KPI_LABELS.totalEnquires }), value: totalEnquires, color: 'bg-slate-50', icon: <FileText className="text-slate-700" size={24} /> },
      { label: t('reports.kpis.approvedCases', { defaultValue: MIS_KPI_LABELS.approvedCases }), value: approvedCases, color: 'bg-emerald-50', icon: <CheckCircle className="text-emerald-700" size={24} /> },
      { label: t('reports.kpis.rejectedCases', { defaultValue: MIS_KPI_LABELS.rejectedCases }), value: rejectedCases, color: 'bg-rose-50', icon: <XCircle className="text-rose-700" size={24} /> },
      { label: t('reports.kpis.conversionRatio', { defaultValue: MIS_KPI_LABELS.conversionRatio }), value: `${calculateConversionRatio(approvedCases, totalEnquires)}%`, color: 'bg-blue-50', icon: <TrendingUp className="text-blue-700" size={24} /> },
    ];
  }, [cases, t]);

  const getCaseOpenPath = (caseItem: DashboardCase) => {
    if (authState.activeRole === 'hospital_spoc' && (caseItem.displayStatus === 'Draft' || caseItem.displayStatus === 'Returned')) {
      return `/cases/${caseItem.caseId}/wizard`;
    }
    return `/cases/${caseItem.caseId}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-4"></div>
              <p className="text-[var(--nfi-text-secondary)]">
                {t('dashboard.loading', { defaultValue: 'Loading dashboard...' })}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">{t('dashboard.title')}</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              {t('dashboard.welcomeBack', {
                defaultValue: 'Welcome back, {{name}}',
                name: authState.activeUser?.fullName || 'User',
              })}
            </p>
          </div>
          {mode === 'DEMO' && <NfiBadge tone="warning">{t('app.demoMode', { defaultValue: 'Demo Mode' })}</NfiBadge>}
        </div>

        {error && (
          <NfiCard className="bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="font-medium text-red-900">{error}</p>
            </div>
          </NfiCard>
        )}

        <div>
          <div className="flex items-center justify-between mb-3 gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--nfi-text)]">{t('dashboard.misSnapshot')}</h2>
              <p className="text-sm text-[var(--nfi-text-secondary)]">{t('dashboard.misDescription')}</p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="px-3 py-2 text-sm border border-[var(--nfi-border)] rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('dashboard.openReports')}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {misMetrics.map((metric) => (
              <QueueCard
                key={metric.label}
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                color={metric.color}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">{t('dashboard.myQueue')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {queueMetrics.map((metric) => (
              <QueueCard
                key={metric.label}
                icon={metric.icon}
                label={metric.label}
                value={metric.value}
                color={metric.color}
                onClick={metric.onClick ? () => navigate(metric.onClick!) : undefined}
              />
            ))}
          </div>
        </div>

        {authState.activeRole === 'admin' && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">{t('dashboard.quickLinks')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickLinkCard
                icon={<Users className="text-blue-600" size={20} />}
                label={t('dashboard.manageUsers')}
                onClick={() => navigate('/admin/users')}
              />
              <QuickLinkCard
                icon={<Building2 className="text-green-600" size={20} />}
                label={t('dashboard.hospitals')}
                onClick={() => navigate('/admin/masters/hospitals')}
              />
              <QuickLinkCard
                icon={<FileText className="text-orange-600" size={20} />}
                label={t('dashboard.documentTemplates')}
                onClick={() => navigate('/admin/templates/document-requirements')}
              />
            </div>
          </div>
        )}

        <NfiCard>
          <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">{t('dashboard.recentCases')}</h2>
          {cases.length === 0 ? (
            <p className="text-[var(--nfi-text-secondary)] text-center py-8">{t('dashboard.noCases')}</p>
          ) : (
            <div className="space-y-3">
              {cases.slice(0, 10).map((c) => (
                <div
                  key={c.caseId}
                  className={`flex items-center justify-between p-4 border rounded-lg transition-colors cursor-pointer ${
                    isNewCase(c.createdAt)
                      ? 'border-sky-200 bg-sky-50/60 hover:bg-sky-50'
                      : 'border-[var(--nfi-border)] hover:bg-gray-50'
                  }`}
                  onClick={() => navigate(getCaseOpenPath(c))}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[var(--nfi-text)]">{c.caseRef}</p>
                      {isNewCase(c.createdAt) && <NfiBadge tone="status">New</NfiBadge>}
                      <NfiBadge tone={getStatusTone(authState.activeRole === 'hospital_spoc' ? c.displayStatus : c.caseStatus)}>
                        {translateCaseStatus(authState.activeRole === 'hospital_spoc' ? c.displayStatus : c.caseStatus)}
                      </NfiBadge>
                    </div>
                    <p className="text-sm text-[var(--nfi-text-secondary)]">
                      {normalizeSeparator(
                        `${formatBabyDisplayName(undefined, c.childName)}${CASE_SUBTITLE_SEPARATOR}${c.hospitalName || t('common.unknownHospital', { defaultValue: 'Unknown Hospital' })}`,
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--nfi-text-secondary)]">{new Date(c.updatedAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </NfiCard>
      </div>
    </Layout>
  );
}

function getStatusTone(status: string): 'success' | 'warning' | 'error' | 'status' | 'neutral' {
  switch (status) {
    case 'Approved':
      return 'success';
    case 'Under_Verification':
    case 'Under_Review':
      return 'warning';
    case 'Returned':
      return 'warning';
    case 'Rejected':
      return 'error';
    case 'Submitted':
      return 'status';
    default:
      return 'neutral';
  }
}

function getRoleQueueMetrics(role: UserRole, cases: DashboardCase[], t: (key: string, options?: any) => string) {
  switch (role) {
    case 'hospital_spoc':
      return [
        { label: t('dashboard.queue.draftCases', { defaultValue: 'Draft Cases' }), value: cases.filter((c) => c.displayStatus === 'Draft').length, icon: <FileText className="text-gray-600" size={24} />, color: 'bg-gray-50', onClick: '/cases?status=Draft' },
        { label: t('case.status.Submitted', { defaultValue: 'Submitted' }), value: cases.filter((c) => c.displayStatus === 'Submitted').length, icon: <TrendingUp className="text-blue-600" size={24} />, color: 'bg-blue-50', onClick: '/cases?status=Submitted' },
        { label: t('case.status.Returned', { defaultValue: 'Returned' }), value: cases.filter((c) => c.displayStatus === 'Returned').length, icon: <AlertCircle className="text-yellow-600" size={24} />, color: 'bg-yellow-50', onClick: '/cases?status=Returned' },
        { label: t('case.status.Rejected', { defaultValue: 'Rejected' }), value: cases.filter((c) => c.displayStatus === 'Rejected').length, icon: <XCircle className="text-red-600" size={24} />, color: 'bg-red-50', onClick: '/cases?status=Rejected' },
        { label: t('case.status.Approved', { defaultValue: 'Approved' }), value: cases.filter((c) => c.displayStatus === 'Approved' || c.displayStatus === 'Closed').length, icon: <CheckCircle className="text-green-600" size={24} />, color: 'bg-green-50' },
      ];
    case 'clinical':
      return [
        { label: t('dashboard.queue.totalCases', { defaultValue: 'Total Cases' }), value: cases.length, icon: <FileText className="text-blue-600" size={24} />, color: 'bg-blue-50', onClick: '/cases' },
        { label: t('dashboard.queue.activeCases', { defaultValue: 'Active Cases' }), value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length, icon: <TrendingUp className="text-teal-600" size={24} />, color: 'bg-teal-50', onClick: '/cases' },
        { label: t('case.status.Approved', { defaultValue: 'Approved' }), value: cases.filter((c) => c.caseStatus === 'Approved').length, icon: <CheckCircle className="text-green-600" size={24} />, color: 'bg-green-50' },
        { label: t('case.status.Rejected', { defaultValue: 'Rejected' }), value: cases.filter((c) => c.caseStatus === 'Rejected').length, icon: <XCircle className="text-red-600" size={24} />, color: 'bg-red-50' },
      ];
    case 'clinical_reviewer':
    case 'hospital_doctor':
      return [
        { label: t('case.status.Under_Review', { defaultValue: 'Under Review' }), value: cases.filter((c) => c.caseStatus === 'Under_Review').length, icon: <Clock className="text-orange-600" size={24} />, color: 'bg-orange-50', onClick: '/cases' },
        { label: t('case.status.Approved', { defaultValue: 'Approved' }), value: cases.filter((c) => c.caseStatus === 'Approved').length, icon: <CheckCircle className="text-green-600" size={24} />, color: 'bg-green-50' },
        { label: t('case.status.Rejected', { defaultValue: 'Rejected' }), value: cases.filter((c) => c.caseStatus === 'Rejected').length, icon: <XCircle className="text-red-600" size={24} />, color: 'bg-red-50' },
        { label: t('dashboard.queue.openCases', { defaultValue: 'Open Cases' }), value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length, icon: <TrendingUp className="text-blue-600" size={24} />, color: 'bg-blue-50' },
      ];
    case 'verifier':
      return [
        { label: t('case.status.Submitted', { defaultValue: 'Submitted' }), value: cases.filter((c) => c.caseStatus === 'Submitted').length, icon: <FileText className="text-blue-600" size={24} />, color: 'bg-blue-50', onClick: '/cases' },
        { label: t('case.status.Under_Verification', { defaultValue: 'Under Verification' }), value: cases.filter((c) => c.caseStatus === 'Under_Verification').length, icon: <Clock className="text-yellow-600" size={24} />, color: 'bg-yellow-50', onClick: '/cases' },
        { label: t('dashboard.queue.verified', { defaultValue: 'Verified' }), value: cases.filter((c) => c.caseStatus === 'Under_Review').length, icon: <CheckCircle className="text-green-600" size={24} />, color: 'bg-green-50' },
        { label: t('dashboard.queue.totalActive', { defaultValue: 'Total Active' }), value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length, icon: <TrendingUp className="text-teal-600" size={24} />, color: 'bg-teal-50' },
      ];
    case 'committee_member':
      return [
        { label: t('dashboard.queue.pendingDecision', { defaultValue: 'Pending Decision' }), value: cases.filter((c) => c.caseStatus === 'Under_Review').length, icon: <AlertCircle className="text-orange-600" size={24} />, color: 'bg-orange-50', onClick: '/cases' },
        { label: t('case.status.Approved', { defaultValue: 'Approved' }), value: cases.filter((c) => c.caseStatus === 'Approved').length, icon: <CheckCircle className="text-green-600" size={24} />, color: 'bg-green-50' },
        { label: t('case.status.Rejected', { defaultValue: 'Rejected' }), value: cases.filter((c) => c.caseStatus === 'Rejected').length, icon: <XCircle className="text-red-600" size={24} />, color: 'bg-red-50' },
        {
          label: t('dashboard.queue.thisMonth', { defaultValue: 'This Month' }),
          value: cases.filter((c) => {
            const d = new Date(c.intakeDate);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length,
          icon: <TrendingUp className="text-blue-600" size={24} />,
          color: 'bg-blue-50',
        },
      ];
    case 'accounts':
      return [
        { label: t('dashboard.queue.approvedPendingPayment', { defaultValue: 'Approved (Pending Payment)' }), value: cases.filter((c) => c.caseStatus === 'Approved').length, icon: <CheckCircle className="text-green-600" size={24} />, color: 'bg-green-50', onClick: '/cases' },
        { label: t('dashboard.queue.financeQueue', { defaultValue: 'Finance Queue' }), value: cases.filter((c) => ['Approved', 'Rejected'].includes(c.caseStatus)).length, icon: <FileText className="text-gray-600" size={24} />, color: 'bg-gray-50' },
        { label: t('dashboard.queue.active', { defaultValue: 'Active' }), value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length, icon: <CheckCircle className="text-blue-600" size={24} />, color: 'bg-blue-50' },
        { label: t('case.status.Rejected', { defaultValue: 'Rejected' }), value: cases.filter((c) => c.caseStatus === 'Rejected').length, icon: <XCircle className="text-red-600" size={24} />, color: 'bg-red-50' },
      ];
    case 'beni_volunteer':
      return [
        { label: t('dashboard.queue.activeMonitoring', { defaultValue: 'Active Monitoring' }), value: cases.filter((c) => c.caseStatus === 'Approved' || c.caseStatus === 'Closed').length, icon: <Heart className="text-pink-600" size={24} />, color: 'bg-pink-50', onClick: '/cases' },
        { label: t('dashboard.queue.totalCases', { defaultValue: 'Total Cases' }), value: cases.length, icon: <TrendingUp className="text-blue-600" size={24} />, color: 'bg-blue-50' },
        { label: t('case.status.Approved', { defaultValue: 'Approved' }), value: cases.filter((c) => c.caseStatus === 'Approved').length, icon: <CheckCircle className="text-green-600" size={24} />, color: 'bg-green-50' },
        { label: t('case.status.Under_Review', { defaultValue: 'Under Review' }), value: cases.filter((c) => c.caseStatus === 'Under_Review').length, icon: <Clock className="text-orange-600" size={24} />, color: 'bg-orange-50' },
      ];
    case 'admin':
    default:
      return [
        { label: t('dashboard.queue.totalCases', { defaultValue: 'Total Cases' }), value: cases.length, icon: <FileText className="text-teal-600" size={24} />, color: 'bg-teal-50', onClick: '/cases' },
        { label: t('dashboard.queue.active', { defaultValue: 'Active' }), value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length, icon: <TrendingUp className="text-blue-600" size={24} />, color: 'bg-blue-50' },
        { label: t('case.status.Approved', { defaultValue: 'Approved' }), value: cases.filter((c) => c.caseStatus === 'Approved').length, icon: <CheckCircle className="text-green-600" size={24} />, color: 'bg-green-50' },
        { label: t('dashboard.queue.pendingReview', { defaultValue: 'Pending Review' }), value: cases.filter((c) => c.caseStatus === 'Under_Review').length, icon: <Clock className="text-orange-600" size={24} />, color: 'bg-orange-50' },
      ];
  }
}

function QueueCard({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <NfiCard className={`${color} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`} padding="sm">
      <div className="flex items-center gap-3" onClick={onClick}>
        <div className="p-2 bg-white rounded-lg">{icon}</div>
        <div>
          <p className="text-2xl font-bold text-[var(--nfi-text)]">{value}</p>
          <p className="text-xs text-[var(--nfi-text-secondary)]">{label}</p>
        </div>
      </div>
    </NfiCard>
  );
}

function QuickLinkCard({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 bg-white border border-[var(--nfi-border)] rounded-lg hover:shadow-md transition-shadow text-left"
    >
      <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
      <p className="font-medium text-[var(--nfi-text)]">{label}</p>
    </button>
  );
}
