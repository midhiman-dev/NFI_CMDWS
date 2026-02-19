import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { Link } from 'react-router-dom';
import { Database, BarChart3, FileText, Link2, AlertCircle } from 'lucide-react';

export function ReportingAdmin() {
  const registries = [
    {
      id: 'kpi-catalog',
      title: 'KPI Catalog',
      description: 'Manage key performance indicators and metrics',
      icon: BarChart3,
      path: '/admin/reporting/kpi-catalog',
    },
    {
      id: 'dataset-registry',
      title: 'Dataset Registry',
      description: 'Configure data sources and refresh schedules',
      icon: Database,
      path: '/admin/reporting/dataset-registry',
    },
    {
      id: 'template-registry',
      title: 'Template Registry',
      description: 'Create and manage report templates',
      icon: FileText,
      path: '/admin/reporting/template-registry',
    },
    {
      id: 'template-bindings',
      title: 'Template Bindings',
      description: 'Map KPIs and datasets to templates',
      icon: Link2,
      path: '/admin/reporting/template-bindings',
    },
    {
      id: 'report-runs',
      title: 'Report Runs & Exceptions',
      description: 'Monitor report execution and errors',
      icon: AlertCircle,
      path: '/admin/reporting/report-runs',
    },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Reporting Admin</h1>
          <p className="text-[var(--nfi-text-secondary)] mt-1">Manage reporting registries and configurations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {registries.map((registry) => {
            const Icon = registry.icon;
            return (
              <Link key={registry.id} to={registry.path}>
                <NfiCard className="cursor-pointer transition-all hover:shadow-lg hover:scale-105">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Icon size={24} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--nfi-text)]">{registry.title}</h3>
                      <p className="text-sm text-[var(--nfi-text-secondary)] mt-1">{registry.description}</p>
                    </div>
                  </div>
                </NfiCard>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
