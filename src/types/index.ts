export type ProcessType = 'BRC' | 'BRRC' | 'BGRC' | 'BCRC' | 'NON_BRC';

export type CaseStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under_Verification'
  | 'Under_Review'
  | 'Approved'
  | 'Rejected'
  | 'Closed'
  | 'Returned';

export type UserRole =
  | 'hospital_spoc'
  | 'hospital_doctor'
  | 'verifier'
  | 'committee_member'
  | 'accounts'
  | 'beni_volunteer'
  | 'admin'
  | 'leadership';

export type DocumentCategory =
  | 'GENERAL'
  | 'MEDICAL'
  | 'FINANCE'
  | 'FINAL'
  | 'COMMUNICATION';

export type DocumentStatus = 'Missing' | 'Uploaded' | 'Verified' | 'Rejected' | 'Not_Applicable';

export type CommitteeOutcome =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Need_More_Info'
  | 'Deferred';

export type RejectionLevel = 'NFI' | 'BRC' | 'BRRC' | 'BGRC' | 'BCRC' | 'Other';

export type InstallmentStatus = 'Scheduled' | 'Requested' | 'Disbursed' | 'Delayed' | 'Cancelled';

export type MetricValueType = 'BOOLEAN' | 'TEXT';

export type ReportRunStatus = 'Queued' | 'Running' | 'Succeeded' | 'Failed';

export interface ReportTemplate {
  templateId: string;
  code: string;
  name: string;
  description?: string;
  version: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRun {
  runId: string;
  templateId: string;
  templateCode?: string;
  templateName?: string;
  status: ReportRunStatus;
  filters?: {
    fiscalYear?: number;
    monthRange?: [number, number];
    hospitalIds?: string[];
  };
  dataAsOf?: string;
  generatedAt?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface KpiCatalog {
  id: string;
  code: string;
  name: string;
  description?: string;
  dataType: 'Numeric' | 'Percentage' | 'Text';
  calculationMethod?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetRegistry {
  id: string;
  code: string;
  name: string;
  description?: string;
  sourceTable?: string;
  refreshFrequency: 'Daily' | 'Weekly' | 'Monthly';
  lastRefreshed?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateRegistry {
  id: string;
  code: string;
  name: string;
  description?: string;
  templateType: 'Dashboard' | 'Export' | 'Alert';
  version: string;
  config?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateBinding {
  id: string;
  templateId: string;
  kpiId?: string;
  datasetId?: string;
  fieldName?: string;
  mappingConfig?: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  userId: string;
  username: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  hospitalId?: string;
  isActive: boolean;
}

export interface Hospital {
  hospitalId: string;
  name: string;
  city: string;
  state: string;
  spocName?: string;
  spocPhone?: string;
  isActive: boolean;
}

export interface HospitalProcessMap {
  mapId: string;
  hospitalId: string;
  processType: ProcessType;
  effectiveFromDate: string;
  notes?: string;
}

export interface DirectorSettlementReview {
  decision?: 'Approved' | 'Returned';
  comments?: string;
  by?: string;
  at?: string;
}

export interface SettlementRecord {
  referenceAmount?: number;
  finalBillAmount?: number;
  nfiPaidAmount?: number;
  otherPaidAmount?: number;
  variancePct?: number;
  varianceFlag?: boolean;
  directorReview?: DirectorSettlementReview;
  closedAt?: string;
  closedBy?: string;
  updatedAt?: string;
}

export interface Case {
  caseId: string;
  caseRef: string;
  processType: ProcessType;
  hospitalId: string;
  caseStatus: CaseStatus;
  intakeDate: string;
  closureDate?: string;
  createdBy: string;
  updatedAt: string;
  lastActionAt: string;
  settlement?: SettlementRecord;
}

export interface ChildProfile {
  caseId: string;
  beneficiaryNo?: string;
  beneficiaryName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string;
  admissionDate: string;
  gestationalAgeWeeks?: number;
  birthWeightKg?: number;
  currentWeightKg?: number;
  morbidity?: string;
  mortality?: boolean;
}

export interface FamilyProfile {
  caseId: string;
  fatherName?: string;
  motherName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  aadhaarLast4?: string;
  incomeBand?: string;
}

export interface ClinicalCaseDetails {
  caseId: string;
  diagnosis: string;
  summary: string;
  doctorName?: string;
  nicuDays?: number;
  admissionDate?: string;
  dischargeDate?: string;
  currentStatus?: string;
  complications?: string;
}

export interface FinancialCaseDetails {
  caseId: string;
  estimateAmount: number;
  approvedAmount?: number;
  finalBillAmount?: number;
  hospitalDiscount?: number;
  govtSchemeContribution?: number;
  insuranceAmount?: number;
  nfiRequestedAmount?: number;
  nfiApprovedAmount?: number;
  paymentMethod?: string;
}

export interface DocVersion {
  versionNo: number;
  fileName: string;
  fileType?: string;
  size?: number;
  uploadedAt: string;
  uploadedBy: string;
  status: DocumentStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface DocumentMetadata {
  docId: string;
  caseId: string;
  category: DocumentCategory;
  docType: string;
  fileName?: string;
  fileType?: string;
  size?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  status: DocumentStatus;
  notes?: string;
  fileUrl?: string;
  versions?: DocVersion[];
}

export interface DocumentRequirementTemplate {
  templateId: string;
  processType: ProcessType;
  category: DocumentCategory;
  docType: string;
  mandatoryFlag: boolean;
  conditionNotes?: string;
}

export interface CommitteeDecision {
  decisionId: string;
  caseId: string;
  outcome: CommitteeOutcome;
  approvedAmount?: number;
  decisionDate?: string;
  comments?: string;
  decidedBy?: string;
}

export interface FundingInstallment {
  installmentId: string;
  caseId: string;
  label: string;
  amount: number;
  plannedDate?: string;
  requestedDate?: string;
  paidDate?: string;
  status: InstallmentStatus;
  paymentMode?: 'BankTransfer' | 'UPI' | 'Cash' | 'Cheque';
  transactionRef?: string;
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface RejectionDetails {
  rejectionId: string;
  caseId: string;
  reasonCategory: 'Medical' | 'Financial' | 'Documentation' | 'Eligibility' | 'Other';
  rejectionLevel: RejectionLevel;
  communicationStatus: 'Pending' | 'Notified' | 'Acknowledged';
  referringHospital?: string;
  caseSummary?: string;
  detailedReason?: string;
}

export interface BeniProgramOps {
  beniId: string;
  caseId: string;
  beniTeamMember?: string;
  hamperSentDate?: string;
  voiceNoteReceivedAt?: string;
  notes?: string;
}

export interface MonitoringVisit {
  visitId: string;
  caseId: string;
  visitType: 'Home' | 'Phone' | 'Hospital' | 'Video';
  status: 'Scheduled' | 'Completed' | 'Missed' | 'Cancelled';
  scheduledDate: string;
  completedDate?: string;
  assignedToUserId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface FollowupMilestone {
  milestoneId: string;
  caseId: string;
  milestoneMonths: 3 | 6 | 9 | 12 | 18 | 24;
  dueDate: string;
  followupDate?: string;
  status?: 'Due' | 'Upcoming' | 'Completed' | 'Overdue';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FollowupEvent {
  followupId: string;
  caseId: string;
  milestoneMonths: 3 | 6 | 9 | 12 | 18 | 24;
  dueDate: string;
  followupDate?: string;
  reachedFlag?: boolean;
  notes?: string;
}

export interface FollowupMetricDef {
  metricId: string;
  milestoneMonths: 3 | 6 | 9 | 12 | 18 | 24;
  metricKey: string;
  metricLabel: string;
  valueType: MetricValueType;
  allowNA: boolean;
}

export interface FollowupMetricValue {
  valueId: string;
  caseId: string;
  milestoneMonths: 3 | 6 | 9 | 12 | 18 | 24;
  metricKey: string;
  valueBoolean?: boolean;
  valueText?: string;
  isNA?: boolean;
  capturedAt?: string;
  capturedBy?: string;
}

export interface AuditEvent {
  eventId: string;
  caseId: string;
  timestamp: string;
  userId: string;
  userRole: UserRole;
  action: string;
  notes?: string;
  changes?: Record<string, unknown>;
}

export interface DoctorReview {
  reviewId: string;
  caseId: string;
  assignedToUserId?: string;
  assignedToName?: string;
  submittedAt?: string;
  outcome?: 'Approved' | 'Approved_With_Comments' | 'Returned';
  comments?: string;
  gatingResult?: {
    canSubmit: boolean;
    reasons: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface SubmitGatingInfo {
  canSubmit: boolean;
  blockedBy: string[];
  details: {
    fundAppComplete: boolean;
    interimSummaryComplete: boolean;
    documentsReady: boolean;
    doctorReviewApproved: boolean;
  };
}

export interface IntakeFundApplicationSection {
  sectionId: string;
  isComplete: boolean;
  percentComplete: number;
}

export interface IntakeFundApplication {
  parentsFamilySection: {
    fatherDob?: string;
    fatherEducation?: string;
    motherDob?: string;
    motherEducation?: string;
    marriageDate?: string;
    dependents?: string;
  };
  occupationIncomeSection: {
    fatherOccupation?: string;
    fatherEmployer?: string;
    fatherMonthlyIncome?: number;
    motherOccupation?: string;
    motherEmployer?: string;
    motherMonthlyIncome?: number;
    incomeProofType?: string;
  };
  birthDetailsSection: {
    isInborn?: boolean;
    conceptionType?: string;
    gestationalAgeWeeks?: number;
    deliveryType?: string;
    gravida?: number;
    parity?: number;
  };
  nicuFinancialSection: {
    nicuAdmissionDate?: string;
    estimatedNicuDays?: number;
    nfiRequestedAmount?: number;
    estimateBilled?: number;
    estimateAfterDiscount?: number;
  };
  otherSupportSection: {
    otherSupportTypes?: string[];
    otherSupportNotes?: string;
  };
  declarationsSection: {
    declarationsAccepted?: boolean;
    declarationTimestamp?: string;
    declaredByUser?: string;
  };
  hospitalApprovalSection: {
    approvedByName?: string;
    approvalDate?: string;
    approvalRemarks?: string;
  };
}

export interface IntakeInterimSummary {
  birthSummarySection: {
    apgarScore?: number;
    timeOfBirth?: string;
    placeOfBirth?: string;
    gestationalAgeWeeks?: number;
  };
  maternalDetailsSection: {
    maritalStatus?: string;
    yearsMarried?: number;
    motherAge?: number;
    gravida?: number;
    parity?: number;
    abortions?: number;
    liveChildrenBefore?: number;
  };
  antenatalRiskFactorsSection: {
    riskFactors?: string[];
    riskNotesIfAny?: string;
  };
  diagnosisSection: {
    diagnoses?: string[];
    otherDiagnosis?: string;
  };
  treatmentGivenSection: {
    respiratorySupportRequired?: boolean;
    phototherapyRequired?: boolean;
    antibioticsRequired?: boolean;
    nutritionalSupportRequired?: boolean;
    treatmentNotes?: string;
  };
  currentStatusSection: {
    dayOfLife?: number;
    currentWeight?: number;
    correctedGestationalAge?: number;
  };
  feedingRespirationSection: {
    feedingMode?: string;
    respirationStatus?: string;
  };
  dischargePlanInvestigationsSection: {
    dischargeDate?: string;
    investigationsPlanned?: string;
    investigationsDone?: boolean;
  };
  remarksSignatureSection: {
    remarks?: string;
    doctorName?: string;
    signedAt?: string;
  };
}

export interface IntakeCompleteness {
  fundAppSections: {
    parentsFamilySection: boolean;
    occupationIncomeSection: boolean;
    birthDetailsSection: boolean;
    nicuFinancialSection: boolean;
    otherSupportSection: boolean;
    declarationsSection: boolean;
    hospitalApprovalSection: boolean;
  };
  fundAppTotalPercent: number;
  fundAppIsComplete: boolean;
  interimSummarySections: {
    birthSummarySection: boolean;
    maternalDetailsSection: boolean;
    antenatalRiskFactorsSection: boolean;
    diagnosisSection: boolean;
    treatmentGivenSection: boolean;
    currentStatusSection: boolean;
    feedingRespirationSection: boolean;
    dischargePlanInvestigationsSection: boolean;
    remarksSignatureSection: boolean;
  };
  interimSummaryTotalPercent: number;
  interimSummaryIsComplete: boolean;
  overallPercent: number;
  allRequiredFieldsComplete: boolean;
}

export interface CaseSubmitReadiness {
  canSubmit: boolean;
  fundAppComplete: boolean;
  interimSummaryComplete: boolean;
  documentsReady: boolean;
  missingSections: string[];
  missingFields: string[];
  missingDocuments: string[];
}

export interface AuthState {
  activeUser: User | null;
  activeRole: UserRole | null;
}

export interface AppStore {
  users: User[];
  hospitals: Hospital[];
  cases: Case[];
  childProfiles: ChildProfile[];
  familyProfiles: FamilyProfile[];
  clinicalDetails: ClinicalCaseDetails[];
  financialDetails: FinancialCaseDetails[];
  documents: DocumentMetadata[];
  documentTemplates: DocumentRequirementTemplate[];
  committeeDecisions: CommitteeDecision[];
  fundingInstallments: FundingInstallment[];
  rejections: RejectionDetails[];
  beniPrograms: BeniProgramOps[];
  followupEvents: FollowupEvent[];
  followupMetricDefs: FollowupMetricDef[];
  followupMetricValues: FollowupMetricValue[];
  auditEvents: AuditEvent[];
}
