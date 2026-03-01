CREATE TABLE IF NOT EXISTS kpi_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  data_type text DEFAULT 'Numeric' CHECK (data_type IN ('Numeric', 'Percentage', 'Text')),
  calculation_method text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dataset_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  source_table text,
  refresh_frequency text DEFAULT 'Daily' CHECK (refresh_frequency IN ('Daily', 'Weekly', 'Monthly')),
  last_refreshed timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  template_type text DEFAULT 'Dashboard' CHECK (template_type IN ('Dashboard', 'Export', 'Alert')),
  version text DEFAULT '1.0',
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS template_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES template_registry(id) ON DELETE CASCADE,
  kpi_id uuid REFERENCES kpi_catalog(id) ON DELETE SET NULL,
  dataset_id uuid REFERENCES dataset_registry(id) ON DELETE SET NULL,
  field_name text,
  mapping_config jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_catalog_code ON kpi_catalog(code);
CREATE INDEX IF NOT EXISTS idx_kpi_catalog_active ON kpi_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_dataset_registry_code ON dataset_registry(code);
CREATE INDEX IF NOT EXISTS idx_dataset_registry_active ON dataset_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_template_registry_code ON template_registry(code);
CREATE INDEX IF NOT EXISTS idx_template_registry_active ON template_registry(is_active);
CREATE INDEX IF NOT EXISTS idx_template_bindings_template ON template_bindings(template_id);
CREATE INDEX IF NOT EXISTS idx_template_bindings_kpi ON template_bindings(kpi_id);
CREATE INDEX IF NOT EXISTS idx_template_bindings_dataset ON template_bindings(dataset_id);

ALTER TABLE kpi_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view KPI catalog" ON kpi_catalog FOR SELECT TO authenticated USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can manage KPI catalog" ON kpi_catalog FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can update KPI catalog" ON kpi_catalog FOR UPDATE TO authenticated USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can delete KPI catalog" ON kpi_catalog FOR DELETE TO authenticated USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admin can view dataset registry" ON dataset_registry FOR SELECT TO authenticated USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can manage dataset registry" ON dataset_registry FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can update dataset registry" ON dataset_registry FOR UPDATE TO authenticated USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can delete dataset registry" ON dataset_registry FOR DELETE TO authenticated USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admin can view template registry" ON template_registry FOR SELECT TO authenticated USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can manage template registry" ON template_registry FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can update template registry" ON template_registry FOR UPDATE TO authenticated USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can delete template registry" ON template_registry FOR DELETE TO authenticated USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admin can view template bindings" ON template_bindings FOR SELECT TO authenticated USING (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can manage template bindings" ON template_bindings FOR INSERT TO authenticated WITH CHECK (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can update template bindings" ON template_bindings FOR UPDATE TO authenticated USING (auth.jwt()->>'role' = 'admin') WITH CHECK (auth.jwt()->>'role' = 'admin');
CREATE POLICY "Admin can delete template bindings" ON template_bindings FOR DELETE TO authenticated USING (auth.jwt()->>'role' = 'admin');
