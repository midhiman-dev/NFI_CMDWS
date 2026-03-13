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
  ACCOUNTS_MIS_DEMO_ROWS,
  downloadCSV,
  formatCurrencyCompact,
  formatDownloadTimestamp,
  formatMISDate,
  formatMISDateTime,
  isDemoDailyDate,
  MIS_DEMO_DATE,
  MIS_DEMO_LAST_REFRESH,
  sameDay,
  toCSV,
  type AccountsLedgerRow,
} from '../../utils/misReporting';
import type { CaseWithDetails } from '../../data/providers/DataProvider';

export function AccountsMISDaily() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const authState = getAuthState();
  const authScopeKey = `${authState.activeRole || 'none'}:${authState.activeUser?.userId || 'anon'}:${authState.activeUser?.hospitalId || 'all'}`;
  const [cases, setCases] = useState<CaseWithDetails[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(MIS_DEMO_DATE);
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
        console.error('Error loading Accounts MIS:', error);
        showToast(t('reports.loadFailed', { defaultValue: 'Failed to load Accounts MIS' }), 'error');
      } finally {
        setLoading(false);
      }
    };

    loadCases();
  }, [authScopeKey, provider, showToast]);

  const liveLedgerRows = useMemo<AccountsLedgerRow[]>(() => {
    return cases
      .filter((item) => sameDay(item.updatedAt || item.lastActionAt || item.intakeDate, selectedDate))
      .map((item) => {
        const isApproved = item.caseStatus === 'Approved' || item.caseStatus === 'Closed';
        const isRejected = item.caseStatus === 'Rejected';
        const amount = isApproved ? item.approvedAmount || 0 : isRejected ? -(item.approvedAmount || 0) : 0;
        return {
          date: selectedDate,
          voucherId: `VCH-${item.caseRef.split('/').pop() || item.caseId.slice(-4)}`,
          caseRef: item.caseRef,
          account: `${item.processType} Fund`,
          type: isApproved ? 'Approval Voucher' : isRejected ? 'Reversal Entry' : 'Pending Finance Review',
          amount,
          status: isApproved ? 'Released' : isRejected ? 'Reversed' : 'Pending',
          remarks: `${item.hospitalName || 'Hospital'} / ${item.caseStatus.replace(/_/g, ' ')}`,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [cases, selectedDate]);

  const ledgerRows = useMemo(
    () => (liveLedgerRows.length > 0 ? liveLedgerRows : isDemoDailyDate(selectedDate) ? ACCOUNTS_MIS_DEMO_ROWS : []),
    [liveLedgerRows, selectedDate],
  );

  const totals = useMemo(() => {
    const approvalVouchers = ledgerRows.filter((row) => row.type === 'Approval Voucher').length;
    const reversalEntries = ledgerRows.filter((row) => row.type === 'Reversal Entry').length;
    const netOutflow = ledgerRows.reduce((sum, row) => sum + row.amount, 0);
    return {
      approvalVouchers,
      reversalEntries,
      snapshotCases: ledgerRows.length,
      netOutflow,
    };
  }, [ledgerRows]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await provider.createReportRun({
        templateId: 'accounts-mis-daily',
        templateCode: 'ACCOUNTS_MIS',
        templateName: 'Accounts MIS',
        filters: { date: selectedDate },
        dataAsOf: new Date(selectedDate),
      });
      downloadCSV(
        toCSV(
          ['Date', 'Voucher ID', 'Case Ref', 'Account', 'Type', 'Amount', 'Status', 'Remarks'],
          ledgerRows.map((row) => [row.date, row.voucherId, row.caseRef, row.account, row.type, row.amount, row.status, row.remarks]),
        ),
        `Accounts_MIS_${formatDownloadTimestamp()}`,
      );
      showToast(t('reports.downloadStarted', { defaultValue: 'Download started' }), 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting Accounts MIS:', error);
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">{t('reports.surfaces.ACCOUNTS_MIS.title', { defaultValue: 'Accounts MIS' })}</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Daily finance snapshot with voucher-style rows derived from current case finance context.</p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">{t('common.date')}</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]"
              />
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">{t('common.dataAsOf')}</p>
              <p className="text-lg font-semibold text-[var(--nfi-text)] mt-1">{formatMISDate(selectedDate)}</p>
              <div className="flex items-center gap-2 text-sm text-[var(--nfi-text-secondary)] mt-2">
                <RefreshCw size={14} />
                {t('common.lastRefresh')}: {formatMISDateTime(ledgerRows.length > 0 && liveLedgerRows.length === 0 ? MIS_DEMO_LAST_REFRESH : lastRefresh)}
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
          <MetricCard label="Approval Vouchers" value={totals.approvalVouchers} />
          <MetricCard label="Reversal Entries" value={totals.reversalEntries} />
          <MetricCard label="Snapshot Cases" value={totals.snapshotCases} />
          <MetricCard label="Net Outflow" value={formatCurrencyCompact(totals.netOutflow)} />
        </div>

        <NfiCard>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Finance Ledger Snapshot</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">Finance rows stay distinct from leadership/program views and preserve the accounts-first framing.</p>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">{t('common.loadingData')}</p>
            </div>
          ) : ledgerRows.length === 0 ? (
            <div className="text-center py-10 text-[var(--nfi-text-secondary)]">No finance ledger rows found for the selected date.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Voucher ID</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Case Ref</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Account</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Type</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Amount</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row) => (
                    <tr key={`${row.voucherId}-${row.caseRef}`} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-[var(--nfi-text)]">{row.voucherId}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.caseRef}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{row.account}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.type}</td>
                      <td className={`text-right py-3 px-4 font-medium ${row.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatCurrencyCompact(row.amount)}
                      </td>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.status}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{row.remarks}</td>
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
