import type { IntakeFundApplication, IntakeInterimSummary } from '../types';

function isUnset(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

export function deriveInterimSeedFromFundApplication(
  fundApplication?: IntakeFundApplication,
  interimSummary?: IntakeInterimSummary
): Partial<IntakeInterimSummary> {
  const fundBirth = fundApplication?.birthDetailsSection;
  const interimBirth = interimSummary?.birthSummarySection;
  const interimMaternal = interimSummary?.maternalDetailsSection;

  const birthSummarySection: IntakeInterimSummary['birthSummarySection'] = {
    ...(isUnset(interimBirth?.dateOfBirth) && !isUnset(fundBirth?.babyDateOfBirth)
      ? { dateOfBirth: fundBirth?.babyDateOfBirth }
      : {}),
    ...(isUnset(interimBirth?.gender) && !isUnset(fundBirth?.babyGender)
      ? { gender: fundBirth?.babyGender }
      : {}),
    ...(isUnset(interimBirth?.babyBirthWeightKg) && !isUnset(fundBirth?.babyBirthWeightKg)
      ? { babyBirthWeightKg: fundBirth?.babyBirthWeightKg }
      : {}),
    ...(isUnset(interimBirth?.isInborn) && !isUnset(fundBirth?.isInborn)
      ? { isInborn: fundBirth?.isInborn }
      : {}),
    ...(isUnset(interimBirth?.outbornHospitalName) && !isUnset(fundBirth?.outbornHospitalName)
      ? { outbornHospitalName: fundBirth?.outbornHospitalName }
      : {}),
    ...(isUnset(interimBirth?.gestationalAgeWeeks) && !isUnset(fundBirth?.gestationalAgeWeeks)
      ? { gestationalAgeWeeks: fundBirth?.gestationalAgeWeeks }
      : {}),
  };

  const maternalDetailsSection: IntakeInterimSummary['maternalDetailsSection'] = {
    ...(isUnset(interimMaternal?.gravida) && !isUnset(fundBirth?.gravida)
      ? { gravida: fundBirth?.gravida }
      : {}),
    ...(isUnset(interimMaternal?.parity) && !isUnset(fundBirth?.parity)
      ? { parity: fundBirth?.parity }
      : {}),
    ...(isUnset(interimMaternal?.conceptionMode) &&
    (fundBirth?.conceptionType === 'Natural' || fundBirth?.conceptionType === 'IUI' || fundBirth?.conceptionType === 'IVF')
      ? { conceptionMode: fundBirth.conceptionType }
      : {}),
  };

  return {
    ...(Object.keys(birthSummarySection).length > 0 ? { birthSummarySection } : {}),
    ...(Object.keys(maternalDetailsSection).length > 0 ? { maternalDetailsSection } : {}),
  };
}
