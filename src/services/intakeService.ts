import { providerFactory } from '../data/providers/ProviderFactory';
import { IntakeFundApplication, IntakeInterimSummary, IntakeCompleteness, CaseSubmitReadiness } from '../types';

export const intakeService = {
  async loadIntakeForCase(caseId: string) {
    const provider = providerFactory.getProvider();
    return provider.getIntakeData(caseId);
  },

  async saveIntakeSection(caseId: string, type: 'fundApp' | 'interimSummary', data: any) {
    const provider = providerFactory.getProvider();
    const intake = await provider.getIntakeData(caseId);

    if (type === 'fundApp') {
      await provider.saveIntakeData(caseId, data, intake.interimSummary);
    } else {
      await provider.saveIntakeData(caseId, intake.fundApplication, data);
    }
  },

  async getCompleteness(caseId: string): Promise<IntakeCompleteness> {
    const provider = providerFactory.getProvider();
    return provider.getIntakeCompleteness(caseId);
  },

  async getSubmitReadiness(caseId: string): Promise<CaseSubmitReadiness> {
    const provider = providerFactory.getProvider();
    return provider.getCaseSubmitReadiness(caseId);
  },
};
