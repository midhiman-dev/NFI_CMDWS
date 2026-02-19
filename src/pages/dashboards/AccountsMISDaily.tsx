import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { Download, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';

interface AccountsData {
  date: string;
  transactionId: string;
  type: string;
  amount: number;
  account: string;
  status: string;
  approver: string;
  remarks: string;
}

const sampleData: AccountsData[] = [
  {
    date: '2024-12-15',
    transactionId: 'TXN001',
    type: 'Approval Voucher',
    amount: 125000,
    account: 'Hospital General Fund',
    status: 'Completed',
    approver: 'Rajesh Kumar',
    remarks: 'Standard approval processed',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN002',
    type: 'Installment Payment',
    amount: 245000,
    account: 'Medical Fund',
    status: 'Completed',
    approver: 'Priya Singh',
    remarks: 'First installment released',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN003',
    type: 'Approval Voucher',
    amount: 89500,
    account: 'Emergency Fund',
    status: 'Completed',
    approver: 'Amit Patel',
    remarks: 'Emergency case approved',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN004',
    type: 'Installment Payment',
    amount: 156000,
    account: 'Hospital General Fund',
    status: 'Completed',
    approver: 'Rajesh Kumar',
    remarks: 'Second installment released',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN005',
    type: 'Adjustment Entry',
    amount: -23500,
    account: 'Medical Fund',
    status: 'Completed',
    approver: 'Meera Desai',
    remarks: 'Overpayment adjustment',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN006',
    type: 'Approval Voucher',
    amount: 342000,
    account: 'Hospital General Fund',
    status: 'Completed',
    approver: 'Priya Singh',
    remarks: 'Critical care case approved',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN007',
    type: 'Installment Payment',
    amount: 178500,
    account: 'Emergency Fund',
    status: 'Completed',
    approver: 'Amit Patel',
    remarks: 'Scheduled installment released',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN008',
    type: 'Approval Voucher',
    amount: 267000,
    account: 'Medical Fund',
    status: 'Completed',
    approver: 'Rajesh Kumar',
    remarks: 'Surgery support approved',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN009',
    type: 'Reversal Entry',
    amount: -45000,
    account: 'Hospital General Fund',
    status: 'Completed',
    approver: 'Meera Desai',
    remarks: 'Rejected case reversal',
  },
  {
    date: '2024-12-15',
    transactionId: 'TXN010',
    type: 'Installment Payment',
    amount: 234500,
    account: 'Emergency Fund',
    status: 'Completed',
    approver: 'Priya Singh',
    remarks: 'Final installment released',
  },
];

export function AccountsMISDaily() {
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
        templateId: 'accounts-mis-daily',
        templateCode: 'ACCOUNTS_MIS_DAILY',
        templateName: 'Accounts MIS Daily',
        filters: {
          date: selectedDate,
        },
        dataAsOf,
      });

      const csv = generateCSV(sampleData);
      downloadCSV(csv, `accounts-mis-daily-${selectedDate}`);
      showToast('Report exported successfully', 'success');
      navigate('/reports/runs');
    } catch (error) {
      console.error('Error exporting report:', error);
      showToast('Failed to export report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = (data: AccountsData[]): string => {
    const headers = [
      'Date',
      'Transaction ID',
      'Type',
      'Amount',
      'Account',
      'Status',
      'Approver',
      'Remarks',
    ];
    const rows = data.map(row => [
      row.date,
      row.transactionId,
      row.type,
      row.amount,
      row.account,
      row.status,
      row.approver,
      row.remarks,
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

  const getTotalAmount = () => {
    return sampleData.reduce((sum, row) => sum + row.amount, 0);
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Accounts MIS Daily</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Daily financial transactions and vouchers</p>
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
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--nfi-border)]">
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Txn ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Account</th>
                      <th className="text-right py-3 px-4 font-semibold text-[var(--nfi-text)]">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Approver</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.map((row, idx) => (
                      <tr key={idx} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-[var(--nfi-text)]">{row.transactionId}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text)]">{row.type}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{row.account}</td>
                        <td className={`text-right py-3 px-4 font-medium ${row.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {row.amount >= 0 ? '+' : ''}₹{Math.abs(row.amount).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                            {row.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[var(--nfi-text)]">{row.approver}</td>
                        <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-xs">{row.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--nfi-border)]">
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-sm text-[var(--nfi-text-secondary)]">Total Amount</p>
                    <p className="text-lg font-bold text-[var(--nfi-text)]">
                      ₹{(getTotalAmount() / 100000).toFixed(2)}L
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </NfiCard>
      </div>
    </Layout>
  );
}
