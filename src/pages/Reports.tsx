import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { NfiBadge } from '../components/design-system/NfiBadge';
import { NfiCard } from '../components/design-system/NfiCard';
import { Download, FileClock, ShieldCheck } from 'lucide-react';
import { useToast } from '../components/design-system/Toast';
import { useAppContext } from '../App';
import { getAuthState } from '../utils/auth';
import { MIS_REPORT_SURFACES, formatMISDate, formatMISDateTime } from '../utils/misReporting';
import type { ReportRun } from '../types';

export function Reports() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const authState = getAuthState();
  const [runs, setRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRuns = async () => {
      try {
        setLoading(true);
        setRuns(await provider.listReportRuns(undefined, 100));
      } catch (error) {
        console.error('Error loading reports:', error);
        showToast('Failed to load reports', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadRuns();
  }, [provider, showToast]);

  const visibleSurfaces = useMemo(
    () => MIS_REPORT_SURFACES.filter((surface) => surface.roles.includes(authState.activeRole || 'admin')),
    [authState.activeRole],
  );

  const recentRuns = runs.slice(0, 8);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">NFI MIS Reports</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">
              Daily and monthly MIS surfaces aligned to NFI reporting templates and donor-safe access.
            </p>
          </div>
          <button
            onClick={() => navigate('/reports/runs')}
            className="px-4 py-2 bg-[var(--nfi-primary)] text-white rounded-lg hover:bg-[var(--nfi-primary-dark)] transition-colors"
          >
            View Run History
          </button>
        </div>

        <NfiCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[var(--nfi-border)] bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-[var(--nfi-text)] font-semibold">
                <ShieldCheck size={18} className="text-emerald-600" />
                Donor-safe defaults
              </div>
              <p className="text-sm text-[var(--nfi-text-secondary)] mt-2">
                Leadership and admin views stay aggregate-first. Beneficiary-level clutter is not surfaced on MIS screens.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-[var(--nfi-text)] font-semibold">
                <FileClock size={18} className="text-amber-700" />
                Template-ready structure
              </div>
              <p className="text-sm text-[var(--nfi-text-secondary)] mt-2">
                The visible UI now prioritizes NFI MIS templates while existing run history and reporting admin flows remain intact.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--nfi-border)] bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-[var(--nfi-text)] font-semibold">
                <Download size={18} className="text-blue-700" />
                Export oriented
              </div>
              <p className="text-sm text-[var(--nfi-text-secondary)] mt-2">
                Each MIS surface exposes a lightweight export action tied to data-as-of timestamps and report run entries.
              </p>
            </div>
          </div>
        </NfiCard>

        <NfiCard>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--nfi-text)]">MIS Surfaces</h2>
            <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
              Old generic report names are retired from the primary UI. Use these MIS-aligned views instead.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleSurfaces.map((surface) => (
              <button
                key={surface.path}
                onClick={() => navigate(surface.path)}
                className="rounded-xl border border-[var(--nfi-border)] p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[var(--nfi-text)]">{surface.title}</h3>
                    <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">{surface.subtitle}</p>
                  </div>
                  <NfiBadge tone="status">{surface.cadence}</NfiBadge>
                </div>
              </button>
            ))}
          </div>
        </NfiCard>

        <NfiCard>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--nfi-text)]">Recent Report Runs</h2>
              <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">
                Run history is preserved for traceability while exports remain screen-driven in this prototype slice.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-2"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading report runs...</p>
            </div>
          ) : recentRuns.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[var(--nfi-text-secondary)]">No report runs yet. Export any MIS screen to create the first run.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--nfi-border)]">
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Template</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Data As Of</th>
                    <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Generated At</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr key={run.runId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-[var(--nfi-text)]">{run.templateName || run.templateCode || run.templateId}</p>
                      </td>
                      <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{run.status}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">{run.dataAsOf ? formatMISDate(run.dataAsOf) : '-'}</td>
                      <td className="py-3 px-4 text-[var(--nfi-text-secondary)]">
                        {run.generatedAt ? formatMISDateTime(run.generatedAt) : '-'}
                      </td>
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
