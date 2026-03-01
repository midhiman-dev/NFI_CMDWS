CREATE TABLE IF NOT EXISTS hospital_process_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  process_type text NOT NULL CHECK (process_type IN ('BRC', 'BRRC', 'BGRC', 'BCRC', 'NON_BRC')),
  is_active boolean DEFAULT true,
  effective_from_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(hospital_id)
);

CREATE INDEX IF NOT EXISTS idx_hospital_process_maps_hospital_id ON hospital_process_maps(hospital_id);

ALTER TABLE hospital_process_maps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all process maps"
  ON hospital_process_maps FOR SELECT
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can create process maps"
  ON hospital_process_maps FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can update process maps"
  ON hospital_process_maps FOR UPDATE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin')
  WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins can delete process maps"
  ON hospital_process_maps FOR DELETE
  TO authenticated
  USING (auth.jwt()->>'role' = 'admin');
