import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiBadge } from '../components/design-system/NfiBadge';
import { UserRole } from '../types';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Building2,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import { getAuthState } from '../utils/auth';
import { useAppContext } from '../App';
import type { CaseWithDetails } from '../data/providers/DataProvider';

export function Dashboard() {
  const navigate = useNavigate();
  const { provider, mode } = useAppContext();
  const [cases, setCases] = useState<CaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const authState = getAuthState();
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (loadedRef.current) return;
      try {
        setError(null);
        const casesData = await provider.listCases();
        if (!cancelled) {
          setCases(casesData);
          loadedRef.current = true;
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load dashboard data.');
          console.error('Dashboard load error:', err);
          setLoading(false);
        }
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [provider]);

  const queueMetrics = getRoleQueueMetrics(authState.activeRole || 'admin', cases);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-4"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading dashboard...</p>
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Dashboard</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              Welcome back, {authState.activeUser?.fullName || 'User'}
            </p>
          </div>
          {mode === 'DEMO' && (
            <NfiBadge tone="warning">Demo Mode</NfiBadge>
          )}
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
          <h2 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">My Queue</h2>
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
            <h2 className="text-lg font-semibold text-[var(--nfi-text)] mb-3">Quick Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <QuickLinkCard
                icon={<Users className="text-blue-600" size={20} />}
                label="Manage Users"
                onClick={() => navigate('/admin/users')}
              />
              <QuickLinkCard
                icon={<Building2 className="text-green-600" size={20} />}
                label="Hospitals"
                onClick={() => navigate('/admin/masters/hospitals')}
              />
              <QuickLinkCard
                icon={<FileText className="text-orange-600" size={20} />}
                label="Document Templates"
                onClick={() => navigate('/admin/templates/document-requirements')}
              />
            </div>
          </div>
        )}

        <NfiCard>
          <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Recent Cases</h2>
          {cases.length === 0 ? (
            <p className="text-[var(--nfi-text-secondary)] text-center py-8">No cases yet</p>
          ) : (
            <div className="space-y-3">
              {cases.slice(0, 10).map((c) => (
                <div
                  key={c.caseId}
                  className="flex items-center justify-between p-4 border border-[var(--nfi-border)] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/cases/${c.caseId}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-[var(--nfi-text)]">{c.caseRef}</p>
                      <NfiBadge tone={getStatusTone(c.caseStatus)}>{c.caseStatus.replace(/_/g, ' ')}</NfiBadge>
                    </div>
                    <p className="text-sm text-[var(--nfi-text-secondary)]">
                      {c.childName && `${c.childName} - `}
                      {c.hospitalName || 'Unknown Hospital'} - {c.processType}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--nfi-text-secondary)]">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </NfiCard>
      </div>
    </Layout>
  );
}

function getStatusTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'Approved': return 'success';
    case 'Under_Verification':
    case 'Under_Review': return 'warning';
    case 'Rejected': return 'danger';
    case 'Submitted': return 'info';
    default: return 'neutral';
  }
}

function getRoleQueueMetrics(role: UserRole, cases: CaseWithDetails[]) {
  switch (role) {
    case 'hospital_spoc':
      return [
        {
          label: 'Draft Cases',
          value: cases.filter((c) => c.caseStatus === 'Draft').length,
          icon: <FileText className="text-gray-600" size={24} />,
          color: 'bg-gray-50',
          onClick: '/cases',
        },
        {
          label: 'Submitted',
          value: cases.filter((c) => c.caseStatus === 'Submitted').length,
          icon: <TrendingUp className="text-blue-600" size={24} />,
          color: 'bg-blue-50',
          onClick: '/cases',
        },
        {
          label: 'Returned',
          value: cases.filter((c) => c.caseStatus === 'Returned').length,
          icon: <AlertCircle className="text-yellow-600" size={24} />,
          color: 'bg-yellow-50',
          onClick: '/cases',
        },
        {
          label: 'Approved',
          value: cases.filter((c) => c.caseStatus === 'Approved').length,
          icon: <CheckCircle className="text-green-600" size={24} />,
          color: 'bg-green-50',
        },
      ];

    case 'clinical':
      return [
        {
          label: 'Total Cases',
          value: cases.length,
          icon: <FileText className="text-blue-600" size={24} />,
          color: 'bg-blue-50',
          onClick: '/cases',
        },
        {
          label: 'Active Cases',
          value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length,
          icon: <TrendingUp className="text-teal-600" size={24} />,
          color: 'bg-teal-50',
          onClick: '/cases',
        },
      ];

    case 'verifier':
      return [
        {
          label: 'Submitted',
          value: cases.filter((c) => c.caseStatus === 'Submitted').length,
          icon: <FileText className="text-blue-600" size={24} />,
          color: 'bg-blue-50',
          onClick: '/cases',
        },
        {
          label: 'Under Verification',
          value: cases.filter((c) => c.caseStatus === 'Under_Verification').length,
          icon: <Clock className="text-yellow-600" size={24} />,
          color: 'bg-yellow-50',
          onClick: '/cases',
        },
        {
          label: 'Verified',
          value: cases.filter((c) => c.caseStatus === 'Under_Review').length,
          icon: <CheckCircle className="text-green-600" size={24} />,
          color: 'bg-green-50',
        },
        {
          label: 'Total Active',
          value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length,
          icon: <TrendingUp className="text-teal-600" size={24} />,
          color: 'bg-teal-50',
        },
      ];

    case 'committee_member':
      return [
        {
          label: 'Pending Decision',
          value: cases.filter((c) => c.caseStatus === 'Under_Review').length,
          icon: <AlertCircle className="text-orange-600" size={24} />,
          color: 'bg-orange-50',
          onClick: '/cases',
        },
        {
          label: 'Approved',
          value: cases.filter((c) => c.caseStatus === 'Approved').length,
          icon: <CheckCircle className="text-green-600" size={24} />,
          color: 'bg-green-50',
        },
        {
          label: 'Rejected',
          value: cases.filter((c) => c.caseStatus === 'Rejected').length,
          icon: <XCircle className="text-red-600" size={24} />,
          color: 'bg-red-50',
        },
        {
          label: 'This Month',
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
        {
          label: 'Approved (Pending Payment)',
          value: cases.filter((c) => c.caseStatus === 'Approved').length,
          icon: <CheckCircle className="text-green-600" size={24} />,
          color: 'bg-green-50',
          onClick: '/cases',
        },
        {
          label: 'Total Cases',
          value: cases.length,
          icon: <FileText className="text-gray-600" size={24} />,
          color: 'bg-gray-50',
        },
        {
          label: 'Active',
          value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length,
          icon: <CheckCircle className="text-blue-600" size={24} />,
          color: 'bg-blue-50',
        },
        {
          label: 'Rejected',
          value: cases.filter((c) => c.caseStatus === 'Rejected').length,
          icon: <XCircle className="text-red-600" size={24} />,
          color: 'bg-red-50',
        },
      ];

    case 'beni_volunteer':
      return [
        {
          label: 'Active Monitoring',
          value: cases.filter((c) => c.caseStatus === 'Approved' || c.caseStatus === 'Closed').length,
          icon: <Heart className="text-pink-600" size={24} />,
          color: 'bg-pink-50',
          onClick: '/cases',
        },
        {
          label: 'Total Cases',
          value: cases.length,
          icon: <TrendingUp className="text-blue-600" size={24} />,
          color: 'bg-blue-50',
        },
        {
          label: 'Approved',
          value: cases.filter((c) => c.caseStatus === 'Approved').length,
          icon: <CheckCircle className="text-green-600" size={24} />,
          color: 'bg-green-50',
        },
        {
          label: 'Under Review',
          value: cases.filter((c) => c.caseStatus === 'Under_Review').length,
          icon: <Clock className="text-orange-600" size={24} />,
          color: 'bg-orange-50',
        },
      ];

    case 'admin':
    default:
      return [
        {
          label: 'Total Cases',
          value: cases.length,
          icon: <FileText className="text-teal-600" size={24} />,
          color: 'bg-teal-50',
          onClick: '/cases',
        },
        {
          label: 'Active',
          value: cases.filter((c) => !['Closed', 'Rejected'].includes(c.caseStatus)).length,
          icon: <TrendingUp className="text-blue-600" size={24} />,
          color: 'bg-blue-50',
        },
        {
          label: 'Approved',
          value: cases.filter((c) => c.caseStatus === 'Approved').length,
          icon: <CheckCircle className="text-green-600" size={24} />,
          color: 'bg-green-50',
        },
        {
          label: 'Pending Review',
          value: cases.filter((c) => c.caseStatus === 'Under_Review').length,
          icon: <Clock className="text-orange-600" size={24} />,
          color: 'bg-orange-50',
        },
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
  value: number;
  color: string;
  onClick?: () => void;
}) {
  return (
    <NfiCard
      className={`${color} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      padding="sm"
    >
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
