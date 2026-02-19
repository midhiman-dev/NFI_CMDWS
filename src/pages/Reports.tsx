import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiBadge } from '../components/design-system/NfiBadge';
import { NfiButton } from '../components/design-system/NfiButton';
import { NfiField } from '../components/design-system/NfiField';
import { NfiModal } from '../components/design-system/NfiModal';
import { useToast } from '../components/design-system/Toast';
import { Play, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppContext } from '../App';
import type { ReportTemplate, ReportRun } from '../types';

export function Reports() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({
    fiscalYear: new Date().getFullYear(),
    monthRange: [1, 12] as [number, number],
    hospitalIds: [] as string[],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, runsData] = await Promise.all([
        provider.listReportTemplates(),
        provider.listReportRuns(undefined, 100),
      ]);
      setTemplates(templatesData);
      setRuns(runsData);
    } catch (error) {
      console.error('Error loading reports:', error);
      showToast('Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateClick = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setFilters({
      fiscalYear: new Date().getFullYear(),
      monthRange: [1, 12],
      hospitalIds: [],
    });
    setShowGenerateModal(true);
  };

  const handleGenerateReport = async () => {
    if (!selectedTemplate) return;

    setGenerating(true);
    try {
      const newRun = await provider.createReportRun(selectedTemplate.templateId, {
        fiscalYear: filters.fiscalYear,
        monthRange: filters.monthRange,
        hospitalIds: filters.hospitalIds.length > 0 ? filters.hospitalIds : undefined,
      });

      setRuns((prev) => [newRun, ...prev]);
      setShowGenerateModal(false);
      showToast(`Report "${selectedTemplate.name}" generation started`, 'success');

      setTimeout(() => {
        loadData();
      }, 2000);
    } catch (error: any) {
      console.error('Error generating report:', error);
      showToast(error.message || 'Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
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

  const recentRuns = runs.filter(r => !selectedTemplate || r.templateId === selectedTemplate.templateId).slice(0, 10);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Reports</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Generate and manage reports</p>
          </div>
          <button
            onClick={() => navigate('/reports/runs')}
            className="px-4 py-2 bg-[var(--nfi-primary)] text-white rounded-lg hover:bg-[var(--nfi-primary-dark)] transition-colors"
          >
            View Run History
          </button>
        </div>

        {loading ? (
          <NfiCard>
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading reports...</p>
            </div>
          </NfiCard>
        ) : (
          <>
            <NfiCard>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Report Templates</h2>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--nfi-text-secondary)]">No report templates available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--nfi-border)]">
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Code</th>
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Description</th>
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Version</th>
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((template) => (
                        <tr key={template.templateId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                          <td className="py-3 px-4 font-mono text-sm text-[var(--nfi-text)]">{template.code}</td>
                          <td className="py-3 px-4 font-medium text-[var(--nfi-text)]">{template.name}</td>
                          <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-sm">{template.description || '-'}</td>
                          <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{template.version}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleGenerateClick(template)}
                              className="inline-flex items-center gap-1 px-3 py-2 bg-[var(--nfi-primary)] text-white rounded hover:bg-[var(--nfi-primary-dark)] transition-colors"
                            >
                              <Play size={14} />
                              Generate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </NfiCard>

            <NfiCard>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Run History</h2>
              </div>

              {recentRuns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--nfi-text-secondary)]">
                    {selectedTemplate ? 'No runs for this template' : 'No report runs yet. Generate a report to see history.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--nfi-border)]">
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Template</th>
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Data As Of</th>
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Generated At</th>
                        <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentRuns.map((run) => (
                        <tr key={run.runId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-[var(--nfi-text)]">{run.templateName}</p>
                              <p className="text-xs text-[var(--nfi-text-secondary)]">{run.templateCode}</p>
                            </div>
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
                            {run.dataAsOf ? new Date(run.dataAsOf).toLocaleDateString() : '-'}
                          </td>
                          <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-sm">
                            {run.generatedAt ? new Date(run.generatedAt).toLocaleString() : '-'}
                          </td>
                          <td className="py-3 px-4 text-[var(--nfi-text-secondary)] text-sm">
                            {new Date(run.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </NfiCard>

            <NfiCard>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Dashboards</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/reports/hospital-mis-monthly')}
                  className="p-4 border border-[var(--nfi-border)] rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <h3 className="font-semibold text-[var(--nfi-text)] mb-1">Hospital MIS Monthly</h3>
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Hospital performance and case statistics</p>
                </button>
                <button
                  onClick={() => navigate('/reports/daily-mis-programs')}
                  className="p-4 border border-[var(--nfi-border)] rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <h3 className="font-semibold text-[var(--nfi-text)] mb-1">Daily MIS Programs</h3>
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Daily program performance metrics</p>
                </button>
                <button
                  onClick={() => navigate('/reports/leadership-monthly')}
                  className="p-4 border border-[var(--nfi-border)] rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <h3 className="font-semibold text-[var(--nfi-text)] mb-1">Leadership Monthly</h3>
                  <p className="text-sm text-[var(--nfi-text-secondary)]">District-level program performance summary</p>
                </button>
                <button
                  onClick={() => navigate('/reports/accounts-mis-daily')}
                  className="p-4 border border-[var(--nfi-border)] rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <h3 className="font-semibold text-[var(--nfi-text)] mb-1">Accounts MIS Daily</h3>
                  <p className="text-sm text-[var(--nfi-text-secondary)]">Daily financial transactions and vouchers</p>
                </button>
              </div>
            </NfiCard>
          </>
        )}
      </div>

      <NfiModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title={`Generate Report: ${selectedTemplate?.name || ''}`}
      >
        <div className="space-y-4">
          <NfiField label="Fiscal Year" required>
            <input
              type="number"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={filters.fiscalYear}
              onChange={(e) => setFilters({ ...filters, fiscalYear: parseInt(e.target.value) })}
              min={2020}
              max={new Date().getFullYear() + 1}
            />
          </NfiField>

          <NfiField label="Month Range">
            <div className="flex gap-2 items-center">
              <select
                className="flex-1 px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={filters.monthRange[0]}
                onChange={(e) => setFilters({
                  ...filters,
                  monthRange: [parseInt(e.target.value), filters.monthRange[1]],
                })}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Month {m}
                  </option>
                ))}
              </select>
              <span className="text-[var(--nfi-text-secondary)]">to</span>
              <select
                className="flex-1 px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={filters.monthRange[1]}
                onChange={(e) => setFilters({
                  ...filters,
                  monthRange: [filters.monthRange[0], parseInt(e.target.value)],
                })}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Month {m}
                  </option>
                ))}
              </select>
            </div>
          </NfiField>

          <div className="flex gap-2 justify-end pt-4">
            <button
              onClick={() => setShowGenerateModal(false)}
              className="px-4 py-2 border border-[var(--nfi-border)] rounded-lg text-[var(--nfi-text)] hover:bg-gray-50"
              disabled={generating}
            >
              Cancel
            </button>
            <NfiButton onClick={handleGenerateReport} disabled={generating}>
              {generating ? 'Generating...' : 'Generate Report'}
            </NfiButton>
          </div>
        </div>
      </NfiModal>
    </Layout>
  );
}
