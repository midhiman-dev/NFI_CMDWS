-- UPDATE USERS ROLE CHECK
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('hospital_spoc', 'hospital_doctor', 'verifier', 'committee_member', 'beni_volunteer', 'admin'));

-- BENI PROGRAM OPS TABLE
CREATE TABLE IF NOT EXISTS beni_program_ops (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  beni_team_member uuid REFERENCES users(id),
  hamper_sent_date date,
  voice_note_received_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (case_id)
);

ALTER TABLE beni_program_ops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Volunteers and admins can view beni ops"
  ON beni_program_ops FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('beni_volunteer', 'admin')));

CREATE POLICY "Volunteers and admins can insert beni ops"
  ON beni_program_ops FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('beni_volunteer', 'admin')));

CREATE POLICY "Volunteers and admins can update beni ops"
  ON beni_program_ops FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('beni_volunteer', 'admin')));

-- FOLLOWUP MILESTONES TABLE
CREATE TABLE IF NOT EXISTS followup_milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  milestone_months integer NOT NULL CHECK (milestone_months IN (3, 6, 9, 12, 18, 24)),
  due_date date,
  followup_date timestamptz,
  reached_flag boolean DEFAULT false,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (case_id, milestone_months)
);

ALTER TABLE followup_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view followup milestones based on case access"
  ON followup_milestones FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND (
        cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'committee_member', 'beni_volunteer', 'admin'))
      )
    )
  );

CREATE POLICY "Volunteers and admins can insert milestones"
  ON followup_milestones FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('beni_volunteer', 'admin')));

CREATE POLICY "Volunteers and admins can update milestones"
  ON followup_milestones FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('beni_volunteer', 'admin')));

-- FOLLOWUP METRIC DEFINITIONS TABLE
CREATE TABLE IF NOT EXISTS followup_metric_definitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_months integer NOT NULL CHECK (milestone_months IN (3, 6, 9, 12, 18, 24)),
  metric_name text NOT NULL,
  metric_type text NOT NULL CHECK (metric_type IN ('BOOLEAN', 'TEXT')),
  allow_na boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (milestone_months, metric_name)
);

ALTER TABLE followup_metric_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view metric definitions"
  ON followup_metric_definitions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert metric definitions"
  ON followup_metric_definitions FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Only admins can update metric definitions"
  ON followup_metric_definitions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

-- FOLLOWUP METRIC VALUES TABLE
CREATE TABLE IF NOT EXISTS followup_metric_values (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  milestone_months integer NOT NULL,
  metric_name text NOT NULL,
  value_text text,
  value_boolean boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (case_id, milestone_months, metric_name)
);

ALTER TABLE followup_metric_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metric values based on case access"
  ON followup_metric_values FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND (
        cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'committee_member', 'beni_volunteer', 'admin'))
      )
    )
  );

CREATE POLICY "Volunteers and admins can insert metric values"
  ON followup_metric_values FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('beni_volunteer', 'admin')));

CREATE POLICY "Volunteers and admins can update metric values"
  ON followup_metric_values FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('beni_volunteer', 'admin')));

-- MODIFY CLINICAL CASE DETAILS TABLE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_case_details' AND column_name = 'admission_date') THEN
    ALTER TABLE clinical_case_details ADD COLUMN admission_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clinical_case_details' AND column_name = 'discharge_date') THEN
    ALTER TABLE clinical_case_details ADD COLUMN discharge_date date;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_beni_program_ops_case_id ON beni_program_ops(case_id);
CREATE INDEX IF NOT EXISTS idx_followup_milestones_case_id ON followup_milestones(case_id);
CREATE INDEX IF NOT EXISTS idx_followup_milestones_due_date ON followup_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_followup_metric_definitions_milestone ON followup_metric_definitions(milestone_months);
CREATE INDEX IF NOT EXISTS idx_followup_metric_values_case_milestone ON followup_metric_values(case_id, milestone_months);

INSERT INTO followup_metric_definitions (milestone_months, metric_name, metric_type, allow_na, display_order) VALUES
  (3, 'Patient is alive and reachable', 'BOOLEAN', false, 1),
  (3, 'Treatment completed successfully', 'BOOLEAN', true, 2),
  (3, 'Any complications reported', 'BOOLEAN', true, 3),
  (3, 'Quality of life improvement', 'TEXT', false, 4),
  (3, 'Additional support needed', 'TEXT', false, 5),
  (6, 'Patient is alive and reachable', 'BOOLEAN', false, 1),
  (6, 'Health status stable', 'BOOLEAN', true, 2),
  (6, 'Currently employed or in school', 'BOOLEAN', true, 3),
  (6, 'Any hospital readmissions', 'BOOLEAN', true, 4),
  (6, 'Quality of life assessment', 'TEXT', false, 5),
  (9, 'Patient is alive and reachable', 'BOOLEAN', false, 1),
  (9, 'Health status stable', 'BOOLEAN', true, 2),
  (9, 'Any complications since last followup', 'BOOLEAN', true, 3),
  (9, 'Overall progress notes', 'TEXT', false, 4),
  (12, 'Patient is alive and reachable', 'BOOLEAN', false, 1),
  (12, 'Health status assessment', 'BOOLEAN', true, 2),
  (12, 'Currently employed or in school', 'BOOLEAN', true, 3),
  (12, 'Family economic status', 'TEXT', false, 4),
  (12, 'One year progress summary', 'TEXT', false, 5),
  (18, 'Patient is alive and reachable', 'BOOLEAN', false, 1),
  (18, 'Health status stable', 'BOOLEAN', true, 2),
  (18, 'Quality of life assessment', 'TEXT', false, 3),
  (24, 'Patient is alive and reachable', 'BOOLEAN', false, 1),
  (24, 'Health status assessment', 'BOOLEAN', true, 2),
  (24, 'Currently employed or in school', 'BOOLEAN', true, 3),
  (24, 'Two year impact assessment', 'TEXT', false, 4),
  (24, 'Final follow-up notes', 'TEXT', false, 5)
ON CONFLICT (milestone_months, metric_name) DO NOTHING;
