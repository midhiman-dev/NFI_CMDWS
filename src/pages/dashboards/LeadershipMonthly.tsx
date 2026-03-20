import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';
import {
  FISCAL_YEAR_OPTIONS,
  LEADERSHIP_MIS_DEMO_ROWS,
  MIS_DEMO_FISCAL_YEAR,
  MIS_DEMO_LAST_REFRESH,
  downloadCSV,
  formatCurrencyCompact,
  formatDownloadTimestamp,
  formatMISDateTime,
  isDemoLeadershipPeriod,
  toCSV,
} from '../../utils/misReporting';

export function LeadershipMonthly() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const [selectedFY, setSelectedFY] = useState<string>(MIS_DEMO_FISCAL_YEAR);
  const [exporting, setExporting] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>(new Date().toISOString());

  useEffect(() => {
    setLastRefresh(new Date().toISOString());
  }, [selectedFY]);

  const rows = useMemo(
    () => (isDemoLeadershipPeriod(selectedFY) ? LEADERSHIP_MIS_DEMO_ROWS : []),
    [selectedFY],
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      await provider.createReportRun({
        templateId: 'leadership-monthly',
        templateCode: 'MONTHLY_MIS_LEADERSHIP',
        templateName: 'Monthly MIS - Leadership Team',
        filters: {
          fiscalYear: selectedFY,
        },
        dataAsOf: new Date(`${selectedFY.slice(0, 4)}-12-31`),
      });
      downloadCSV(
        toCSV(
          [
            'Month',
            'Beneficiary - Enquiries',
            'Beneficiary - Approved',
            'Partner Hospital - Enrollment - Identified',
            'Partner Hospital - Enrollment - Status',
            'Donation - Individuals',
            'Donation - CSR',
            'Donation - Family Foundation',
            'Donation - CfNFI',
            'Donation - Campaigns',
            'Donation - Total',
            'Program Cost',
            'Ops Cost',
            'Ratio- Program Cost/Ops Cost',
          ],
          rows.map((row) => [
            row.month,
            row.beneficiaryEnquiries,
            row.beneficiaryApproved,
            row.partnerHospitalIdentified,
            row.partnerHospitalStatus,
            row.donationIndividuals,
            row.donationCSR,
            row.donationFamilyFoundation,
            row.donationCfNFI,
            row.donationCampaigns,
            row.donationTotal,
            row.programCost,
            row.opsCost,
            row.ratio,
          ]),
        ),
        `Leadership_Monthly_MIS_${formatDownloadTimestamp()}`,
      );
      showToast(t('reports.downloadStarted', { defaultValue: 'Download started' }), 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting Leadership MIS:', error);
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">{t('reports.surfaces.MONTHLY_MIS_LEADERSHIP.title', { defaultValue: 'Monthly MIS - Leadership Team' })}</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              NFI Monthly Performance Dashboard aligned to the source layout with monthly rollups and a total row.
            </p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">{t('reports.fiscalYear', { defaultValue: 'Fiscal Year' })}</label>
              <select value={selectedFY} onChange={(e) => setSelectedFY(e.target.value)} className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]">
                {FISCAL_YEAR_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--nfi-text-secondary)]">Dashboard period</p>
              <p className="text-lg font-semibold text-[var(--nfi-text)] mt-1">{selectedFY}</p>
              <div className="flex items-center gap-2 text-sm text-[var(--nfi-text-secondary)] mt-2">
                <RefreshCw size={14} />
                {t('common.lastRefresh')}: {formatMISDateTime(rows.length > 0 ? MIS_DEMO_LAST_REFRESH : lastRefresh)}
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
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">NFI- Monthly Performance Dashboard</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
              The visible groups follow the source template: Beneficiary, Partner Hospital - Enrollment, Donation, Program Cost, Ops Cost, and Ratio.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="text-center py-10 text-[var(--nfi-text-secondary)]">No monthly leadership MIS data is available for the selected fiscal year.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[1500px]">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th rowSpan={2} className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Month</th>
                    <th colSpan={2} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Beneficiary</th>
                    <th colSpan={2} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Partner Hospital - Enrollment</th>
                    <th colSpan={6} className="text-center py-3 px-4 font-semibold text-[var(--nfi-text)]">Donation</th>
                    <th rowSpan={2} className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Program Cost</th>
                    <th rowSpan={2} className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Ops Cost</th>
                    <th rowSpan={2} className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Ratio- Program Cost/Ops Cost</th>
                  </tr>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Enquiries</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Approved</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Identified</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Individuals</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">CSR</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Family Foundation</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">CfNFI</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Campaigns</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.month} className={`border-b border-[var(--nfi-border)] hover:bg-gray-50 ${row.month === 'Total' ? 'bg-slate-50 font-semibold' : ''}`}>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.month}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.beneficiaryEnquiries}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.beneficiaryApproved}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.partnerHospitalIdentified}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.partnerHospitalStatus}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.donationIndividuals)}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.donationCSR)}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.donationFamilyFoundation)}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.donationCfNFI)}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.donationCampaigns)}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.donationTotal)}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.programCost)}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{formatCurrencyCompact(row.opsCost)}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.ratio}</td>
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
