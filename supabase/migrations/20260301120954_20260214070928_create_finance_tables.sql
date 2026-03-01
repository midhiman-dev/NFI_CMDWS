CREATE TABLE IF NOT EXISTS donations_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  donor_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  category text DEFAULT 'Cash' CHECK (category IN ('Cash', 'Check', 'Online')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_fd_balance_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  account_name text NOT NULL,
  account_number text,
  balance numeric NOT NULL CHECK (balance >= 0),
  account_type text DEFAULT 'Savings' CHECK (account_type IN ('Savings', 'Current', 'FD')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expense_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date date NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  category text NOT NULL CHECK (category IN ('Program', 'Operations')),
  approved_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE donations_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_fd_balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all donation entries"
  ON donations_ledger_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert donation entries"
  ON donations_ledger_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update donation entries"
  ON donations_ledger_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete donation entries"
  ON donations_ledger_entries FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all bank snapshots"
  ON bank_fd_balance_snapshots FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert bank snapshots"
  ON bank_fd_balance_snapshots FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update bank snapshots"
  ON bank_fd_balance_snapshots FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete bank snapshots"
  ON bank_fd_balance_snapshots FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all expense transactions"
  ON expense_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert expense transactions"
  ON expense_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update expense transactions"
  ON expense_transactions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete expense transactions"
  ON expense_transactions FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_donations_entry_date ON donations_ledger_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_bank_snapshot_date ON bank_fd_balance_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_expense_transaction_date ON expense_transactions(transaction_date);
