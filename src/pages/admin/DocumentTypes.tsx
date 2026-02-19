import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';

export function DocumentTypes() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Document Types</h1>
          <p className="text-[var(--nfi-text-secondary)] mt-1">Manage document type master data</p>
        </div>

        <NfiCard>
          <div className="text-center py-12 text-[var(--nfi-text-secondary)]">
            Document types management interface
          </div>
        </NfiCard>
      </div>
    </Layout>
  );
}
