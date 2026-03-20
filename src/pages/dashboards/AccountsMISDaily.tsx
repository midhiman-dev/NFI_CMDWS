import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';
import {
  MIS_DEMO_FISCAL_YEAR,
  MIS_DEMO_LAST_REFRESH,
  MIS_DEMO_MONTH,
  MONTH_OPTIONS,
  buildAccountsMisDemoRows,
  downloadCSV,
  formatCurrencyCompact,
  formatDownloadTimestamp,
  formatMISDateTime,
  getMonthLabel,
  toCSV,
} from '../../utils/misReporting';

export function AccountsMISDaily() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [selectedFY, setSelectedFY] = useState<string>(MIS_DEMO_FISCAL_YEAR);
  const [selectedMonth, setSelectedMonth] = useState<string>(MIS_DEMO_MONTH);
  const [exporting, setExporting] = useState(false);

  const selectedYear = Number(selectedFY.slice(0, 4)) + (Number(selectedMonth) <= 3 ? 1 : 0);
  const rows = useMemo(() => buildAccountsMisDemoRows(selectedYear, Number(selectedMonth)), [selectedMonth, selectedYear]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await provider.createReportRun({
        templateId: 'accounts-mis-daily',
        templateCode: 'ACCOUNTS_MIS',
        templateName: 'Accounts MIS',
        filters: { fiscalYear: selectedFY, month: Number(selectedMonth) },
        dataAsOf: new Date(`${selectedYear}-${selectedMonth.padStart(2, '0')}-01`),
      });
      downloadCSV(
        toCSV(
          [
            'Date',
            'Babies Count - Completed Till date',
            'Babies Count - Completed Current Month',
            'Babies Count - Inquiries',
            'Babies Count - Rejected',
            'Babies Count - In Pipeline',
            'Partner Hospital Count - Completed',
            'Partner Hospital Count - In Pipeline',
            'Fund Status - Funds Raised (Current Month)',
            'Fund Status - Funds Raised (Daily)',
            'Fund Status - Bank (as on date)',
            'Fund Status - FD (as on Date)',
            'Fund Status - Total',
            'Committed Outflow - No of Babies',
            'Committed Outflow - Amount',
            'Surplus Funds - Total Funds Available',
            'Program Vs Ops Ratio (As on Date) - Programs',
            'Program Vs Ops Ratio (As on Date) - Operations',
            'Program Vs Ops Ratio (As on Date) - Ratio',
          ],
          rows.map((row) => [
            row.date,
            row.babiesCompletedTillDate,
            row.babiesCompletedCurrentMonth,
            row.inquiries,
            row.rejected,
            row.inPipeline,
            row.partnerCompleted,
            row.partnerInPipeline,
            row.fundsRaisedCurrentMonth,
            row.fundsRaisedDaily,
            row.bankAsOnDate,
            row.fdAsOnDate,
            row.totalFunds,
            row.committedBabies,
            row.committedAmount,
            row.totalFundsAvailable,
            row.programSpend,
            row.operationsSpend,
            row.ratio,
          ]),
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
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              Accounts MIS aligned to the month-wise finance and operations template with grouped daily columns.
            </p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">{t('reports.fiscalYear', { defaultValue: 'Fiscal Year' })}</label>
              <input
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">{t('reports.month', { defaultValue: 'Month' })}</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]">
                {MONTH_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">Selected month</p>
              <p className="text-lg font-semibold text-[var(--nfi-text)] mt-1">{getMonthLabel(selectedMonth)} {selectedYear}</p>
              <div className="flex items-center gap-2 text-sm text-[var(--nfi-text-secondary)] mt-2">
                <RefreshCw size={14} />
                {t('common.lastRefresh')}: {formatMISDateTime(MIS_DEMO_LAST_REFRESH)}
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

        <NfiCard>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Accounts MIS ({getMonthLabel(selectedMonth)})</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
              Daily rows follow the source grouping: Babies Count, Partner Hospital Count, Fund Status, Committed Outflow, Surplus Funds, and Program Vs Ops Ratio.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1800px]">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th rowSpan={2} className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Date</th>
                  <th colSpan={5} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Babies Count</th>
                  <th colSpan={2} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Partner Hospital Count</th>
                  <th colSpan={5} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Fund Status</th>
                  <th colSpan={2} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Committed Outflow</th>
                  <th colSpan={1} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Surplus Funds</th>
                  <th colSpan={3} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Program Vs Ops Ratio (As on Date)</th>
                </tr>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Completed Till date</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Completed Current Month</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Inquiries</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Rejected</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">In Pipeline</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Completed</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">In Pipeline</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Funds Raised (Current Month)</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Funds Raised (Daily)</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Bank (as on date)</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">FD (as on Date)</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Total</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">No of Babies</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Total Funds Available</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Programs</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Operations</th>
                  <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Ratio</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.date} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4 text-[var(--nfi-text)]">{row.date}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.babiesCompletedTillDate}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.babiesCompletedCurrentMonth}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.inquiries}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.rejected}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.inPipeline}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.partnerCompleted}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.partnerInPipeline}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.fundsRaisedCurrentMonth)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.fundsRaisedDaily)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.bankAsOnDate)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.fdAsOnDate)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.totalFunds)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.committedBabies}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.committedAmount)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.totalFundsAvailable)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.programSpend)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.operationsSpend)}</td>
                    <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.ratio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NfiCard>
      </div>
    </Layout>
  );
}
