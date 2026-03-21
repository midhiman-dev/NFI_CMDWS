import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiBadge } from '../components/design-system/NfiBadge';
import { NfiButton } from '../components/design-system/NfiButton';
import { Search, Filter, PlusCircle, Eye, Edit, CheckSquare, FileCheck, Heart, AlertTriangle } from 'lucide-react';
import { getAuthState } from '../utils/auth';
import { getScopedHospitalId } from '../utils/roleAccess';
import { getHospitalDisplayStatus, getLatestRejectedEvent, getLatestReturnedEvent, listCaseWorkflowEvents } from '../utils/caseWorkflow';
import { useAppContext } from '../App';
import type { CaseWithDetails } from '../data/providers/DataProvider';
import type { CaseStatus } from '../types';
import { translateCaseStatus } from '../i18n/helpers';
import { formatBabyDisplayName, getOrderedCaseStatuses, isNewCase } from '../utils/casePresentation';
import { shouldShowBeneficiaryNo } from '../utils/caseIdentifiers';

interface CaseRow extends CaseWithDetails {
  checklistProgress: number;
  displayStatus: CaseStatus;
  returnReason?: string;
  rejectionReason?: string;
}

export function Cases() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { provider } = useAppContext();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hospitalFilter, setHospitalFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const authState = getAuthState();
  const scopedHospitalId = getScopedHospitalId(authState);
  const canFilterHospital = !scopedHospitalId;
  const isHospitalUser = authState.activeRole === 'hospital_spoc';
  const searchPlaceholder = isHospitalUser
    ? t('cases.searchPlaceholderHospital', { defaultValue: 'Search by case ref, baby name, or hospital...' })
    : t('cases.searchPlaceholder');

  useEffect(() => {
    loadCases();
  }, [provider]);

  useEffect(() => {
    const requestedStatus = searchParams.get('status');
    if (requestedStatus && ['Draft', 'Submitted', 'Returned', 'Rejected', 'Approved', 'Closed', 'Under_Review'].includes(requestedStatus)) {
      setStatusFilter(requestedStatus);
    }
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [cases, searchTerm, statusFilter, hospitalFilter, isHospitalUser]);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const allCases = await provider.listCases();

      const enrichedCases: CaseRow[] = allCases.map((c) => {
        const workflow = listCaseWorkflowEvents(c.caseId);
        const latestReturn = getLatestReturnedEvent(workflow);
        const latestReject = getLatestRejectedEvent(workflow);
        return {
          ...c,
          checklistProgress: 0,
          displayStatus: getHospitalDisplayStatus(c.caseStatus, workflow),
          returnReason: latestReturn?.reason,
          rejectionReason: latestReject?.reason,
        };
      });

      setCases(enrichedCases);
    } catch (err) {
      setError(t('cases.loadFailed', { defaultValue: 'Failed to load cases' }));
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
          (!isHospitalUser && c.beneficiaryNo?.toLowerCase().includes(term)) ||
          c.childName?.toLowerCase().includes(term) ||
          c.hospitalName?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => (isHospitalUser ? c.displayStatus : c.caseStatus) === statusFilter);
    }

    if (hospitalFilter !== 'all') {
      filtered = filtered.filter((c) => c.hospitalId === hospitalFilter);
    }

    setFilteredCases(filtered);
  };

  const getCaseOpenPath = (caseItem: CaseRow) => {
    if (isHospitalUser && (caseItem.displayStatus === 'Draft' || caseItem.displayStatus === 'Returned')) {
      return `/cases/${caseItem.caseId}/wizard`;
    }
    return `/cases/${caseItem.caseId}`;
  };

  const getRoleAction = (caseItem: CaseRow) => {
    const role = authState.activeRole;

    switch (role) {
      case 'hospital_spoc':
        if (caseItem.displayStatus === 'Draft' || caseItem.displayStatus === 'Returned') {
          return {
            label: caseItem.displayStatus === 'Returned' ? t('common.fixResubmit', { defaultValue: 'Fix & Resubmit' }) : t('common.continue', { defaultValue: 'Continue' }),
            icon: <Edit size={16} />,
            variant: 'primary' as const,
            onClick: () => navigate(getCaseOpenPath(caseItem)),
          };
        }
        return {
          label: t('common.view', { defaultValue: 'View' }),
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(getCaseOpenPath(caseItem)),
        };

      case 'clinical':
        return {
          label: t('common.view', { defaultValue: 'View' }),
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(getCaseOpenPath(caseItem)),
        };

      case 'verifier':
        if (caseItem.caseStatus === 'Submitted' || caseItem.caseStatus === 'Under_Verification') {
          return {
            label: t('common.verify', { defaultValue: 'Verify' }),
            icon: <FileCheck size={16} />,
            variant: 'primary' as const,
            onClick: () => navigate(`/cases/${caseItem.caseId}?tab=documents`),
          };
        }
        return {
          label: t('common.view', { defaultValue: 'View' }),
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(getCaseOpenPath(caseItem)),
        };

      case 'committee_member':
        if (caseItem.caseStatus === 'Under_Review') {
          return {
            label: t('common.decide', { defaultValue: 'Decide' }),
            icon: <CheckSquare size={16} />,
            variant: 'primary' as const,
            onClick: () => navigate(`/cases/${caseItem.caseId}?tab=approval`),
          };
        }
        return {
          label: t('common.view', { defaultValue: 'View' }),
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(getCaseOpenPath(caseItem)),
        };

      case 'beni_volunteer':
        if (caseItem.caseStatus === 'Approved' || caseItem.caseStatus === 'Closed') {
          return {
            label: t('common.monitor', { defaultValue: 'Monitor' }),
            icon: <Heart size={16} />,
            variant: 'primary' as const,
            onClick: () => navigate(`/cases/${caseItem.caseId}?tab=monitoring`),
          };
        }
        return {
          label: t('common.view', { defaultValue: 'View' }),
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(getCaseOpenPath(caseItem)),
        };

      case 'admin':
        return {
          label: t('common.view', { defaultValue: 'View' }),
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(getCaseOpenPath(caseItem)),
        };

      default:
        return {
          label: t('common.view', { defaultValue: 'View' }),
          icon: <Eye size={16} />,
          variant: 'secondary' as const,
          onClick: () => navigate(getCaseOpenPath(caseItem)),
        };
    }
  };

  const hospitals = cases.reduce((acc, c) => {
    if (!acc.find((h: any) => h.id === c.hospitalId)) {
      acc.push({ id: c.hospitalId, name: c.hospitalName });
    }
    return acc;
  }, [] as any[]);

  const hospitalBuckets = useMemo(
    () => ({
      Draft: cases.filter((c) => c.displayStatus === 'Draft').length,
      Submitted: cases.filter((c) => c.displayStatus === 'Submitted').length,
      Returned: cases.filter((c) => c.displayStatus === 'Returned').length,
      Approved: cases.filter((c) => c.displayStatus === 'Approved' || c.displayStatus === 'Closed').length,
      Rejected: cases.filter((c) => c.displayStatus === 'Rejected').length,
    }),
    [cases]
  );

  const orderedStatusOptions = useMemo(
    () =>
      getOrderedCaseStatuses([
        'Draft',
        'Submitted',
        'Under_Verification',
        'Under_Review',
        'Returned',
        'Approved',
        'Rejected',
        'Closed',
      ]),
    []
  );

  if (loading) {
    return (
      <Layout>
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-4"></div>
              <p className="text-[var(--nfi-text-secondary)]">{t('cases.loading', { defaultValue: 'Loading cases...' })}</p>
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">{t('cases.title')}</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              {t('cases.subtitle')}
            </p>
          </div>

          {authState.activeRole === 'hospital_spoc' && (
            <NfiButton onClick={() => navigate('/cases/new')}>
              <PlusCircle size={20} className="mr-2" />
              {t('nav.newCase')}
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
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              />
            </div>

            {isHospitalUser && (
              <div className="flex flex-wrap items-center gap-2">
                {(['Draft', 'Submitted', 'Returned', 'Approved', 'Rejected'] as const).map((bucket) => {
                  const active = statusFilter === bucket;
                  return (
                    <button
                      key={bucket}
                      onClick={() => setStatusFilter(bucket)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        active
                          ? 'bg-[var(--nfi-primary)] text-white border-[var(--nfi-primary)]'
                          : 'bg-white text-[var(--nfi-text)] border-[var(--nfi-border)] hover:bg-[var(--nfi-bg-light)]'
                      }`}
                    >
                      {translateCaseStatus(bucket)} ({hospitalBuckets[bucket]})
                    </button>
                  );
                })}
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-[var(--nfi-primary)] text-white border-[var(--nfi-primary)]'
                      : 'bg-white text-[var(--nfi-text)] border-[var(--nfi-border)] hover:bg-[var(--nfi-bg-light)]'
                  }`}
                >
                  {t('common.all')} ({cases.length})
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-[var(--nfi-text)]">{t('common.filters')}:</span>
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
              >
                <option value="all">{t('common.allStatus')}</option>
                {orderedStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {translateCaseStatus(status)}
                  </option>
                ))}
              </select>

              {canFilterHospital && (
                <select
                  value={hospitalFilter}
                  onChange={(e) => setHospitalFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-[var(--nfi-border)] rounded-lg focus:ring-2 focus:ring-[var(--nfi-primary)] focus:border-[var(--nfi-primary)] outline-none"
                >
                  <option value="all">{t('common.allHospitals')}</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              )}

              {(searchTerm || statusFilter !== 'all' || (canFilterHospital && hospitalFilter !== 'all')) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    if (canFilterHospital) {
                      setHospitalFilter('all');
                    }
                  }}
                  className="text-sm text-[var(--nfi-primary)] hover:underline"
                >
                  {t('common.clearFilters')}
                </button>
              )}
            </div>
          </div>

          {filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-[var(--nfi-text-secondary)]">{t('cases.noCasesFound')}</p>
              <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
                {t('cases.adjustFilters')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      {t('cases.caseRef')}
                    </th>
                    {!isHospitalUser && (
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                        {t('cases.beneficiaryNo')}
                      </th>
                    )}
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      {t('cases.babyName')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      {t('cases.hospital')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      {t('common.status')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      {t('cases.checklist')}
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      {t('cases.lastUpdated')}
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--nfi-text)]">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((caseItem) => {
                    const action = getRoleAction(caseItem);
                    const showNewCase = isNewCase(caseItem.createdAt);
                    const babyDisplayName = formatBabyDisplayName(caseItem.motherName, caseItem.childName);
                    const showBeneficiaryNo = shouldShowBeneficiaryNo(authState.activeRole, caseItem.caseStatus);
                    return (
                      <tr
                        key={caseItem.caseId}
                        className={`border-b border-[var(--nfi-border)] transition-colors ${
                          showNewCase ? 'bg-sky-50/60 hover:bg-sky-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(getCaseOpenPath(caseItem))}
                              className="font-medium text-[var(--nfi-primary)] hover:underline text-left"
                            >
                              {caseItem.caseRef}
                            </button>
                            {showNewCase && <NfiBadge tone="status">New</NfiBadge>}
                          </div>
                        </td>
                        {!isHospitalUser && (
                          <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">
                            {showBeneficiaryNo ? caseItem.beneficiaryNo || '-' : '-'}
                          </td>
                        )}
                        <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">
                          <span className="font-medium">{babyDisplayName}</span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">
                          <div>
                            <p className="font-medium">{caseItem.hospitalName || t('common.unknownHospital', { defaultValue: 'Unknown' })}</p>
                            <p className="text-xs text-[var(--nfi-text-secondary)]">
                              {t('cases.locationDetails')}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <NfiBadge
                            tone={
                              (isHospitalUser ? caseItem.displayStatus : caseItem.caseStatus) === 'Approved' ||
                              (isHospitalUser ? caseItem.displayStatus : caseItem.caseStatus) === 'Closed'
                                ? 'success'
                                : (isHospitalUser ? caseItem.displayStatus : caseItem.caseStatus) === 'Rejected'
                                ? 'error'
                                : (isHospitalUser ? caseItem.displayStatus : caseItem.caseStatus) === 'Draft'
                                ? 'neutral'
                                : 'warning'
                            }
                          >
                            {translateCaseStatus(isHospitalUser ? caseItem.displayStatus : caseItem.caseStatus)}
                          </NfiBadge>
                          {isHospitalUser && caseItem.displayStatus === 'Returned' && caseItem.returnReason && (
                            <p className="text-xs text-amber-700 mt-1 max-w-[280px] truncate" title={caseItem.returnReason}>
                              {t('cases.returnedReason', { defaultValue: 'Reason: {{reason}}', reason: caseItem.returnReason })}
                            </p>
                          )}
                          {isHospitalUser && caseItem.displayStatus === 'Rejected' && caseItem.rejectionReason && (
                            <p className="text-xs text-red-700 mt-1 max-w-[280px] truncate" title={caseItem.rejectionReason}>
                              {t('cases.rejectedReason', { defaultValue: 'Rejected: {{reason}}', reason: caseItem.rejectionReason })}
                            </p>
                          )}
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
              {t('cases.showingCount', {
                defaultValue: 'Showing {{filtered}} of {{total}} cases',
                filtered: filteredCases.length,
                total: cases.length,
              })}
            </div>
          )}
        </NfiCard>
      </div>
    </Layout>
  );
}
