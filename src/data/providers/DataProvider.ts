import type { Case, Hospital, User, ChildProfile, FamilyProfile, ClinicalCaseDetails, FinancialCaseDetails, ProcessType, DocumentMetadata, DocumentRequirementTemplate, DocumentStatus, CaseStatus, CommitteeOutcome, FundingInstallment, InstallmentStatus, MonitoringVisit, FollowupMilestone, FollowupMetricDef, FollowupMetricValue, ReportTemplate, ReportRun, ReportRunStatus, KpiCatalog, DatasetRegistry, TemplateRegistry, TemplateBinding, IntakeFundApplication, IntakeInterimSummary, IntakeCompleteness, CaseSubmitReadiness, SettlementRecord, DoctorReview, SubmitGatingInfo, WorkflowExtensions } from '../../types';

export interface CaseWithDetails extends Case {
  hospitalName?: string;
  childName?: string;
  beneficiaryNo?: string;
  approvedAmount?: number;
}

export interface CreateCasePayload {
  processType: ProcessType;
  hospitalId: string;
  admissionDate: string;
  intakeDate: string;
  caseStatus: CaseStatus;
  beneficiaryNo?: string;
  beneficiaryName?: string;
  gender?: 'Male' | 'Female' | 'Other';
  dob?: string;
  fatherName?: string;
  motherName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  diagnosis?: string;
  summary?: string;
  estimateAmount?: number;
  createdBy: string;
}

export interface DocumentWithTemplate extends DocumentMetadata {
  mandatoryFlag?: boolean;
  conditionNotes?: string;
}

export interface ChecklistReadiness {
  mandatoryTotal: number;
  mandatoryComplete: number;
  blockingDocs: DocumentWithTemplate[];
  isReady: boolean;
}

export interface VerificationRecord {
  verificationId: string;
  caseId: string;
  recommendation: 'Proceed' | 'Return' | 'Hold';
  notes: string;
  verifiedBy: string;
  verifiedAt: string;
}

export interface CommitteeReviewRecord {
  reviewId: string;
  caseId: string;
  outcome: CommitteeOutcome;
  approvedAmount?: number;
  comments: string;
  decidedBy: string;
  decidedAt: string;
}

export interface InstallmentSummary {
  totalApproved: number;
  totalPlanned: number;
  totalPaid: number;
  balance: number;
}

export interface BeniProgramOpsData {
  opsId?: string;
  caseId: string;
  beniTeamMember?: string;
  beniTeamMemberName?: string;
  hamperSentDate?: string;
  voiceNoteReceivedAt?: string;
  notes?: string;
}

export interface HospitalProcessMapWithDetails {
  mapId: string;
  hospitalId: string;
  hospitalName: string;
  processType: ProcessType;
  isActive: boolean;
  effectiveFromDate: string;
  updatedAt: string;
}

export interface DataProvider {
  listCases(): Promise<CaseWithDetails[]>;
  getCaseById(caseId: string): Promise<CaseWithDetails | null>;
  getHospitals(): Promise<Hospital[]>;
  getHospitalProcessType(hospitalId: string): Promise<ProcessType | null>;
  createCase(payload: CreateCasePayload): Promise<CaseWithDetails>;
  listCaseDocuments(caseId: string): Promise<DocumentWithTemplate[]>;
  ensureDocumentChecklist(caseId: string, processType: string): Promise<void>;
  updateDocumentStatus(documentId: string, status: DocumentStatus, notes?: string): Promise<void>;
  updateDocumentNotes(documentId: string, notes: string): Promise<void>;
  uploadDocument(caseId: string, documentId: string, fileMetadata: {
    fileName: string;
    fileType?: string;
    size?: number;
    mimeType?: string;
    fileSize?: number;
    lastModified?: number;
  }): Promise<void>;
  getDocumentTemplates(processType: string): Promise<DocumentRequirementTemplate[]>;
  getChecklistReadiness(caseId: string): Promise<ChecklistReadiness>;
  getVerification(caseId: string): Promise<VerificationRecord | null>;
  submitVerification(caseId: string, data: {
    recommendation: 'Proceed' | 'Return' | 'Hold';
    notes: string;
    verifiedBy: string;
  }): Promise<void>;
  returnToHospital(caseId: string, data: {
    reason: string;
    comment: string;
  }): Promise<void>;
  sendToCommittee(caseId: string, data: {
    comment: string;
  }): Promise<void>;
  getCommitteeReview(caseId: string): Promise<CommitteeReviewRecord | null>;
  submitCommitteeDecision(caseId: string, data: {
    outcome: CommitteeOutcome;
    approvedAmount?: number;
    comments: string;
    decidedBy: string;
  }): Promise<void>;
  updateCaseStatus(caseId: string, status: CaseStatus): Promise<void>;
  listInstallments(caseId: string): Promise<FundingInstallment[]>;
  createInstallment(caseId: string, payload: Omit<FundingInstallment, 'installmentId' | 'caseId' | 'updatedAt'>): Promise<FundingInstallment>;
  updateInstallment(installmentId: string, patch: Partial<Omit<FundingInstallment, 'installmentId' | 'caseId'>>): Promise<FundingInstallment>;
  deleteInstallment(installmentId: string): Promise<void>;
  getInstallmentSummary(caseId: string): Promise<InstallmentSummary>;
  listMonitoringVisits(caseId: string): Promise<MonitoringVisit[]>;
  createMonitoringVisit(caseId: string, payload: Omit<MonitoringVisit, 'visitId' | 'caseId' | 'createdAt' | 'updatedAt'>): Promise<MonitoringVisit>;
  updateMonitoringVisit(visitId: string, patch: Partial<Omit<MonitoringVisit, 'visitId' | 'caseId' | 'createdAt'>>): Promise<MonitoringVisit>;
  deleteMonitoringVisit(visitId: string): Promise<void>;
  listFollowupMilestones(caseId: string): Promise<FollowupMilestone[]>;
  ensureFollowupMilestones(caseId: string, anchorDate: string): Promise<FollowupMilestone[]>;
  listFollowupMetricDefs(milestoneMonths: number): Promise<FollowupMetricDef[]>;
  saveFollowupMetricValues(caseId: string, milestoneMonths: number, values: Omit<FollowupMetricValue, 'valueId'>[]): Promise<void>;
  getFollowupMetricValues(caseId: string, milestoneMonths: number): Promise<FollowupMetricValue[]>;
  setFollowupDate(caseId: string, milestoneMonths: number, followupDate: string, notes?: string): Promise<void>;
  simulateMandatoryDocs(caseId: string, options?: { autoVerify?: boolean }): Promise<number>;
  listVolunteers(): Promise<User[]>;
  getClinicalDetails(caseId: string): Promise<ClinicalCaseDetails | null>;
  updateClinicalDates(caseId: string, dates: { admissionDate?: string; dischargeDate?: string }): Promise<void>;
  getBeniProgramOps(caseId: string): Promise<BeniProgramOpsData | null>;
  saveBeniProgramOps(caseId: string, ops: Omit<BeniProgramOpsData, 'opsId' | 'caseId' | 'beniTeamMemberName'>): Promise<void>;
  getDoctorReview(caseId: string): Promise<DoctorReview | null>;
  listUsersByRole(role: string): Promise<Array<{ userId: string; fullName: string; email: string }>>;
  assignDoctorReviewer(caseId: string, reviewerUserId: string): Promise<void>;
  submitDoctorReview(caseId: string, outcome: 'Approved' | 'Approved_With_Comments' | 'Returned', comments?: string, gatingInfo?: SubmitGatingInfo): Promise<void>;
  getBeneficiary(caseId: string): Promise<ChildProfile | null>;
  upsertBeneficiary(caseId: string, data: Partial<Omit<ChildProfile, 'caseId'>>): Promise<void>;
  getFamily(caseId: string): Promise<FamilyProfile | null>;
  upsertFamily(caseId: string, data: Partial<Omit<FamilyProfile, 'caseId'>>): Promise<void>;
  upsertClinical(caseId: string, data: Partial<Omit<ClinicalCaseDetails, 'caseId'>>): Promise<void>;
  getFinancial(caseId: string): Promise<FinancialCaseDetails | null>;
  upsertFinancial(caseId: string, data: Partial<Omit<FinancialCaseDetails, 'caseId'>>): Promise<void>;
  listHospitalProcessMaps(): Promise<HospitalProcessMapWithDetails[]>;
  createHospitalProcessMap(data: {
    hospitalId: string;
    processType: ProcessType;
    isActive: boolean;
    effectiveFromDate: string;
  }): Promise<HospitalProcessMapWithDetails>;
  updateHospitalProcessMap(mapId: string, data: {
    processType?: ProcessType;
    isActive?: boolean;
    effectiveFromDate?: string;
  }): Promise<HospitalProcessMapWithDetails>;
  deleteHospitalProcessMap(mapId: string): Promise<void>;
  listReportTemplates(): Promise<ReportTemplate[]>;
  listReportRuns(templateId?: string, limit?: number): Promise<ReportRun[]>;
  createReportRun(data: {
    templateId: string;
    templateCode?: string;
    templateName?: string;
    filters?: any;
    dataAsOf?: Date;
  }): Promise<any>;
  updateReportRunStatus(runId: string, status: ReportRunStatus, dataAsOf?: string): Promise<ReportRun>;
  getDonationsLedger(): Promise<any[]>;
  createDonationEntry(data: any): Promise<any>;
  updateDonationEntry(id: string, data: any): Promise<any>;
  deleteDonationEntry(id: string): Promise<void>;
  getBankBalanceSnapshots(): Promise<any[]>;
  createBankSnapshot(data: any): Promise<any>;
  updateBankSnapshot(id: string, data: any): Promise<any>;
  deleteBankSnapshot(id: string): Promise<void>;
  getExpenseTransactions(): Promise<any[]>;
  createExpenseTransaction(data: any): Promise<any>;
  updateExpenseTransaction(id: string, data: any): Promise<any>;
  deleteExpenseTransaction(id: string): Promise<void>;
  listKpiCatalog(): Promise<KpiCatalog[]>;
  createKpi(data: Omit<KpiCatalog, 'id' | 'createdAt' | 'updatedAt'>): Promise<KpiCatalog>;
  updateKpi(id: string, data: Partial<Omit<KpiCatalog, 'id' | 'createdAt'>>): Promise<KpiCatalog>;
  deleteKpi(id: string): Promise<void>;
  listDatasetRegistry(): Promise<DatasetRegistry[]>;
  createDataset(data: Omit<DatasetRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatasetRegistry>;
  updateDataset(id: string, data: Partial<Omit<DatasetRegistry, 'id' | 'createdAt'>>): Promise<DatasetRegistry>;
  deleteDataset(id: string): Promise<void>;
  listTemplateRegistry(): Promise<TemplateRegistry[]>;
  createTemplate(data: Omit<TemplateRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TemplateRegistry>;
  updateTemplate(id: string, data: Partial<Omit<TemplateRegistry, 'id' | 'createdAt'>>): Promise<TemplateRegistry>;
  deleteTemplate(id: string): Promise<void>;
  listTemplateBindings(templateId?: string): Promise<TemplateBinding[]>;
  createTemplateBinding(data: Omit<TemplateBinding, 'id' | 'createdAt' | 'updatedAt'>): Promise<TemplateBinding>;
  updateTemplateBinding(id: string, data: Partial<Omit<TemplateBinding, 'id' | 'createdAt'>>): Promise<TemplateBinding>;
  deleteTemplateBinding(id: string): Promise<void>;
  listReportRunsWithDetails(templateId?: string, limit?: number): Promise<ReportRun[]>;
  updateReportRunWithError(runId: string, status: ReportRunStatus, errorMessage?: string): Promise<ReportRun>;
  getIntakeData(caseId: string): Promise<{ fundApplication?: IntakeFundApplication; interimSummary?: IntakeInterimSummary }>;
  saveIntakeData(caseId: string, fundApplication?: IntakeFundApplication, interimSummary?: IntakeInterimSummary): Promise<void>;
  getIntakeCompleteness(caseId: string): Promise<IntakeCompleteness>;
  getCaseSubmitReadiness(caseId: string): Promise<CaseSubmitReadiness>;
  getWorkflowExt(caseId: string): Promise<WorkflowExtensions | null>;
  saveWorkflowExt(caseId: string, patch: Partial<WorkflowExtensions>): Promise<void>;
  getSettlement(caseId: string): Promise<SettlementRecord | null>;
  saveSettlement(caseId: string, data: Partial<SettlementRecord>): Promise<void>;
  submitDirectorReview(caseId: string, decision: 'Approved' | 'Returned', comments: string, decidedBy: string): Promise<void>;
  closeCaseWithSettlement(caseId: string, closedBy: string): Promise<void>;
}

export type DataMode = 'DB' | 'DEMO';
