import i18next from './index';
import type { CaseStatus, InstallmentStatus, ProcessType } from '../types';

const literalTranslations: Record<string, string> = {
  'Basic Registration': 'बेसिक रजिस्ट्रेशन',
  'Fund Application': 'फंड एप्लिकेशन',
  'Interim Summary': 'इंटरिम समरी',
  'Review & Submit': 'समीक्षा और जमा',
  'Parents & Family': 'माता-पिता और परिवार',
  'Occupation, Income & Proof': 'व्यवसाय, आय और प्रमाण',
  'Birth / Medical Details': 'जन्म / चिकित्सीय विवरण',
  'NICU & Financial': 'NICU और वित्तीय',
  'Other Support': 'अन्य सहायता',
  'Declarations': 'घोषणाएँ',
  'Hospital Approval': 'अस्पताल अनुमोदन',
  'Birth Summary': 'जन्म सारांश',
  'Maternal Details': 'मातृ विवरण',
  'Antenatal Risk Factors': 'गर्भावस्था जोखिम कारक',
  'Diagnosis': 'निदान',
  'Treatment Given': 'दिया गया उपचार',
  'Current Status': 'वर्तमान स्थिति',
  'Ongoing Treatment': 'चालू उपचार',
  'Discharge Plan & Investigations': 'डिस्चार्ज योजना और जाँच',
  'Remarks & Signature': 'टिप्पणियाँ और हस्ताक्षर',
  'Father Name': 'पिता का नाम',
  'Mother Name': 'माँ का नाम',
  'Father Contact No': 'पिता का संपर्क नंबर',
  'Mother Contact No': 'माँ का संपर्क नंबर',
  'Address Details': 'पते का विवरण',
  'Father DOB': 'पिता की जन्म तिथि',
  'Mother DOB': 'माँ की जन्म तिथि',
  'Father Education': 'पिता की शिक्षा',
  'Mother Education': 'माँ की शिक्षा',
  'Date of Marriage': 'विवाह की तिथि',
  'Number of Family Members': 'परिवार के सदस्यों की संख्या',
  'Primary Phone': 'प्राथमिक फोन',
  'City': 'शहर',
  'Process': 'प्रक्रिया',
  'Father Occupation': 'पिता का व्यवसाय',
  'Father Employer / Company Name': 'पिता के नियोक्ता / कंपनी का नाम',
  'Father Monthly Income (INR)': 'पिता की मासिक आय (रु.)',
  'Father Daily Wages (INR)': 'पिता की दैनिक मजदूरी (रु.)',
  'Mother Occupation': 'माँ का व्यवसाय',
  'Mother Employer / Company Name': 'माँ के नियोक्ता / कंपनी का नाम',
  'Mother Monthly Income (INR)': 'माँ की मासिक आय (रु.)',
  'Mother Daily Wages (INR)': 'माँ की दैनिक मजदूरी (रु.)',
  'Assets / Own Land-House': 'संपत्ति / स्वयं की जमीन-घर',
  'Income Proof (Required)': 'आय प्रमाण (आवश्यक)',
  'Tahsildar Income Certificate': 'तहसीलदार आय प्रमाण पत्र',
  'Bank Statement (Last 6 months), if no Income Certificate': 'यदि आय प्रमाण पत्र नहीं है तो पिछले 6 महीनों का बैंक स्टेटमेंट',
  'Baby Date of Birth': 'बच्चे की जन्म तिथि',
  'Gender': 'लिंग',
  'Select gender': 'लिंग चुनें',
  'Baby Birth Weight (kg)': 'जन्म के समय वजन (कि.ग्रा.)',
  'Inborn / Outborn': 'इनबॉर्न / आउटबॉर्न',
  'Select...': 'चुनें...',
  'Inborn': 'इनबॉर्न',
  'Outborn': 'आउटबॉर्न',
  'If Outborn, Hospital Name': 'यदि आउटबॉर्न हो तो अस्पताल का नाम',
  'Type of Conception': 'गर्भाधान का प्रकार',
  'Natural': 'प्राकृतिक',
  'Gestational Age (weeks)': 'गर्भकाल आयु (सप्ताह)',
  'Type of Delivery': 'प्रसव का प्रकार',
  'Normal Vaginal Delivery': 'सामान्य प्रसव',
  'Cesarean Section': 'सीजेरियन सेक्शन',
  'Assisted Delivery': 'सहायता प्राप्त प्रसव',
  'Delivery Charges (INR)': 'प्रसव शुल्क (रु.)',
  'Gravida': 'गर्भ संख्या',
  'Parity': 'पैरिटी',
  'NICU Admission Date': 'NICU भर्ती तिथि',
  'Estimated Number of NICU Days': 'NICU के अनुमानित दिनों की संख्या',
  'Total Estimated Hospital Bill (INR)': 'कुल अनुमानित अस्पताल बिल (रु.)',
  'Advance Paid by Family (INR)': 'परिवार द्वारा दिया गया अग्रिम (रु.)',
  'Current Outstanding / Running Bill (INR)': 'वर्तमान बकाया / चल रहा बिल (रु.)',
  'Legacy Financial Fields (Optional)': 'पुराने वित्तीय फ़ील्ड (वैकल्पिक)',
  'These fields are retained for backward compatibility and do not affect completion.': 'ये फ़ील्ड पिछली संगतता के लिए रखे गए हैं और पूर्णता को प्रभावित नहीं करते।',
  'NFI Requested Amount (INR)': 'NFI अनुरोधित राशि (रु.)',
  'Estimate Billed Amount (INR)': 'अनुमानित बिल राशि (रु.)',
  'Estimate After Discount (INR)': 'छूट के बाद अनुमान (रु.)',
  'Any Other Support Received (Govt / NGO / Private)': 'प्राप्त अन्य सहायता (सरकार / NGO / निजी)',
  'Support Types (Optional)': 'सहायता के प्रकार (वैकल्पिक)',
  'One per line': 'एक पंक्ति में एक',
  'Notes': 'टिप्पणियाँ',
  'Declaration Date': 'घोषणा की तिथि',
  'Parent Signature (File/Image Reference)': 'अभिभावक हस्ताक्षर (फ़ाइल/छवि संदर्भ)',
  'Statement 1 accepted on': 'घोषणा 1 स्वीकार की गई:',
  'Name': 'नाम',
  'Designation': 'पदनाम',
  'Signature & Stamp (File/Image Reference)': 'हस्ताक्षर और मुहर (फ़ाइल/छवि संदर्भ)',
  'Approval Date': 'अनुमोदन तिथि',
  'Approval Remarks': 'अनुमोदन टिप्पणियाँ',
  'Marital Status': 'वैवाहिक स्थिति',
  'Married Life / Years Married': 'विवाहित जीवन / विवाह के वर्ष',
  'Mother Age': 'माँ की आयु',
  'Gravida (G)': 'ग्रैविडा (G)',
  'Abortions (A)': 'गर्भपात (A)',
  'Live Children Before (L)': 'पूर्व जीवित बच्चे (L)',
  'Mode of Conception': 'गर्भाधान का माध्यम',
  'Risk Factors': 'जोखिम कारक',
  'Risk Notes (if any)': 'जोखिम नोट्स (यदि कोई हों)',
  'Diagnoses': 'निदान',
  'Other Diagnosis': 'अन्य निदान',
  'Respiration Support': 'श्वसन सहायता',
  'Mechanical Ventilation': 'मैकेनिकल वेंटिलेशन',
  'IV Antibiotics': 'IV एंटीबायोटिक्स',
  'Ionotropes': 'आयोनोट्रोप्स',
  'Others If Any': 'अन्य यदि कोई हों',
  'DOL': 'DOL',
  "Today's Weight (kg)": 'आज का वजन (कि.ग्रा.)',
  'CGA (weeks)': 'CGA (सप्ताह)',
  'Respiration': 'श्वसन',
  'Feeding': 'फीडिंग',
  'Others': 'अन्य',
  'Plan of Discharge': 'डिस्चार्ज की योजना',
  'Labs Attached': 'लैब रिपोर्ट संलग्न',
  'X Ray Attached': 'एक्स-रे संलग्न',
  'Scans Attached': 'स्कैन संलग्न',
  'Others Attached': 'अन्य संलग्न',
  'Other Investigations Details': 'अन्य जाँच का विवरण',
  'Remarks if any': 'टिप्पणियाँ यदि कोई हों',
  'Signature (File/Image Reference)': 'हस्ताक्षर (फ़ाइल/छवि संदर्भ)',
  'Signed Date': 'हस्ताक्षर की तिथि'
};

export function tx(key: string, defaultValue: string, options?: Record<string, unknown>): string {
  return i18next.t(key, { defaultValue, ...options });
}

export function translateCaseStatus(status: CaseStatus | string): string {
  return tx(`case.status.${status}`, String(status).replace(/_/g, ' '));
}

export function translateInstallmentStatus(status: InstallmentStatus | string): string {
  return tx(`installment.status.${status}`, String(status));
}

export function translateProcessType(processType: ProcessType | '' | string): string {
  switch (processType) {
    case 'BRC':
      return tx('process.BRC', 'BRC - Birth & Resuscitation Care');
    case 'BRRC':
      return tx('process.BRRC', 'BRRC - Birth & Re-admission Resuscitation Care');
    case 'BGRC':
      return tx('process.BGRC', 'BGRC - Birth & Growth Care');
    case 'BCRC':
      return tx('process.BCRC', 'BCRC - Birth & Closure/Completion Care');
    case 'NON_BRC':
      return tx('process.NON_BRC', 'NON_BRC - Non-BRC Case');
    default:
      return tx('common.notMapped', 'Not mapped');
  }
}

export function translateGender(gender: string): string {
  switch (gender) {
    case 'Male':
      return tx('common.gender.male', 'Male');
    case 'Female':
      return tx('common.gender.female', 'Female');
    case 'Other':
      return tx('common.gender.other', 'Other');
    default:
      return gender;
  }
}

export function translateReportRunStatus(status: string): string {
  switch (status) {
    case 'Queued':
      return tx('reports.runStatus.Queued', 'Queued');
    case 'Running':
      return tx('reports.runStatus.Running', 'Running');
    case 'Succeeded':
      return tx('reports.runStatus.Succeeded', 'Succeeded');
    case 'Failed':
      return tx('reports.runStatus.Failed', 'Failed');
    default:
      return status;
  }
}

export function translateLiteral(text?: string | null): string {
  if (!text) return '';
  if (i18next.language !== 'hi') return text;
  return literalTranslations[text] || text;
}
