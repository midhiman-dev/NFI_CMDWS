/*
  # Doctor Review System

  1. New Tables
    - `doctor_reviews`
      - `id` (uuid, primary key) - unique review record
      - `case_id` (uuid, FK to cases) - the case being reviewed
      - `assigned_to_user_id` (uuid, FK to users) - clinical_reviewer role user
      - `submitted_at` (timestamptz) - when review was submitted
      - `outcome` (text) - Approved/Approved_With_Comments/Returned
      - `comments` (text) - optional reviewer comments
      - `gating_result` (jsonb) - cached submit readiness result {canSubmit, reasons}
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS on `doctor_reviews` table
    - Add policy for clinical_reviewer to view/update assignments
    - Add policy for admin/leadership to assign/edit assignments
    - Add policy for case creators to view assignments

  3. Notes
    - doctor_reviews tracks assignment + sign-off for clinical review gate
    - gating_result stores the readiness snapshot at review time
    - Case can only go to committee if doctor review outcome is Approved or Approved_With_Comments
*/

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
      SELECT 1 FROM cases
      WHERE cases.id = doctor_reviews.case_id
      AND cases.created_by = auth.uid()
    )
  );

CREATE POLICY "Admin and leadership can manage assignments"
  ON doctor_reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY(ARRAY['admin'::text, 'leadership'::text])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY(ARRAY['admin'::text, 'leadership'::text])
    )
  );

CREATE POLICY "Admin and leadership can create reviews"
  ON doctor_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = ANY(ARRAY['admin'::text, 'leadership'::text])
    )
  );

CREATE POLICY "Clinical reviewers can submit reviews"
  ON doctor_reviews FOR UPDATE
  TO authenticated
  USING (assigned_to_user_id = auth.uid())
  WITH CHECK (assigned_to_user_id = auth.uid());
