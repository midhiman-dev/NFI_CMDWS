import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { Download, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';
import type { ReportTemplate } from '../../types';

interface HospitalMISData {
  hospitalId: string;
  hospitalName: string;
  totalAdmissions: number;
  avgLengthOfStay: number;
  nfiCasesApproved: number;
  nfiCasesRejected: number;
  totalApprovedAmount: number;
  approvalRate: number;
}

const sampleData: HospitalMISData[] = [
  {
    hospitalId: 'H001',
    hospitalName: 'City Medical Center',
    totalAdmissions: 245,
    avgLengthOfStay: 4.2,
    nfiCasesApproved: 189,
    nfiCasesRejected: 18,
    totalApprovedAmount: 4850000,
    approvalRate: 91.3,
  },
  {
    hospitalId: 'H002',
    hospitalName: 'District Hospital',
    totalAdmissions: 312,
    avgLengthOfStay: 5.1,
    nfiCasesApproved: 271,
    nfiCasesRejected: 32,
    totalApprovedAmount: 6230000,
    approvalRate: 89.5,
  },
  {
    hospitalId: 'H003',
    hospitalName: 'Teaching Hospital',
    totalAdmissions: 189,
    avgLengthOfStay: 6.8,
    nfiCasesApproved: 165,
    nfiCasesRejected: 15,
    totalApprovedAmount: 5120000,
    approvalRate: 91.7,
  },
  {
    hospitalId: 'H004',
    hospitalName: 'Community Clinic',
    totalAdmissions: 156,
    avgLengthOfStay: 3.5,
    nfiCasesApproved: 134,
    nfiCasesRejected: 14,
    totalApprovedAmount: 3420000,
    approvalRate: 90.5,
  },
  {
    hospitalId: 'H005',
    hospitalName: 'Metropolitan Hospital',
    totalAdmissions: 428,
    avgLengthOfStay: 4.9,
    nfiCasesApproved: 378,
    nfiCasesRejected: 38,
    totalApprovedAmount: 9150000,
    approvalRate: 90.9,
  },
  {
    hospitalId: 'H006',
    hospitalName: 'Rural Health Center',
    totalAdmissions: 95,
    avgLengthOfStay: 2.8,
    nfiCasesApproved: 82,
    nfiCasesRejected: 8,
    totalApprovedAmount: 1890000,
    approvalRate: 91.1,
  },
  {
    hospitalId: 'H007',
    hospitalName: 'Cardiac Institute',
    totalAdmissions: 234,
    avgLengthOfStay: 7.2,
    nfiCasesApproved: 210,
    nfiCasesRejected: 18,
    totalApprovedAmount: 7840000,
    approvalRate: 92.1,
  },
  {
    hospitalId: 'H008',
    hospitalName: 'Cancer Research Center',
    totalAdmissions: 167,
    avgLengthOfStay: 8.5,
    nfiCasesApproved: 145,
    nfiCasesRejected: 16,
    totalApprovedAmount: 6540000,
    approvalRate: 90.1,
  },
];

export function HospitalMISMonthly() {
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
      const run = await provider.createReportRun({
        templateId: 'hospital-mis-monthly',
        templateCode: 'HOSPITAL_MIS_MONTHLY',
        templateName: 'Hospital MIS Monthly',
        filters: {
          fiscalYear: selectedFY,
          month: parseInt(selectedMonth),
        },
        dataAsOf,
      });

      const csv = generateCSV(sampleData);
      downloadCSV(csv, `hospital-mis-monthly-${selectedFY}-m${selectedMonth}`);
      showToast('Report exported successfully', 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting report:', error);
      showToast('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = (data: HospitalMISData[]): string => {
    const headers = [
      'Hospital ID',
      'Hospital Name',
      'Total Admissions',
      'Avg Length of Stay',
      'NFI Cases Approved',
      'NFI Cases Rejected',
      'Total Approved Amount',
      'Approval Rate %',
    ];
    const rows = data.map(row => [
      row.hospitalId,
      row.hospitalName,
      row.totalAdmissions,
      row.avgLengthOfStay,
      row.nfiCasesApproved,
      row.nfiCasesRejected,
      row.totalApprovedAmount,
      row.approvalRate,
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Hospital MIS Monthly</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Hospital performance and case statistics</p>
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
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Hospital Name</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Total Admissions</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Avg LoS</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">NFI Approved</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">NFI Rejected</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Approved Amount</th>
                    <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Approval %</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((row) => (
                    <tr key={row.hospitalId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4 text-[var(--nfi-text)]">{row.hospitalName}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.totalAdmissions}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.avgLengthOfStay}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.nfiCasesApproved}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.nfiCasesRejected}</td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">
                        ₹{(row.totalApprovedAmount / 100000).toFixed(1)}L
                      </td>
                      <td className="text-right py-3 px-4 text-[var(--nfi-text)]">{row.approvalRate}%</td>
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
