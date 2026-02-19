import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { NfiButton } from '../../components/design-system/NfiButton';
import { useToast } from '../../components/design-system/Toast';
import { adminService } from '../../services/adminService';
import { Download } from 'lucide-react';

export function RejectionExport() {
  const { showToast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const exportData = await adminService.getRejectionExportData();
      setData(exportData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (data.length === 0) {
      showToast('No data to export', 'error');
      return;
    }

    const headers = [
      'FY Sl No', 'NFI BN', 'Name of the Beneficiary', 'Age (in days)', 'Hospital',
      'Reason for Case Rejection', 'Status of Rejection', 'Status of Rejection Communication',
      'Date of rejection', 'Referring hospital', 'Remarks'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(row => [
        row.fySlNo,
        row.nfiBn,
        `"${row.nameOfBeneficiary}"`,
        row.ageInDays,
        `"${row.hospital}"`,
        `"${row.reasonForRejection}"`,
        row.statusOfRejection,
        row.statusOfCommunication,
        row.dateOfRejection,
        `"${row.referringHospital}"`,
        `"${row.remarks}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rejection_master_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('Export downloaded successfully', 'success');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Rejection Master Export</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Export rejection data to CSV</p>
          </div>
          <NfiButton onClick={handleExport} disabled={loading || data.length === 0}>
            <Download size={16} className="mr-1" />
            Download CSV
          </NfiButton>
        </div>

        <NfiCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-2 px-2 font-semibold">Sl</th>
                  <th className="text-left py-2 px-2 font-semibold">NFI BN</th>
                  <th className="text-left py-2 px-2 font-semibold">Beneficiary</th>
                  <th className="text-left py-2 px-2 font-semibold">Hospital</th>
                  <th className="text-left py-2 px-2 font-semibold">Reason</th>
                  <th className="text-left py-2 px-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">Loading...</td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">No rejections found</td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <tr key={row.fySlNo} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-2 px-2">{row.fySlNo}</td>
                      <td className="py-2 px-2 font-medium">{row.nfiBn}</td>
                      <td className="py-2 px-2">{row.nameOfBeneficiary}</td>
                      <td className="py-2 px-2">{row.hospital}</td>
                      <td className="py-2 px-2">{row.reasonForRejection}</td>
                      <td className="py-2 px-2">{row.statusOfRejection}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </NfiCard>
      </div>
    </Layout>
  );
}
