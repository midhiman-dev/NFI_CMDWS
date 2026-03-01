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
        setTimeout(() => reject(new Error('Health check timeout')), 3000)
      );

      const check = supabase.from('app_settings').select('key').limit(1);

      const result = await Promise.race([check, timeout]) as any;

      if (result.error) {
        const code = result.error?.code;
        if (code === 'PGRST116' || result.error?.message?.includes('does not exist')) {
          console.warn('Health check: table not found', result.error);
          return { healthy: false };
        }
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
