import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';
import { getAuthState } from '../../utils/auth';
import { filterCasesForAuth } from '../../utils/roleAccess';
import {
  FISCAL_YEAR_OPTIONS,
  HOSPITAL_MIS_DEMO_ROWS,
  MIS_KPI_LABELS,
  MIS_DEMO_FISCAL_YEAR,
  MIS_DEMO_LAST_REFRESH,
  MIS_DEMO_MONTH,
  MONTH_OPTIONS,
  calculateConversionRatio,
  downloadCSV,
  formatCurrencyCompact,
  formatDownloadTimestamp,
  formatMISDateTime,
  isDemoLeadershipPeriod,
  sameMonth,
  toCSV,
  type HospitalRow,
} from '../../utils/misReporting';
import type { CaseWithDetails } from '../../data/providers/DataProvider';

export function HospitalMISMonthly() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const authState = getAuthState();
  const authScopeKey = `${authState.activeRole || 'none'}:${authState.activeUser?.userId || 'anon'}:${authState.activeUser?.hospitalId || 'all'}`;
  const [cases, setCases] = useState<CaseWithDetails[]>([]);
  const [selectedFY, setSelectedFY] = useState<string>(MIS_DEMO_FISCAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<string>(MIS_DEMO_MONTH);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const loadCases = async () => {
      try {
        setLoading(true);
        const allCases = await provider.listCases();
        const scopedCases = filterCasesForAuth(authState, allCases);
        setCases(scopedCases);
        setLastRefresh(new Date().toISOString());
      } catch (error) {
        console.error('Error loading Hospital MIS:', error);
        showToast(t('reports.loadFailed', { defaultValue: 'Failed to load Hospital MIS - Monthly' }), 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, [authScopeKey, provider, showToast]);

  const filteredCases = useMemo(
    () => cases.filter((item) => sameMonth(item.intakeDate, selectedFY, selectedMonth)),
    [cases, selectedFY, selectedMonth],
  );

  const liveRows = useMemo<HospitalRow[]>(() => {
    const grouped = new Map<string, HospitalRow>();
    filteredCases.forEach((item) => {
      const key = item.hospitalName || 'Unknown Hospital';
      const current = grouped.get(key) || {
        hospitalName: key,
        totalEnquires: 0,
        approvedCases: 0,
        rejectedCases: 0,
        approvedValue: 0,
      };
      current.totalEnquires += 1;
      if (item.caseStatus === 'Approved' || item.caseStatus === 'Closed') current.approvedCases += 1;
      if (item.caseStatus === 'Rejected') current.rejectedCases += 1;
      current.approvedValue += item.approvedAmount || 0;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => b.totalEnquires - a.totalEnquires);
  }, [filteredCases]);

  const rows = useMemo(
    () => (liveRows.length > 0 ? liveRows : isDemoLeadershipPeriod(selectedFY, selectedMonth) ? HOSPITAL_MIS_DEMO_ROWS : []),
    [liveRows, selectedFY, selectedMonth],
  );

  const summary = useMemo(() => {
    const totalEnquires = rows.reduce((sum, row) => sum + row.totalEnquires, 0);
    const approvedCases = rows.reduce((sum, row) => sum + row.approvedCases, 0);
    const rejectedCases = rows.reduce((sum, row) => sum + row.rejectedCases, 0);
    return {
      totalEnquires,
      approvedCases,
      rejectedCases,
      conversionRatio: calculateConversionRatio(approvedCases, totalEnquires),
    };
  }, [rows]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await provider.createReportRun({
        templateId: 'hospital-mis-monthly',
        templateCode: 'HOSPITAL_MIS_MONTHLY',
        templateName: 'Hospital MIS - Monthly',
        filters: { fiscalYear: selectedFY, month: Number(selectedMonth) },
        dataAsOf: new Date(`${selectedFY.slice(0, 4)}-${selectedMonth.padStart(2, '0')}-01`),
      });
      downloadCSV(
        toCSV(
          ['Hospital', MIS_KPI_LABELS.totalEnquires, MIS_KPI_LABELS.approvedCases, MIS_KPI_LABELS.rejectedCases, MIS_KPI_LABELS.conversionRatio, 'Approved Value'],
          rows.map((row) => [
            row.hospitalName,
            row.totalEnquires,
            row.approvedCases,
            row.rejectedCases,
            `${calculateConversionRatio(row.approvedCases, row.totalEnquires)}%`,
            row.approvedValue,
          ]),
        ),
        `Hospital_MIS_Monthly_${formatDownloadTimestamp()}`,
      );
      showToast(t('reports.downloadStarted', { defaultValue: 'Download started' }), 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting Hospital MIS:', error);
      showToast(t('reports.exportFailed', { defaultValue: 'Failed to export report' }), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reports')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title={t('reports.backToReports', { defaultValue: 'Back to Reports' })}>
            <ArrowLeft size={20} className="text-[var(--nfi-text)]" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">{t('reports.surfaces.HOSPITAL_MIS_MONTHLY.title', { defaultValue: 'Hospital MIS - Monthly' })}</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Hospital-wise monthly scorecard with totals as on date and the agreed MIS KPIs.</p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">{t('reports.fiscalYear', { defaultValue: 'Fiscal Year' })}</label>
              <select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]">
                {FISCAL_YEAR_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">{t('reports.month', { defaultValue: 'Month' })}</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]">
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{t(`reports.months.${option.value}`, { defaultValue: option.label })}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">{t('reports.totalsAsOn', { defaultValue: 'Totals as on' })}</p>
              <p className="text-lg font-semibold text-[var(--nfi-text)] mt-1">
                {t(`reports.months.${selectedMonth}`, { defaultValue: MONTH_OPTIONS.find((option) => option.value === selectedMonth)?.label || selectedMonth })} {selectedFY}
              </p>
              <div className="flex items-center gap-2 text-sm text-[var(--nfi-text-secondary)] mt-2">
                <RefreshCw size={14} />
                {t('common.lastRefresh')}: {formatMISDateTime(rows.length > 0 && liveRows.length === 0 ? MIS_DEMO_LAST_REFRESH : lastRefresh)}
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-2 bg-[var(--nfi-primary)] text-white rounded-lg hover:bg-[var(--nfi-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Download size={16} />
                {exporting ? t('common.exporting', { defaultValue: 'Exporting...' }) : t('common.exportDownload', { defaultValue: 'Export / Download' })}
              </button>
            </div>
          </div>
        </NfiCard>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard label={t('reports.kpis.totalEnquires', { defaultValue: MIS_KPI_LABELS.totalEnquires })} value={summary.totalEnquires} />
          <MetricCard label={t('reports.kpis.approvedCases', { defaultValue: MIS_KPI_LABELS.approvedCases })} value={summary.approvedCases} />
          <MetricCard label={t('reports.kpis.rejectedCases', { defaultValue: MIS_KPI_LABELS.rejectedCases })} value={summary.rejectedCases} />
          <MetricCard label={t('reports.kpis.conversionRatio', { defaultValue: MIS_KPI_LABELS.conversionRatio })} value={`${summary.conversionRatio}%`} />
        </div>

        <NfiCard>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Hospital Scorecard</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">This is the lightweight prototype version of the hospital monthly MIS with only the agreed case KPI set.</p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">{t('common.loadingData')}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-10 text-[var(--nfi-text-secondary)]">No hospital MIS data is available for the selected month.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Hospital</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.totalEnquires}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.approvedCases}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.rejectedCases}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">{MIS_KPI_LABELS.conversionRatio}</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Approved Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.hospitalName} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.hospitalName}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.totalEnquires}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.approvedCases}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.rejectedCases}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{calculateConversionRatio(row.approvedCases, row.totalEnquires)}%</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.approvedValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </NfiCard>
      </div>
    </Layout>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <NfiCard className="bg-white border border-[var(--nfi-border)]">
      <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">{label}</p>
      <p className="text-3xl font-bold text-[var(--nfi-text)] mt-2">{value}</p>
    </NfiCard>
  );
}
