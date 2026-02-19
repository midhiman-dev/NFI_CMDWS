import { supabase } from '../../lib/supabase';
import type { DataProvider, DataMode } from './DataProvider';
import { DbProvider } from './DbProvider';
import { MockProvider } from './MockProvider';

class ProviderFactory {
  private provider: DataProvider | null = null;
  private mode: DataMode | null = null;
  private initialized = false;

  async initialize(): Promise<{ provider: DataProvider; mode: DataMode }> {
    if (this.initialized && this.provider && this.mode) {
      return { provider: this.provider, mode: this.mode };
    }

    const forceDemo = localStorage.getItem('nfi_force_demo_mode') === 'true';

    if (forceDemo) {
      this.provider = new MockProvider();
      this.mode = 'DEMO';
      this.initialized = true;
      return { provider: this.provider, mode: this.mode };
    }

    const healthCheck = await this.runHealthCheck();

    if (!healthCheck.healthy) {
      this.provider = new MockProvider();
      this.mode = 'DEMO';
    } else {
      this.provider = new DbProvider();
      this.mode = 'DB';
    }

    this.initialized = true;
    return { provider: this.provider, mode: this.mode };
  }

  private async runHealthCheck(): Promise<{ healthy: boolean }> {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), 500)
      );

      const checks = Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('hospitals').select('id', { count: 'exact', head: true }),
        supabase.from('cases').select('id', { count: 'exact', head: true }),
      ]);

      const results = await Promise.race([checks, timeout]) as any[];

      for (const result of results) {
        if (result.error) {
          console.warn('Health check failed:', result.error);
          return { healthy: false };
        }
      }

      const [usersResult, hospitalsResult] = results;
      const userCount = usersResult.count || 0;
      const hospitalCount = hospitalsResult.count || 0;

      if (userCount === 0 || hospitalCount === 0) {
        console.warn('Database empty: users=' + userCount + ', hospitals=' + hospitalCount);
        return { healthy: false };
      }

      return { healthy: true };
    } catch (error) {
      console.warn('Health check error:', error);
      return { healthy: false };
    }
  }

  getProvider(): DataProvider {
    if (!this.provider) {
      throw new Error('ProviderFactory not initialized');
    }
    return this.provider;
  }

  getMode(): DataMode {
    if (!this.mode) {
      throw new Error('ProviderFactory not initialized');
    }
    return this.mode;
  }
}

export const providerFactory = new ProviderFactory();
