CREATE TABLE IF NOT EXISTS case_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  fund_application jsonb,
  interim_summary jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_case_intake_case_id ON case_intake(case_id);

ALTER TABLE case_intake ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can view intake for their cases"
  ON case_intake FOR SELECT
  TO authenticated
  USING (
    case_id IN (
      SELECT id FROM cases
      WHERE hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'committee_member', 'admin')
    )
  );

CREATE POLICY "Hospital staff can insert intake for their cases"
  ON case_intake FOR INSERT
  TO authenticated
  WITH CHECK (
    case_id IN (
      SELECT id FROM cases WHERE hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Hospital staff can update intake for their cases"
  ON case_intake FOR UPDATE
  TO authenticated
  USING (
    case_id IN (
      SELECT id FROM cases WHERE hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'admin'))
  )
  WITH CHECK (
    case_id IN (
      SELECT id FROM cases WHERE hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'admin'))
  );
