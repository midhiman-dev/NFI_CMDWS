const SEED_VERSION = '1';

const hospitals = [
  { name: 'Apollo Hospitals', code: 'APL001', city: 'New Delhi', state: 'Delhi' },
  { name: 'Fortis Healthcare', code: 'FOR001', city: 'Mumbai', state: 'Maharashtra' },
  { name: 'Max Healthcare', code: 'MAX001', city: 'Bangalore', state: 'Karnataka' },
  { name: 'AIIMS', code: 'AII001', city: 'New Delhi', state: 'Delhi' },
  { name: 'Narayana Health', code: 'NAR001', city: 'Bangalore', state: 'Karnataka' },
  { name: 'Manipal Hospitals', code: 'MAN001', city: 'Pune', state: 'Maharashtra' },
  { name: 'Lilavati Hospital', code: 'LIL001', city: 'Mumbai', state: 'Maharashtra' },
];

const firstNames = [
  'Rajesh', 'Priya', 'Amit', 'Anjali', 'Dr. Vikram', 'Dr. Neha',
  'Suresh', 'Deepika', 'Arjun', 'Pooja', 'Dr. Karan', 'Shreya',
  'Mohan', 'Nikita', 'Dr. Rohit', 'Divya', 'Sandeep', 'Riya',
];

const lastNames = [
  'Kumar', 'Sharma', 'Singh', 'Patel', 'Gupta', 'Verma', 'Rao', 'Nair',
];

const roles = [
  'admin', 'hospital_spoc', 'hospital_doctor', 'verifier', 'committee_member',
];

const processingStatuses = [
  'Draft', 'Submitted', 'Under_Verification', 'Returned',
  'Under_Review', 'Approved', 'Rejected', 'Closed',
];

const processTypes = ['New', 'Renewal', 'Revision'];

const beneficiaryNames = [
  'Arjun', 'Aisha', 'Rohan', 'Priya', 'Vivaan', 'Diya', 'Dev', 'Zara',
  'Ananya', 'Harsh', 'Ishita', 'Varun', 'Sara', 'Kabir', 'Neha', 'Aditya',
];

const diagnoses = [
  'Premature birth with respiratory distress',
  'Sepsis and congenital infection',
  'Birth asphyxia with HIE',
  'Patent foramen ovale',
  'Low birth weight management',
  'Meconium aspiration syndrome',
  'Persistent pulmonary hypertension',
  'Intraventricular hemorrhage',
  'Necrotizing enterocolitis',
  'Retinopathy of prematurity',
];

const cities = ['New Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'];
const states = ['Delhi', 'Maharashtra', 'Karnataka', 'Telangana', 'Tamil Nadu', 'Gujarat', 'West Bengal'];

const docTypes = [
  { type: 'NFI Fund Application Form', category: 'GENERAL', mandatory: true },
  { type: 'Aadhaar Cards (Mother & Father)', category: 'GENERAL', mandatory: true },
  { type: 'Parents Photo', category: 'GENERAL', mandatory: true },
  { type: 'Baby Photo', category: 'GENERAL', mandatory: true },

  { type: 'Bank Statement', category: 'FINANCE', mandatory: true },
  { type: 'Income Certificate', category: 'FINANCE', mandatory: true },
  { type: 'Talati / Govt Economic Card', category: 'FINANCE', mandatory: true },
  { type: 'BPL Card', category: 'FINANCE', mandatory: true },

  { type: 'Interim Summary Document', category: 'MEDICAL', mandatory: true },
  { type: 'Lab Report', category: 'MEDICAL', mandatory: true },
  { type: 'Internal Case Papers', category: 'MEDICAL', mandatory: true },
  { type: 'Investigation Reports (All)', category: 'MEDICAL', mandatory: true },

  { type: 'Imaging Reports', category: 'MEDICAL', mandatory: false },
  { type: 'Prescription', category: 'MEDICAL', mandatory: false },
  { type: 'Insurance Document', category: 'FINANCE', mandatory: false },
  { type: 'Photo ID', category: 'GENERAL', mandatory: false },
];

const rejectionReasons = [
  { category: 'Medical', reason: 'Does not meet clinical inclusion criteria' },
  { category: 'Financial', reason: 'Financial situation improved beyond threshold' },
  { category: 'Documentation', reason: 'Essential documents missing or incomplete' },
  { category: 'Eligibility', reason: 'Hospital not accredited for this process' },
  { category: 'Other', reason: 'Application incomplete' },
];

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getSeededElement<T>(array: T[], seed: number): T {
  const index = Math.floor(seededRandom(seed) * array.length);
  return array[index];
}

function generateEmail(firstName: string, lastName: string, seed: number): string {
  const domains = ['nfi.org', 'hospital.com', 'health.in'];
  const domain = domains[Math.floor(seededRandom(seed + 1000) * domains.length)];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generateUsers() {
  const users = [];
  let seed = 100;

  for (let i = 0; i < 1; i++) {
    const firstName = getSeededElement(firstNames, seed);
    const lastName = getSeededElement(lastNames, seed + 1);
    const user = {
      email: generateEmail(firstName, lastName, seed),
      fullName: `${firstName} ${lastName}`,
      role: 'admin',
      hospitalId: null,
    };
    users.push(user);
    seed += 10;
  }

  for (let i = 0; i < 2; i++) {
    const firstName = `Dr. ${getSeededElement(firstNames.slice(0, 6), seed)}`;
    const lastName = getSeededElement(lastNames, seed + 1);
    const user = {
      email: generateEmail(firstName, lastName, seed),
      fullName: `${firstName} ${lastName}`,
      role: 'verifier',
      hospitalId: null,
    };
    users.push(user);
    seed += 10;
  }

  for (let i = 0; i < 3; i++) {
    const firstName = `${getSeededElement(firstNames, seed)}`;
    const lastName = getSeededElement(lastNames, seed + 1);
    const user = {
      email: generateEmail(firstName, lastName, seed),
      fullName: `${firstName} ${lastName}`,
      role: 'committee_member',
      hospitalId: null,
    };
    users.push(user);
    seed += 10;
  }

  for (let i = 0; i < 2; i++) {
    const firstName = getSeededElement(firstNames, seed);
    const lastName = getSeededElement(lastNames, seed + 1);
    const user = {
      email: generateEmail(firstName, lastName, seed),
      fullName: `${firstName} ${lastName}`,
      role: 'committee_member',
      hospitalId: null,
    };
    users.push(user);
    seed += 10;
  }

  for (let i = 0; i < 5; i++) {
    const firstName = getSeededElement(firstNames, seed);
    const lastName = getSeededElement(lastNames, seed + 1);
    const hospitalIdx = i % hospitals.length;
    const user = {
      email: generateEmail(firstName, lastName, seed),
      fullName: `${firstName} ${lastName}`,
      role: 'hospital_spoc',
      hospitalId: hospitals[hospitalIdx],
    };
    users.push(user);
    seed += 10;
  }

  for (let i = 0; i < 3; i++) {
    const firstName = `Dr. ${getSeededElement(firstNames.slice(0, 6), seed)}`;
    const lastName = getSeededElement(lastNames, seed + 1);
    const hospitalIdx = i % hospitals.length;
    const user = {
      email: generateEmail(firstName, lastName, seed),
      fullName: `${firstName} ${lastName}`,
      role: 'hospital_doctor',
      hospitalId: hospitals[hospitalIdx],
    };
    users.push(user);
    seed += 10;
  }

  return users;
}

function generateCases(hosp: typeof hospitals) {
  const cases = [];
  const casesByStatus: Record<string, any[]> = {
    Draft: [],
    Submitted: [],
    Under_Verification: [],
    Returned: [],
    Under_Review: [],
    Approved: [],
    Rejected: [],
    Closed: [],
  };

  let seed = 200;
  const statusDistribution = {
    Draft: 2,
    Submitted: 3,
    Under_Verification: 2,
    Returned: 1,
    Under_Review: 2,
    Approved: 4,
    Rejected: 2,
    Closed: 0,
  };

  let caseCounter = 0;
  for (const [status, count] of Object.entries(statusDistribution)) {
    for (let i = 0; i < count; i++) {
      const hospitalIdx = caseCounter % hosp.length;
      const hospital = hosp[hospitalIdx];
      const caseObj = {
        caseNumber: `CASE-2024-${String(caseCounter + 1).padStart(5, '0')}`,
        hospitalId: hospital,
        bgrcCycleId: 'BGRC-2024-Q1',
        processType: getSeededElement(processTypes, seed),
        caseStatus: status,
        createdBy: null,
        createdAt: new Date(2024, 0, 1 + caseCounter),
        updatedAt: new Date(2024, 0, 1 + caseCounter),
        lastActionAt: new Date(2024, 0, 1 + caseCounter),
        submittedAt: status !== 'Draft' ? new Date(2024, 0, 1 + caseCounter) : null,
        reviewedAt: ['Under_Review', 'Approved', 'Rejected'].includes(status) ? new Date(2024, 0, 2 + caseCounter) : null,
        decisionAt: ['Approved', 'Rejected'].includes(status) ? new Date(2024, 0, 3 + caseCounter) : null,
      };
      cases.push(caseObj);
      casesByStatus[status as keyof typeof casesByStatus].push(caseObj);
      seed += 10;
      caseCounter++;
    }
  }

  return { cases, casesByStatus };
}

function generateBeneficiaryProfiles(casesList: any[]) {
  const profiles = [];
  let seed = 300;

  for (const caseObj of casesList) {
    const profile = {
      caseId: caseObj.caseNumber,
      babyName: getSeededElement(beneficiaryNames, seed),
      gender: getSeededElement(['Male', 'Female'], seed + 1),
      dob: new Date(2024, Math.floor(seededRandom(seed + 2) * 12), Math.floor(seededRandom(seed + 3) * 28) + 1),
      birthWeightKg: 1.5 + seededRandom(seed + 4) * 2.5,
      currentWeightKg: 2.0 + seededRandom(seed + 5) * 2.0,
      morbidity: getSeededElement(
        ['None', 'Respiratory distress', 'Sepsis', 'Birth asphyxia'],
        seed + 6
      ),
      mortality: seededRandom(seed + 7) > 0.95,
    };
    profiles.push(profile);
    seed += 10;
  }

  return profiles;
}

function generateFamilyProfiles(casesList: any[]) {
  const profiles = [];
  let seed = 400;

  for (const caseObj of casesList) {
    const profile = {
      caseId: caseObj.caseNumber,
      fatherName: `${getSeededElement(firstNames, seed)} ${getSeededElement(lastNames, seed + 1)}`,
      motherName: `${getSeededElement(firstNames, seed + 2)} ${getSeededElement(lastNames, seed + 3)}`,
      phone: `+91${String(Math.floor(seededRandom(seed + 4) * 9000000000 + 1000000000)).slice(0, 10)}`,
      address: `${Math.floor(seededRandom(seed + 5) * 1000)} Main Street`,
      city: getSeededElement(cities, seed + 6),
      state: getSeededElement(states, seed + 7),
      pincode: String(Math.floor(seededRandom(seed + 8) * 900000 + 100000)),
      incomeBand: getSeededElement(['< 1L', '1L - 5L', '5L - 10L', '> 10L'], seed + 9),
    };
    profiles.push(profile);
    seed += 10;
  }

  return profiles;
}

function generateClinicalDetails(casesList: any[]) {
  const details = [];
  let seed = 500;

  for (const caseObj of casesList) {
    const detail = {
      caseId: caseObj.caseNumber,
      diagnosis: getSeededElement(diagnoses, seed),
      summary: `Complex case requiring ${Math.floor(seededRandom(seed + 1) * 30 + 5)} days of NICU care`,
      doctorName: `Dr. ${getSeededElement(firstNames, seed + 2)} ${getSeededElement(lastNames, seed + 3)}`,
      nicuDays: Math.floor(seededRandom(seed + 4) * 60 + 3),
      admissionDate: caseObj.createdAt,
      dischargeDate: new Date(caseObj.createdAt.getTime() + Math.floor(seededRandom(seed + 5) * 60 + 3) * 24 * 60 * 60 * 1000),
    };
    details.push(detail);
    seed += 10;
  }

  return details;
}

function generateFinancialDetails(casesList: any[]) {
  const details = [];
  let seed = 600;

  for (const caseObj of casesList) {
    const nicuCost = Math.floor(seededRandom(seed) * 200000 + 50000);
    const pharmacyCost = Math.floor(seededRandom(seed + 1) * 30000 + 5000);
    const otherCharges = Math.floor(seededRandom(seed + 2) * 20000 + 5000);
    const totalBilled = nicuCost + pharmacyCost + otherCharges;
    const discount = Math.floor(seededRandom(seed + 3) * totalBilled * 0.2);
    const finalBillAmount = totalBilled - discount;

    const detail = {
      caseId: caseObj.caseNumber,
      nicuCost,
      pharmacyCost,
      otherCharges,
      totalBilled,
      discount,
      finalBillAmount,
      approvedAmount: ['Approved', 'Closed'].includes(caseObj.caseStatus)
        ? Math.floor(finalBillAmount * (0.5 + seededRandom(seed + 4) * 0.5))
        : null,
    };
    details.push(detail);
    seed += 10;
  }

  return details;
}

function generateDocuments(casesList: any[]) {
  const documents = [];
  let seed = 700;

  for (const caseObj of casesList) {
    const numDocs = Math.floor(seededRandom(seed) * 15 + 10);
    for (let i = 0; i < numDocs; i++) {
      const docType = docTypes[i % docTypes.length];
      const statusOpts =
        caseObj.caseStatus === 'Draft' || caseObj.caseStatus === 'Submitted'
          ? ['Missing', 'Uploaded']
          : caseObj.caseStatus === 'Rejected'
            ? ['Missing', 'Uploaded', 'Verified']
            : ['Missing', 'Uploaded', 'Verified'];

      const status = getSeededElement(statusOpts, seed + i);
      const doc = {
        caseId: caseObj.caseNumber,
        category: docType.category,
        docType: docType.type,
        fileName: `${docType.type}_${caseObj.caseNumber}.pdf`,
        fileType: 'application/pdf',
        size: Math.floor(seededRandom(seed + i + 100) * 5000000 + 100000),
        status,
        uploadedAt: status !== 'Missing' ? new Date(2024, 0, 2 + Math.floor(Math.random() * 10)) : null,
        uploadedBy: null,
        verifiedAt: status === 'Verified' ? new Date(2024, 0, 3 + Math.floor(Math.random() * 10)) : null,
        verifiedBy: null,
        notes: null,
        fileUrl: `https://storage.example.com/${docType.type}_${caseObj.caseNumber}.pdf`,
      };
      documents.push(doc);
      seed += 1;
    }
  }

  return documents;
}

function generateDocumentTemplates() {
  const templates = [];
  for (const processType of processTypes) {
    for (const docType of docTypes) {
      templates.push({
        processType,
        category: docType.category,
        docType: docType.type,
        mandatoryFlag: docType.mandatory,
        displayOrder: templates.length,
      });
    }
  }
  return templates;
}

function generateCommitteeReviews(casesList: any[], financialDetails: any[]) {
  const reviews = [];
  let seed = 800;

  for (const caseObj of casesList) {
    if (['Under_Review', 'Approved', 'Rejected'].includes(caseObj.caseStatus)) {
      const decisions = ['Approved', 'Rejected', 'Pending', 'Deferred'];
      const decision = getSeededElement(decisions, seed);

      const financialDetail = financialDetails.find((f) => f.caseId === caseObj.caseNumber);
      const approvedAmount =
        decision === 'Approved' && financialDetail
          ? Math.floor(financialDetail.finalBillAmount * (0.5 + seededRandom(seed + 1) * 0.5))
          : null;

      const review = {
        caseId: caseObj.caseNumber,
        reviewDate: caseObj.reviewedAt || new Date(),
        decision: caseObj.caseStatus === 'Rejected' ? 'Rejected' : decision,
        outcome: caseObj.caseStatus === 'Rejected' ? 'Rejected' : decision,
        amount_sanctioned: approvedAmount,
        approvedAmount,
        remarks: `Reviewed on ${new Date().toLocaleDateString()}`,
        reviewedBy: null,
        decisionDate: caseObj.decisionAt || new Date(),
        comments: `Committee decision: ${decision}`,
      };
      reviews.push(review);
      seed += 10;
    }
  }

  return reviews;
}

function generateFundingInstallments(casesList: any[], financialDetails: any[]) {
  const installments = [];
  let seed = 900;

  for (const caseObj of casesList) {
    if (caseObj.caseStatus === 'Approved') {
      const financialDetail = financialDetails.find((f) => f.caseId === caseObj.caseNumber);
      const approvedAmount = financialDetail?.approvedAmount || 0;

      if (approvedAmount > 0) {
        const numInstallments = Math.floor(seededRandom(seed) * 2 + 2);
        const installmentAmount = Math.floor(approvedAmount / numInstallments);

        for (let i = 0; i < numInstallments; i++) {
          const amount = i === numInstallments - 1 ? approvedAmount - installmentAmount * i : installmentAmount;
          const statuses = ['Planned', 'Requested', 'Paid'];
          const installment = {
            caseId: caseObj.caseNumber,
            label: `Installment ${i + 1}`,
            amount,
            dueDate: new Date(2024, i + 1, 15),
            status: getSeededElement(statuses, seed + i),
          };
          installments.push(installment);
        }
      }
      seed += 10;
    }
  }

  return installments;
}

function generateBeniPrograms(casesList: any[]) {
  const programs = [];
  let seed = 1000;

  for (const caseObj of casesList) {
    if (caseObj.caseStatus === 'Approved') {
      const program = {
        caseId: caseObj.caseNumber,
        beniTeamMember: null,
        hamperSentDate: new Date(2024, 2, 15),
        voiceNoteReceivedAt: seededRandom(seed) > 0.3 ? new Date(2024, 3, 20) : null,
        notes: 'BENI program initiated for approved case',
      };
      programs.push(program);
      seed += 10;
    }
  }

  return programs;
}

function generateFollowupMilestones(casesList: any[], clinicalDetails: any[]) {
  const milestones = [];
  let seed = 1100;
  const milestoneTimes = [3, 6, 9, 12, 18, 24];

  for (const caseObj of casesList) {
    if (caseObj.caseStatus === 'Approved') {
      const clinicalDetail = clinicalDetails.find((c) => c.caseId === caseObj.caseNumber);
      const baseDate = clinicalDetail?.dischargeDate || caseObj.createdAt;

      for (const months of milestoneTimes) {
        const dueDate = new Date(baseDate);
        dueDate.setMonth(dueDate.getMonth() + months);

        const milestone = {
          caseId: caseObj.caseNumber,
          milestoneMonths: months,
          dueDate,
          followupDate: seededRandom(seed) > 0.5 ? new Date(dueDate.getTime() + 86400000 * 5) : null,
          reachedFlag: seededRandom(seed + 1) > 0.3,
          completed: seededRandom(seed + 2) > 0.5,
        };
        milestones.push(milestone);
        seed += 1;
      }
      seed += 10;
    }
  }

  return milestones;
}

function generateFollowupMetricValues(milestones: any[]) {
  const values = [];
  let seed = 1200;

  for (const milestone of milestones) {
    if (seededRandom(seed) > 0.5) {
      const metricNames = [
        'Patient is alive and reachable',
        'Health status stable',
        'Currently employed or in school',
        'Quality of life assessment',
      ];

      for (const metricName of metricNames) {
        if (seededRandom(seed + 1) > 0.4) {
          const value = {
            caseId: milestone.caseId,
            milestoneMonths: milestone.milestoneMonths,
            metricName,
            valueText: getSeededElement(
              ['Good', 'Fair', 'Poor', 'Excellent', 'Stable'],
              seed + 2
            ),
            valueBoolean: seededRandom(seed + 3) > 0.5,
          };
          values.push(value);
        }
        seed += 5;
      }
    }
    seed += 10;
  }

  return values;
}

function generateRejectionReasons(casesList: any[]) {
  const reasons = [];
  let seed = 1300;

  for (const caseObj of casesList) {
    if (caseObj.caseStatus === 'Rejected') {
      const rejectionReason = getSeededElement(rejectionReasons, seed);
      const reason = {
        caseId: caseObj.caseNumber,
        rejectionDate: caseObj.decisionAt || new Date(),
        reasonCategory: rejectionReason.category,
        detailedReason: rejectionReason.reason,
        rejectedBy: null,
        rejectionLevel: getSeededElement(['NFI', 'BRC', 'BRRC', 'BGRC'], seed + 1),
        communicationStatus: getSeededElement(['Pending', 'Notified', 'Acknowledged'], seed + 2),
        referringHospital: caseObj.hospitalId.name,
        caseSummary: `Rejection of case ${caseObj.caseNumber} due to ${rejectionReason.reason.toLowerCase()}`,
      };
      reasons.push(reason);
      seed += 10;
    }
  }

  return reasons;
}

function generateAuditEvents(casesList: any[]) {
  const events = [];
  let seed = 1400;

  const actions = [
    'Case created',
    'Status changed to Submitted',
    'Document uploaded',
    'Document verified',
    'Committee review completed',
    'Decision made',
    'Case approved',
    'Funding approved',
    'Installment created',
    'Follow-up scheduled',
  ];

  for (const caseObj of casesList) {
    const numEvents = Math.floor(seededRandom(seed) * 10 + 5);
    for (let i = 0; i < numEvents; i++) {
      const event = {
        caseId: caseObj.caseNumber,
        timestamp: new Date(caseObj.createdAt.getTime() + i * 86400000 * 2),
        userId: null,
        userRole: getSeededElement(roles, seed + i),
        action: getSeededElement(actions, seed + i + 1),
        notes: `Audit entry for ${getSeededElement(actions, seed + i)}`,
      };
      events.push(event);
    }
    seed += 10;
  }

  return events;
}

export function generateSeedData() {
  const cases = generateCases(hospitals);
  const beneficiaryProfiles = generateBeneficiaryProfiles(cases.cases);
  const familyProfiles = generateFamilyProfiles(cases.cases);
  const clinicalDetails = generateClinicalDetails(cases.cases);
  const financialDetails = generateFinancialDetails(cases.cases);
  const documents = generateDocuments(cases.cases);
  const documentTemplates = generateDocumentTemplates();
  const committeeReviews = generateCommitteeReviews(cases.cases, financialDetails);
  const fundingInstallments = generateFundingInstallments(cases.cases, financialDetails);
  const beniPrograms = generateBeniPrograms(cases.cases);
  const followupMilestones = generateFollowupMilestones(cases.cases, clinicalDetails);
  const followupMetricValues = generateFollowupMetricValues(followupMilestones);
  const rejectionReasons = generateRejectionReasons(cases.cases);
  const auditEvents = generateAuditEvents(cases.cases);

  return {
    hospitals,
    users: generateUsers(),
    cases: cases.cases,
    beneficiaryProfiles,
    familyProfiles,
    clinicalDetails,
    financialDetails,
    documents,
    documentTemplates,
    committeeReviews,
    fundingInstallments,
    beniPrograms,
    followupMilestones,
    followupMetricValues,
    rejectionReasons,
    auditEvents,
  };
}
