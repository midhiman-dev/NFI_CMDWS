import { useState } from 'react';
import { Layout } from '../components/layout/Layout';
import { NfiCard } from '../components/design-system/NfiCard';
import { NfiTabs } from '../components/design-system/NfiTabs';
import { useToast } from '../components/design-system/Toast';
import { useAppContext } from '../App';
import { DonationsLedgerTab } from '../components/finance/DonationsLedgerTab';
import { BankBalanceTab } from '../components/finance/BankBalanceTab';
import { ExpenseTransactionsTab } from '../components/finance/ExpenseTransactionsTab';

export function FinanceInputs() {
  const { showToast } = useToast();
  const { provider } = useAppContext();
  const [activeTab, setActiveTab] = useState<'donations' | 'bank' | 'expense'>('donations');

  const tabs = [
    { id: 'donations', label: 'Donations Ledger Entry' },
    { id: 'bank', label: 'Bank/FD Balance Snapshot' },
    { id: 'expense', label: 'Expense Transactions' },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Finance Inputs</h1>
          <p className="text-[var(--nfi-text-secondary)] mt-1">Manage financial transactions and account balances</p>
        </div>

        <NfiCard>
          <NfiTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as 'donations' | 'bank' | 'expense')}
          >
            {activeTab === 'donations' && <DonationsLedgerTab />}
            {activeTab === 'bank' && <BankBalanceTab />}
            {activeTab === 'expense' && <ExpenseTransactionsTab />}
          </NfiTabs>
        </NfiCard>
      </div>
    </Layout>
  );
}
