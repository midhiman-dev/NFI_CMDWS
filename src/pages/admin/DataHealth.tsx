import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { NfiButton } from '../../components/design-system/NfiButton';
import { NfiBadge } from '../../components/design-system/NfiBadge';
import { getTableRowCounts, resetAndSeedDemoData } from '../../data/seedService';
import { casesRepository } from '../../data/repositories';
import { AlertCircle, CheckCircle, Zap, TrendingUp } from 'lucide-react';

interface TableHealth {
  name: string;
  count: number;
  expected: number;
  critical: boolean;
}

export function DataHealth() {
  const [tables, setTables] = useState<TableHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [integrityErrors, setIntegrityErrors] = useState<string[]>([]);

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      setIntegrityErrors([]);

      const counts = await getTableRowCounts();

      const healthTable: TableHealth[] = [
        { name: 'hospitals', count: counts.hospitals || 0, expected: 5, critical: true },
        { name: 'users', count: counts.users || 0, expected: 12, critical: true },
        { name: 'cases', count: counts.cases || 0, expected: 12, critical: true },
        { name: 'beneficiary_profiles', count: counts.beneficiary_profiles || 0, expected: 12, critical: true },
        { name: 'family_profiles', count: counts.family_profiles || 0, expected: 12, critical: true },
        { name: 'clinical_case_details', count: counts.clinical_case_details || 0, expected: 12, critical: true },
        { name: 'financial_case_details', count: counts.financial_case_details || 0, expected: 12, critical: true },
        { name: 'document_templates', count: counts.document_templates || 0, expected: 20, critical: true },
        { name: 'document_metadata', count: counts.document_metadata || 0, expected: 120, critical: false },
        { name: 'committee_reviews', count: counts.committee_reviews || 0, expected: 8, critical: false },
        { name: 'funding_installments', count: counts.funding_installments || 0, expected: 8, critical: false },
        { name: 'beni_program_ops', count: counts.beni_program_ops || 0, expected: 4, critical: false },
        { name: 'followup_milestones', count: counts.followup_milestones || 0, expected: 24, critical: false },
        { name: 'followup_metric_values', count: counts.followup_metric_values || 0, expected: 20, critical: false },
        { name: 'rejection_reasons', count: counts.rejection_reasons || 0, expected: 2, critical: false },
        { name: 'audit_events', count: counts.audit_events || 0, expected: 60, critical: false },
      ];

      setTables(healthTable);

      await checkDataIntegrity();
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDataIntegrity = async () => {
    const errors: string[] = [];

    try {
      const cases = await casesRepository.getAllCases();

      if (cases.length === 0) {
        errors.push('No cases found - database appears to be empty');
      } else {
        const approvedCases = cases.filter((c: any) => c.case_status === 'Approved');
        if (approvedCases.length === 0) {
          errors.push('⚠ No approved cases found - limited workflow testing possible');
        }

        const rejectedCases = cases.filter((c: any) => c.case_status === 'Rejected');
        if (rejectedCases.length === 0) {
          errors.push('⚠ No rejected cases found - rejection workflow not testable');
        }
      }

      const emptyTables = tables.filter((t) => t.count === 0 && t.critical);
      if (emptyTables.length > 0) {
        errors.push(`Critical tables empty: ${emptyTables.map((t) => t.name).join(', ')}`);
      }
    } catch (error) {
      errors.push('Failed to run integrity checks');
    }

    setIntegrityErrors(errors);
  };

  const handleReseedData = async () => {
    if (confirm('This will delete all data and reseed with fresh demo data. This cannot be undone. Continue?')) {
      try {
        setSeeding(true);
        await resetAndSeedDemoData();
        await loadHealthData();
        alert('Database has been reseeded successfully');
      } catch (error) {
        alert('Seeding failed. Check console for details.');
        console.error(error);
      } finally {
        setSeeding(false);
      }
    }
  };

  const getHealthStatus = (table: TableHealth) => {
    if (table.count === 0 && table.critical) return 'error';
    if (table.count === 0) return 'warning';
    if (table.count < table.expected * 0.5) return 'warning';
    return 'ok';
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const okCount = tables.filter((t) => getHealthStatus(t) === 'ok').length;
  const warningCount = tables.filter((t) => getHealthStatus(t) === 'warning').length;
  const errorCount = tables.filter((t) => getHealthStatus(t) === 'error').length;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nfi-primary)] mb-4"></div>
              <p className="text-[var(--nfi-text-secondary)]">Loading database health...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Database Health</h1>
          <p className="text-[var(--nfi-text-secondary)] mt-1">Monitor data integrity and manage database seeding</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NfiCard padding="sm" className="bg-green-50 border border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <p className="text-2xl font-bold text-green-900">{okCount}</p>
                <p className="text-xs text-green-700">Healthy Tables</p>
              </div>
            </div>
          </NfiCard>

          <NfiCard padding="sm" className="bg-yellow-50 border border-yellow-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-yellow-600" size={24} />
              <div>
                <p className="text-2xl font-bold text-yellow-900">{warningCount}</p>
                <p className="text-xs text-yellow-700">Low Row Counts</p>
              </div>
            </div>
          </NfiCard>

          <NfiCard padding="sm" className="bg-red-50 border border-red-200">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600" size={24} />
              <div>
                <p className="text-2xl font-bold text-red-900">{errorCount}</p>
                <p className="text-xs text-red-700">Empty Critical Tables</p>
              </div>
            </div>
          </NfiCard>
        </div>

        {integrityErrors.length > 0 && (
          <NfiCard className="bg-orange-50 border border-orange-200">
            <div className="flex gap-3">
              <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900 mb-2">Data Issues Detected</h3>
                <ul className="space-y-1">
                  {integrityErrors.map((error, i) => (
                    <li key={i} className="text-sm text-orange-800">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </NfiCard>
        )}

        {errorCount > 0 && (
          <NfiCard className="bg-red-50 border border-red-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600" size={24} />
                <div>
                  <h3 className="font-semibold text-red-900">Database is Empty</h3>
                  <p className="text-sm text-red-800">Click the button to reseed with demo data</p>
                </div>
              </div>
              <NfiButton onClick={handleReseedData} disabled={seeding} className="whitespace-nowrap">
                <Zap size={16} />
                {seeding ? 'Seeding...' : 'Reseed Database'}
              </NfiButton>
            </div>
          </NfiCard>
        )}

        <div className="flex justify-end gap-2">
          <NfiButton onClick={loadHealthData} variant="secondary">
            <TrendingUp size={16} />
            Refresh
          </NfiButton>
          {errorCount === 0 && (
            <NfiButton onClick={handleReseedData} disabled={seeding}>
              <Zap size={16} />
              {seeding ? 'Seeding...' : 'Reseed with Demo Data'}
            </NfiButton>
          )}
        </div>

        <NfiCard>
          <h2 className="text-xl font-semibold text-[var(--nfi-text)] mb-4">Table Statistics</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-2 px-3 font-semibold text-[var(--nfi-text)] text-sm">Table Name</th>
                  <th className="text-right py-2 px-3 font-semibold text-[var(--nfi-text)] text-sm">Row Count</th>
                  <th className="text-right py-2 px-3 font-semibold text-[var(--nfi-text)] text-sm">Expected</th>
                  <th className="text-center py-2 px-3 font-semibold text-[var(--nfi-text)] text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((table) => {
                  const status = getHealthStatus(table);
                  const statusColor = getHealthColor(status);

                  return (
                    <tr
                      key={table.name}
                      className={`border-b border-[var(--nfi-border)] ${statusColor} transition-colors`}
                    >
                      <td className="py-3 px-3">
                        <span className="font-medium text-[var(--nfi-text)]">{table.name}</span>
                        {table.critical && <NfiBadge tone="error" className="ml-2 text-xs">Critical</NfiBadge>}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-[var(--nfi-text)]">
                        {table.count.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--nfi-text-secondary)]">
                        {table.expected.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {status === 'ok' && <CheckCircle className="text-green-600 mx-auto" size={20} />}
                        {status === 'warning' && <AlertCircle className="text-yellow-600 mx-auto" size={20} />}
                        {status === 'error' && <AlertCircle className="text-red-600 mx-auto" size={20} />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </NfiCard>
      </div>
    </Layout>
  );
}
