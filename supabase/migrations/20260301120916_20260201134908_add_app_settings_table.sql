CREATE TABLE IF NOT EXISTS app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view app settings"
  ON app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage app settings"
  ON app_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

INSERT INTO app_settings (key, value) VALUES ('seed_version', '1') ON CONFLICT (key) DO NOTHING;
