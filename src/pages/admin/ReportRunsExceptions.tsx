import { useState, useEffect } from 'react';
import { AlertTriangle, Play, ChevronLeft } from 'lucide-react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { useToast } from '../../components/design-system/Toast';
import { useAppContext } from '../../App';
import { Link } from 'react-router-dom';
import type { ReportRun } from '../../types';

export function ReportRunsExceptionsPage() {
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = await provider.listReportRunsWithDetails(undefined, 50);
      setRuns(data);
    } catch (error) {
      console.error('Error loading report runs:', error);
      showToast('Failed to load report runs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const simulateFailedRun = async () => {
    try {
      setSimulatingId('simulating');

      // Create a test report template if it doesn't exist
      const templates = await provider.listReportTemplates();
      let templateId = templates[0]?.templateId;

      if (!templateId) {
        const newTemplate = await provider.createReportRun({
          templateId: 'default',
          templateCode: 'TEST_RPT',
          templateName: 'Test Report',
        });
        templateId = newTemplate.templateId;
      }

      // Create a failed run directly via mock data storage
      const errorMsg = 'Database connection timeout: Unable to connect to data warehouse after 30 seconds';
      const failedRun: ReportRun = {
        runId: Math.random().toString(),
        templateId: templateId || 'default',
        templateCode: 'TEST_RPT',
        templateName: 'Test Report',
        status: 'Failed',
        filters: { fiscalYear: 2025 },
        dataAsOf: new Date().toISOString().split('T')[0],
        generatedAt: new Date().toISOString(),
        createdBy: 'admin@example.com',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        updatedAt: new Date().toISOString(),
        errorMessage: errorMsg,
      };

      // Add to localStorage for demo mode
      const stored = localStorage.getItem('nfi_demo_report_runs_v1');
      const runs = stored ? JSON.parse(stored) : [];
      runs.unshift(failedRun);
      localStorage.setItem('nfi_demo_report_runs_v1', JSON.stringify(runs));

      showToast('Simulated failed report run', 'success');
      loadRuns();
    } catch (error) {
      console.error('Error simulating failed run:', error);
      showToast('Failed to simulate error', 'error');
    } finally {
      setSimulatingId(null);
    }
  };

  const failedRuns = runs.filter(r => r.status === 'Failed');
  const otherRuns = runs.filter(r => r.status !== 'Failed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Succeeded':
        return 'bg-green-100 text-green-600';
      case 'Failed':
        return 'bg-red-100 text-red-600';
      case 'Running':
        return 'bg-blue-100 text-blue-600';
      case 'Queued':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Failed':
        return <AlertTriangle size={16} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/admin/reporting" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <ChevronLeft size={20} />
            Back
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Report Runs & Exceptions</h1>
          <p className="text-[var(--nfi-text-secondary)] mt-1">Monitor report execution and errors</p>
        </div>

        {failedRuns.length === 0 && (
          <NfiCard>
            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Play size={20} className="text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">No failed runs yet</p>
                <p className="text-xs text-blue-700">Click the button below to simulate a failed report</p>
              </div>
              <button
                onClick={simulateFailedRun}
                disabled={simulatingId === 'simulating'}
                className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {simulatingId === 'simulating' ? 'Simulating...' : 'Simulate Failed Run'}
              </button>
            </div>
          </NfiCard>
        )}

        {failedRuns.length > 0 && (
          <NfiCard>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                  <AlertTriangle size={20} />
                  Failed Runs ({failedRuns.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--nfi-border)]">
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Report</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Error Message</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Failed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedRuns.map((run) => (
                      <tr key={run.runId} className="border-b border-[var(--nfi-border)] bg-red-50 hover:bg-red-100">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-[var(--nfi-text)]">{run.templateName || run.templateCode}</p>
                            <p className="text-xs text-[var(--nfi-text-secondary)]">{run.templateCode}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${getStatusColor(run.status)}`}>
                            {getStatusIcon(run.status)}
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs text-red-600 font-medium max-w-md">
                            {run.errorMessage || 'No error message'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--nfi-text-secondary)]">
                          {new Date(run.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--nfi-text-secondary)]">
                          {run.generatedAt ? new Date(run.generatedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </NfiCard>
        )}

        {otherRuns.length > 0 && (
          <NfiCard>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--nfi-text)]">All Report Runs ({runs.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--nfi-border)]">
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Report</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Data As Of</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Created</th>
                      <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherRuns.map((run) => (
                      <tr key={run.runId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-[var(--nfi-text)]">{run.templateName || run.templateCode}</p>
                            <p className="text-xs text-[var(--nfi-text-secondary)]">{run.templateCode}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--nfi-text)]">
                          {run.dataAsOf ? new Date(run.dataAsOf).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--nfi-text-secondary)]">
                          {new Date(run.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-xs text-[var(--nfi-text-secondary)]">
                          {run.generatedAt ? new Date(run.generatedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </NfiCard>
        )}

        {loading && (
          <NfiCard>
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading report runs...</p>
            </div>
          </NfiCard>
        )}

        {!loading && runs.length === 0 && (
          <NfiCard>
            <div className="text-center py-8">
              <p className="text-[var(--nfi-text-secondary)] mb-4">No report runs yet</p>
              <button
                onClick={simulateFailedRun}
                disabled={simulatingId === 'simulating'}
                className="px-4 py-2 bg-[var(--nfi-primary)] text-white rounded-lg hover:bg-[var(--nfi-primary-dark)] transition-colors disabled:opacity-50"
              >
                {simulatingId === 'simulating' ? 'Simulating...' : 'Create Failed Run'}
              </button>
            </div>
          </NfiCard>
        )}
      </div>
    </Layout>
  );
}
