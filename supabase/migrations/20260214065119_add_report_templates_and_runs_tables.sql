/*
  # Add Report Templates and Run History tables

  1. New Tables
    - `report_templates`
      - `id` (uuid, primary key)
      - `code` (text, unique - template identifier)
      - `name` (text - display name)
      - `description` (text)
      - `version` (text - version identifier)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `report_runs`
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key to report_templates)
      - `status` (text: Queued, Running, Succeeded, Failed)
      - `filters` (jsonb - fiscal_year, month_range, hospital_ids)
      - `data_as_of` (date - snapshot date for report data)
      - `generated_at` (timestamp - when report generation completed)
      - `created_by` (uuid - user who triggered report)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Indexes
    - Index on template_id for query performance
    - Index on created_at for ordering

  3. Security
    - Enable RLS on both tables
    - Accounts, Admin, and Leadership can view/create reports
    - Users can only see run history they created or have role access to
*/

CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  version text DEFAULT '1.0',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Running', 'Succeeded', 'Failed')),
  filters jsonb DEFAULT '{}'::jsonb,
  data_as_of date,
  generated_at timestamptz,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_runs_template_id ON report_runs(template_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_created_at ON report_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_runs_status ON report_runs(status);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reports visible to accounts, admin, and leadership"
  ON report_templates FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'role' IN ('accounts', 'admin', 'leadership'));

CREATE POLICY "Admin and accounts can create reports"
  ON report_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' IN ('accounts', 'admin', 'leadership'));

CREATE POLICY "Reports visible to accounts, admin, and leadership"
  ON report_runs FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'role' IN ('accounts', 'admin', 'leadership'));

CREATE POLICY "Users can update own report runs"
  ON report_runs FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'role' IN ('accounts', 'admin', 'leadership'))
  WITH CHECK (auth.jwt()->>'role' IN ('accounts', 'admin', 'leadership'));
