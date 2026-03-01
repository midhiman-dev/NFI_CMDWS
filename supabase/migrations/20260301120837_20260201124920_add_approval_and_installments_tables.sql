-- FUNDING INSTALLMENTS TABLE
CREATE TABLE IF NOT EXISTS funding_installments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  label text NOT NULL,
  amount numeric(12,2) NOT NULL,
  due_date date,
  status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Requested', 'Paid')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE funding_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view installments based on case access"
  ON funding_installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND (
        cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'committee_member', 'admin'))
      )
    )
  );

CREATE POLICY "Committee members can create installments"
  ON funding_installments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('committee_member', 'admin')
    )
  );

CREATE POLICY "Committee and accounts can update installments"
  ON funding_installments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('committee_member', 'admin')
    )
  );

-- MODIFY COMMITTEE REVIEWS TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'committee_reviews' AND column_name = 'outcome') THEN
    ALTER TABLE committee_reviews ADD COLUMN outcome text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'committee_reviews' AND column_name = 'approved_amount') THEN
    ALTER TABLE committee_reviews ADD COLUMN approved_amount numeric(12,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'committee_reviews' AND column_name = 'decision_date') THEN
    ALTER TABLE committee_reviews ADD COLUMN decision_date timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'committee_reviews' AND column_name = 'comments') THEN
    ALTER TABLE committee_reviews ADD COLUMN comments text;
  END IF;
END $$;

ALTER TABLE committee_reviews DROP CONSTRAINT IF EXISTS committee_reviews_decision_check;
ALTER TABLE committee_reviews ADD CONSTRAINT committee_reviews_decision_check 
  CHECK (decision IS NULL OR decision IN ('Approved', 'Rejected', 'Pending', 'Deferred'));

-- MODIFY REJECTION REASONS TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rejection_reasons' AND column_name = 'rejection_level') THEN
    ALTER TABLE rejection_reasons ADD COLUMN rejection_level text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rejection_reasons' AND column_name = 'communication_status') THEN
    ALTER TABLE rejection_reasons ADD COLUMN communication_status text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rejection_reasons' AND column_name = 'referring_hospital') THEN
    ALTER TABLE rejection_reasons ADD COLUMN referring_hospital text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rejection_reasons' AND column_name = 'case_summary') THEN
    ALTER TABLE rejection_reasons ADD COLUMN case_summary text;
  END IF;
END $$;

-- MODIFY FINANCIAL CASE DETAILS TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_case_details' AND column_name = 'approved_amount') THEN
    ALTER TABLE financial_case_details ADD COLUMN approved_amount numeric(12,2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_funding_installments_case_id ON funding_installments(case_id);
CREATE INDEX IF NOT EXISTS idx_funding_installments_status ON funding_installments(status);
