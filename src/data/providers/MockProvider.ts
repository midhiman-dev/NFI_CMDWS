import type { DataProvider, CaseWithDetails, CreateCasePayload, DocumentWithTemplate, VerificationRecord, CommitteeReviewRecord, ChecklistReadiness, InstallmentSummary, BeniProgramOpsData, HospitalProcessMapWithDetails } from './DataProvider';
import type { Hospital, User, ChildProfile, FamilyProfile, ClinicalCaseDetails, FinancialCaseDetails, DocumentMetadata, DocumentRequirementTemplate, DocumentStatus, CaseStatus, CommitteeOutcome, FundingInstallment, MonitoringVisit, FollowupMilestone, FollowupMetricDef, FollowupMetricValue, ProcessType, HospitalProcessMap, ReportTemplate, ReportRun, ReportRunStatus, KpiCatalog, DatasetRegistry, TemplateRegistry, TemplateBinding, IntakeFundApplication, IntakeInterimSummary, IntakeCompleteness, CaseSubmitReadiness, SettlementRecord, DocVersion, DoctorReview, SubmitGatingInfo, WorkflowExtensions } from '../../types';
import { resolveDocTypeAlias } from '../../utils/docTypeMapping';
import { getBuiltInDocumentTemplates } from '../../utils/documentTemplateCatalog';
import { mockStore } from '../../store/mockStore';
import { getAuthState } from '../../utils/auth';
import { filterCasesForAuth, getScopedHospitalId, isCaseVisibleToAuth, normalizeHospitalId } from '../../utils/roleAccess';
import { appendCaseWorkflowEvent, type CaseWorkflowEvent, loadWorkflowStore, saveWorkflowStore } from '../../utils/caseWorkflow';
import { getChecklistReadinessFromDocuments, normalizeOptionalSupportingDoc } from '../../utils/documentChecklistRules';
import { formatBabyDisplayName } from '../../utils/casePresentation';
import { generatePrototypeCaseReference, resolvePrototypeIdentifiers } from '../../utils/caseIdentifiers';
import { FOLLOWUP_REMARK_FIELDS, getFollowupQuestionnaire } from '../../utils/followupQuestionnaires';
import {
  FUND_APPLICATION_FIELDS,
  INTERIM_SUMMARY_FIELDS,
  getFundApplicationSectionProgress,
  getInterimSummarySectionProgress,
  getSectionStatus,
} from '../../utils/intakeValidation';

const STORAGE_KEY = 'nfi_demo_data_v1';
const DEMO_DATA_VERSION_KEY = 'nfi_demo_data_version';
const DEMO_DATA_VERSION = 'v3_5_h1';
const DOCUMENTS_STORAGE_KEY = 'nfi_demo_documents_v1';
const VERIFICATIONS_STORAGE_KEY = 'nfi_demo_verifications_v1';
const COMMITTEE_REVIEWS_STORAGE_KEY = 'nfi_demo_committee_reviews_v1';
const INSTALLMENTS_STORAGE_KEY = 'nfi_demo_installments_v1';
const VISITS_STORAGE_KEY = 'nfi_demo_visits_v1';
const MILESTONES_STORAGE_KEY = 'nfi_demo_followups_v1';
const METRIC_VALUES_STORAGE_KEY = 'nfi_demo_followup_values_v1';
const CLINICAL_STORAGE_KEY = 'nfi_demo_clinical_v1';
const BENI_OPS_STORAGE_KEY = 'nfi_demo_beni_ops_v1';
const HOSPITAL_PROCESS_MAP_STORAGE_KEY = 'nfi_demo_hospital_process_map_v1';
const REPORT_TEMPLATES_STORAGE_KEY = 'nfi_demo_report_templates_v1';
const REPORT_RUNS_STORAGE_KEY = 'nfi_demo_report_runs_v1';
const KPI_CATALOG_STORAGE_KEY = 'nfi_demo_kpi_catalog_v1';
const DATASET_REGISTRY_STORAGE_KEY = 'nfi_demo_dataset_registry_v1';
const TEMPLATE_REGISTRY_STORAGE_KEY = 'nfi_demo_template_registry_v1';
const TEMPLATE_BINDINGS_STORAGE_KEY = 'nfi_demo_template_bindings_v1';
const INTAKE_STORAGE_KEY = 'nfi_demo_intake_v1';
const SETTLEMENTS_STORAGE_KEY = 'nfi_demo_settlements_v1';
const DOCTOR_REVIEWS_STORAGE_KEY = 'nfi_demo_doctor_reviews_v1';
interface MockData {
  hospitals: Hospital[];
  cases: CaseWithDetails[];
}

interface ClinicalData {
  [caseId: string]: ClinicalCaseDetails;
}

interface BeniOpsData {
  [caseId: string]: BeniProgramOpsData;
}

interface DocumentsData {
  [caseId: string]: DocumentMetadata[];
}

interface VerificationsData {
  [caseId: string]: VerificationRecord;
}

interface CommitteeReviewsData {
  [caseId: string]: CommitteeReviewRecord;
}

interface InstallmentsData {
  [caseId: string]: FundingInstallment[];
}

interface VisitsData {
  [caseId: string]: MonitoringVisit[];
}

interface MilestonesData {
  [caseId: string]: FollowupMilestone[];
}

interface MetricValuesData {
  [key: string]: FollowupMetricValue;
}

interface HospitalProcessMapData {
  [mapId: string]: {
    mapId: string;
    hospitalId: string;
    hospitalName: string;
    processType: ProcessType;
    isActive: boolean;
    effectiveFromDate: string;
    updatedAt: string;
  };
}

interface ReportTemplatesData {
  [templateId: string]: ReportTemplate;
}

interface ReportRunsData {
  [runId: string]: ReportRun;
}

interface DoctorReviewsData {
  [caseId: string]: DoctorReview;
}

export class MockProvider implements DataProvider {
  private data: MockData;
  private documents: DocumentsData;
  private verifications: VerificationsData;
  private committeeReviews: CommitteeReviewsData;
  private installments: InstallmentsData;
  private visits: VisitsData;
  private milestones: MilestonesData;
  private metricValues: MetricValuesData;
  private clinicalData: ClinicalData;
  private beniOps: BeniOpsData;
  private hospitalProcessMap: HospitalProcessMapData;
  private reportTemplates: ReportTemplatesData;
  private reportRuns: ReportRunsData;
  private doctorReviews: DoctorReviewsData;

  private static readonly DEMO_VOLUNTEERS: User[] = [
    { userId: 'user-beni-1', username: 'priya.beni', fullName: 'Priya Deshmukh', email: 'priya@nfi.org', roles: ['beni_volunteer'], isActive: true },
    { userId: 'user-beni-2', username: 'ravi.beni', fullName: 'Ravi Shankar', email: 'ravi@nfi.org', roles: ['beni_volunteer'], isActive: true },
    { userId: 'user-beni-3', username: 'meera.beni', fullName: 'Meera Patel', email: 'meera@nfi.org', roles: ['beni_volunteer'], isActive: true },
  ];

  constructor() {
    this.data = this.loadOrGenerateData();
    this.documents = this.loadOrGenerateDocuments();
    this.verifications = this.loadOrGenerateVerifications();
    this.committeeReviews = this.loadOrGenerateCommitteeReviews();
    this.installments = this.loadOrGenerateInstallments();
    this.visits = this.loadOrGenerateVisits();
    this.milestones = this.loadOrGenerateMilestones();
    this.metricValues = this.loadOrGenerateMetricValues();
    this.clinicalData = this.loadOrGenerateClinical();
    this.beniOps = this.loadOrGenerateBeniOps();
    this.hospitalProcessMap = this.loadOrGenerateHospitalProcessMap();
    this.reportTemplates = this.loadOrGenerateReportTemplates();
    this.reportRuns = this.loadOrGenerateReportRuns();
    this.doctorReviews = this.loadOrGenerateDoctorReviews();
    this.normalizePrototypeIdentifiers();
    this.seedWorkflowHistoryIfNeeded();
    this.seedInstallmentsIfNeeded();
    this.seedVisitsAndMilestonesIfNeeded();
    this.seedClinicalIfNeeded();
  }

  private saveData(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  private normalizePrototypeIdentifiers(): void {
    const beneficiaryMap = this.readMap<ChildProfile>(MockProvider.BENE_KEY);
    let beneficiaryMapChanged = false;

    this.data.cases = this.data.cases.map((caseItem, index) => {
      const identifiers = resolvePrototypeIdentifiers({
        caseRef: caseItem.caseRef,
        caseReferenceSerial: caseItem.caseReferenceSerial ?? index + 1,
        beneficiaryNo: beneficiaryMap[caseItem.caseId]?.beneficiaryNo ?? caseItem.beneficiaryNo,
        beneficiaryNumberAllocatedAt: beneficiaryMap[caseItem.caseId]?.beneficiaryNumberAllocatedAt ?? caseItem.beneficiaryNumberAllocatedAt,
        caseStatus: caseItem.caseStatus,
        decisionAt: caseItem.updatedAt,
        intakeDate: caseItem.intakeDate,
      });

      const beneficiary = beneficiaryMap[caseItem.caseId];
      if (beneficiary) {
        beneficiaryMap[caseItem.caseId] = {
          ...beneficiary,
          beneficiaryNo: identifiers.beneficiaryNo,
          beneficiaryNumberAllocatedAt: identifiers.beneficiaryNumberAllocatedAt,
        };
        beneficiaryMapChanged = true;
      }

      return {
        ...caseItem,
        caseRef: identifiers.caseRef || generatePrototypeCaseReference(index + 1),
        caseReferenceSerial: identifiers.caseReferenceSerial ?? index + 1,
        beneficiaryNo: identifiers.beneficiaryNo,
        beneficiaryNumberAllocatedAt: identifiers.beneficiaryNumberAllocatedAt,
      };
    });

    this.saveData();
    if (beneficiaryMapChanged) {
      this.writeMap(MockProvider.BENE_KEY, beneficiaryMap);
    }
  }

  private seedInstallmentsIfNeeded(): void {
    const approvedCases = this.data.cases.filter(c => c.caseStatus === 'Approved');
    for (const caseItem of approvedCases) {
      if (!this.installments[caseItem.caseId]) {
        this.installments[caseItem.caseId] = [];
      }
      if (this.installments[caseItem.caseId].length === 0) {
        const baseAmount = 50000 + Math.random() * 50000;
        if (caseItem.caseId === 'case-demo-9') {
          this.installments[caseItem.caseId] = [
            {
              installmentId: `inst-${caseItem.caseId}-1`,
              caseId: caseItem.caseId,
              label: 'Full Payment',
              amount: baseAmount,
              plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              paidDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'Disbursed' as const,
              paymentMode: 'BankTransfer',
              transactionRef: 'TXN-2026-001',
              updatedAt: new Date().toISOString(),
            },
          ];
        } else if (caseItem.caseId === 'case-demo-10') {
          this.installments[caseItem.caseId] = [
            {
              installmentId: `inst-${caseItem.caseId}-1`,
              caseId: caseItem.caseId,
              label: 'Installment 1',
              amount: baseAmount * 0.5,
              plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'Scheduled' as const,
              updatedAt: new Date().toISOString(),
            },
            {
              installmentId: `inst-${caseItem.caseId}-2`,
              caseId: caseItem.caseId,
              label: 'Installment 2',
              amount: baseAmount * 0.5,
              plannedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              requestedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'Requested' as const,
              updatedAt: new Date().toISOString(),
            },
          ];
        }
      }
    }
    this.saveInstallments();
  }

  private seedVisitsAndMilestonesIfNeeded(): void {
    const approvedCases = this.data.cases.filter(c => c.caseStatus === 'Approved');
    const MILESTONE_MONTHS = [3, 6, 9, 12, 18, 24] as const;

    for (const caseItem of approvedCases) {
      // Seed monitoring visits
      if (!this.visits[caseItem.caseId]) {
        this.visits[caseItem.caseId] = [];
      }
      if (this.visits[caseItem.caseId].length === 0) {
        const now = Date.now();
        this.visits[caseItem.caseId] = [
          {
            visitId: `visit-${caseItem.caseId}-1`,
            caseId: caseItem.caseId,
            visitType: 'Home',
            status: 'Completed',
            scheduledDate: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            completedDate: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assignedToUserId: 'user-beni-1',
            notes: 'Home visit completed successfully',
            createdAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            visitId: `visit-${caseItem.caseId}-2`,
            caseId: caseItem.caseId,
            visitType: 'Phone',
            status: 'Scheduled',
            scheduledDate: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            assignedToUserId: 'user-beni-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
      }

      // Seed follow-up milestones
      if (!this.milestones[caseItem.caseId]) {
        this.milestones[caseItem.caseId] = [];
      }
      if (this.milestones[caseItem.caseId].length === 0) {
        const now = Date.now();
        const baseDate = new Date(now - 180 * 24 * 60 * 60 * 1000);

        this.milestones[caseItem.caseId] = MILESTONE_MONTHS.map(months => ({
          milestoneId: `milestone-${caseItem.caseId}-${months}`,
          caseId: caseItem.caseId,
          milestoneMonths: months,
          dueDate: new Date(baseDate.getTime() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          followupDate: months === 3 ? new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
          status: months === 3 ? ('Completed' as const) : (months <= 6 ? ('Due' as const) : ('Upcoming' as const)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    }

    this.saveVisits();
    this.saveMilestones();
  }

  private loadOrGenerateData(): MockData {
    const storedVersion = localStorage.getItem(DEMO_DATA_VERSION_KEY);
    if (storedVersion !== DEMO_DATA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(DEMO_DATA_VERSION_KEY, DEMO_DATA_VERSION);
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return this.generateData();
      }
    }
    return this.generateData();
  }

  private loadOrGenerateDocuments(): DocumentsData {
    const stored = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return this.generateDocuments();
      }
    }
    return this.generateDocuments();
  }

  private loadOrGenerateVerifications(): VerificationsData {
    const stored = localStorage.getItem(VERIFICATIONS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private loadOrGenerateCommitteeReviews(): CommitteeReviewsData {
    const stored = localStorage.getItem(COMMITTEE_REVIEWS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private loadOrGenerateInstallments(): InstallmentsData {
    const stored = localStorage.getItem(INSTALLMENTS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveDocuments(): void {
    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(this.documents));
  }

  private saveVerifications(): void {
    localStorage.setItem(VERIFICATIONS_STORAGE_KEY, JSON.stringify(this.verifications));
  }

  private saveCommitteeReviews(): void {
    localStorage.setItem(COMMITTEE_REVIEWS_STORAGE_KEY, JSON.stringify(this.committeeReviews));
  }

  private saveInstallments(): void {
    localStorage.setItem(INSTALLMENTS_STORAGE_KEY, JSON.stringify(this.installments));
  }

  private loadOrGenerateVisits(): VisitsData {
    const stored = localStorage.getItem(VISITS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveVisits(): void {
    localStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(this.visits));
  }

  private loadOrGenerateMilestones(): MilestonesData {
    const stored = localStorage.getItem(MILESTONES_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveMilestones(): void {
    localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify(this.milestones));
  }

  private loadOrGenerateMetricValues(): MetricValuesData {
    const stored = localStorage.getItem(METRIC_VALUES_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveMetricValues(): void {
    localStorage.setItem(METRIC_VALUES_STORAGE_KEY, JSON.stringify(this.metricValues));
  }

  private loadOrGenerateClinical(): ClinicalData {
    const stored = localStorage.getItem(CLINICAL_STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { return {}; }
    }
    return {};
  }

  private saveClinical(): void {
    localStorage.setItem(CLINICAL_STORAGE_KEY, JSON.stringify(this.clinicalData));
  }

  private loadOrGenerateBeniOps(): BeniOpsData {
    const stored = localStorage.getItem(BENI_OPS_STORAGE_KEY);
    if (stored) {
      try { return JSON.parse(stored); } catch { return {}; }
    }
    return {};
  }

  private saveBeniOps(): void {
    localStorage.setItem(BENI_OPS_STORAGE_KEY, JSON.stringify(this.beniOps));
  }

  private loadOrGenerateDoctorReviews(): DoctorReviewsData {
    const stored = localStorage.getItem(DOCTOR_REVIEWS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveDoctorReviews(): void {
    localStorage.setItem(DOCTOR_REVIEWS_STORAGE_KEY, JSON.stringify(this.doctorReviews));
  }

  private loadOrGenerateHospitalProcessMap(): HospitalProcessMapData {
    const stored = localStorage.getItem(HOSPITAL_PROCESS_MAP_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return this.generateHospitalProcessMap();
      }
    }
    return this.generateHospitalProcessMap();
  }

  private generateHospitalProcessMap(): HospitalProcessMapData {
    const map: HospitalProcessMapData = {};
    const today = new Date().toISOString().split('T')[0];

    for (const hospital of this.data.hospitals) {
      const processTypes: ProcessType[] = ['BRC', 'BRRC', 'BGRC', 'BCRC'];
      const processType = processTypes[Math.floor(Math.random() * processTypes.length)];
      const mapId = `map-${hospital.hospitalId}`;

      map[mapId] = {
        mapId,
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.name,
        processType,
        isActive: true,
        effectiveFromDate: today,
        updatedAt: new Date().toISOString(),
      };
    }

    this.saveHospitalProcessMap(map);
    return map;
  }

  private saveHospitalProcessMap(map: HospitalProcessMapData): void {
    localStorage.setItem(HOSPITAL_PROCESS_MAP_STORAGE_KEY, JSON.stringify(map));
  }

  private seedClinicalIfNeeded(): void {
    for (const caseItem of this.data.cases) {
      if (!this.clinicalData[caseItem.caseId]) {
        const caseDate = new Date(caseItem.intakeDate);
        const admDate = new Date(caseDate);
        admDate.setDate(admDate.getDate() - 14);
        const dischDate = caseItem.caseStatus === 'Approved' || caseItem.caseStatus === 'Closed'
          ? new Date(caseDate.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : undefined;

        this.clinicalData[caseItem.caseId] = {
          caseId: caseItem.caseId,
          diagnosis: 'Preterm birth with low birth weight',
          summary: 'NICU admission for respiratory support and monitoring',
          admissionDate: admDate.toISOString().split('T')[0],
          dischargeDate: dischDate,
        };
      }
    }
    this.saveClinical();
  }

  private generateData(): MockData {
    const hospitals: Hospital[] = [
      {
        hospitalId: 'hosp-1',
        name: 'City General Hospital',
        city: 'Mumbai',
        state: 'Maharashtra',
        spocName: 'Dr. Anjali Sharma',
        spocPhone: '9876543210',
        isActive: true,
      },
      {
        hospitalId: 'hosp-2',
        name: 'Metro Medical Center',
        city: 'Delhi',
        state: 'Delhi',
        spocName: 'Dr. Rajesh Kumar',
        spocPhone: '9876543211',
        isActive: true,
      },
      {
        hospitalId: 'hosp-3',
        name: 'Rainbow Children Hospital',
        city: 'Bangalore',
        state: 'Karnataka',
        spocName: 'Dr. Priya Menon',
        spocPhone: '9876543212',
        isActive: true,
      },
    ];

    const caseTemplates = [
      { status: 'Draft', processType: 'BRC', motherName: 'Asha Menon', hosp: 0 },
      { status: 'Draft', processType: 'BRRC', motherName: 'Pooja Shah', hosp: 1 },
      { status: 'Submitted', processType: 'BRC', motherName: 'Neha Batra', hosp: 2 },
      { status: 'Submitted', processType: 'BGRC', motherName: 'Farah Khan', hosp: 0 },
      { status: 'Under_Verification', processType: 'BRC', motherName: 'Ritu Nair', hosp: 1 },
      { status: 'Under_Verification', processType: 'BRRC', motherName: 'Megha Patil', hosp: 2 },
      { status: 'Under_Review', processType: 'BRC', motherName: 'Kavya Rao', hosp: 0 },
      { status: 'Under_Review', processType: 'BGRC', motherName: 'Shalini Verma', hosp: 1 },
      { status: 'Approved', processType: 'BRC', motherName: 'Anita Das', hosp: 2 },
      { status: 'Approved', processType: 'BRRC', motherName: 'Lakshmi Iyer', hosp: 0 },
      { status: 'Rejected', processType: 'BRC', motherName: 'Sunaina Kaur', hosp: 1 },
      { status: 'Returned', processType: 'BRC', motherName: 'Deepa Joshi', hosp: 2 },
    ];

    const now = new Date();
    const cases: CaseWithDetails[] = caseTemplates.map((template, idx) => {
      const caseDate = new Date(now);
      caseDate.setDate(caseDate.getDate() - (12 - idx) * 7);

      const hospital = hospitals[template.hosp];

      const identifiers = resolvePrototypeIdentifiers({
        caseReferenceSerial: idx + 1,
        caseStatus: template.status as any,
        decisionAt: caseDate.toISOString(),
        intakeDate: caseDate.toISOString().split('T')[0],
      });

      return {
        caseId: `case-demo-${idx + 1}`,
        caseRef: identifiers.caseRef,
        caseReferenceSerial: identifiers.caseReferenceSerial,
        processType: template.processType as any,
        hospitalId: hospital.hospitalId,
        hospitalName: hospital.name,
        caseStatus: template.status as any,
        intakeDate: caseDate.toISOString().split('T')[0],
        createdBy: 'demo-user',
        updatedAt: caseDate.toISOString(),
        lastActionAt: caseDate.toISOString(),
        childName: formatBabyDisplayName(template.motherName),
        motherName: template.motherName,
        beneficiaryNo: identifiers.beneficiaryNo,
        beneficiaryNumberAllocatedAt: identifiers.beneficiaryNumberAllocatedAt,
        approvedAmount: template.status === 'Approved' ? 100000 : undefined,
      };
    });

    const data = { hospitals, cases };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  static readonly BLOCKING_DOC_TYPES = [
    'Aadhar Card', 'Birth Certificate', 'Residence Proof',
    'Medical Reports', 'Discharge Summary', 'Lab Results',
  ];

  private generateDocuments(): DocumentsData {
    const templates = this.getBuiltInTemplates();
    const docs: DocumentsData = {};
    const preUploadStatuses = ['Under_Verification', 'Under_Review', 'Approved', 'Closed'];

    for (const caseItem of this.data.cases) {
      const shouldPreUpload = preUploadStatuses.includes(caseItem.caseStatus);
      const caseTemplates = templates.filter(t => t.processType === caseItem.processType);
      const caseIdShort = caseItem.caseId.replace('case-demo-', '');

      docs[caseItem.caseId] = caseTemplates.map((template, idx) => {
        const isBlocking = MockProvider.BLOCKING_DOC_TYPES.some(
          dt => dt.toLowerCase() === template.docType.toLowerCase()
        );

        if (shouldPreUpload && isBlocking) {
          return {
            docId: `doc-${caseItem.caseId}-${idx}`,
            caseId: caseItem.caseId,
            category: template.category,
            docType: template.docType,
            status: 'Uploaded' as DocumentStatus,
            fileName: `${template.docType.replace(/\s+/g, '_')}_${caseIdShort}.pdf`,
            fileType: 'application/pdf',
            size: Math.floor(200 * 1024 + Math.random() * 1300 * 1024),
            uploadedAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
            uploadedBy: 'Hospital SPOC',
            notes: '',
          };
        }

        return {
          docId: `doc-${caseItem.caseId}-${idx}`,
          caseId: caseItem.caseId,
          category: template.category,
          docType: template.docType,
          status: 'Missing' as DocumentStatus,
          notes: '',
        };
      });
    }

    localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
    return docs;
  }

  private getBuiltInTemplates(): DocumentRequirementTemplate[] {
    return getBuiltInDocumentTemplates().map((template) =>
      normalizeOptionalSupportingDoc(template)
    );
  }

  private getActorMeta(): { by: string; role: string } {
    const auth = getAuthState();
    return {
      by: auth.activeUser?.fullName || auth.activeUser?.userId || 'System',
      role: auth.activeRole || 'admin',
    };
  }

  private recordStatusTransition(caseId: string, fromStatus: CaseStatus | undefined, toStatus: CaseStatus, reason?: string, source?: string): void {
    const actor = this.getActorMeta();
    appendCaseWorkflowEvent(caseId, {
      fromStatus,
      toStatus,
      changedAt: new Date().toISOString(),
      changedBy: actor.by,
      changedByRole: actor.role,
      reason: reason || undefined,
      source: source || undefined,
    });
  }

  private seedWorkflowHistoryIfNeeded(): void {
    const store = loadWorkflowStore();
    let updated = false;

    for (const caseItem of this.data.cases) {
      if (store[caseItem.caseId]?.length) continue;

      const createdAt = caseItem.intakeDate
        ? new Date(`${caseItem.intakeDate}T09:00:00`).toISOString()
        : caseItem.updatedAt;
      const createdBy = caseItem.createdBy || 'Hospital SPOC';

      const seededEvents: CaseWorkflowEvent[] = [{
        eventId: `wf-seed-${caseItem.caseId}-draft`,
        caseId: caseItem.caseId,
        fromStatus: undefined,
        toStatus: 'Draft' as const,
        changedAt: createdAt,
        changedBy: createdBy,
        changedByRole: 'hospital_spoc',
        reason: 'Case created in wizard',
        source: 'Intake',
      }];

      if (caseItem.caseStatus !== 'Draft') {
        const reason =
          caseItem.caseStatus === 'Returned'
            ? 'Returned for updates to intake/documents'
            : caseItem.caseStatus === 'Rejected'
            ? 'Case rejected after review'
            : `Moved to ${caseItem.caseStatus.replace(/_/g, ' ')}`;
        seededEvents.push({
          eventId: `wf-seed-${caseItem.caseId}-${caseItem.caseStatus.toLowerCase()}`,
          caseId: caseItem.caseId,
          fromStatus: 'Draft',
          toStatus: caseItem.caseStatus,
          changedAt: caseItem.updatedAt || createdAt,
          changedBy: 'System',
          changedByRole: 'admin',
          reason,
          source: caseItem.caseStatus === 'Returned' ? 'Verification' : caseItem.caseStatus === 'Rejected' ? 'Committee' : 'Workflow',
        });
      }

      store[caseItem.caseId] = seededEvents;
      updated = true;
    }

    if (updated) {
      saveWorkflowStore(store);
    }
  }

  async listCases(): Promise<CaseWithDetails[]> {
    return filterCasesForAuth(getAuthState(), this.data.cases).sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getCaseById(caseId: string): Promise<CaseWithDetails | null> {
    const caseItem = this.data.cases.find(c => c.caseId === caseId) || null;
    if (!caseItem) return null;
    if (!isCaseVisibleToAuth(getAuthState(), caseItem.hospitalId)) {
      throw new Error('ACCESS_DENIED_CASE_SCOPE');
    }
    return caseItem;
  }

  async getHospitals(): Promise<Hospital[]> {
    const scopedHospitalId = getScopedHospitalId(getAuthState());
    if (!scopedHospitalId) {
      return this.data.hospitals;
    }
    return this.data.hospitals.filter((h) => normalizeHospitalId(h.hospitalId) === scopedHospitalId);
  }

  async getHospitalProcessType(hospitalId: string): Promise<ProcessType | null> {
    for (const map of Object.values(this.hospitalProcessMap)) {
      if (map.hospitalId === hospitalId && map.isActive) {
        return map.processType;
      }
    }
    return null;
  }

  async createCase(payload: CreateCasePayload): Promise<CaseWithDetails> {
    const scopedHospitalId = getScopedHospitalId(getAuthState());
    const resolvedHospitalId = scopedHospitalId || normalizeHospitalId(payload.hospitalId) || payload.hospitalId;
    const caseId = `case-demo-${Date.now()}`;
    const nextNum = this.data.cases.length + 1;
    const hospital = this.data.hospitals.find(h => normalizeHospitalId(h.hospitalId) === resolvedHospitalId);
    const now = new Date().toISOString();
    const identifiers = resolvePrototypeIdentifiers({
      caseReferenceSerial: nextNum,
      beneficiaryNo: payload.beneficiaryNo,
      caseStatus: payload.caseStatus,
      decisionAt: now,
      intakeDate: payload.intakeDate,
    });

    const newCase: CaseWithDetails = {
      caseId,
      caseRef: identifiers.caseRef,
      caseReferenceSerial: identifiers.caseReferenceSerial,
      processType: payload.processType,
      hospitalId: hospital?.hospitalId || resolvedHospitalId,
      hospitalName: hospital?.name || 'Unknown',
      caseStatus: payload.caseStatus,
      intakeDate: payload.intakeDate,
      createdBy: payload.createdBy,
      updatedAt: now,
      lastActionAt: now,
      childName: formatBabyDisplayName(payload.motherName, payload.beneficiaryName),
      motherName: payload.motherName,
      beneficiaryNo: identifiers.beneficiaryNo,
      beneficiaryNumberAllocatedAt: identifiers.beneficiaryNumberAllocatedAt,
    };

    this.data.cases.push(newCase);
    this.saveData();
    await this.ensureDocumentChecklist(caseId, payload.processType);
    this.recordStatusTransition(caseId, undefined, payload.caseStatus, payload.caseStatus === 'Draft' ? 'Case created in wizard' : undefined, 'Intake');

    return newCase;
  }

  async listCaseDocuments(caseId: string): Promise<DocumentWithTemplate[]> {
    await this.ensureDocumentChecklist(caseId, '');
    const caseDocs = this.documents[caseId] || [];
    const templates = this.getBuiltInTemplates();

    return caseDocs.map(doc => {
      const resolved = resolveDocTypeAlias(doc.docType, doc.category);
      const template = templates.find(t => t.docType === resolved.docType);
      return normalizeOptionalSupportingDoc({
        ...doc,
        mimeType: doc.mimeType || doc.fileType,
        fileSize: doc.fileSize ?? doc.size,
        docType: resolved.docType,
        category: resolved.category,
        mandatoryFlag: template?.mandatoryFlag,
        conditionNotes: template?.conditionNotes,
      });
    });
  }

  async ensureDocumentChecklist(caseId: string, processType: string): Promise<void> {
    const caseItem = this.data.cases.find(c => c.caseId === caseId);
    if (!caseItem) return;

    const templates = this.getBuiltInTemplates().filter(
      t => t.processType === caseItem.processType
    );

    const existingDocs = this.documents[caseId] || [];
    const existingKeys = new Set(
      existingDocs.map((doc) => {
        const resolved = resolveDocTypeAlias(doc.docType, doc.category);
        return `${resolved.category}::${resolved.docType}`;
      })
    );

    const missingDocs = templates.filter((template) =>
      !existingKeys.has(`${template.category}::${template.docType}`)
    );

    if (!this.documents[caseId]) {
      this.documents[caseId] = [];
    }

    if (this.documents[caseId].length === 0) {
      this.documents[caseId] = templates.map((template, idx) => ({
        docId: `doc-${caseId}-${idx}`,
        caseId,
        category: template.category,
        docType: template.docType,
        status: 'Missing' as DocumentStatus,
        notes: '',
      }));
      this.saveDocuments();
      return;
    }

    if (missingDocs.length > 0) {
      const startingIndex = this.documents[caseId].length;
      this.documents[caseId].push(
        ...missingDocs.map((template, idx) => ({
          docId: `doc-${caseId}-${startingIndex + idx}`,
          caseId,
          category: template.category,
          docType: template.docType,
          status: 'Missing' as DocumentStatus,
          notes: '',
        }))
      );
      this.saveDocuments();
    }
  }

  async updateDocumentStatus(documentId: string, status: DocumentStatus, notes?: string): Promise<void> {
    for (const caseId in this.documents) {
      const doc = this.documents[caseId].find(d => d.docId === documentId);
      if (doc) {
        doc.status = status;
        if (notes !== undefined) doc.notes = notes;
        if (doc.versions && doc.versions.length > 0) {
          const latestVersion = doc.versions[doc.versions.length - 1];
          latestVersion.status = status;

          if (status === 'Rejected') {
            latestVersion.rejectionReason = notes;
            latestVersion.reviewedAt = new Date().toISOString();
            latestVersion.reviewedBy = 'demo-user';
          } else if (status === 'Verified') {
            latestVersion.reviewedAt = new Date().toISOString();
            latestVersion.reviewedBy = 'demo-user';
          }
        }
        this.saveDocuments();
        return;
      }
    }
  }

  async updateDocumentNotes(documentId: string, notes: string): Promise<void> {
    for (const caseId in this.documents) {
      const doc = this.documents[caseId].find(d => d.docId === documentId);
      if (doc) {
        doc.notes = notes;
        this.saveDocuments();
        return;
      }
    }
  }

  async uploadDocument(caseId: string, documentId: string, fileMetadata: {
    fileName: string;
    fileType?: string;
    size?: number;
    mimeType?: string;
    fileSize?: number;
    lastModified?: number;
  }): Promise<void> {
    const caseDocuments = this.documents[caseId];
    if (!caseDocuments) return;

    const doc = caseDocuments.find(d => d.docId === documentId);
    if (doc) {
      const now = new Date().toISOString();
      const effectiveFileType = fileMetadata.mimeType || fileMetadata.fileType || '';
      const effectiveSize = fileMetadata.fileSize ?? fileMetadata.size ?? 0;

      const versions: DocVersion[] = doc.versions ? [...doc.versions] : [];
      if (versions.length === 0 && doc.fileName && doc.uploadedAt && doc.uploadedBy) {
        versions.push({
          versionNo: 1,
          fileName: doc.fileName,
          fileType: doc.fileType,
          mimeType: doc.mimeType || doc.fileType,
          size: doc.size,
          fileSize: doc.fileSize ?? doc.size,
          lastModified: doc.lastModified,
          uploadedAt: doc.uploadedAt,
          uploadedBy: doc.uploadedBy,
          status: doc.status,
        });
      }

      versions.push({
        versionNo: versions.length + 1,
        fileName: fileMetadata.fileName,
        fileType: effectiveFileType || undefined,
        mimeType: effectiveFileType || undefined,
        size: effectiveSize,
        fileSize: effectiveSize,
        lastModified: fileMetadata.lastModified,
        uploadedAt: now,
        uploadedBy: 'demo-user',
        status: 'Uploaded',
      });

      doc.fileName = fileMetadata.fileName;
      doc.fileType = effectiveFileType || undefined;
      doc.mimeType = effectiveFileType || undefined;
      doc.size = effectiveSize;
      doc.fileSize = effectiveSize;
      doc.lastModified = fileMetadata.lastModified;
      doc.uploadedAt = now;
      doc.uploadedBy = 'demo-user';
      doc.status = 'Uploaded';
      doc.versions = versions;
      this.saveDocuments();
    }
  }

  async getDocumentTemplates(processType: string): Promise<DocumentRequirementTemplate[]> {
    return this.getBuiltInTemplates().filter(t => t.processType === processType);
  }

  async getChecklistReadiness(caseId: string): Promise<ChecklistReadiness> {
    const docs = await this.listCaseDocuments(caseId);
    return getChecklistReadinessFromDocuments(docs);
  }

  async getVerification(caseId: string): Promise<VerificationRecord | null> {
    return this.verifications[caseId] || null;
  }

  async submitVerification(caseId: string, data: {
    recommendation: 'Proceed' | 'Return' | 'Hold';
    notes: string;
    verifiedBy: string;
  }): Promise<void> {
    this.verifications[caseId] = {
      verificationId: `ver-${caseId}-${Date.now()}`,
      caseId,
      recommendation: data.recommendation,
      notes: data.notes,
      verifiedBy: data.verifiedBy,
      verifiedAt: new Date().toISOString(),
    };
    this.saveVerifications();
  }

  async returnToHospital(caseId: string, data: {
    reason: string;
    comment: string;
  }): Promise<void> {
    const caseItem = this.data.cases.find(c => c.caseId === caseId);
    if (caseItem) {
      const previousStatus = caseItem.caseStatus;
      caseItem.caseStatus = 'Returned';
      caseItem.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      const combinedReason = [data.reason, data.comment].filter(Boolean).join(': ');
      this.recordStatusTransition(caseId, previousStatus, 'Returned', combinedReason, 'Verification');
    }
  }

  async sendToCommittee(caseId: string, data: {
    comment: string;
  }): Promise<void> {
    const caseItem = this.data.cases.find(c => c.caseId === caseId);
    if (caseItem) {
      const previousStatus = caseItem.caseStatus;
      caseItem.caseStatus = 'Under_Review';
      caseItem.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.recordStatusTransition(caseId, previousStatus, 'Under_Review', data.comment, 'Verification');
    }
  }

  async getCommitteeReview(caseId: string): Promise<CommitteeReviewRecord | null> {
    return this.committeeReviews[caseId] || null;
  }

  async submitCommitteeDecision(caseId: string, data: {
    outcome: CommitteeOutcome;
    approvedAmount?: number;
    comments: string;
    decidedBy: string;
  }): Promise<void> {
    const caseItem = this.data.cases.find(c => c.caseId === caseId);
    if (!caseItem) return;

    this.committeeReviews[caseId] = {
      reviewId: `rev-${caseId}-${Date.now()}`,
      caseId,
      outcome: data.outcome,
      approvedAmount: data.approvedAmount,
      comments: data.comments,
      decidedBy: data.decidedBy,
      decidedAt: new Date().toISOString(),
    };

    const previousStatus = caseItem.caseStatus;
    if (data.outcome === 'Approved') {
      caseItem.caseStatus = 'Approved';
    } else if (data.outcome === 'Rejected') {
      caseItem.caseStatus = 'Rejected';
    } else if (data.outcome === 'Need_More_Info') {
      caseItem.caseStatus = 'Returned';
    }

    const identifiers = resolvePrototypeIdentifiers({
      caseRef: caseItem.caseRef,
      caseReferenceSerial: caseItem.caseReferenceSerial,
      beneficiaryNo: caseItem.beneficiaryNo,
      beneficiaryNumberAllocatedAt: caseItem.beneficiaryNumberAllocatedAt,
      caseStatus: caseItem.caseStatus,
      decisionAt: this.committeeReviews[caseId].decidedAt,
      intakeDate: caseItem.intakeDate,
    });
    caseItem.caseRef = identifiers.caseRef;
    caseItem.caseReferenceSerial = identifiers.caseReferenceSerial;
    caseItem.beneficiaryNo = identifiers.beneficiaryNo;
    caseItem.beneficiaryNumberAllocatedAt = identifiers.beneficiaryNumberAllocatedAt;
    await this.upsertBeneficiary(caseId, {
      beneficiaryNo: identifiers.beneficiaryNo,
      beneficiaryNumberAllocatedAt: identifiers.beneficiaryNumberAllocatedAt,
    });
    caseItem.updatedAt = new Date().toISOString();
    this.saveData();
    this.saveCommitteeReviews();
    this.recordStatusTransition(caseId, previousStatus, caseItem.caseStatus, data.comments, 'Committee');
  }

  async updateCaseStatus(caseId: string, status: CaseStatus): Promise<void> {
    const caseItem = this.data.cases.find(c => c.caseId === caseId);
    if (caseItem) {
      const previousStatus = caseItem.caseStatus;
      caseItem.caseStatus = status;
      const identifiers = resolvePrototypeIdentifiers({
        caseRef: caseItem.caseRef,
        caseReferenceSerial: caseItem.caseReferenceSerial,
        beneficiaryNo: caseItem.beneficiaryNo,
        beneficiaryNumberAllocatedAt: caseItem.beneficiaryNumberAllocatedAt,
        caseStatus: status,
        decisionAt: new Date().toISOString(),
        intakeDate: caseItem.intakeDate,
      });
      caseItem.caseRef = identifiers.caseRef;
      caseItem.caseReferenceSerial = identifiers.caseReferenceSerial;
      caseItem.beneficiaryNo = identifiers.beneficiaryNo;
      caseItem.beneficiaryNumberAllocatedAt = identifiers.beneficiaryNumberAllocatedAt;
      caseItem.updatedAt = new Date().toISOString();
      await this.upsertBeneficiary(caseId, {
        beneficiaryNo: identifiers.beneficiaryNo,
        beneficiaryNumberAllocatedAt: identifiers.beneficiaryNumberAllocatedAt,
      });
      this.saveData();
      this.recordStatusTransition(caseId, previousStatus, status, status === 'Submitted' && previousStatus === 'Returned'
        ? 'Returned corrections updated and resubmitted'
        : undefined, previousStatus === 'Returned' && status === 'Submitted' ? 'Hospital Resubmission' : 'Case Update');
    }
  }

  async listInstallments(caseId: string): Promise<FundingInstallment[]> {
    return this.installments[caseId] || [];
  }

  async createInstallment(caseId: string, payload: Omit<FundingInstallment, 'installmentId' | 'caseId' | 'updatedAt'>): Promise<FundingInstallment> {
    const installment: FundingInstallment = {
      ...payload,
      installmentId: `inst-${caseId}-${Date.now()}`,
      caseId,
      updatedAt: new Date().toISOString(),
    };

    if (!this.installments[caseId]) {
      this.installments[caseId] = [];
    }
    this.installments[caseId].push(installment);
    this.saveInstallments();
    return installment;
  }

  async updateInstallment(installmentId: string, patch: Partial<Omit<FundingInstallment, 'installmentId' | 'caseId'>>): Promise<FundingInstallment> {
    for (const caseId in this.installments) {
      const inst = this.installments[caseId].find(i => i.installmentId === installmentId);
      if (inst) {
        const updated = { ...inst, ...patch, updatedAt: new Date().toISOString() };
        const idx = this.installments[caseId].indexOf(inst);
        this.installments[caseId][idx] = updated;
        this.saveInstallments();
        return updated;
      }
    }
    throw new Error('Installment not found');
  }

  async deleteInstallment(installmentId: string): Promise<void> {
    for (const caseId in this.installments) {
      const idx = this.installments[caseId].findIndex(i => i.installmentId === installmentId);
      if (idx >= 0) {
        this.installments[caseId].splice(idx, 1);
        this.saveInstallments();
        return;
      }
    }
  }

  async getInstallmentSummary(caseId: string): Promise<{ totalApproved: number; totalPlanned: number; totalPaid: number; balance: number }> {
    const caseItem = this.data.cases.find(c => c.caseId === caseId);
    const installments = this.installments[caseId] || [];

    const totalApproved = caseItem?.approvedAmount || 0;
    const totalPlanned = installments.reduce((sum, i) => sum + i.amount, 0);
    const totalPaid = installments
      .filter(i => i.status === 'Disbursed')
      .reduce((sum, i) => sum + i.amount, 0);
    const balance = totalApproved - totalPaid;

    return { totalApproved, totalPlanned, totalPaid, balance };
  }

  async listMonitoringVisits(caseId: string): Promise<MonitoringVisit[]> {
    return (this.visits[caseId] || []).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
  }

  async createMonitoringVisit(caseId: string, payload: Omit<MonitoringVisit, 'visitId' | 'caseId' | 'createdAt' | 'updatedAt'>): Promise<MonitoringVisit> {
    const visit: MonitoringVisit = {
      ...payload,
      visitId: `visit-${caseId}-${Date.now()}`,
      caseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!this.visits[caseId]) {
      this.visits[caseId] = [];
    }
    this.visits[caseId].push(visit);
    this.saveVisits();
    return visit;
  }

  async updateMonitoringVisit(visitId: string, patch: Partial<Omit<MonitoringVisit, 'visitId' | 'caseId' | 'createdAt'>>): Promise<MonitoringVisit> {
    for (const caseId in this.visits) {
      const visit = this.visits[caseId].find(v => v.visitId === visitId);
      if (visit) {
        const updated = { ...visit, ...patch, updatedAt: new Date().toISOString() };
        const idx = this.visits[caseId].indexOf(visit);
        this.visits[caseId][idx] = updated;
        this.saveVisits();
        return updated;
      }
    }
    throw new Error('Visit not found');
  }

  async deleteMonitoringVisit(visitId: string): Promise<void> {
    for (const caseId in this.visits) {
      const idx = this.visits[caseId].findIndex(v => v.visitId === visitId);
      if (idx >= 0) {
        this.visits[caseId].splice(idx, 1);
        this.saveVisits();
        return;
      }
    }
  }

  async listFollowupMilestones(caseId: string): Promise<FollowupMilestone[]> {
    return this.milestones[caseId] || [];
  }

  async ensureFollowupMilestones(caseId: string, anchorDate: string): Promise<FollowupMilestone[]> {
    if (!this.milestones[caseId]) {
      const MILESTONE_MONTHS = [3, 6, 9, 12, 18, 24] as const;
      const baseDate = new Date(anchorDate);

      this.milestones[caseId] = MILESTONE_MONTHS.map(months => ({
        milestoneId: `milestone-${caseId}-${months}`,
        caseId,
        milestoneMonths: months,
        dueDate: new Date(baseDate.getTime() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Upcoming' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      this.saveMilestones();
    }
    return this.milestones[caseId];
  }

  async listFollowupMetricDefs(milestoneMonths: number): Promise<FollowupMetricDef[]> {
    const questionnaire = getFollowupQuestionnaire(milestoneMonths);
    const questionDefs = questionnaire.questions.map((question, index) => ({
      metricId: `metric-${milestoneMonths}-${question.metricKey}`,
      milestoneMonths: questionnaire.milestoneMonths,
      metricKey: question.metricKey,
      metricLabel: question.label,
      valueType: 'TEXT' as const,
      allowNA: true,
    }));

    const remarkDefs = FOLLOWUP_REMARK_FIELDS.map((field, index) => ({
      metricId: `metric-${milestoneMonths}-${field.metricKey}-${index}`,
      milestoneMonths: questionnaire.milestoneMonths,
      metricKey: field.metricKey,
      metricLabel: field.label,
      valueType: 'TEXT' as const,
      allowNA: true,
    }));

    return [...questionDefs, ...remarkDefs];
  }

  async saveFollowupMetricValues(caseId: string, milestoneMonths: number, values: Omit<FollowupMetricValue, 'valueId'>[]): Promise<void> {
    for (const val of values) {
      const key = `${caseId}-${milestoneMonths}-${val.metricKey}`;
      this.metricValues[key] = {
        valueId: key,
        ...val,
        capturedAt: new Date().toISOString(),
      };
    }
    this.saveMetricValues();
  }

  async getFollowupMetricValues(caseId: string, milestoneMonths: number): Promise<FollowupMetricValue[]> {
    const prefix = `${caseId}-${milestoneMonths}`;
    return Object.values(this.metricValues).filter(v => v.caseId === caseId && v.milestoneMonths === milestoneMonths);
  }

  async setFollowupDate(caseId: string, milestoneMonths: number, followupDate: string, notes?: string): Promise<void> {
    const milestone = this.milestones[caseId]?.find(m => m.milestoneMonths === milestoneMonths);
    if (milestone) {
      milestone.followupDate = followupDate;
      milestone.status = 'Completed';
      if (notes) milestone.notes = notes;
      milestone.updatedAt = new Date().toISOString();
      this.saveMilestones();
    }
  }

  async listVolunteers(): Promise<User[]> {
    return MockProvider.DEMO_VOLUNTEERS;
  }

  async getClinicalDetails(caseId: string): Promise<ClinicalCaseDetails | null> {
    return this.clinicalData[caseId] || null;
  }

  async updateClinicalDates(caseId: string, dates: { admissionDate?: string; dischargeDate?: string }): Promise<void> {
    if (!this.clinicalData[caseId]) {
      this.clinicalData[caseId] = {
        caseId,
        diagnosis: '',
        summary: '',
      };
    }
    if (dates.admissionDate !== undefined) this.clinicalData[caseId].admissionDate = dates.admissionDate;
    if (dates.dischargeDate !== undefined) this.clinicalData[caseId].dischargeDate = dates.dischargeDate;
    this.saveClinical();
  }

  async getBeniProgramOps(caseId: string): Promise<BeniProgramOpsData | null> {
    const ops = this.beniOps[caseId];
    if (!ops) return null;
    const getVolunteerName = (userId?: string) => MockProvider.DEMO_VOLUNTEERS.find(v => v.userId === userId)?.fullName;
    return {
      ...ops,
      beniTeamMemberName: getVolunteerName(ops.beniTeamMember),
      volunteerLeadName: getVolunteerName(ops.volunteerLead),
      assignedVolunteerName: getVolunteerName(ops.assignedVolunteer),
      caseAllottedToName: getVolunteerName(ops.caseAllottedTo),
    };
  }

  async saveBeniProgramOps(caseId: string, ops: Omit<BeniProgramOpsData, 'opsId' | 'caseId' | 'beniTeamMemberName'>): Promise<void> {
    this.beniOps[caseId] = {
      ...this.beniOps[caseId],
      opsId: this.beniOps[caseId]?.opsId || `beni-${caseId}-${Date.now()}`,
      caseId,
      beniTeamMember: ops.beniTeamMember,
      volunteerLead: ops.volunteerLead,
      assignedVolunteer: ops.assignedVolunteer,
      caseAllottedTo: ops.caseAllottedTo,
      spocContacted: ops.spocContacted,
      preDischargeCallCompleted: ops.preDischargeCallCompleted,
      parentContactedBeforeDischarge: ops.parentContactedBeforeDischarge,
      spocContactedBeforeDischarge: ops.spocContactedBeforeDischarge,
      plannedDischargeDateDiscussed: ops.plannedDischargeDateDiscussed,
      preDischargeContactDate: ops.preDischargeContactDate,
      homeReachedConfirmed: ops.homeReachedConfirmed,
      postDischargeContactDone: ops.postDischargeContactDone,
      familyReachedAtHome: ops.familyReachedAtHome,
      postDischargeContactDate: ops.postDischargeContactDate,
      hamperSentDate: ops.hamperSentDate,
      hamperStatus: ops.hamperStatus,
      hamperDeliveryDate: ops.hamperDeliveryDate,
      hamperDispatchNotes: ops.hamperDispatchNotes,
      voiceNoteReceivedAt: ops.voiceNoteReceivedAt,
      notes: ops.notes,
    };
    this.saveBeniOps();
  }

  async getDoctorReview(caseId: string): Promise<DoctorReview | null> {
    return this.doctorReviews[caseId] || null;
  }

  async listUsersByRole(role: string): Promise<Array<{ userId: string; fullName: string; email: string }>> {
    const allUsers = mockStore.getUsers();
    const normalizedRole = role.toLowerCase();

    const matchesRole = (userRole: string) => {
      if (normalizedRole === 'clinical_reviewer') {
        return userRole === 'clinical_reviewer' || userRole === 'clinical' || userRole === 'hospital_doctor';
      }
      return userRole === normalizedRole;
    };

    return allUsers
      .filter((u) => u.isActive && u.roles.some(r => matchesRole(r)))
      .map((u) => ({
        userId: u.userId,
        fullName: u.fullName,
        email: u.email,
      }));
  }

  async assignDoctorReviewer(caseId: string, reviewerUserId: string): Promise<void> {
    const reviewers = await this.listUsersByRole('clinical_reviewer');
    const reviewer = reviewers.find(r => r.userId === reviewerUserId);
    if (!reviewer) {
      throw new Error('Selected reviewer not found');
    }

    const now = new Date().toISOString();
    const existing = this.doctorReviews[caseId];
    this.doctorReviews[caseId] = {
      reviewId: existing?.reviewId || `dr-${caseId}-${Date.now()}`,
      caseId,
      assignedToUserId: reviewerUserId,
      assignedToName: reviewer.fullName,
      submittedAt: existing?.submittedAt,
      outcome: existing?.outcome,
      comments: existing?.comments,
      gatingResult: existing?.gatingResult,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    this.saveDoctorReviews();

    const caseItem = this.data.cases.find(c => c.caseId === caseId) as (CaseWithDetails & { doctorAssignment?: any }) | undefined;
    if (caseItem) {
      caseItem.doctorAssignment = {
        reviewerUserId,
        reviewerName: reviewer.fullName,
        assignedAt: now,
        assignedBy: 'demo-user',
      };
      caseItem.updatedAt = now;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }
  }

  async submitDoctorReview(caseId: string, outcome: 'Approved' | 'Approved_With_Comments' | 'Returned', comments?: string, gatingInfo?: SubmitGatingInfo): Promise<void> {
    const existing = this.doctorReviews[caseId];
    if (!existing?.assignedToUserId) {
      throw new Error('No clinical reviewer assigned for this case');
    }

    const now = new Date().toISOString();
    this.doctorReviews[caseId] = {
      ...existing,
      submittedAt: now,
      outcome,
      comments: comments || undefined,
      gatingResult: gatingInfo
        ? { canSubmit: gatingInfo.canSubmit, reasons: gatingInfo.blockedBy }
        : existing.gatingResult,
      updatedAt: now,
    };
    this.saveDoctorReviews();
  }

  private static readonly BENE_KEY = 'nfi_demo_beneficiary_v1';
  private static readonly FAM_KEY = 'nfi_demo_family_v1';
  private static readonly FIN_KEY = 'nfi_demo_financial_v1';

  private readMap<T>(key: string): Record<string, T> {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
  }

  private writeMap<T>(key: string, map: Record<string, T>): void {
    localStorage.setItem(key, JSON.stringify(map));
  }

  async getBeneficiary(caseId: string): Promise<ChildProfile | null> {
    const caseItem = this.data.cases.find((entry) => entry.caseId === caseId);
    const beneficiary = this.readMap<ChildProfile>(MockProvider.BENE_KEY)[caseId];
    if (!beneficiary) return null;

    const identifiers = resolvePrototypeIdentifiers({
      caseRef: caseItem?.caseRef,
      caseReferenceSerial: caseItem?.caseReferenceSerial,
      beneficiaryNo: beneficiary.beneficiaryNo,
      beneficiaryNumberAllocatedAt: beneficiary.beneficiaryNumberAllocatedAt,
      caseStatus: caseItem?.caseStatus,
      decisionAt: caseItem?.updatedAt,
      intakeDate: caseItem?.intakeDate,
    });

    return {
      ...beneficiary,
      beneficiaryNo: identifiers.beneficiaryNo,
      beneficiaryNumberAllocatedAt: identifiers.beneficiaryNumberAllocatedAt,
    };
  }

  async upsertBeneficiary(caseId: string, data: Partial<Omit<ChildProfile, 'caseId'>>): Promise<void> {
    const caseItem = this.data.cases.find((entry) => entry.caseId === caseId);
    const map = this.readMap<ChildProfile>(MockProvider.BENE_KEY);
    const merged = { ...(map[caseId] || { caseId, beneficiaryName: '', gender: 'Male' as const, dob: '', admissionDate: '' }), ...data, caseId } as ChildProfile;
    const identifiers = resolvePrototypeIdentifiers({
      caseRef: caseItem?.caseRef,
      caseReferenceSerial: caseItem?.caseReferenceSerial,
      beneficiaryNo: merged.beneficiaryNo,
      beneficiaryNumberAllocatedAt: merged.beneficiaryNumberAllocatedAt,
      caseStatus: caseItem?.caseStatus,
      decisionAt: caseItem?.updatedAt,
      intakeDate: caseItem?.intakeDate,
    });
    map[caseId] = {
      ...merged,
      beneficiaryNo: identifiers.beneficiaryNo,
      beneficiaryNumberAllocatedAt: identifiers.beneficiaryNumberAllocatedAt,
    };
    this.writeMap(MockProvider.BENE_KEY, map);
  }

  async getFamily(caseId: string): Promise<FamilyProfile | null> {
    return this.readMap<FamilyProfile>(MockProvider.FAM_KEY)[caseId] || null;
  }

  async upsertFamily(caseId: string, data: Partial<Omit<FamilyProfile, 'caseId'>>): Promise<void> {
    const map = this.readMap<FamilyProfile>(MockProvider.FAM_KEY);
    map[caseId] = { ...(map[caseId] || { caseId, motherName: '', phone: '', address: '' }), ...data, caseId } as FamilyProfile;
    this.writeMap(MockProvider.FAM_KEY, map);
  }

  async upsertClinical(caseId: string, data: Partial<Omit<ClinicalCaseDetails, 'caseId'>>): Promise<void> {
    this.clinicalData[caseId] = { ...(this.clinicalData[caseId] || { caseId, diagnosis: '', summary: '' }), ...data, caseId } as ClinicalCaseDetails;
    this.saveClinical();
  }

  async getFinancial(caseId: string): Promise<FinancialCaseDetails | null> {
    return this.readMap<FinancialCaseDetails>(MockProvider.FIN_KEY)[caseId] || null;
  }

  async upsertFinancial(caseId: string, data: Partial<Omit<FinancialCaseDetails, 'caseId'>>): Promise<void> {
    const map = this.readMap<FinancialCaseDetails>(MockProvider.FIN_KEY);
    map[caseId] = { ...(map[caseId] || { caseId, estimateAmount: 0 }), ...data, caseId } as FinancialCaseDetails;
    this.writeMap(MockProvider.FIN_KEY, map);
  }

  async simulateMandatoryDocs(caseId: string, options?: { autoVerify?: boolean }): Promise<number> {
    await this.ensureDocumentChecklist(caseId, '');
    const caseDocs = this.documents[caseId] || [];
    const templates = this.getBuiltInTemplates();
    const caseIdShort = caseId.replace('case-demo-', '').substring(0, 8);
    let count = 0;

    for (const doc of caseDocs) {
      const template = templates.find(t => t.docType === doc.docType);
      if (!template?.mandatoryFlag) continue;

      const isBlocking = MockProvider.BLOCKING_DOC_TYPES.some(
        dt => dt.toLowerCase() === doc.docType.toLowerCase()
      );
      if (!isBlocking) continue;

      if (doc.status === 'Missing' || doc.status === 'Rejected') {
        doc.fileName = `${doc.docType.replace(/\s+/g, '_')}_${caseIdShort}.pdf`;
        doc.fileType = 'application/pdf';
        doc.size = Math.floor(200 * 1024 + Math.random() * 1300 * 1024);
        doc.uploadedAt = new Date().toISOString();
        doc.uploadedBy = 'Hospital SPOC';
        doc.status = options?.autoVerify ? 'Verified' : 'Uploaded';
        count++;
      } else if (doc.status === 'Uploaded' && options?.autoVerify) {
        doc.status = 'Verified';
        count++;
      }
    }

    this.saveDocuments();
    return count;
  }

  async listHospitalProcessMaps(): Promise<HospitalProcessMapWithDetails[]> {
    return Object.values(this.hospitalProcessMap).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async createHospitalProcessMap(data: {
    hospitalId: string;
    processType: string;
    isActive: boolean;
    effectiveFromDate: string;
  }): Promise<HospitalProcessMapWithDetails> {
    const hospital = this.data.hospitals.find(h => h.hospitalId === data.hospitalId);
    if (!hospital) throw new Error('Hospital not found');

    const mapId = `map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const newMap: HospitalProcessMapWithDetails = {
      mapId,
      hospitalId: data.hospitalId,
      hospitalName: hospital.name,
      processType: data.processType as ProcessType,
      isActive: data.isActive,
      effectiveFromDate: data.effectiveFromDate,
      updatedAt: now,
    };

    this.hospitalProcessMap[mapId] = newMap;
    this.saveHospitalProcessMap(this.hospitalProcessMap);
    return newMap;
  }

  async updateHospitalProcessMap(mapId: string, data: {
    processType?: string;
    isActive?: boolean;
    effectiveFromDate?: string;
  }): Promise<HospitalProcessMapWithDetails> {
    const map = this.hospitalProcessMap[mapId];
    if (!map) throw new Error('Hospital process map not found');

    const updated: HospitalProcessMapWithDetails = {
      ...map,
      ...(data.processType && { processType: data.processType as ProcessType }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.effectiveFromDate && { effectiveFromDate: data.effectiveFromDate }),
      updatedAt: new Date().toISOString(),
    };

    this.hospitalProcessMap[mapId] = updated;
    this.saveHospitalProcessMap(this.hospitalProcessMap);
    return updated;
  }

  async deleteHospitalProcessMap(mapId: string): Promise<void> {
    if (!this.hospitalProcessMap[mapId]) {
      throw new Error('Hospital process map not found');
    }
    delete this.hospitalProcessMap[mapId];
    this.saveHospitalProcessMap(this.hospitalProcessMap);
  }

  private loadOrGenerateReportTemplates(): ReportTemplatesData {
    const stored = localStorage.getItem(REPORT_TEMPLATES_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ReportTemplatesData;
        const codes = Object.values(parsed).map((template) => template.code);
        const hasLegacyOnly = ['BEN_SUMMARY', 'FIN_SUMMARY', 'PROCESS_METRICS'].every((code) => codes.includes(code));
        if (hasLegacyOnly) {
          return this.generateReportTemplates();
        }
        return parsed;
      } catch {
        return this.generateReportTemplates();
      }
    }
    return this.generateReportTemplates();
  }

  private generateReportTemplates(): ReportTemplatesData {
    const templates: ReportTemplatesData = {
      'template-1': {
        templateId: 'template-1',
        code: 'HOSPITAL_MIS_MONTHLY',
        name: 'Hospital MIS - Monthly',
        description: 'Hospital-wise monthly MIS scorecard',
        version: '1.0',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      'template-2': {
        templateId: 'template-2',
        code: 'DAILY_MIS_PROGRAMS',
        name: 'Daily MIS - Programs',
        description: 'Daily operational MIS with case status rollups',
        version: '1.0',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      'template-3': {
        templateId: 'template-3',
        code: 'MONTHLY_MIS_LEADERSHIP',
        name: 'Monthly MIS - Leadership Team',
        description: 'Monthly donor-safe leadership MIS',
        version: '1.0',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      'template-4': {
        templateId: 'template-4',
        code: 'ACCOUNTS_MIS',
        name: 'Accounts MIS',
        description: 'Daily accounts MIS and finance snapshot',
        version: '1.0',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    this.saveReportTemplates(templates);
    return templates;
  }

  private saveReportTemplates(templates: ReportTemplatesData): void {
    localStorage.setItem(REPORT_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  }

  private loadOrGenerateReportRuns(): ReportRunsData {
    const stored = localStorage.getItem(REPORT_RUNS_STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveReportRuns(runs: ReportRunsData): void {
    localStorage.setItem(REPORT_RUNS_STORAGE_KEY, JSON.stringify(runs));
  }

  async listReportTemplates(): Promise<ReportTemplate[]> {
    return Object.values(this.reportTemplates).filter(t => t.isActive);
  }

  async listReportRuns(templateId?: string, limit = 50): Promise<ReportRun[]> {
    let runs = Object.values(this.reportRuns);
    if (templateId) {
      runs = runs.filter(r => r.templateId === templateId);
    }
    return runs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async createReportRun(data: {
    templateId: string;
    templateCode?: string;
    templateName?: string;
    filters?: any;
    dataAsOf?: Date;
  }): Promise<any> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const dataAsOfStr = data.dataAsOf
      ? new Date(data.dataAsOf).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const newRun = {
      runId,
      templateId: data.templateId,
      templateCode: data.templateCode,
      templateName: data.templateName,
      status: 'Succeeded',
      filters: data.filters || {},
      dataAsOf: dataAsOfStr,
      generatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.reportRuns[runId] = newRun;
    this.saveReportRuns(this.reportRuns);

    return newRun;
  }

  async updateReportRunStatus(runId: string, status: ReportRunStatus, dataAsOf?: string): Promise<ReportRun> {
    const run = this.reportRuns[runId];
    if (!run) {
      throw new Error('Report run not found');
    }

    const updated: ReportRun = {
      ...run,
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'Succeeded') {
      updated.generatedAt = new Date().toISOString();
    }

    if (dataAsOf) {
      updated.dataAsOf = dataAsOf;
    }

    this.reportRuns[runId] = updated;
    this.saveReportRuns(this.reportRuns);
    return updated;
  }

  async getDonationsLedger(): Promise<any[]> {
    const stored = localStorage.getItem('nfi_donations_ledger');
    return stored ? JSON.parse(stored) : [];
  }

  async createDonationEntry(data: any): Promise<any> {
    const entries = await this.getDonationsLedger();
    const entry = { ...data, id: Math.random().toString() };
    entries.push(entry);
    localStorage.setItem('nfi_donations_ledger', JSON.stringify(entries));
    return entry;
  }

  async updateDonationEntry(id: string, data: any): Promise<any> {
    const entries = await this.getDonationsLedger();
    const idx = entries.findIndex((e: any) => e.id === id);
    if (idx < 0) throw new Error('Entry not found');
    entries[idx] = { ...entries[idx], ...data };
    localStorage.setItem('nfi_donations_ledger', JSON.stringify(entries));
    return entries[idx];
  }

  async deleteDonationEntry(id: string): Promise<void> {
    const entries = await this.getDonationsLedger();
    const filtered = entries.filter((e: any) => e.id !== id);
    localStorage.setItem('nfi_donations_ledger', JSON.stringify(filtered));
  }

  async getBankBalanceSnapshots(): Promise<any[]> {
    const stored = localStorage.getItem('nfi_bank_snapshots');
    return stored ? JSON.parse(stored) : [];
  }

  async createBankSnapshot(data: any): Promise<any> {
    const snapshots = await this.getBankBalanceSnapshots();
    const snapshot = { ...data, id: Math.random().toString() };
    snapshots.push(snapshot);
    localStorage.setItem('nfi_bank_snapshots', JSON.stringify(snapshots));
    return snapshot;
  }

  async updateBankSnapshot(id: string, data: any): Promise<any> {
    const snapshots = await this.getBankBalanceSnapshots();
    const idx = snapshots.findIndex((s: any) => s.id === id);
    if (idx < 0) throw new Error('Snapshot not found');
    snapshots[idx] = { ...snapshots[idx], ...data };
    localStorage.setItem('nfi_bank_snapshots', JSON.stringify(snapshots));
    return snapshots[idx];
  }

  async deleteBankSnapshot(id: string): Promise<void> {
    const snapshots = await this.getBankBalanceSnapshots();
    const filtered = snapshots.filter((s: any) => s.id !== id);
    localStorage.setItem('nfi_bank_snapshots', JSON.stringify(filtered));
  }

  async getExpenseTransactions(): Promise<any[]> {
    const stored = localStorage.getItem('nfi_expense_transactions');
    return stored ? JSON.parse(stored) : [];
  }

  async createExpenseTransaction(data: any): Promise<any> {
    const transactions = await this.getExpenseTransactions();
    const transaction = { ...data, id: Math.random().toString() };
    transactions.push(transaction);
    localStorage.setItem('nfi_expense_transactions', JSON.stringify(transactions));
    return transaction;
  }

  async updateExpenseTransaction(id: string, data: any): Promise<any> {
    const transactions = await this.getExpenseTransactions();
    const idx = transactions.findIndex((t: any) => t.id === id);
    if (idx < 0) throw new Error('Transaction not found');
    transactions[idx] = { ...transactions[idx], ...data };
    localStorage.setItem('nfi_expense_transactions', JSON.stringify(transactions));
    return transactions[idx];
  }

  async deleteExpenseTransaction(id: string): Promise<void> {
    const transactions = await this.getExpenseTransactions();
    const filtered = transactions.filter((t: any) => t.id !== id);
    localStorage.setItem('nfi_expense_transactions', JSON.stringify(filtered));
  }

  async listKpiCatalog(): Promise<KpiCatalog[]> {
    const stored = localStorage.getItem(KPI_CATALOG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async createKpi(data: Omit<KpiCatalog, 'id' | 'createdAt' | 'updatedAt'>): Promise<KpiCatalog> {
    const list = await this.listKpiCatalog();
    const now = new Date().toISOString();
    const kpi: KpiCatalog = {
      ...data,
      id: Math.random().toString(),
      createdAt: now,
      updatedAt: now,
    };
    list.push(kpi);
    localStorage.setItem(KPI_CATALOG_STORAGE_KEY, JSON.stringify(list));
    return kpi;
  }

  async updateKpi(id: string, data: Partial<Omit<KpiCatalog, 'id' | 'createdAt'>>): Promise<KpiCatalog> {
    const list = await this.listKpiCatalog();
    const idx = list.findIndex(k => k.id === id);
    if (idx < 0) throw new Error('KPI not found');
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(KPI_CATALOG_STORAGE_KEY, JSON.stringify(list));
    return list[idx];
  }

  async deleteKpi(id: string): Promise<void> {
    const list = await this.listKpiCatalog();
    const filtered = list.filter(k => k.id !== id);
    localStorage.setItem(KPI_CATALOG_STORAGE_KEY, JSON.stringify(filtered));
  }

  async listDatasetRegistry(): Promise<DatasetRegistry[]> {
    const stored = localStorage.getItem(DATASET_REGISTRY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async createDataset(data: Omit<DatasetRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatasetRegistry> {
    const list = await this.listDatasetRegistry();
    const now = new Date().toISOString();
    const dataset: DatasetRegistry = {
      ...data,
      id: Math.random().toString(),
      createdAt: now,
      updatedAt: now,
    };
    list.push(dataset);
    localStorage.setItem(DATASET_REGISTRY_STORAGE_KEY, JSON.stringify(list));
    return dataset;
  }

  async updateDataset(id: string, data: Partial<Omit<DatasetRegistry, 'id' | 'createdAt'>>): Promise<DatasetRegistry> {
    const list = await this.listDatasetRegistry();
    const idx = list.findIndex(d => d.id === id);
    if (idx < 0) throw new Error('Dataset not found');
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(DATASET_REGISTRY_STORAGE_KEY, JSON.stringify(list));
    return list[idx];
  }

  async deleteDataset(id: string): Promise<void> {
    const list = await this.listDatasetRegistry();
    const filtered = list.filter(d => d.id !== id);
    localStorage.setItem(DATASET_REGISTRY_STORAGE_KEY, JSON.stringify(filtered));
  }

  async listTemplateRegistry(): Promise<TemplateRegistry[]> {
    const stored = localStorage.getItem(TEMPLATE_REGISTRY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  async createTemplate(data: Omit<TemplateRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TemplateRegistry> {
    const list = await this.listTemplateRegistry();
    const now = new Date().toISOString();
    const template: TemplateRegistry = {
      ...data,
      id: Math.random().toString(),
      createdAt: now,
      updatedAt: now,
    };
    list.push(template);
    localStorage.setItem(TEMPLATE_REGISTRY_STORAGE_KEY, JSON.stringify(list));
    return template;
  }

  async updateTemplate(id: string, data: Partial<Omit<TemplateRegistry, 'id' | 'createdAt'>>): Promise<TemplateRegistry> {
    const list = await this.listTemplateRegistry();
    const idx = list.findIndex(t => t.id === id);
    if (idx < 0) throw new Error('Template not found');
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(TEMPLATE_REGISTRY_STORAGE_KEY, JSON.stringify(list));
    return list[idx];
  }

  async deleteTemplate(id: string): Promise<void> {
    const list = await this.listTemplateRegistry();
    const filtered = list.filter(t => t.id !== id);
    localStorage.setItem(TEMPLATE_REGISTRY_STORAGE_KEY, JSON.stringify(filtered));
  }

  async listTemplateBindings(templateId?: string): Promise<TemplateBinding[]> {
    const stored = localStorage.getItem(TEMPLATE_BINDINGS_STORAGE_KEY);
    let list: TemplateBinding[] = stored ? JSON.parse(stored) : [];
    if (templateId) {
      list = list.filter(b => b.templateId === templateId);
    }
    return list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createTemplateBinding(data: Omit<TemplateBinding, 'id' | 'createdAt' | 'updatedAt'>): Promise<TemplateBinding> {
    const list = await this.listTemplateBindings();
    const now = new Date().toISOString();
    const binding: TemplateBinding = {
      ...data,
      id: Math.random().toString(),
      createdAt: now,
      updatedAt: now,
    };
    list.push(binding);
    localStorage.setItem(TEMPLATE_BINDINGS_STORAGE_KEY, JSON.stringify(list));
    return binding;
  }

  async updateTemplateBinding(id: string, data: Partial<Omit<TemplateBinding, 'id' | 'createdAt'>>): Promise<TemplateBinding> {
    const list = await this.listTemplateBindings();
    const idx = list.findIndex(b => b.id === id);
    if (idx < 0) throw new Error('Template binding not found');
    list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
    localStorage.setItem(TEMPLATE_BINDINGS_STORAGE_KEY, JSON.stringify(list));
    return list[idx];
  }

  async deleteTemplateBinding(id: string): Promise<void> {
    const list = await this.listTemplateBindings();
    const filtered = list.filter(b => b.id !== id);
    localStorage.setItem(TEMPLATE_BINDINGS_STORAGE_KEY, JSON.stringify(filtered));
  }

  async listReportRunsWithDetails(templateId?: string, limit?: number): Promise<ReportRun[]> {
    const stored = localStorage.getItem(REPORT_RUNS_STORAGE_KEY);
    let runs: ReportRun[] = stored ? JSON.parse(stored) : [];
    if (templateId) {
      runs = runs.filter(r => r.templateId === templateId);
    }
    runs = runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (limit) {
      runs = runs.slice(0, limit);
    }
    return runs;
  }

  async updateReportRunWithError(runId: string, status: ReportRunStatus, errorMessage?: string): Promise<ReportRun> {
    const stored = localStorage.getItem(REPORT_RUNS_STORAGE_KEY);
    const runs: ReportRun[] = stored ? JSON.parse(stored) : [];
    const idx = runs.findIndex(r => r.runId === runId);
    if (idx < 0) throw new Error('Report run not found');

    runs[idx] = {
      ...runs[idx],
      status,
      errorMessage,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'Succeeded' || status === 'Failed') {
      runs[idx].generatedAt = new Date().toISOString();
    }

    localStorage.setItem(REPORT_RUNS_STORAGE_KEY, JSON.stringify(runs));
    return runs[idx];
  }

  async getIntakeData(caseId: string): Promise<{ fundApplication?: IntakeFundApplication; interimSummary?: IntakeInterimSummary }> {
    try {
      const stored = localStorage.getItem(INTAKE_STORAGE_KEY);
      if (!stored) return {};
      const intakeMap: Record<string, any> = JSON.parse(stored);
      const intakeRecord = intakeMap[caseId];
      if (!intakeRecord) return {};
      return {
        fundApplication: intakeRecord.fundApplication,
        interimSummary: intakeRecord.interimSummary,
      };
    } catch (e) {
      console.warn('Failed to load intake data:', e);
      return {};
    }
  }

  async saveIntakeData(caseId: string, fundApplication?: IntakeFundApplication, interimSummary?: IntakeInterimSummary): Promise<void> {
    try {
      const stored = localStorage.getItem(INTAKE_STORAGE_KEY);
      const intakeMap: Record<string, any> = stored ? JSON.parse(stored) : {};
      intakeMap[caseId] = {
        fundApplication,
        interimSummary,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(INTAKE_STORAGE_KEY, JSON.stringify(intakeMap));
    } catch (e) {
      console.error('Failed to save intake data:', e);
      throw e;
    }
  }

  async getIntakeCompleteness(caseId: string): Promise<IntakeCompleteness> {
    const intake = await this.getIntakeData(caseId);
    return this.calculateIntakeCompleteness(intake.fundApplication, intake.interimSummary);
  }

  async getCaseSubmitReadiness(caseId: string): Promise<CaseSubmitReadiness> {
    const completeness = await this.getIntakeCompleteness(caseId);
    const checklistReadiness = await this.getChecklistReadiness(caseId);

    const missingSections: string[] = [];
    const missingFields: string[] = [];

    if (!completeness.fundAppIsComplete) {
      Object.entries(completeness.fundAppSections).forEach(([sectionKey, isComplete]) => {
        if (!isComplete) {
          missingSections.push(`Fund Application -> ${this.formatSectionName(sectionKey)}`);
        }
      });
    }

    if (!completeness.interimSummaryIsComplete) {
      Object.entries(completeness.interimSummarySections).forEach(([sectionKey, isComplete]) => {
        if (!isComplete) {
          missingSections.push(`Interim Summary -> ${this.formatSectionName(sectionKey)}`);
        }
      });
    }

    const missingDocs = checklistReadiness.blockingDocs.map(d => d.docType);

    return {
      canSubmit: completeness.fundAppIsComplete && completeness.interimSummaryIsComplete && checklistReadiness.isReady,
      fundAppComplete: completeness.fundAppIsComplete,
      interimSummaryComplete: completeness.interimSummaryIsComplete,
      documentsReady: checklistReadiness.isReady,
      missingSections,
      missingFields,
      missingDocuments: missingDocs,
    };
  }

  private calculateIntakeCompleteness(fundApplication?: IntakeFundApplication, interimSummary?: IntakeInterimSummary): IntakeCompleteness {
    const fundSectionKeys = Object.keys(FUND_APPLICATION_FIELDS) as Array<keyof typeof FUND_APPLICATION_FIELDS>;
    const interimSectionKeys = Object.keys(INTERIM_SUMMARY_FIELDS) as Array<keyof typeof INTERIM_SUMMARY_FIELDS>;

    const fundSectionProgress = fundSectionKeys.reduce((acc, sectionKey) => {
      acc[sectionKey] = getFundApplicationSectionProgress(sectionKey, fundApplication?.[sectionKey]);
      return acc;
    }, {} as Record<keyof typeof FUND_APPLICATION_FIELDS, { pct: number; filled: number; total: number }>);

    const interimSectionProgress = interimSectionKeys.reduce((acc, sectionKey) => {
      acc[sectionKey] = getInterimSummarySectionProgress(sectionKey, interimSummary?.[sectionKey]);
      return acc;
    }, {} as Record<keyof typeof INTERIM_SUMMARY_FIELDS, { pct: number; filled: number; total: number }>);

    const fundAppSections = {
      parentsFamilySection: getSectionStatus(fundSectionProgress.parentsFamilySection) === 'complete',
      occupationIncomeSection: getSectionStatus(fundSectionProgress.occupationIncomeSection) === 'complete',
      birthDetailsSection: getSectionStatus(fundSectionProgress.birthDetailsSection) === 'complete',
      nicuFinancialSection: getSectionStatus(fundSectionProgress.nicuFinancialSection) === 'complete',
      otherSupportSection: getSectionStatus(fundSectionProgress.otherSupportSection) === 'complete',
      declarationsSection: getSectionStatus(fundSectionProgress.declarationsSection) === 'complete',
      hospitalApprovalSection: getSectionStatus(fundSectionProgress.hospitalApprovalSection) === 'complete',
    };

    const interimSummarySections = {
      birthSummarySection: getSectionStatus(interimSectionProgress.birthSummarySection) === 'complete',
      maternalDetailsSection: getSectionStatus(interimSectionProgress.maternalDetailsSection) === 'complete',
      antenatalRiskFactorsSection: getSectionStatus(interimSectionProgress.antenatalRiskFactorsSection) === 'complete',
      diagnosisSection: getSectionStatus(interimSectionProgress.diagnosisSection) === 'complete',
      treatmentGivenSection: getSectionStatus(interimSectionProgress.treatmentGivenSection) === 'complete',
      currentStatusSection: getSectionStatus(interimSectionProgress.currentStatusSection) === 'complete',
      feedingRespirationSection: getSectionStatus(interimSectionProgress.feedingRespirationSection) === 'complete',
      dischargePlanInvestigationsSection: getSectionStatus(interimSectionProgress.dischargePlanInvestigationsSection) === 'complete',
      remarksSignatureSection: getSectionStatus(interimSectionProgress.remarksSignatureSection) === 'complete',
    };

    const fundAppComplete = Object.values(fundAppSections).every(v => v);
    const interimSummaryComplete = Object.values(interimSummarySections).every(v => v);
    const fundAppTotalPercent = Math.round(
      fundSectionKeys.reduce((sum, key) => sum + fundSectionProgress[key].pct, 0) / fundSectionKeys.length
    );
    const interimSummaryTotalPercent = Math.round(
      interimSectionKeys.reduce((sum, key) => sum + interimSectionProgress[key].pct, 0) / interimSectionKeys.length
    );
    const overallPercent = Math.round((fundAppTotalPercent + interimSummaryTotalPercent) / 2);

    return {
      fundAppSections,
      fundAppTotalPercent,
      fundAppIsComplete: fundAppComplete,
      interimSummarySections,
      interimSummaryTotalPercent,
      interimSummaryIsComplete: interimSummaryComplete,
      overallPercent,
      allRequiredFieldsComplete: fundAppComplete && interimSummaryComplete,
    };
  }

  private formatSectionName(sectionKey: string): string {
    const normalized = sectionKey.replace(/Section$/, '');
    const labelMap: Record<string, string> = {
      nicuFinancial: 'NICU & Financial',
      feedingRespiration: 'Feeding & Respiration',
      dischargePlanInvestigations: 'Discharge Plan & Investigations',
      remarksSignature: 'Remarks & Signature',
    };
    if (labelMap[normalized]) {
      return labelMap[normalized];
    }
    return normalized
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async getWorkflowExt(caseId: string): Promise<WorkflowExtensions | null> {
    const caseItem = this.data.cases.find(c => c.caseId === caseId);
    return caseItem?.workflowExt || null;
  }

  async saveWorkflowExt(caseId: string, patch: Partial<WorkflowExtensions>): Promise<void> {
    const idx = this.data.cases.findIndex(c => c.caseId === caseId);
    if (idx < 0) {
      throw new Error('Case not found');
    }

    const existingWorkflow = (this.data.cases[idx].workflowExt || {}) as WorkflowExtensions;
    const updatedWorkflow: WorkflowExtensions = {
      ...existingWorkflow,
      ...patch,
      interview: {
        ...existingWorkflow.interview,
        ...patch.interview,
      },
      appeal: {
        ...existingWorkflow.appeal,
        ...patch.appeal,
      },
      funding: {
        ...existingWorkflow.funding,
        ...patch.funding,
        campaign: {
          ...existingWorkflow.funding?.campaign,
          ...patch.funding?.campaign,
        },
        sponsorQuantification: {
          ...existingWorkflow.funding?.sponsorQuantification,
          ...patch.funding?.sponsorQuantification,
        },
      },
    };

    this.data.cases[idx] = {
      ...this.data.cases[idx],
      workflowExt: updatedWorkflow,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  }

  async getSettlement(caseId: string): Promise<SettlementRecord | null> {
    try {
      const stored = localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      if (!stored) return null;
      const settlements: Record<string, SettlementRecord> = JSON.parse(stored);
      return settlements[caseId] || null;
    } catch (e) {
      console.warn('Failed to load settlement data:', e);
      return null;
    }
  }

  async saveSettlement(caseId: string, data: Partial<SettlementRecord>): Promise<void> {
    try {
      const stored = localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      const settlements: Record<string, SettlementRecord> = stored ? JSON.parse(stored) : {};
      const existing = settlements[caseId] || {};
      settlements[caseId] = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(settlements));
    } catch (e) {
      console.error('Failed to save settlement data:', e);
      throw e;
    }
  }

  async submitDirectorReview(caseId: string, decision: 'Approved' | 'Returned', comments: string, decidedBy: string): Promise<void> {
    try {
      const stored = localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      const settlements: Record<string, SettlementRecord> = stored ? JSON.parse(stored) : {};
      const existing = settlements[caseId] || {};
      settlements[caseId] = {
        ...existing,
        directorReview: {
          decision,
          comments,
          by: decidedBy,
          at: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(settlements));
    } catch (e) {
      console.error('Failed to submit director review:', e);
      throw e;
    }
  }

  async closeCaseWithSettlement(caseId: string, closedBy: string): Promise<void> {
    try {
      const stored = localStorage.getItem(SETTLEMENTS_STORAGE_KEY);
      const settlements: Record<string, SettlementRecord> = stored ? JSON.parse(stored) : {};
      const existing = settlements[caseId] || {};
      settlements[caseId] = {
        ...existing,
        closedAt: new Date().toISOString(),
        closedBy,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(SETTLEMENTS_STORAGE_KEY, JSON.stringify(settlements));

      const caseItem = this.data.cases.find(c => c.caseId === caseId);
      if (caseItem) {
        caseItem.caseStatus = 'Closed';
        caseItem.closureDate = new Date().toISOString().split('T')[0];
        caseItem.updatedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      }
    } catch (e) {
      console.error('Failed to close case with settlement:', e);
      throw e;
    }
  }
}

