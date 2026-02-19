import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiBadge } from '../components/design-system/NfiBadge';
import { NfiButton } from '../components/design-system/NfiButton';
import { Search, Filter, PlusCircle, Eye, Edit, CheckSquare, FileCheck, Heart, AlertTriangle } from 'lucide-react';
import { getAuthState } from '../utils/auth';
import { useAppContext } from '../App';
import type { CaseWithDetails } from '../data/providers/DataProvider';

interface CaseRow extends CaseWithDetails {
  checklistProgress: number;
}

export function Cases() {
  const navigate = useNavigate();
  const { provider } = useAppContext();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processFilter, setProcessFilter] = useState<string>('all');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const authState = getAuthState();

  useEffect(() => {
    loadCases();
  }, [provider]);

  useEffect(() => {
    applyFilters();
  }, [cases, searchTerm, statusFilter, processFilter, hospitalFilter]);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const allCases = await provider.listCases();

      const enrichedCases: CaseRow[] = allCases.map((c) => ({
        ...c,
        checklistProgress: 0,
      }));

      setCases(enrichedCases);
    } catch (err) {
      setError('Failed to load cases');
      console.error('Cases load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...cases];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.caseRef.toLowerCase().includes(term) ||
          c.beneficiaryNo?.toLowerCase().includes(term) ||
          c.childName?.toLowerCase().includes(term) ||
          c.hospitalName?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.caseStatus === statusFilter);
    }

    if (processFilter !== 'all') {
      filtered = filtered.filter((c) => c.processType === processFilter);
    }

    if (hospitalFilter !== 'all') {
      filtered = filtered.filter((c) => c.hospitalId === hospitalFilter);
    }

    setFilteredCases(filtered);
  };

  const getRoleAction = (caseItem: CaseRow) => {
    const role = authState.activeRole;

    switch (role) {
      case 'hospital_spoc':
        if (caseItem.caseStatus === 'Draft' || caseItem.caseStatus === 'Returned') {
          return {
            label: 'Continue',
            icon: <Edit size={16} />,
            variant: 'primary' as const,
            onClick: () => navigate(`/cases/${caseItem.caseId}`),
          };
        }
        return {
          label: 'View',
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(`/cases/${caseItem.caseId}`),
        };

      case 'verifier':
      case 'intake_reviewer':
        if (caseItem.caseStatus === 'Submitted' || caseItem.caseStatus === 'Under_Verification') {
          return {
            label: 'Verify',
            icon: <FileCheck size={16} />,
            variant: 'primary' as const,
            onClick: () => navigate(`/cases/${caseItem.caseId}?tab=documents`),
          };
        }
        return {
          label: 'View',
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(`/cases/${caseItem.caseId}`),
        };

      case 'committee_member':
        if (caseItem.caseStatus === 'Under_Review') {
          return {
            label: 'Decide',
            icon: <CheckSquare size={16} />,
            variant: 'primary' as const,
            onClick: () => navigate(`/cases/${caseItem.caseId}?tab=approval`),
          };
        }
        return {
          label: 'View',
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(`/cases/${caseItem.caseId}`),
        };

      case 'beni_volunteer':
        if (caseItem.caseStatus === 'Approved' || caseItem.caseStatus === 'Closed') {
          return {
            label: 'Monitor',
            icon: <Heart size={16} />,
            variant: 'primary' as const,
            onClick: () => navigate(`/cases/${caseItem.caseId}?tab=monitoring`),
          };
        }
        return {
          label: 'View',
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(`/cases/${caseItem.caseId}`),
        };

      case 'admin':
        return {
          label: 'View',
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(`/cases/${caseItem.caseId}`),
        };

      default:
        return {
          label: 'View',
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(`/cases/${caseItem.caseId}`),
        };
    }
  };

  const hospitals = cases.reduce((acc, c) => {
    if (!acc.find((h: any) => h.id === c.hospitalId)) {
      acc.push({ id: c.hospitalId, name: c.hospitalName });
    }
    return acc;
  }, [] as any[]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-4"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading cases...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Cases</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              Manage and track all cases
            </p>
          </div>

          {authState.activeRole === 'hospital_spoc' && (
            <NfiButton onClick={() => navigate('/cases/new')}>
              <PlusCircle size={20} className="mr-2" />
              New Case
            </NfiButton>
          )}
        </div>

        {error && (
          <NfiCard className="bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-red-800">{error}</p>
            </div>
          </NfiCard>
        )}

        <NfiCard>
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by case ref, beneficiary no, baby name, or hospital..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-[var(--nfi-text)]">Filters:</span>
              </div>

              <select
                value={processFilter}
                onChange={(e) => setProcessFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              >
                <option value="all">All Process Types</option>
                <option value="New">New</option>
                <option value="Renewal">Renewal</option>
                <option value="Revision">Revision</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              >
                <option value="all">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Under_Verification">Under Verification</option>
                <option value="Under_Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Closed">Closed</option>
                <option value="Returned">Returned</option>
              </select>

              <select
                value={hospitalFilter}
                onChange={(e) => setHospitalFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              >
                <option value="all">All Hospitals</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>

              {(searchTerm || statusFilter !== 'all' || processFilter !== 'all' || hospitalFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setProcessFilter('all');
                    setHospitalFilter('all');
                  }}
                  className="text-sm text-[var(--nfi-primary)] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-[var(--nfi-text-secondary)]">No cases found</p>
              <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
                Try adjusting your filters or search criteria
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Case Ref
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Beneficiary No
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Baby Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Hospital
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Process
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Checklist
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Last Updated
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((caseItem) => {
                    const action = getRoleAction(caseItem);
                    return (
                      <tr
                        key={caseItem.caseId}
                        className="border-b border-[var(--nfi-border)] hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => navigate(`/cases/${caseItem.caseId}`)}
                            className="font-medium text-[var(--nfi-primary)] hover:underline text-left"
                          >
                            {caseItem.caseRef}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">
                          {caseItem.beneficiaryNo || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">
                          {caseItem.childName || '-'}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">
                          <div>
                            <p className="font-medium">{caseItem.hospitalName || 'Unknown'}</p>
                            <p className="text-xs text-[var(--nfi-text-secondary)]">
                              Location details
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <NfiBadge tone="accent">{caseItem.processType}</NfiBadge>
                        </td>
                        <td className="py-3 px-4">
                          <NfiBadge
                            tone={
                              caseItem.caseStatus === 'Approved' || caseItem.caseStatus === 'Closed'
                                ? 'success'
                                : caseItem.caseStatus === 'Rejected'
                                ? 'error'
                                : caseItem.caseStatus === 'Draft'
                                ? 'neutral'
                                : 'warning'
                            }
                          >
                            {caseItem.caseStatus.replace('_', ' ')}
                          </NfiBadge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                              <div
                                className={`h-2 rounded-full ${
                                  caseItem.checklistProgress === 100
                                    ? 'bg-green-600'
                                    : caseItem.checklistProgress >= 50
                                    ? 'bg-yellow-600'
                                    : 'bg-red-600'
                                }`}
                                style={{ width: `${caseItem.checklistProgress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-[var(--nfi-text)] min-w-[35px]">
                              {caseItem.checklistProgress}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--nfi-text-secondary)]">
                          {new Date(caseItem.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <NfiButton
                            size="sm"
                            variant={action.variant}
                            onClick={action.onClick}
                            className="inline-flex items-center gap-1"
                          >
                            {action.icon}
                            {action.label}
                          </NfiButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredCases.length > 0 && (
            <div className="mt-4 text-sm text-[var(--nfi-text-secondary)] text-center">
              Showing {filteredCases.length} of {cases.length} cases
            </div>
          )}
        </NfiCard>
      </div>
    </Layout>
  );
}
