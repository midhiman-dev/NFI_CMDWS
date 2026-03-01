/*
  # Allow anonymous reads on app_settings

  The health check runs before authentication to determine if the database
  is reachable. app_settings needs to be readable by anonymous users for
  the health check to work correctly.
*/

CREATE POLICY "Anon users can view app settings"
  ON app_settings FOR SELECT
  TO anon
  USING (true);
