import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { Download, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';

interface LeadershipData {
  district: string;
  totalBeneficiaries: number;
  casesProcessed: number;
  casesApproved: number;
  casesRejected: number;
  avgApprovalTime: number;
  totalFundsUtilized: number;
  utilizationRate: number;
}

const sampleData: LeadershipData[] = [
  {
    district: 'District A',
    totalBeneficiaries: 1250,
    casesProcessed: 385,
    casesApproved: 348,
    casesRejected: 37,
    avgApprovalTime: 2.1,
    totalFundsUtilized: 8540000,
    utilizationRate: 85.4,
  },
  {
    district: 'District B',
    totalBeneficiaries: 980,
    casesProcessed: 298,
    casesApproved: 267,
    casesRejected: 31,
    avgApprovalTime: 2.4,
    totalFundsUtilized: 6230000,
    utilizationRate: 82.3,
  },
  {
    district: 'District C',
    totalBeneficiaries: 1540,
    casesProcessed: 469,
    casesApproved: 425,
    casesRejected: 44,
    avgApprovalTime: 1.9,
    totalFundsUtilized: 9850000,
    utilizationRate: 88.5,
  },
  {
    district: 'District D',
    totalBeneficiaries: 740,
    casesProcessed: 225,
    casesApproved: 198,
    casesRejected: 27,
    avgApprovalTime: 2.6,
    totalFundsUtilized: 4120000,
    utilizationRate: 79.2,
  },
  {
    district: 'District E',
    totalBeneficiaries: 1120,
    casesProcessed: 340,
    casesApproved: 306,
    casesRejected: 34,
    avgApprovalTime: 2.2,
    totalFundsUtilized: 7640000,
    utilizationRate: 84.6,
  },
  {
    district: 'District F',
    totalBeneficiaries: 890,
    casesProcessed: 272,
    casesApproved: 242,
    casesRejected: 30,
    avgApprovalTime: 2.3,
    totalFundsUtilized: 5890000,
    utilizationRate: 81.2,
  },
  {
    district: 'District G',
    totalBeneficiaries: 1360,
    casesProcessed: 415,
    casesApproved: 378,
    casesRejected: 37,
    avgApprovalTime: 2.0,
    totalFundsUtilized: 8920000,
    utilizationRate: 87.1,
  },
];

export function LeadershipMonthly() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [selectedFY, setSelectedFY] = useState<string>('2024-25');
  const [selectedMonth, setSelectedMonth] = useState<string>('12');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dataAsOf = new Date(2024, 11, 15);

  const handleExport = async () => {
    try {
      setExporting(true);
      await provider.createReportRun({
        templateId: 'leadership-monthly',
        templateCode: 'LEADERSHIP_MONTHLY',
        templateName: 'Leadership Monthly',
        filters: {
          fiscalYear: selectedFY,
          month: parseInt(selectedMonth),
        },
        dataAsOf,
      });

      const csv = generateCSV(sampleData);
      downloadCSV(csv, `leadership-monthly-${selectedFY}-m${selectedMonth}`);
      showToast('Report exported successfully', 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting report:', error);
      showToast('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = (data: LeadershipData[]): string => {
    const headers = [
      'District',
      'Total Beneficiaries',
      'Cases Processed',
      'Cases Approved',
      'Cases Rejected',
      'Avg Approval Time (Days)',
      'Total Funds Utilized',
      'Utilization Rate %',
    ];
    const rows = data.map(row => [
      row.district,
      row.totalBeneficiaries,
      row.casesProcessed,
      row.casesApproved,
      row.casesRejected,
      row.avgApprovalTime,
      row.totalFundsUtilized,
      row.utilizationRate,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to Reports"
          >
            <ArrowLeft size={20} className="text-[var(--nfi-text)]" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Leadership Monthly</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">District-level program performance summary</p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">
                Fiscal Year
              </label>
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]"
              >
                <option value="2024-25">FY 2024-25</option>
                <option value="2023-24">FY 2023-24</option>
                <option value="2022-23">FY 2022-23</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]"
              >
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-4 py-2 bg-[var(--nfi-primary)] text-white rounded-lg hover:bg-[var(--nfi-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Download size={16} />
                {exporting ? 'Exporting...' : 'Export & Download'}
              </button>
            </div>
          </div>

          <div className="text-sm text-[var(--nfi-text-secondary)] mb-4">
            Data as of: <span className="font-medium">{dataAsOf.toLocaleDateString()}</span>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">District</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Beneficiaries</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Processed</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Approved</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Rejected</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Avg Time</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Funds Used</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Util. %</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((row, idx) => (
                    <tr key={idx} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.district}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.totalBeneficiaries}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.casesProcessed}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.casesApproved}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.casesRejected}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.avgApprovalTime}d</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">
                        ₹{(row.totalFundsUtilized / 100000).toFixed(1)}L
                      </td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.utilizationRate}%</td>
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
