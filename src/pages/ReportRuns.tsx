import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiBadge } from '../components/design-system/NfiBadge';
import { Download, Clock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '../components/design-system/Toast';
import { useAppContext } from '../App';
import type { ReportRun } from '../types';

export function ReportRuns() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const runsData = await provider.listReportRuns(undefined, 1000);
      setRuns(runsData);
    } catch (error) {
      console.error('Error loading runs:', error);
      showToast('Failed to load report runs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatParameters = (filters?: any): string => {
    if (!filters || Object.keys(filters).length === 0) {
      return '-';
    }

    const parts: string[] = [];
    if (filters.fiscalYear) {
      parts.push(`FY: ${filters.fiscalYear}`);
    }
    if (filters.monthRange) {
      parts.push(`Months: ${filters.monthRange[0]}-${filters.monthRange[1]}`);
    }
    if (filters.hospitalIds && filters.hospitalIds.length > 0) {
      parts.push(`Hospitals: ${filters.hospitalIds.length}`);
    }
    return parts.length > 0 ? parts.join(' | ') : '-';
  };

  const formatDownloadTimestamp = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}_${hh}${min}`;
  };

  const generateCSV = (run: ReportRun) => {
    const headers = ['Run ID', 'Template', 'Code', 'Status', 'Parameters', 'Data As Of', 'Generated At', 'Created At'];
    const dataRow = [
      run.runId,
      run.templateName || '',
      run.templateCode || '',
      run.status,
      formatParameters(run.filters),
      run.dataAsOf || '',
      run.generatedAt ? new Date(run.generatedAt).toLocaleString() : '',
      new Date(run.createdAt).toLocaleString(),
    ];

    const csvContent = [
      headers.join(','),
      dataRow.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const safeName = (run.templateName || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `${safeName}_${formatDownloadTimestamp()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Download started', 'success');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Queued':
        return <Clock size={16} className="text-orange-500" />;
      case 'Running':
        return <div className="inline-block animate-spin"><Clock size={16} className="text-blue-500" /></div>;
      case 'Succeeded':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'Failed':
        return <AlertCircle size={16} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeTone = (status: string) => {
    switch (status) {
      case 'Queued':
        return 'warning';
      case 'Running':
        return 'info';
      case 'Succeeded':
        return 'success';
      case 'Failed':
        return 'error';
      default:
        return 'secondary';
    }
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
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Report Runs</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">View and download report execution history</p>
          </div>
        </div>

        {loading ? (
          <NfiCard>
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading report runs...</p>
            </div>
          </NfiCard>
        ) : (
          <NfiCard>
            {runs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[var(--nfi-text-secondary)]">No report runs yet. Generate a report to see history.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--nfi-border)]">
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Run ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Template</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Parameters</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Generated At</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Data As Of</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.runId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm text-[var(--nfi-text)]">
                          {run.runId.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-[var(--nfi-text)]">{run.templateName}</p>
                            <p className="text-xs text-[var(--nfi-text-secondary)]">{run.templateCode}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-sm">
                          {formatParameters(run.filters)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <NfiBadge tone={getStatusBadgeTone(run.status)}>
                              {run.status}
                            </NfiBadge>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-sm">
                          {run.generatedAt ? new Date(run.generatedAt).toLocaleString() : '-'}
                        </td>
                        <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-sm">
                          {run.dataAsOf ? new Date(run.dataAsOf).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => generateCSV(run)}
                            disabled={run.status !== 'Succeeded'}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-[var(--nfi-primary)] text-white rounded hover:bg-[var(--nfi-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={run.status !== 'Succeeded' ? 'Report must be completed to download' : 'Download as CSV'}
                          >
                            <Download size={14} />
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 text-xs text-[var(--nfi-text-secondary)]">
              Total Runs: {runs.length}
            </div>
          </NfiCard>
        )}
      </div>
    </Layout>
  );
}
