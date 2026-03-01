-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('hospital_spoc', 'hospital_doctor', 'verifier', 'committee_member', 'admin')),
  hospital_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- HOSPITALS TABLE
CREATE TABLE IF NOT EXISTS hospitals (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  contact_person text,
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view hospitals"
  ON hospitals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage hospitals"
  ON hospitals FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- BGRC CYCLES TABLE
CREATE TABLE IF NOT EXISTS bgrc_cycles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_name text UNIQUE NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE bgrc_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view cycles"
  ON bgrc_cycles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage cycles"
  ON bgrc_cycles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- CASES TABLE
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_number text UNIQUE NOT NULL,
  hospital_id uuid NOT NULL REFERENCES hospitals(id),
  bgrc_cycle_id uuid REFERENCES bgrc_cycles(id),
  process_type text NOT NULL CHECK (process_type IN ('New', 'Renewal', 'Revision')),
  case_status text NOT NULL DEFAULT 'Draft' CHECK (
    case_status IN ('Draft', 'Submitted', 'Under_Verification', 'Returned', 'Under_Review', 'Approved', 'Rejected', 'Closed')
  ),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_action_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  decision_at timestamptz
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital staff can view their hospital cases"
  ON cases FOR SELECT
  TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('verifier', 'committee_member', 'admin')
    )
  );

CREATE POLICY "Hospital staff can create cases for their hospital"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Hospital staff can update their hospital cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('verifier', 'admin')
    )
  );

-- BENEFICIARY PROFILES TABLE
CREATE TABLE IF NOT EXISTS beneficiary_profiles (
  case_id uuid PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  baby_name text NOT NULL,
  gender text CHECK (gender IN ('Male', 'Female', 'Other')),
  dob date,
  birth_weight_kg numeric(5,3),
  current_weight_kg numeric(5,3),
  morbidity text,
  mortality boolean DEFAULT false
);

ALTER TABLE beneficiary_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view beneficiary profiles based on case access"
  ON beneficiary_profiles FOR SELECT
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

CREATE POLICY "Hospital staff can manage beneficiary profiles for their cases"
  ON beneficiary_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
  );

-- FAMILY PROFILES TABLE
CREATE TABLE IF NOT EXISTS family_profiles (
  case_id uuid PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  father_name text,
  mother_name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  city text,
  state text,
  pincode text,
  income_band text
);

ALTER TABLE family_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view family profiles based on case access"
  ON family_profiles FOR SELECT
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

CREATE POLICY "Hospital staff can manage family profiles for their cases"
  ON family_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
  );

-- CLINICAL CASE DETAILS TABLE
CREATE TABLE IF NOT EXISTS clinical_case_details (
  case_id uuid PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  diagnosis text NOT NULL,
  summary text NOT NULL,
  doctor_name text,
  nicu_days integer
);

ALTER TABLE clinical_case_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinical details based on case access"
  ON clinical_case_details FOR SELECT
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

CREATE POLICY "Hospital staff can manage clinical details for their cases"
  ON clinical_case_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
  );

-- FINANCIAL CASE DETAILS TABLE
CREATE TABLE IF NOT EXISTS financial_case_details (
  case_id uuid PRIMARY KEY REFERENCES cases(id) ON DELETE CASCADE,
  nicu_cost numeric(12,2),
  pharmacy_cost numeric(12,2),
  other_charges numeric(12,2),
  total_billed numeric(12,2),
  discount numeric(12,2),
  final_bill_amount numeric(12,2)
);

ALTER TABLE financial_case_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view financial details based on case access"
  ON financial_case_details FOR SELECT
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

CREATE POLICY "Hospital staff can manage financial details for their cases"
  ON financial_case_details FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
  );

-- DOCUMENT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  process_type text NOT NULL CHECK (process_type IN ('New', 'Renewal', 'Revision')),
  category text NOT NULL CHECK (category IN ('GENERAL', 'MEDICAL', 'FINANCIAL', 'FINAL', 'COMMUNICATION')),
  doc_type text NOT NULL,
  mandatory_flag boolean DEFAULT false,
  condition_notes text,
  display_order integer DEFAULT 0,
  UNIQUE(process_type, doc_type)
);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view document templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage document templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- DOCUMENT METADATA TABLE
CREATE TABLE IF NOT EXISTS document_metadata (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('GENERAL', 'MEDICAL', 'FINANCIAL', 'FINAL', 'COMMUNICATION')),
  doc_type text NOT NULL,
  file_name text,
  file_type text,
  size integer,
  status text NOT NULL DEFAULT 'Missing' CHECK (status IN ('Missing', 'Uploaded', 'Verified', 'Not_Applicable')),
  uploaded_at timestamptz,
  uploaded_by uuid REFERENCES users(id),
  verified_at timestamptz,
  verified_by uuid REFERENCES users(id),
  notes text,
  file_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE document_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents based on case access"
  ON document_metadata FOR SELECT
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

CREATE POLICY "Hospital staff can upload documents for their cases"
  ON document_metadata FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update documents based on role and case access"
  ON document_metadata FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND (
        cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'admin'))
      )
    )
  );

-- AUDIT EVENTS TABLE
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  user_id uuid REFERENCES users(id),
  user_role text,
  action text NOT NULL,
  notes text
);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit events based on case access"
  ON audit_events FOR SELECT
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

CREATE POLICY "Users can create audit events for accessible cases"
  ON audit_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND (
        cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'committee_member', 'admin'))
      )
    )
  );

-- FOLLOWUP SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS followup_schedules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  follow_up_type text NOT NULL,
  scheduled_date date NOT NULL,
  completed_date date,
  outcome text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE followup_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view followups based on case access"
  ON followup_schedules FOR SELECT
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

CREATE POLICY "Authorized users can manage followups"
  ON followup_schedules FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases 
      WHERE cases.id = case_id 
      AND (
        cases.hospital_id IN (SELECT hospital_id FROM users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'admin'))
      )
    )
  );

-- COMMITTEE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS committee_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  review_date timestamptz DEFAULT now(),
  decision text NOT NULL CHECK (decision IN ('Approved', 'Rejected', 'Pending', 'Deferred')),
  amount_sanctioned numeric(12,2),
  remarks text,
  reviewed_by uuid REFERENCES users(id)
);

ALTER TABLE committee_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view committee reviews based on case access"
  ON committee_reviews FOR SELECT
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

CREATE POLICY "Committee members can create reviews"
  ON committee_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('committee_member', 'admin')
    )
  );

-- REJECTION REASONS TABLE
CREATE TABLE IF NOT EXISTS rejection_reasons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  rejection_date timestamptz DEFAULT now(),
  reason_category text NOT NULL,
  detailed_reason text NOT NULL,
  rejected_by uuid REFERENCES users(id)
);

ALTER TABLE rejection_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rejections based on case access"
  ON rejection_reasons FOR SELECT
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

CREATE POLICY "Authorized users can record rejections"
  ON rejection_reasons FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('verifier', 'committee_member', 'admin')
    )
  );

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_cases_hospital_id ON cases(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(case_status);
CREATE INDEX IF NOT EXISTS idx_cases_created_by ON cases(created_by);
CREATE INDEX IF NOT EXISTS idx_document_metadata_case_id ON document_metadata(case_id);
CREATE INDEX IF NOT EXISTS idx_document_metadata_status ON document_metadata(status);
CREATE INDEX IF NOT EXISTS idx_audit_events_case_id ON audit_events(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_followup_schedules_case_id ON followup_schedules(case_id);
CREATE INDEX IF NOT EXISTS idx_followup_schedules_scheduled_date ON followup_schedules(scheduled_date);
