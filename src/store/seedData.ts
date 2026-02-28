import {
  AppStore,
  User,
  Hospital,
  Case,
  ChildProfile,
  FamilyProfile,
  ClinicalCaseDetails,
  FinancialCaseDetails,
  DocumentMetadata,
  DocumentRequirementTemplate,
  CommitteeDecision,
  FundingInstallment,
  RejectionDetails,
  BeniProgramOps,
  FollowupEvent,
  FollowupMetricDef,
  AuditEvent,
} from '../types';

export const SEED_VERSION = 'rbac_v3';

export function seedData(): AppStore {
  const users: User[] = [
    {
      userId: 'usr_admin',
      username: 'admin',
      fullName: 'Admin User',
      email: 'admin@nfi.org',
      roles: ['admin'],
      isActive: true,
    },
    {
      userId: 'usr_leadership',
      username: 'leadership',
      fullName: 'Leadership User',
      email: 'leadership@nfi.org',
      roles: ['leadership'],
      isActive: true,
    },
    {
      userId: 'usr_clinical',
      username: 'clinical',
      fullName: 'Dr. NFI Clinical Reviewer',
      email: 'clinical@nfi.org',
      roles: ['clinical'],
      isActive: true,
    },
    {
      userId: 'usr_hosp1',
      username: 'hospital_spoc1',
      fullName: 'Dr. Rajesh Kumar',
      email: 'rajesh@hospital1.com',
      roles: ['hospital_spoc'],
      hospitalId: 'hosp_1',
      isActive: true,
    },
    {
      userId: 'usr_verifier',
      username: 'verifier1',
      fullName: 'Priya Sharma',
      email: 'priya@nfi.org',
      roles: ['verifier'],
      isActive: true,
    },
    {
      userId: 'usr_committee',
      username: 'committee1',
      fullName: 'Dr. Sunita Reddy',
      email: 'sunita@nfi.org',
      roles: ['committee_member'],
      isActive: true,
    },
    {
      userId: 'usr_accounts',
      username: 'accounts1',
      fullName: 'Ramesh Gupta',
      email: 'ramesh@nfi.org',
      roles: ['accounts'],
      isActive: true,
    },
    {
      userId: 'usr_beni',
      username: 'beni1',
      fullName: 'Kavita Singh',
      email: 'kavita@nfi.org',
      roles: ['beni_volunteer'],
      isActive: true,
    },
  ];

  const hospitals: Hospital[] = [
    {
      hospitalId: 'hosp_1',
      name: 'Apollo Hospitals',
      city: 'Chennai',
      state: 'Tamil Nadu',
      spocName: 'Dr. Rajesh Kumar',
      spocPhone: '+91-9876543210',
      isActive: true,
    },
    {
      hospitalId: 'hosp_2',
      name: 'Fortis Hospital',
      city: 'Mumbai',
      state: 'Maharashtra',
      spocName: 'Dr. Meera Iyer',
      spocPhone: '+91-9876543211',
      isActive: true,
    },
    {
      hospitalId: 'hosp_3',
      name: 'AIIMS',
      city: 'New Delhi',
      state: 'Delhi',
      spocName: 'Dr. Vikram Singh',
      spocPhone: '+91-9876543212',
      isActive: true,
    },
    {
      hospitalId: 'hosp_4',
      name: 'PGIMER',
      city: 'Chandigarh',
      state: 'Chandigarh',
      spocName: 'Dr. Simran Kaur',
      spocPhone: '+91-9876543213',
      isActive: true,
    },
    {
      hospitalId: 'hosp_5',
      name: 'Manipal Hospital',
      city: 'Bengaluru',
      state: 'Karnataka',
      spocName: 'Dr. Arun Kumar',
      spocPhone: '+91-9876543214',
      isActive: true,
    },
  ];

  const documentTemplates: DocumentRequirementTemplate[] = [
    { templateId: 'tmpl_1', processType: 'BRC', category: 'GENERAL', docType: 'Hospital Registration', mandatoryFlag: true },
    { templateId: 'tmpl_2', processType: 'BRC', category: 'GENERAL', docType: 'Birth Certificate', mandatoryFlag: true },
    { templateId: 'tmpl_3', processType: 'BRC', category: 'GENERAL', docType: 'Aadhar Card (Parent)', mandatoryFlag: false },
    { templateId: 'tmpl_4', processType: 'BRC', category: 'MEDICAL', docType: 'Discharge Summary', mandatoryFlag: true },
    { templateId: 'tmpl_5', processType: 'BRC', category: 'MEDICAL', docType: 'Medical Reports', mandatoryFlag: true },
    { templateId: 'tmpl_6', processType: 'BRC', category: 'FINANCE', docType: 'Bank Statement', mandatoryFlag: true },
    { templateId: 'tmpl_7', processType: 'BRC', category: 'FINANCE', docType: 'Income Certificate', mandatoryFlag: true },
    { templateId: 'tmpl_8', processType: 'BRRC', category: 'MEDICAL', docType: 'Follow-up Report', mandatoryFlag: true },
    { templateId: 'tmpl_9', processType: 'BRRC', category: 'FINANCE', docType: 'BPL Card', mandatoryFlag: true },
    { templateId: 'tmpl_10', processType: 'BGRC', category: 'MEDICAL', docType: 'Lab Report', mandatoryFlag: true },
    { templateId: 'tmpl_11', processType: 'BGRC', category: 'MEDICAL', docType: 'Internal Case Papers', mandatoryFlag: true },
    { templateId: 'tmpl_12', processType: 'BCRC', category: 'FINANCE', docType: 'Talati/Govt Economic Card', mandatoryFlag: true },
    { templateId: 'tmpl_13', processType: 'BCRC', category: 'MEDICAL', docType: 'Investigation Reports (All)', mandatoryFlag: true },
  ];

  const followupMetricDefs: FollowupMetricDef[] = [
    { metricId: 'fmd_1', milestoneMonths: 3, metricKey: 'weight_adequate', metricLabel: 'Weight Adequate for Age', valueType: 'BOOLEAN', allowNA: false },
    { metricId: 'fmd_2', milestoneMonths: 3, metricKey: 'vaccination_complete', metricLabel: 'Vaccination Up-to-Date', valueType: 'BOOLEAN', allowNA: false },
    { metricId: 'fmd_3', milestoneMonths: 6, metricKey: 'motor_development', metricLabel: 'Motor Development Normal', valueType: 'BOOLEAN', allowNA: false },
    { metricId: 'fmd_4', milestoneMonths: 6, metricKey: 'feeding_pattern', metricLabel: 'Feeding Pattern', valueType: 'TEXT', allowNA: true },
    { metricId: 'fmd_5', milestoneMonths: 12, metricKey: 'walking', metricLabel: 'Child Walking', valueType: 'BOOLEAN', allowNA: false },
    { metricId: 'fmd_6', milestoneMonths: 12, metricKey: 'speech_development', metricLabel: 'Speech Development', valueType: 'TEXT', allowNA: true },
    { metricId: 'fmd_7', milestoneMonths: 18, metricKey: 'cognitive_skills', metricLabel: 'Cognitive Skills Normal', valueType: 'BOOLEAN', allowNA: false },
    { metricId: 'fmd_8', milestoneMonths: 24, metricKey: 'social_interaction', metricLabel: 'Social Interaction Normal', valueType: 'BOOLEAN', allowNA: false },
  ];

  const cases: Case[] = [];
  const childProfiles: ChildProfile[] = [];
  const familyProfiles: FamilyProfile[] = [];
  const clinicalDetails: ClinicalCaseDetails[] = [];
  const financialDetails: FinancialCaseDetails[] = [];
  const documents: DocumentMetadata[] = [];
  const committeeDecisions: CommitteeDecision[] = [];
  const fundingInstallments: FundingInstallment[] = [];
  const rejections: RejectionDetails[] = [];
  const beniPrograms: BeniProgramOps[] = [];
  const followupEvents: FollowupEvent[] = [];
  const auditEvents: AuditEvent[] = [];

  const caseData = [
    {
      caseId: 'case_1',
      caseRef: 'NFI/BRC/2024/001',
      processType: 'BRC' as const,
      hospitalId: 'hosp_1',
      caseStatus: 'Under_Review' as const,
      intakeDate: '2024-01-15',
      child: { beneficiaryNo: 'BEN001', beneficiaryName: 'Baby Aanya', gender: 'Female' as const, dob: '2024-01-10', admissionDate: '2024-01-10', gestationalAgeWeeks: 28, birthWeightKg: 1.2, currentWeightKg: 2.1 },
      family: { motherName: 'Lakshmi Devi', fatherName: 'Ravi Kumar', phone: '+91-9988776655', address: '123, Gandhi Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', incomeBand: '< 50,000' },
      clinical: { diagnosis: 'Respiratory Distress Syndrome', summary: 'Premature baby requiring NICU support', doctorName: 'Dr. Rajesh Kumar', nicuDays: 45 },
      financial: { estimateAmount: 250000, approvedAmount: 200000 },
      decision: { outcome: 'Approved' as const, approvedAmount: 200000, decisionDate: '2024-02-01', decidedBy: 'usr_committee', comments: 'Approved for full support' },
    },
    {
      caseId: 'case_2',
      caseRef: 'NFI/BRC/2024/002',
      processType: 'BRC' as const,
      hospitalId: 'hosp_2',
      caseStatus: 'Under_Verification' as const,
      intakeDate: '2024-02-10',
      child: { beneficiaryNo: 'BEN002', beneficiaryName: 'Baby Arjun', gender: 'Male' as const, dob: '2024-02-05', admissionDate: '2024-02-05', gestationalAgeWeeks: 30, birthWeightKg: 1.5, currentWeightKg: 1.8 },
      family: { motherName: 'Sunita Sharma', fatherName: 'Raj Sharma', phone: '+91-9988776656', address: '456, MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', incomeBand: '50,000 - 1,00,000' },
      clinical: { diagnosis: 'Neonatal Jaundice', summary: 'Requires phototherapy and monitoring', doctorName: 'Dr. Meera Iyer', nicuDays: 20 },
      financial: { estimateAmount: 150000 },
    },
    {
      caseId: 'case_3',
      caseRef: 'NFI/BGRC/2024/001',
      processType: 'BGRC' as const,
      hospitalId: 'hosp_1',
      caseStatus: 'Approved' as const,
      intakeDate: '2024-03-01',
      child: { beneficiaryNo: 'BEN001', beneficiaryName: 'Baby Aanya', gender: 'Female' as const, dob: '2024-01-10', admissionDate: '2024-01-10', gestationalAgeWeeks: 28, birthWeightKg: 1.2, currentWeightKg: 4.5 },
      family: { motherName: 'Lakshmi Devi', fatherName: 'Ravi Kumar', phone: '+91-9988776655', address: '123, Gandhi Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', incomeBand: '< 50,000' },
      clinical: { diagnosis: 'Growth Monitoring', summary: '6-month follow-up for growth tracking', doctorName: 'Dr. Rajesh Kumar', nicuDays: 0 },
      financial: { estimateAmount: 0, approvedAmount: 5000 },
      decision: { outcome: 'Approved' as const, approvedAmount: 5000, decisionDate: '2024-03-05', decidedBy: 'usr_committee', comments: 'Growth support approved' },
      beni: { beniTeamMember: 'Kavita Singh', hamperSentDate: '2024-03-10', voiceNoteReceivedAt: '2024-03-15', notes: 'Mother reported good progress' },
    },
    {
      caseId: 'case_4',
      caseRef: 'NFI/BCRC/2024/001',
      processType: 'BCRC' as const,
      hospitalId: 'hosp_3',
      caseStatus: 'Closed' as const,
      intakeDate: '2024-01-20',
      closureDate: '2024-03-20',
      child: { beneficiaryNo: 'BEN003', beneficiaryName: 'Baby Diya', gender: 'Female' as const, dob: '2024-01-15', admissionDate: '2024-01-15', gestationalAgeWeeks: 32, birthWeightKg: 1.8, currentWeightKg: 3.2 },
      family: { motherName: 'Anita Singh', fatherName: 'Vikram Singh', phone: '+91-9988776657', address: '789, Nehru Place', city: 'New Delhi', state: 'Delhi', pincode: '110019', incomeBand: '1,00,000 - 2,00,000' },
      clinical: { diagnosis: 'Sepsis', summary: 'Successfully treated, discharged healthy', doctorName: 'Dr. Vikram Singh', nicuDays: 30 },
      financial: { estimateAmount: 180000, approvedAmount: 150000, finalBillAmount: 145000 },
      decision: { outcome: 'Approved' as const, approvedAmount: 150000, decisionDate: '2024-02-05', decidedBy: 'usr_committee', comments: 'Closure approved' },
    },
    {
      caseId: 'case_5',
      caseRef: 'NFI/BRC/2024/003',
      processType: 'BRC' as const,
      hospitalId: 'hosp_4',
      caseStatus: 'Rejected' as const,
      intakeDate: '2024-02-25',
      child: { beneficiaryName: 'Baby Rohit', gender: 'Male' as const, dob: '2024-02-20', admissionDate: '2024-02-20', gestationalAgeWeeks: 38, birthWeightKg: 2.8 },
      family: { motherName: 'Kavita Kaur', fatherName: 'Harpreet Singh', phone: '+91-9988776658', address: '321, Sector 17', city: 'Chandigarh', state: 'Chandigarh', pincode: '160017', incomeBand: '> 5,00,000' },
      clinical: { diagnosis: 'Mild Infection', summary: 'Short-term care required', doctorName: 'Dr. Simran Kaur', nicuDays: 5 },
      financial: { estimateAmount: 50000 },
      decision: { outcome: 'Rejected' as const, decisionDate: '2024-03-05', decidedBy: 'usr_committee', comments: 'Income exceeds eligibility criteria' },
      rejection: { reasonCategory: 'Financial' as const, rejectionLevel: 'BRC' as const, communicationStatus: 'Notified' as const, detailedReason: 'Family income exceeds the eligibility threshold' },
    },
    {
      caseId: 'case_6',
      caseRef: 'NFI/BRRC/2024/001',
      processType: 'BRRC' as const,
      hospitalId: 'hosp_5',
      caseStatus: 'Under_Review' as const,
      intakeDate: '2024-03-10',
      child: { beneficiaryNo: 'BEN004', beneficiaryName: 'Baby Sai', gender: 'Male' as const, dob: '2024-02-01', admissionDate: '2024-03-08', gestationalAgeWeeks: 29, birthWeightKg: 1.3, currentWeightKg: 2.0 },
      family: { motherName: 'Priya Kumar', fatherName: 'Arun Kumar', phone: '+91-9988776659', address: '654, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038', incomeBand: '< 50,000' },
      clinical: { diagnosis: 'Re-admission for Pneumonia', summary: 'Previous BRC beneficiary requiring re-admission', doctorName: 'Dr. Arun Kumar', nicuDays: 15 },
      financial: { estimateAmount: 80000 },
    },
    {
      caseId: 'case_7',
      caseRef: 'NFI/BRC/2024/004',
      processType: 'BRC' as const,
      hospitalId: 'hosp_1',
      caseStatus: 'Submitted' as const,
      intakeDate: '2024-03-20',
      child: { beneficiaryName: 'Baby Meera', gender: 'Female' as const, dob: '2024-03-18', admissionDate: '2024-03-18', gestationalAgeWeeks: 27, birthWeightKg: 0.9, currentWeightKg: 1.0 },
      family: { motherName: 'Radha Iyer', fatherName: 'Suresh Iyer', phone: '+91-9988776660', address: '987, T Nagar', city: 'Chennai', state: 'Tamil Nadu', pincode: '600017', incomeBand: '50,000 - 1,00,000' },
      clinical: { diagnosis: 'Extremely Low Birth Weight', summary: 'Critical care required in NICU', doctorName: 'Dr. Rajesh Kumar', nicuDays: 60 },
      financial: { estimateAmount: 350000 },
    },
    {
      caseId: 'case_8',
      caseRef: 'NFI/BRC/2024/005',
      processType: 'BRC' as const,
      hospitalId: 'hosp_2',
      caseStatus: 'Draft' as const,
      intakeDate: '2024-03-25',
      child: { beneficiaryName: 'Baby Karan', gender: 'Male' as const, dob: '2024-03-22', admissionDate: '2024-03-22', gestationalAgeWeeks: 31, birthWeightKg: 1.6 },
      family: { motherName: 'Neha Gupta', fatherName: 'Rahul Gupta', phone: '+91-9988776661', address: '147, Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' },
      clinical: { diagnosis: 'Hypoxic Ischemic Encephalopathy', summary: 'Requires intensive monitoring', doctorName: 'Dr. Meera Iyer' },
      financial: { estimateAmount: 280000 },
    },
    {
      caseId: 'case_9',
      caseRef: 'NFI/BRC/2024/006',
      processType: 'BRC' as const,
      hospitalId: 'hosp_3',
      caseStatus: 'Approved' as const,
      intakeDate: '2024-02-15',
      child: { beneficiaryNo: 'BEN005', beneficiaryName: 'Baby Priya', gender: 'Female' as const, dob: '2024-02-10', admissionDate: '2024-02-10', gestationalAgeWeeks: 33, birthWeightKg: 1.9, currentWeightKg: 2.8 },
      family: { motherName: 'Geeta Rao', fatherName: 'Mohan Rao', phone: '+91-9988776662', address: '258, Lajpat Nagar', city: 'New Delhi', state: 'Delhi', pincode: '110024', incomeBand: '< 50,000' },
      clinical: { diagnosis: 'Congenital Heart Defect', summary: 'Surgery planned after weight gain', doctorName: 'Dr. Vikram Singh', nicuDays: 40 },
      financial: { estimateAmount: 400000, approvedAmount: 300000 },
      decision: { outcome: 'Approved' as const, approvedAmount: 300000, decisionDate: '2024-03-01', decidedBy: 'usr_committee', comments: 'Approved with installment plan' },
    },
    {
      caseId: 'case_10',
      caseRef: 'NFI/NON_BRC/2024/001',
      processType: 'NON_BRC' as const,
      hospitalId: 'hosp_4',
      caseStatus: 'Under_Verification' as const,
      intakeDate: '2024-03-15',
      child: { beneficiaryName: 'Baby Isha', gender: 'Female' as const, dob: '2024-03-12', admissionDate: '2024-03-12', gestationalAgeWeeks: 35, birthWeightKg: 2.2 },
      family: { motherName: 'Simran Kaur', fatherName: 'Jaspreet Singh', phone: '+91-9988776663', address: '369, Sector 22', city: 'Chandigarh', state: 'Chandigarh', pincode: '160022', incomeBand: '1,00,000 - 2,00,000' },
      clinical: { diagnosis: 'Birth Asphyxia', summary: 'Requires therapeutic hypothermia', doctorName: 'Dr. Simran Kaur', nicuDays: 25 },
      financial: { estimateAmount: 200000 },
    },
    {
      caseId: 'case_11',
      caseRef: 'NFI/BRC/2024/007',
      processType: 'BRC' as const,
      hospitalId: 'hosp_5',
      caseStatus: 'Returned' as const,
      intakeDate: '2024-03-05',
      child: { beneficiaryName: 'Baby Aditya', gender: 'Male' as const, dob: '2024-03-01', admissionDate: '2024-03-01', gestationalAgeWeeks: 29, birthWeightKg: 1.4 },
      family: { motherName: 'Divya Nair', fatherName: 'Suresh Nair', phone: '+91-9988776664', address: '741, Koramangala', city: 'Bengaluru', state: 'Karnataka', pincode: '560034', incomeBand: '50,000 - 1,00,000' },
      clinical: { diagnosis: 'Necrotizing Enterocolitis', summary: 'Surgical intervention required', doctorName: 'Dr. Arun Kumar', nicuDays: 50 },
      financial: { estimateAmount: 320000 },
    },
    {
      caseId: 'case_12',
      caseRef: 'NFI/BGRC/2024/002',
      processType: 'BGRC' as const,
      hospitalId: 'hosp_2',
      caseStatus: 'Approved' as const,
      intakeDate: '2024-03-18',
      child: { beneficiaryNo: 'BEN002', beneficiaryName: 'Baby Arjun', gender: 'Male' as const, dob: '2024-02-05', admissionDate: '2024-02-05', gestationalAgeWeeks: 30, birthWeightKg: 1.5, currentWeightKg: 5.2 },
      family: { motherName: 'Sunita Sharma', fatherName: 'Raj Sharma', phone: '+91-9988776656', address: '456, MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', incomeBand: '50,000 - 1,00,000' },
      clinical: { diagnosis: 'Growth Follow-up', summary: '6-month growth assessment', doctorName: 'Dr. Meera Iyer', nicuDays: 0 },
      financial: { estimateAmount: 0, approvedAmount: 5000 },
      decision: { outcome: 'Approved' as const, approvedAmount: 5000, decisionDate: '2024-03-20', decidedBy: 'usr_committee', comments: 'Growth support approved' },
      beni: { beniTeamMember: 'Kavita Singh', hamperSentDate: '2024-03-22', notes: 'Hamper sent, awaiting voice note' },
    },
  ];

  caseData.forEach((cd) => {
    cases.push({
      caseId: cd.caseId,
      caseRef: cd.caseRef,
      processType: cd.processType,
      hospitalId: cd.hospitalId,
      caseStatus: cd.caseStatus,
      intakeDate: cd.intakeDate,
      closureDate: cd.closureDate,
      createdBy: 'usr_hosp1',
      updatedAt: new Date().toISOString(),
      lastActionAt: new Date().toISOString(),
    });

    childProfiles.push({ caseId: cd.caseId, ...cd.child });
    familyProfiles.push({ caseId: cd.caseId, ...cd.family });
    clinicalDetails.push({ caseId: cd.caseId, ...cd.clinical });
    financialDetails.push({ caseId: cd.caseId, ...cd.financial });

    if (cd.decision) {
      committeeDecisions.push({
        decisionId: `dec_${cd.caseId}`,
        caseId: cd.caseId,
        ...cd.decision,
      });
    }

    if (cd.rejection) {
      rejections.push({
        rejectionId: `rej_${cd.caseId}`,
        caseId: cd.caseId,
        ...cd.rejection,
      });
    }

    if (cd.beni) {
      beniPrograms.push({
        beniId: `beni_${cd.caseId}`,
        caseId: cd.caseId,
        ...cd.beni,
      });
    }

    const templates = documentTemplates.filter((t) => t.processType === cd.processType);
    templates.forEach((tmpl, idx) => {
      documents.push({
        docId: `doc_${cd.caseId}_${idx}`,
        caseId: cd.caseId,
        category: tmpl.category,
        docType: tmpl.docType,
        status: cd.caseStatus === 'Draft' ? 'Missing' : (idx % 3 === 0 ? 'Uploaded' : idx % 3 === 1 ? 'Verified' : 'Missing'),
      });
    });

    if (cd.caseStatus === 'Approved' && cd.financial.approvedAmount) {
      const installmentCount = cd.processType === 'BGRC' ? 1 : cd.financial.approvedAmount > 200000 ? 3 : 2;
      const installmentAmount = Math.floor(cd.financial.approvedAmount / installmentCount);

      for (let i = 0; i < installmentCount; i++) {
        fundingInstallments.push({
          installmentId: `inst_${cd.caseId}_${i + 1}`,
          caseId: cd.caseId,
          label: `Installment ${i + 1}`,
          amount: i === installmentCount - 1 ? cd.financial.approvedAmount - (installmentAmount * (installmentCount - 1)) : installmentAmount,
          status: i === 0 ? 'Paid' : i === 1 ? 'Requested' : 'Planned',
          paidDate: i === 0 ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined,
        });
      }
    }

    if (cd.processType === 'BGRC' || (cd.caseStatus === 'Approved' && cd.child.beneficiaryNo)) {
      [6, 12, 18].forEach((months) => {
        followupEvents.push({
          followupId: `fu_${cd.caseId}_${months}`,
          caseId: cd.caseId,
          milestoneMonths: months as 3 | 6 | 9 | 12 | 18 | 24,
          dueDate: new Date(new Date(cd.child.dob).getTime() + months * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          followupDate: months === 6 ? new Date().toISOString().split('T')[0] : undefined,
          reachedFlag: months === 6 ? true : undefined,
        });
      });
    }

    auditEvents.push({
      eventId: `evt_${cd.caseId}_1`,
      caseId: cd.caseId,
      timestamp: cd.intakeDate + 'T10:00:00Z',
      userId: 'usr_hosp1',
      userRole: 'hospital_spoc',
      action: 'Case Created',
      notes: 'Initial case submission',
    });

    if (cd.caseStatus !== 'Draft') {
      auditEvents.push({
        eventId: `evt_${cd.caseId}_2`,
        caseId: cd.caseId,
        timestamp: new Date(new Date(cd.intakeDate).getTime() + 2 * 60 * 60 * 1000).toISOString(),
        userId: 'usr_verifier',
        userRole: 'verifier',
        action: 'Case Submitted',
        notes: 'Case submitted for review',
      });
    }

    if (cd.caseStatus === 'Under_Verification' || cd.caseStatus === 'Under_Review' || cd.caseStatus === 'Approved' || cd.caseStatus === 'Rejected' || cd.caseStatus === 'Closed') {
      auditEvents.push({
        eventId: `evt_${cd.caseId}_3`,
        caseId: cd.caseId,
        timestamp: new Date(new Date(cd.intakeDate).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        userId: 'usr_verifier',
        userRole: 'verifier',
        action: 'Documents Verified',
        notes: 'Document verification completed',
      });
    }

    if (cd.caseStatus === 'Approved' || cd.caseStatus === 'Rejected' || cd.caseStatus === 'Closed') {
      auditEvents.push({
        eventId: `evt_${cd.caseId}_4`,
        caseId: cd.caseId,
        timestamp: new Date(new Date(cd.intakeDate).getTime() + 48 * 60 * 60 * 1000).toISOString(),
        userId: 'usr_committee',
        userRole: 'committee_member',
        action: cd.caseStatus === 'Rejected' ? 'Case Rejected' : 'Case Approved',
        notes: cd.decision?.comments || cd.rejection?.detailedReason,
      });
    }
  });

  return {
    users,
    hospitals,
    cases,
    childProfiles,
    familyProfiles,
    clinicalDetails,
    financialDetails,
    documents,
    documentTemplates,
    committeeDecisions,
    fundingInstallments,
    rejections,
    beniPrograms,
    followupEvents,
    followupMetricDefs,
    followupMetricValues: [],
    auditEvents,
  };
}
