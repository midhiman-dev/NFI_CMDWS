CREATE TABLE IF NOT EXISTS doctor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE REFERENCES cases(id) ON DELETE CASCADE,
  assigned_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  outcome text CHECK (outcome IS NULL OR outcome = ANY(ARRAY['Approved', 'Approved_With_Comments', 'Returned'])),
  comments text,
  gating_result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinical reviewers can view assigned reviews"
  ON doctor_reviews FOR SELECT
  TO authenticated
  USING (assigned_to_user_id = auth.uid());

CREATE POLICY "Case creators can view doctor reviews"
  ON doctor_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases WHERE cases.id = doctor_reviews.case_id AND cases.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin and leadership can manage assignments"
  ON doctor_reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = ANY(ARRAY['admin'::text, 'leadership'::text])))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = ANY(ARRAY['admin'::text, 'leadership'::text])));

CREATE POLICY "Admin and leadership can create reviews"
  ON doctor_reviews FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = ANY(ARRAY['admin'::text, 'leadership'::text])));

CREATE POLICY "Clinical reviewers can submit reviews"
  ON doctor_reviews FOR UPDATE
  TO authenticated
  USING (assigned_to_user_id = auth.uid())
  WITH CHECK (assigned_to_user_id = auth.uid());
