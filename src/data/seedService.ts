import { supabase } from '../lib/supabase';
import { generateSeedData } from './seedData';

const SEED_VERSION = '1';

export async function getSeedStatus() {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'seed_version')
    .maybeSingle();

  return {
    version: data?.value || '0',
    needsSeeding: data?.value !== SEED_VERSION,
  };
}

export async function resetAndSeedDemoData() {
  try {
    console.log('Starting database reseed via edge function...');
    const seedData = generateSeedData();

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/reseed-database`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'X-Client-Info': 'supabase-js/2.57.4',
        },
        body: JSON.stringify({ seedData }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to reseed database');
    }

    const result = await response.json();
    console.log('Reseed successful:', result);
    return result;
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

export async function getTableRowCounts() {
  const tables = [
    'hospitals',
    'users',
    'cases',
    'beneficiary_profiles',
    'family_profiles',
    'clinical_case_details',
    'financial_case_details',
    'document_templates',
    'document_metadata',
    'committee_reviews',
    'funding_installments',
    'beni_program_ops',
    'followup_milestones',
    'followup_metric_values',
    'rejection_reasons',
    'audit_events',
  ];

  const counts: Record<string, number> = {};

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn(`Error counting ${table}:`, error);
      counts[table] = 0;
    } else {
      counts[table] = count || 0;
    }
  }

  return counts;
}
