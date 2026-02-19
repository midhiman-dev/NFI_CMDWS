import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { Download, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';

interface ProgramData {
  date: string;
  programCode: string;
  programName: string;
  casesRegistered: number;
  casesApproved: number;
  casesRejected: number;
  totalAmount: number;
  avgApprovalTime: number;
}

const sampleData: ProgramData[] = [
  {
    date: '2024-12-15',
    programCode: 'P001',
    programName: 'Emergency Financial Assistance',
    casesRegistered: 42,
    casesApproved: 38,
    casesRejected: 4,
    totalAmount: 1200000,
    avgApprovalTime: 2.3,
  },
  {
    date: '2024-12-15',
    programCode: 'P002',
    programName: 'Surgery Support Program',
    casesRegistered: 28,
    casesApproved: 25,
    casesRejected: 3,
    totalAmount: 850000,
    avgApprovalTime: 1.8,
  },
  {
    date: '2024-12-15',
    programCode: 'P003',
    programName: 'Critical Care Support',
    casesRegistered: 35,
    casesApproved: 31,
    casesRejected: 4,
    totalAmount: 920000,
    avgApprovalTime: 2.1,
  },
  {
    date: '2024-12-15',
    programCode: 'P004',
    programName: 'Pediatric Care Program',
    casesRegistered: 22,
    casesApproved: 20,
    casesRejected: 2,
    totalAmount: 540000,
    avgApprovalTime: 1.6,
  },
  {
    date: '2024-12-15',
    programCode: 'P005',
    programName: 'Chronic Disease Management',
    casesRegistered: 18,
    casesApproved: 16,
    casesRejected: 2,
    totalAmount: 380000,
    avgApprovalTime: 2.4,
  },
  {
    date: '2024-12-15',
    programCode: 'P006',
    programName: 'Disability Support Scheme',
    casesRegistered: 12,
    casesApproved: 10,
    casesRejected: 2,
    totalAmount: 290000,
    avgApprovalTime: 2.9,
  },
  {
    date: '2024-12-15',
    programCode: 'P007',
    programName: 'Mental Health Initiative',
    casesRegistered: 8,
    casesApproved: 7,
    casesRejected: 1,
    totalAmount: 160000,
    avgApprovalTime: 2.0,
  },
];

export function DailyMISPrograms() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<string>('2024-12-15');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dataAsOf = new Date(2024, 11, 15);

  const handleExport = async () => {
    try {
      setExporting(true);
      await provider.createReportRun({
        templateId: 'daily-mis-programs',
        templateCode: 'DAILY_MIS_PROGRAMS',
        templateName: 'Daily MIS Programs',
        filters: {
          date: selectedDate,
        },
        dataAsOf,
      });

      const csv = generateCSV(sampleData);
      downloadCSV(csv, `daily-mis-programs-${selectedDate}`);
      showToast('Report exported successfully', 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting report:', error);
      showToast('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = (data: ProgramData[]): string => {
    const headers = [
      'Date',
      'Program Code',
      'Program Name',
      'Cases Registered',
      'Cases Approved',
      'Cases Rejected',
      'Total Amount',
      'Avg Approval Time (Days)',
    ];
    const rows = data.map(row => [
      row.date,
      row.programCode,
      row.programName,
      row.casesRegistered,
      row.casesApproved,
      row.casesRejected,
      row.totalAmount,
      row.avgApprovalTime,
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Daily MIS Programs</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Daily program performance metrics</p>
          </div>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-[var(--nfi-text)] mb-2">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg bg-white text-[var(--nfi-text)]"
              />
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
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Program Name</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Registered</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Approved</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Rejected</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Total Amount</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Avg Approval Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((row, idx) => (
                    <tr key={idx} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.programName}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.casesRegistered}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.casesApproved}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.casesRejected}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">
                        ₹{(row.totalAmount / 100000).toFixed(1)}L
                      </td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.avgApprovalTime}d</td>
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
