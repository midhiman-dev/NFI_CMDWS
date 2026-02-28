import type { DataProvider, CaseWithDetails, CreateCasePayload, DocumentWithTemplate, ChecklistReadiness, VerificationRecord, CommitteeReviewRecord, InstallmentSummary, BeniProgramOpsData, HospitalProcessMapWithDetails } from './DataProvider';
import type { Hospital, User, ChildProfile, FamilyProfile, ClinicalCaseDetails, FinancialCaseDetails, DocumentMetadata, DocumentRequirementTemplate, DocumentStatus, CaseStatus, CommitteeOutcome, FundingInstallment, MonitoringVisit, FollowupMilestone, FollowupMetricDef, FollowupMetricValue, ReportTemplate, ReportRun, ReportRunStatus, KpiCatalog, DatasetRegistry, TemplateRegistry, TemplateBinding, IntakeFundApplication, IntakeInterimSummary, IntakeCompleteness, CaseSubmitReadiness, SettlementRecord } from '../../types';
import { caseService } from '../../services/caseService';
import { supabase } from '../../lib/supabase';
import { resolveDocTypeAlias } from '../../utils/docTypeMapping';

export class DbProvider implements DataProvider {
  async listCases(): Promise<CaseWithDetails[]> {
    const cases = await caseService.getCases();
    return cases.map(c => ({
      ...c,
      caseRef: c.caseNumber,
      intakeDate: c.createdAt,
    }));
  }

  async getCaseById(caseId: string): Promise<CaseWithDetails | null> {
    const caseData = await caseService.getCaseById(caseId);
    if (!caseData) return null;

    return {
      ...caseData,
      caseRef: caseData.caseNumber,
      intakeDate: caseData.createdAt,
    };
  }

  async getHospitals(): Promise<Hospital[]> {
    const hospitals = await caseService.getHospitals();
    return hospitals.map(h => ({
      hospitalId: h.hospitalId,
      name: h.name,
      city: h.city,
      state: h.state,
      spocName: h.contactPerson,
      spocPhone: h.phone,
      isActive: h.isActive,
    }));
  }

  async createCase(payload: CreateCasePayload): Promise<CaseWithDetails> {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('cases')
      .select('id', { count: 'exact', head: true });
    const nextNum = (count || 0) + 1;
    const caseNumber = `NFI/${payload.processType}/${year}/${String(nextNum).padStart(4, '0')}`;

    const { data: caseRow, error: caseError } = await supabase
      .from('cases')
      .insert({
        case_number: caseNumber,
        hospital_id: payload.hospitalId,
        process_type: payload.processType,
        case_status: payload.caseStatus,
        created_by: payload.createdBy || null,
        last_action_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (caseError) throw caseError;

    const caseId = caseRow.id;

    if (payload.beneficiaryName || payload.dob || payload.gender) {
      await supabase.from('beneficiary_profiles').insert({
        case_id: caseId,
        baby_name: payload.beneficiaryName || 'Unnamed',
        gender: payload.gender || 'Male',
        dob: payload.dob || null,
      }).then(r => { if (r.error) console.warn('beneficiary insert:', r.error); });
    }

    if (payload.motherName || payload.phone) {
      await supabase.from('family_profiles').insert({
        case_id: caseId,
        father_name: payload.fatherName || null,
        mother_name: payload.motherName || 'Unknown',
        phone: payload.phone || null,
        address: payload.address || null,
        city: payload.city || null,
        state: payload.state || null,
        pincode: payload.pincode || null,
      }).then(r => { if (r.error) console.warn('family insert:', r.error); });
    }

    if (payload.diagnosis || payload.summary) {
      await supabase.from('clinical_case_details').insert({
        case_id: caseId,
        diagnosis: payload.diagnosis || null,
        summary: payload.summary || null,
      }).then(r => { if (r.error) console.warn('clinical insert:', r.error); });
    }

    if (payload.estimateAmount) {
      await supabase.from('financial_case_details').insert({
        case_id: caseId,
        estimate_amount: payload.estimateAmount,
      }).then(r => { if (r.error) console.warn('financial insert:', r.error); });
    }

    const hospitals = await this.getHospitals();
    const hospital = hospitals.find(h => h.hospitalId === payload.hospitalId);

    return {
      caseId,
      caseRef: caseNumber,
      processType: payload.processType,
      hospitalId: payload.hospitalId,
      hospitalName: hospital?.name || 'Unknown',
      caseStatus: payload.caseStatus,
      intakeDate: payload.intakeDate,
      createdBy: payload.createdBy,
      updatedAt: caseRow.updated_at,
      lastActionAt: caseRow.last_action_at,
      childName: payload.beneficiaryName,
      beneficiaryNo: payload.beneficiaryNo,
    };
  }

  async listCaseDocuments(caseId: string): Promise<DocumentWithTemplate[]> {
    const docs = await caseService.getDocuments(caseId);
    const templates = await caseService.getDocumentTemplates();

    return docs.map(doc => {
      const resolved = resolveDocTypeAlias(doc.docType, doc.category);
      const template = templates.find(t => t.doc_type === resolved.docType);
      return {
        ...doc,
        docType: resolved.docType,
        category: resolved.category,
        mandatoryFlag: template?.mandatory_flag,
        conditionNotes: template?.condition_notes,
      };
    });
  }

  async ensureDocumentChecklist(caseId: string, processType: string): Promise<void> {
    const docs = await caseService.getDocuments(caseId);
    if (docs.length === 0 && processType) {
      const templates = await caseService.getDocumentTemplates();
      const processTemplates = templates.filter(t => t.process_type === processType);

      for (const template of processTemplates) {
        const exists = docs.some(d => d.docType === template.doc_type);
        if (!exists) {
          await caseService.updateDocument('', {
            status: 'Missing',
          }).catch(() => {});
        }
      }
    }
  }

  async updateDocumentStatus(documentId: string, status: DocumentStatus, notes?: string): Promise<void> {
    await caseService.updateDocument(documentId, {
      status,
      notes: notes !== undefined ? notes : undefined,
    });
  }

  async updateDocumentNotes(documentId: string, notes: string): Promise<void> {
    await caseService.updateDocument(documentId, {
      notes,
    });
  }

  async uploadDocument(caseId: string, documentId: string, fileMetadata: {
    fileName: string;
    fileType: string;
    size: number;
  }): Promise<void> {
    await caseService.updateDocument(documentId, {
      fileName: fileMetadata.fileName,
      fileType: fileMetadata.fileType,
      size: fileMetadata.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: 'user-id',
      status: 'Uploaded',
    });
  }

  async getDocumentTemplates(processType: string): Promise<DocumentRequirementTemplate[]> {
    const templates = await caseService.getDocumentTemplates();
    return templates
      .filter((t: any) => t.process_type === processType)
      .map((t: any) => ({
        templateId: t.id,
        processType: t.process_type,
        category: t.category,
        docType: t.doc_type,
        mandatoryFlag: t.mandatory_flag,
        conditionNotes: t.condition_notes,
      }));
  }

  async getChecklistReadiness(caseId: string): Promise<ChecklistReadiness> {
    const docs = await this.listCaseDocuments(caseId);
    const mandatoryDocs = docs.filter(d => d.mandatoryFlag);
    const mandatoryComplete = mandatoryDocs.filter(
      d => d.status === 'Verified' || d.status === 'Not_Applicable'
    ).length;
    const blockingDocs = mandatoryDocs.filter(
      d => d.status !== 'Verified' && d.status !== 'Not_Applicable'
    );

    return {
      mandatoryTotal: mandatoryDocs.length,
      mandatoryComplete,
      blockingDocs,
      isReady: blockingDocs.length === 0 && mandatoryDocs.length > 0,
    };
  }

  async getVerification(caseId: string): Promise<VerificationRecord | null> {
    try {
      const verification = await caseService.getVerification(caseId);
      if (!verification) return null;
      return {
        verificationId: verification.id,
        caseId,
        recommendation: verification.recommendation,
        notes: verification.notes,
        verifiedBy: verification.verified_by,
        verifiedAt: verification.verified_at,
      };
    } catch {
      return null;
    }
  }

  async submitVerification(caseId: string, data: {
    recommendation: 'Proceed' | 'Return' | 'Hold';
    notes: string;
    verifiedBy: string;
  }): Promise<void> {
    await caseService.updateVerification(caseId, {
      recommendation: data.recommendation,
      notes: data.notes,
      verified_by: data.verifiedBy,
      verified_at: new Date().toISOString(),
    });
  }

  async returnToHospital(caseId: string, data: {
    reason: string;
    comment: string;
  }): Promise<void> {
    await this.updateCaseStatus(caseId, 'Returned');
  }

  async sendToCommittee(caseId: string, data: {
    comment: string;
  }): Promise<void> {
    await this.updateCaseStatus(caseId, 'Under_Review');
  }

  async getCommitteeReview(caseId: string): Promise<CommitteeReviewRecord | null> {
    try {
      const review = await caseService.getCommitteeReview(caseId);
      if (!review) return null;
      return {
        reviewId: review.id,
        caseId,
        outcome: review.outcome,
        approvedAmount: review.approved_amount,
        comments: review.comments,
        decidedBy: review.decided_by,
        decidedAt: review.decided_at,
      };
    } catch {
      return null;
    }
  }

  async submitCommitteeDecision(caseId: string, data: {
    outcome: CommitteeOutcome;
    approvedAmount?: number;
    comments: string;
    decidedBy: string;
  }): Promise<void> {
    await caseService.updateCommitteeDecision(caseId, {
      outcome: data.outcome,
      approved_amount: data.approvedAmount,
      comments: data.comments,
      decided_by: data.decidedBy,
      decided_at: new Date().toISOString(),
    });

    let caseStatus: CaseStatus = 'Under_Review';
    if (data.outcome === 'Approved') {
      caseStatus = 'Approved';
    } else if (data.outcome === 'Rejected') {
      caseStatus = 'Rejected';
    } else if (data.outcome === 'Need_More_Info') {
      caseStatus = 'Returned';
    }

    await this.updateCaseStatus(caseId, caseStatus);
  }

  async updateCaseStatus(caseId: string, status: CaseStatus): Promise<void> {
    await caseService.updateCaseStatus(caseId, status);
  }

  async listInstallments(caseId: string): Promise<FundingInstallment[]> {
    try {
      const installments = await caseService.getInstallments(caseId);
      return installments || [];
    } catch {
      return [];
    }
  }

  async createInstallment(caseId: string, payload: Omit<FundingInstallment, 'installmentId' | 'caseId' | 'updatedAt'>): Promise<FundingInstallment> {
    return caseService.createInstallment(caseId, payload);
  }

  async updateInstallment(installmentId: string, patch: Partial<Omit<FundingInstallment, 'installmentId' | 'caseId'>>): Promise<FundingInstallment> {
    return caseService.updateInstallment(installmentId, patch);
  }

  async deleteInstallment(installmentId: string): Promise<void> {
    await caseService.deleteInstallment(installmentId);
  }

  async getInstallmentSummary(caseId: string): Promise<InstallmentSummary> {
    const caseData = await this.getCaseById(caseId);
    const installments = await this.listInstallments(caseId);

    const totalApproved = caseData?.approvedAmount || 0;
    const totalPlanned = installments.reduce((sum, i) => sum + i.amount, 0);
    const totalPaid = installments
      .filter(i => i.status === 'Disbursed')
      .reduce((sum, i) => sum + i.amount, 0);
    const balance = totalApproved - totalPaid;

    return { totalApproved, totalPlanned, totalPaid, balance };
  }

  async listMonitoringVisits(caseId: string): Promise<MonitoringVisit[]> {
    return [];
  }

  async createMonitoringVisit(caseId: string, payload: Omit<MonitoringVisit, 'visitId' | 'caseId' | 'createdAt' | 'updatedAt'>): Promise<MonitoringVisit> {
    throw new Error('Not implemented');
  }

  async updateMonitoringVisit(visitId: string, patch: Partial<Omit<MonitoringVisit, 'visitId' | 'caseId' | 'createdAt'>>): Promise<MonitoringVisit> {
    throw new Error('Not implemented');
  }

  async deleteMonitoringVisit(visitId: string): Promise<void> {
    return;
  }

  async listFollowupMilestones(caseId: string): Promise<FollowupMilestone[]> {
    return [];
  }

  async ensureFollowupMilestones(caseId: string, anchorDate: string): Promise<FollowupMilestone[]> {
    return [];
  }

  async listFollowupMetricDefs(milestoneMonths: number): Promise<FollowupMetricDef[]> {
    return [];
  }

  async saveFollowupMetricValues(caseId: string, milestoneMonths: number, values: Omit<FollowupMetricValue, 'valueId'>[]): Promise<void> {
    return;
  }

  async getFollowupMetricValues(caseId: string, milestoneMonths: number): Promise<FollowupMetricValue[]> {
    return [];
  }

  async setFollowupDate(caseId: string, milestoneMonths: number, followupDate: string, notes?: string): Promise<void> {
    return;
  }

  async listVolunteers(): Promise<User[]> {
    try {
      const volunteers = await caseService.getVolunteerUsers();
      return volunteers.map(v => ({
        userId: v.userId,
        username: v.email?.split('@')[0] || v.userId,
        fullName: v.fullName,
        email: v.email || '',
        roles: ['beni_volunteer' as const],
        isActive: true,
      }));
    } catch {
      return [];
    }
  }

  async getClinicalDetails(caseId: string): Promise<ClinicalCaseDetails | null> {
    try {
      return await caseService.getClinicalDetails(caseId);
    } catch {
      return null;
    }
  }

  async updateClinicalDates(caseId: string, dates: { admissionDate?: string; dischargeDate?: string }): Promise<void> {
    const dbUpdates: Record<string, string | null> = {};
    if (dates.admissionDate !== undefined) dbUpdates.admission_date = dates.admissionDate || null;
    if (dates.dischargeDate !== undefined) dbUpdates.discharge_date = dates.dischargeDate || null;
    dbUpdates.updated_at = new Date().toISOString();

    const { data: existing } = await supabase
      .from('clinical_case_details')
      .select('case_id')
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('clinical_case_details')
        .update(dbUpdates)
        .eq('case_id', caseId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('clinical_case_details')
        .insert({ case_id: caseId, ...dbUpdates });
      if (error) throw error;
    }
  }

  async getBeniProgramOps(caseId: string): Promise<BeniProgramOpsData | null> {
    try {
      const ops = await caseService.getBeniProgramOps(caseId);
      if (!ops) return null;
      return {
        opsId: ops.opsId,
        caseId: ops.caseId,
        beniTeamMember: ops.beniTeamMember,
        beniTeamMemberName: ops.beniTeamMemberName,
        hamperSentDate: ops.hamperSentDate,
        voiceNoteReceivedAt: ops.voiceNoteReceivedAt,
        notes: ops.notes,
      };
    } catch {
      return null;
    }
  }

  async saveBeniProgramOps(caseId: string, ops: Omit<BeniProgramOpsData, 'opsId' | 'caseId' | 'beniTeamMemberName'>): Promise<void> {
    await caseService.saveBeniProgramOps(caseId, {
      beniTeamMember: ops.beniTeamMember,
      hamperSentDate: ops.hamperSentDate,
      voiceNoteReceivedAt: ops.voiceNoteReceivedAt,
      notes: ops.notes,
    });
  }

  async getBeneficiary(caseId: string): Promise<ChildProfile | null> {
    try {
      const { data, error } = await supabase.from('beneficiary_profiles').select('*').eq('case_id', caseId).maybeSingle();
      if (error || !data) return null;
      return {
        caseId: data.case_id, beneficiaryNo: data.beneficiary_no, beneficiaryName: data.baby_name,
        gender: data.gender, dob: data.dob, admissionDate: data.admission_date || '',
        gestationalAgeWeeks: data.gestational_age_weeks, birthWeightKg: data.birth_weight_kg,
        currentWeightKg: data.current_weight_kg, morbidity: data.morbidity, mortality: data.mortality,
      };
    } catch { return null; }
  }

  async upsertBeneficiary(caseId: string, data: Partial<Omit<ChildProfile, 'caseId'>>): Promise<void> {
    const row: Record<string, unknown> = { case_id: caseId, updated_at: new Date().toISOString() };
    if (data.beneficiaryName !== undefined) row.baby_name = data.beneficiaryName;
    if (data.beneficiaryNo !== undefined) row.beneficiary_no = data.beneficiaryNo;
    if (data.gender !== undefined) row.gender = data.gender;
    if (data.dob !== undefined) row.dob = data.dob;
    if (data.admissionDate !== undefined) row.admission_date = data.admissionDate;
    if (data.gestationalAgeWeeks !== undefined) row.gestational_age_weeks = data.gestationalAgeWeeks;
    if (data.birthWeightKg !== undefined) row.birth_weight_kg = data.birthWeightKg;
    if (data.currentWeightKg !== undefined) row.current_weight_kg = data.currentWeightKg;
    if (data.morbidity !== undefined) row.morbidity = data.morbidity;
    const { data: existing } = await supabase.from('beneficiary_profiles').select('case_id').eq('case_id', caseId).maybeSingle();
    if (existing) { await supabase.from('beneficiary_profiles').update(row).eq('case_id', caseId); }
    else { await supabase.from('beneficiary_profiles').insert(row); }
  }

  async getFamily(caseId: string): Promise<FamilyProfile | null> {
    try {
      const { data, error } = await supabase.from('family_profiles').select('*').eq('case_id', caseId).maybeSingle();
      if (error || !data) return null;
      return {
        caseId: data.case_id, fatherName: data.father_name, motherName: data.mother_name,
        phone: data.phone, whatsapp: data.whatsapp, email: data.email, address: data.address,
        city: data.city, state: data.state, pincode: data.pincode,
        aadhaarLast4: data.aadhaar_last4, incomeBand: data.income_band,
      };
    } catch { return null; }
  }

  async upsertFamily(caseId: string, data: Partial<Omit<FamilyProfile, 'caseId'>>): Promise<void> {
    const row: Record<string, unknown> = { case_id: caseId, updated_at: new Date().toISOString() };
    if (data.motherName !== undefined) row.mother_name = data.motherName;
    if (data.fatherName !== undefined) row.father_name = data.fatherName;
    if (data.phone !== undefined) row.phone = data.phone;
    if (data.whatsapp !== undefined) row.whatsapp = data.whatsapp;
    if (data.email !== undefined) row.email = data.email;
    if (data.address !== undefined) row.address = data.address;
    if (data.city !== undefined) row.city = data.city;
    if (data.state !== undefined) row.state = data.state;
    if (data.pincode !== undefined) row.pincode = data.pincode;
    if (data.aadhaarLast4 !== undefined) row.aadhaar_last4 = data.aadhaarLast4;
    if (data.incomeBand !== undefined) row.income_band = data.incomeBand;
    const { data: existing } = await supabase.from('family_profiles').select('case_id').eq('case_id', caseId).maybeSingle();
    if (existing) { await supabase.from('family_profiles').update(row).eq('case_id', caseId); }
    else { await supabase.from('family_profiles').insert(row); }
  }

  async upsertClinical(caseId: string, data: Partial<Omit<ClinicalCaseDetails, 'caseId'>>): Promise<void> {
    const row: Record<string, unknown> = { case_id: caseId, updated_at: new Date().toISOString() };
    if (data.diagnosis !== undefined) row.diagnosis = data.diagnosis;
    if (data.summary !== undefined) row.summary = data.summary;
    if (data.doctorName !== undefined) row.doctor_name = data.doctorName;
    if (data.nicuDays !== undefined) row.nicu_days = data.nicuDays;
    if (data.admissionDate !== undefined) row.admission_date = data.admissionDate;
    if (data.dischargeDate !== undefined) row.discharge_date = data.dischargeDate;
    if (data.currentStatus !== undefined) row.current_status = data.currentStatus;
    if (data.complications !== undefined) row.complications = data.complications;
    const { data: existing } = await supabase.from('clinical_case_details').select('case_id').eq('case_id', caseId).maybeSingle();
    if (existing) { await supabase.from('clinical_case_details').update(row).eq('case_id', caseId); }
    else { await supabase.from('clinical_case_details').insert(row); }
  }

  async getFinancial(caseId: string): Promise<FinancialCaseDetails | null> {
    try {
      const { data, error } = await supabase.from('financial_case_details').select('*').eq('case_id', caseId).maybeSingle();
      if (error || !data) return null;
      return {
        caseId: data.case_id, estimateAmount: data.estimate_amount || 0,
        approvedAmount: data.approved_amount, finalBillAmount: data.final_bill_amount,
        hospitalDiscount: data.hospital_discount, govtSchemeContribution: data.govt_scheme_contribution,
        insuranceAmount: data.insurance_amount, nfiRequestedAmount: data.nfi_requested_amount,
        nfiApprovedAmount: data.nfi_approved_amount, paymentMethod: data.payment_method,
      };
    } catch { return null; }
  }

  async upsertFinancial(caseId: string, data: Partial<Omit<FinancialCaseDetails, 'caseId'>>): Promise<void> {
    const row: Record<string, unknown> = { case_id: caseId, updated_at: new Date().toISOString() };
    if (data.estimateAmount !== undefined) row.estimate_amount = data.estimateAmount;
    if (data.approvedAmount !== undefined) row.approved_amount = data.approvedAmount;
    if (data.finalBillAmount !== undefined) row.final_bill_amount = data.finalBillAmount;
    if (data.hospitalDiscount !== undefined) row.hospital_discount = data.hospitalDiscount;
    if (data.govtSchemeContribution !== undefined) row.govt_scheme_contribution = data.govtSchemeContribution;
    if (data.insuranceAmount !== undefined) row.insurance_amount = data.insuranceAmount;
    if (data.nfiRequestedAmount !== undefined) row.nfi_requested_amount = data.nfiRequestedAmount;
    if (data.nfiApprovedAmount !== undefined) row.nfi_approved_amount = data.nfiApprovedAmount;
    if (data.paymentMethod !== undefined) row.payment_method = data.paymentMethod;
    const { data: existing } = await supabase.from('financial_case_details').select('case_id').eq('case_id', caseId).maybeSingle();
    if (existing) { await supabase.from('financial_case_details').update(row).eq('case_id', caseId); }
    else { await supabase.from('financial_case_details').insert(row); }
  }

  async simulateMandatoryDocs(caseId: string, options?: { autoVerify?: boolean }): Promise<number> {
    const docs = await this.listCaseDocuments(caseId);
    const targetStatus = options?.autoVerify ? 'Verified' : 'Uploaded';
    let count = 0;

    for (const doc of docs) {
      if (!doc.mandatoryFlag) continue;
      if (doc.status === 'Verified' || doc.status === 'Not_Applicable') continue;
      if (doc.status === targetStatus && !options?.autoVerify) continue;

      const updates: Partial<DocumentMetadata> = {
        status: targetStatus as any,
      };

      if (doc.status === 'Missing' || doc.status === 'Rejected') {
        updates.fileName = `${doc.docType.replace(/\s+/g, '_')}_simulated.pdf`;
        updates.fileType = 'application/pdf';
        updates.size = Math.floor(200 * 1024 + Math.random() * 1300 * 1024);
        updates.uploadedAt = new Date().toISOString();
        updates.uploadedBy = 'Demo Simulation';
      }

      await caseService.updateDocument(doc.docId, updates);
      count++;
    }

    return count;
  }

  async listHospitalProcessMaps(): Promise<HospitalProcessMapWithDetails[]> {
    const { data, error } = await supabase
      .from('hospital_process_maps')
      .select(`
        id,
        hospital_id,
        process_type,
        is_active,
        effective_from_date,
        updated_at,
        hospital:hospitals(name)
      `)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      mapId: row.id,
      hospitalId: row.hospital_id,
      hospitalName: row.hospital?.name || '',
      processType: row.process_type,
      isActive: row.is_active,
      effectiveFromDate: row.effective_from_date,
      updatedAt: row.updated_at,
    }));
  }

  async createHospitalProcessMap(data: {
    hospitalId: string;
    processType: string;
    isActive: boolean;
    effectiveFromDate: string;
  }): Promise<HospitalProcessMapWithDetails> {
    const { data: row, error } = await supabase
      .from('hospital_process_maps')
      .insert({
        hospital_id: data.hospitalId,
        process_type: data.processType,
        is_active: data.isActive,
        effective_from_date: data.effectiveFromDate,
      })
      .select(`
        id,
        hospital_id,
        process_type,
        is_active,
        effective_from_date,
        updated_at,
        hospital:hospitals(name)
      `)
      .single();

    if (error) throw error;

    return {
      mapId: row.id,
      hospitalId: row.hospital_id,
      hospitalName: row.hospital?.name || '',
      processType: row.process_type,
      isActive: row.is_active,
      effectiveFromDate: row.effective_from_date,
      updatedAt: row.updated_at,
    };
  }

  async updateHospitalProcessMap(mapId: string, data: {
    processType?: string;
    isActive?: boolean;
    effectiveFromDate?: string;
  }): Promise<HospitalProcessMapWithDetails> {
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.processType) updates.process_type = data.processType;
    if (data.isActive !== undefined) updates.is_active = data.isActive;
    if (data.effectiveFromDate) updates.effective_from_date = data.effectiveFromDate;

    const { data: row, error } = await supabase
      .from('hospital_process_maps')
      .update(updates)
      .eq('id', mapId)
      .select(`
        id,
        hospital_id,
        process_type,
        is_active,
        effective_from_date,
        updated_at,
        hospital:hospitals(name)
      `)
      .single();

    if (error) throw error;

    return {
      mapId: row.id,
      hospitalId: row.hospital_id,
      hospitalName: row.hospital?.name || '',
      processType: row.process_type,
      isActive: row.is_active,
      effectiveFromDate: row.effective_from_date,
      updatedAt: row.updated_at,
    };
  }

  async deleteHospitalProcessMap(mapId: string): Promise<void> {
    const { error } = await supabase
      .from('hospital_process_maps')
      .delete()
      .eq('id', mapId);

    if (error) throw error;
  }

  async listReportTemplates(): Promise<ReportTemplate[]> {
    const { data, error } = await supabase
      .from('report_templates')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return (data || []).map(row => ({
      templateId: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      version: row.version,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async listReportRuns(templateId?: string, limit = 50): Promise<ReportRun[]> {
    let query = supabase
      .from('report_runs')
      .select(`
        id,
        template_id,
        status,
        filters,
        data_as_of,
        generated_at,
        created_by,
        created_at,
        updated_at,
        template:report_templates(code, name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      runId: row.id,
      templateId: row.template_id,
      templateCode: row.template?.code,
      templateName: row.template?.name,
      status: row.status,
      filters: row.filters,
      dataAsOf: row.data_as_of,
      generatedAt: row.generated_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createReportRun(data: {
    templateId: string;
    templateCode?: string;
    templateName?: string;
    filters?: any;
    dataAsOf?: Date;
  }): Promise<any> {
    const dataAsOfStr = data.dataAsOf
      ? new Date(data.dataAsOf).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const { data: row, error } = await supabase
      .from('report_runs')
      .insert({
        template_id: data.templateId,
        status: 'Succeeded',
        filters: data.filters || {},
        data_as_of: dataAsOfStr,
        generated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;

    return {
      runId: row.id,
      templateId: row.template_id,
      templateCode: data.templateCode,
      templateName: data.templateName,
      status: row.status,
      filters: row.filters,
      dataAsOf: row.data_as_of,
      generatedAt: row.generated_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateReportRunStatus(runId: string, status: ReportRunStatus, dataAsOf?: string): Promise<ReportRun> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'Succeeded') {
      updates.generated_at = new Date().toISOString();
    }

    if (dataAsOf) {
      updates.data_as_of = dataAsOf;
    }

    const { data: row, error } = await supabase
      .from('report_runs')
      .update(updates)
      .eq('id', runId)
      .select(`
        id,
        template_id,
        status,
        filters,
        data_as_of,
        generated_at,
        created_by,
        created_at,
        updated_at,
        template:report_templates(code, name)
      `)
      .single();

    if (error) throw error;

    return {
      runId: row.id,
      templateId: row.template_id,
      templateCode: row.template?.code,
      templateName: row.template?.name,
      status: row.status,
      filters: row.filters,
      dataAsOf: row.data_as_of,
      generatedAt: row.generated_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getDonationsLedger(): Promise<any[]> {
    const { data, error } = await supabase
      .from('donations_ledger_entries')
      .select('*')
      .order('entry_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      entry_date: row.entry_date,
      donor_name: row.donor_name,
      amount: row.amount,
      category: row.category,
      notes: row.notes,
    }));
  }

  async createDonationEntry(data: any): Promise<any> {
    const { data: row, error } = await supabase
      .from('donations_ledger_entries')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async updateDonationEntry(id: string, data: any): Promise<any> {
    const { data: row, error } = await supabase
      .from('donations_ledger_entries')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async deleteDonationEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('donations_ledger_entries')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getBankBalanceSnapshots(): Promise<any[]> {
    const { data, error } = await supabase
      .from('bank_fd_balance_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      snapshot_date: row.snapshot_date,
      account_name: row.account_name,
      account_number: row.account_number,
      balance: row.balance,
      account_type: row.account_type,
      notes: row.notes,
    }));
  }

  async createBankSnapshot(data: any): Promise<any> {
    const { data: row, error } = await supabase
      .from('bank_fd_balance_snapshots')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async updateBankSnapshot(id: string, data: any): Promise<any> {
    const { data: row, error } = await supabase
      .from('bank_fd_balance_snapshots')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async deleteBankSnapshot(id: string): Promise<void> {
    const { error } = await supabase
      .from('bank_fd_balance_snapshots')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getExpenseTransactions(): Promise<any[]> {
    const { data, error } = await supabase
      .from('expense_transactions')
      .select('*')
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      transaction_date: row.transaction_date,
      description: row.description,
      amount: row.amount,
      category: row.category,
      approved_by: row.approved_by,
      notes: row.notes,
    }));
  }

  async createExpenseTransaction(data: any): Promise<any> {
    const { data: row, error } = await supabase
      .from('expense_transactions')
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async updateExpenseTransaction(id: string, data: any): Promise<any> {
    const { data: row, error } = await supabase
      .from('expense_transactions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return row;
  }

  async deleteExpenseTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('expense_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async listKpiCatalog(): Promise<KpiCatalog[]> {
    const { data, error } = await supabase
      .from('kpi_catalog')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      dataType: row.data_type,
      calculationMethod: row.calculation_method,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createKpi(data: Omit<KpiCatalog, 'id' | 'createdAt' | 'updatedAt'>): Promise<KpiCatalog> {
    const { data: row, error } = await supabase
      .from('kpi_catalog')
      .insert({
        code: data.code,
        name: data.name,
        description: data.description,
        data_type: data.dataType,
        calculation_method: data.calculationMethod,
        is_active: data.isActive,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      dataType: row.data_type,
      calculationMethod: row.calculation_method,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateKpi(id: string, data: Partial<Omit<KpiCatalog, 'id' | 'createdAt'>>): Promise<KpiCatalog> {
    const { data: row, error } = await supabase
      .from('kpi_catalog')
      .update({
        code: data.code,
        name: data.name,
        description: data.description,
        data_type: data.dataType,
        calculation_method: data.calculationMethod,
        is_active: data.isActive,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      dataType: row.data_type,
      calculationMethod: row.calculation_method,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async deleteKpi(id: string): Promise<void> {
    const { error } = await supabase
      .from('kpi_catalog')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async listDatasetRegistry(): Promise<DatasetRegistry[]> {
    const { data, error } = await supabase
      .from('dataset_registry')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      sourceTable: row.source_table,
      refreshFrequency: row.refresh_frequency,
      lastRefreshed: row.last_refreshed,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createDataset(data: Omit<DatasetRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatasetRegistry> {
    const { data: row, error } = await supabase
      .from('dataset_registry')
      .insert({
        code: data.code,
        name: data.name,
        description: data.description,
        source_table: data.sourceTable,
        refresh_frequency: data.refreshFrequency,
        is_active: data.isActive,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      sourceTable: row.source_table,
      refreshFrequency: row.refresh_frequency,
      lastRefreshed: row.last_refreshed,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateDataset(id: string, data: Partial<Omit<DatasetRegistry, 'id' | 'createdAt'>>): Promise<DatasetRegistry> {
    const { data: row, error } = await supabase
      .from('dataset_registry')
      .update({
        code: data.code,
        name: data.name,
        description: data.description,
        source_table: data.sourceTable,
        refresh_frequency: data.refreshFrequency,
        is_active: data.isActive,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      sourceTable: row.source_table,
      refreshFrequency: row.refresh_frequency,
      lastRefreshed: row.last_refreshed,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async deleteDataset(id: string): Promise<void> {
    const { error } = await supabase
      .from('dataset_registry')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async listTemplateRegistry(): Promise<TemplateRegistry[]> {
    const { data, error } = await supabase
      .from('template_registry')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      templateType: row.template_type,
      version: row.version,
      config: row.config,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createTemplate(data: Omit<TemplateRegistry, 'id' | 'createdAt' | 'updatedAt'>): Promise<TemplateRegistry> {
    const { data: row, error } = await supabase
      .from('template_registry')
      .insert({
        code: data.code,
        name: data.name,
        description: data.description,
        template_type: data.templateType,
        version: data.version,
        config: data.config || {},
        is_active: data.isActive,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      templateType: row.template_type,
      version: row.version,
      config: row.config,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateTemplate(id: string, data: Partial<Omit<TemplateRegistry, 'id' | 'createdAt'>>): Promise<TemplateRegistry> {
    const { data: row, error } = await supabase
      .from('template_registry')
      .update({
        code: data.code,
        name: data.name,
        description: data.description,
        template_type: data.templateType,
        version: data.version,
        config: data.config,
        is_active: data.isActive,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      templateType: row.template_type,
      version: row.version,
      config: row.config,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async deleteTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('template_registry')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async listTemplateBindings(templateId?: string): Promise<TemplateBinding[]> {
    let query = supabase
      .from('template_bindings')
      .select('*');

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    const { data, error } = await query.order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
      id: row.id,
      templateId: row.template_id,
      kpiId: row.kpi_id,
      datasetId: row.dataset_id,
      fieldName: row.field_name,
      mappingConfig: row.mapping_config,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async createTemplateBinding(data: Omit<TemplateBinding, 'id' | 'createdAt' | 'updatedAt'>): Promise<TemplateBinding> {
    const { data: row, error } = await supabase
      .from('template_bindings')
      .insert({
        template_id: data.templateId,
        kpi_id: data.kpiId,
        dataset_id: data.datasetId,
        field_name: data.fieldName,
        mapping_config: data.mappingConfig || {},
        sort_order: data.sortOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: row.id,
      templateId: row.template_id,
      kpiId: row.kpi_id,
      datasetId: row.dataset_id,
      fieldName: row.field_name,
      mappingConfig: row.mapping_config,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async updateTemplateBinding(id: string, data: Partial<Omit<TemplateBinding, 'id' | 'createdAt'>>): Promise<TemplateBinding> {
    const { data: row, error } = await supabase
      .from('template_bindings')
      .update({
        kpi_id: data.kpiId,
        dataset_id: data.datasetId,
        field_name: data.fieldName,
        mapping_config: data.mappingConfig,
        sort_order: data.sortOrder,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      id: row.id,
      templateId: row.template_id,
      kpiId: row.kpi_id,
      datasetId: row.dataset_id,
      fieldName: row.field_name,
      mappingConfig: row.mapping_config,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async deleteTemplateBinding(id: string): Promise<void> {
    const { error } = await supabase
      .from('template_bindings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async listReportRunsWithDetails(templateId?: string, limit?: number): Promise<ReportRun[]> {
    let query = supabase
      .from('report_runs')
      .select(`
        *,
        report_templates(code, name)
      `);

    if (templateId) {
      query = query.eq('template_id', templateId);
    }

    query = query.order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map((row: any) => ({
      runId: row.id,
      templateId: row.template_id,
      templateCode: row.report_templates?.code,
      templateName: row.report_templates?.name,
      status: row.status,
      filters: row.filters,
      dataAsOf: row.data_as_of,
      generatedAt: row.generated_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      errorMessage: row.error_message,
    }));
  }

  async updateReportRunWithError(runId: string, status: ReportRunStatus, errorMessage?: string): Promise<ReportRun> {
    const updateData: any = { status };
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    if (status === 'Succeeded' || status === 'Failed') {
      updateData.generated_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('report_runs')
      .update(updateData)
      .eq('id', runId)
      .select(`
        *,
        report_templates(code, name)
      `)
      .single();

    if (error) throw error;
    return {
      runId: data.id,
      templateId: data.template_id,
      templateCode: data.report_templates?.code,
      templateName: data.report_templates?.name,
      status: data.status,
      filters: data.filters,
      dataAsOf: data.data_as_of,
      generatedAt: data.generated_at,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      errorMessage: data.error_message,
    };
  }

  async getIntakeData(caseId: string): Promise<{ fundApplication?: IntakeFundApplication; interimSummary?: IntakeInterimSummary }> {
    try {
      const { data, error } = await supabase
        .from('case_intake')
        .select('fund_application, interim_summary')
        .eq('case_id', caseId)
        .maybeSingle();

      if (error) {
        console.warn('Failed to load intake data:', error);
        return {};
      }
      if (!data) return {};
      return {
        fundApplication: data.fund_application,
        interimSummary: data.interim_summary,
      };
    } catch (e) {
      console.warn('Failed to load intake data:', e);
      return {};
    }
  }

  async saveIntakeData(caseId: string, fundApplication?: IntakeFundApplication, interimSummary?: IntakeInterimSummary): Promise<void> {
    try {
      const { data: existing } = await supabase
        .from('case_intake')
        .select('id')
        .eq('case_id', caseId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('case_intake')
          .update({
            fund_application: fundApplication,
            interim_summary: interimSummary,
            updated_at: new Date().toISOString(),
          })
          .eq('case_id', caseId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('case_intake')
          .insert({
            case_id: caseId,
            fund_application: fundApplication,
            interim_summary: interimSummary,
            updated_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
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
          missingSections.push(`Fund Application → ${this.formatSectionName(sectionKey)}`);
        }
      });
    }

    if (!completeness.interimSummaryIsComplete) {
      Object.entries(completeness.interimSummarySections).forEach(([sectionKey, isComplete]) => {
        if (!isComplete) {
          missingSections.push(`Interim Summary → ${this.formatSectionName(sectionKey)}`);
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
    const isSectionComplete = (section: any): boolean => {
      if (!section) return false;
      return Object.values(section).some(v => v !== undefined && v !== null && v !== '');
    };

    const fundAppSections = {
      parentsFamilySection: isSectionComplete(fundApplication?.parentsFamilySection),
      occupationIncomeSection: isSectionComplete(fundApplication?.occupationIncomeSection),
      birthDetailsSection: isSectionComplete(fundApplication?.birthDetailsSection),
      nicuFinancialSection: isSectionComplete(fundApplication?.nicuFinancialSection),
      otherSupportSection: isSectionComplete(fundApplication?.otherSupportSection),
      declarationsSection: isSectionComplete(fundApplication?.declarationsSection),
      hospitalApprovalSection: isSectionComplete(fundApplication?.hospitalApprovalSection),
    };

    const interimSummarySections = {
      birthSummarySection: isSectionComplete(interimSummary?.birthSummarySection),
      maternalDetailsSection: isSectionComplete(interimSummary?.maternalDetailsSection),
      antenatalRiskFactorsSection: isSectionComplete(interimSummary?.antenatalRiskFactorsSection),
      diagnosisSection: isSectionComplete(interimSummary?.diagnosisSection),
      treatmentGivenSection: isSectionComplete(interimSummary?.treatmentGivenSection),
      currentStatusSection: isSectionComplete(interimSummary?.currentStatusSection),
      feedingRespirationSection: isSectionComplete(interimSummary?.feedingRespirationSection),
      dischargePlanInvestigationsSection: isSectionComplete(interimSummary?.dischargePlanInvestigationsSection),
      remarksSignatureSection: isSectionComplete(interimSummary?.remarksSignatureSection),
    };

    const fundAppComplete = Object.values(fundAppSections).every(v => v === true);
    const interimSummaryComplete = Object.values(interimSummarySections).every(v => v === true);
    const fundAppTotalPercent = (Object.values(fundAppSections).filter(v => v).length / Object.keys(fundAppSections).length) * 100;
    const interimSummaryTotalPercent = (Object.values(interimSummarySections).filter(v => v).length / Object.keys(interimSummarySections).length) * 100;
    const overallPercent = (fundAppTotalPercent + interimSummaryTotalPercent) / 2;

    return {
      fundAppSections,
      fundAppTotalPercent: Math.round(fundAppTotalPercent),
      fundAppIsComplete: fundAppComplete,
      interimSummarySections,
      interimSummaryTotalPercent: Math.round(interimSummaryTotalPercent),
      interimSummaryIsComplete: interimSummaryComplete,
      overallPercent: Math.round(overallPercent),
      allRequiredFieldsComplete: fundAppComplete && interimSummaryComplete,
    };
  }

  private formatSectionName(sectionKey: string): string {
    return sectionKey
      .replace(/Section$/, '')
      .split(/(?=[A-Z])/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  async getSettlement(caseId: string): Promise<SettlementRecord | null> {
    try {
      const caseRow = await supabase
        .from('cases')
        .select('data')
        .eq('id', caseId)
        .maybeSingle();

      if (caseRow.error || !caseRow.data?.data?.settlement) {
        return null;
      }

      return caseRow.data.data.settlement as SettlementRecord;
    } catch (e) {
      console.error('Failed to get settlement:', e);
      return null;
    }
  }

  async saveSettlement(caseId: string, data: Partial<SettlementRecord>): Promise<void> {
    try {
      const caseRow = await supabase
        .from('cases')
        .select('data')
        .eq('id', caseId)
        .maybeSingle();

      if (caseRow.error || !caseRow.data) {
        throw new Error('Case not found');
      }

      const existing = caseRow.data.data || {};
      const settlement = existing.settlement || {};

      const updated = {
        ...existing,
        settlement: {
          ...settlement,
          ...data,
          updatedAt: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('cases')
        .update({ data: updated })
        .eq('id', caseId);

      if (error) throw error;
    } catch (e) {
      console.error('Failed to save settlement:', e);
      throw e;
    }
  }

  async submitDirectorReview(caseId: string, decision: 'Approved' | 'Returned', comments: string, decidedBy: string): Promise<void> {
    try {
      const caseRow = await supabase
        .from('cases')
        .select('data')
        .eq('id', caseId)
        .maybeSingle();

      if (caseRow.error || !caseRow.data) {
        throw new Error('Case not found');
      }

      const existing = caseRow.data.data || {};
      const settlement = existing.settlement || {};

      const updated = {
        ...existing,
        settlement: {
          ...settlement,
          directorReview: {
            decision,
            comments,
            by: decidedBy,
            at: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('cases')
        .update({ data: updated })
        .eq('id', caseId);

      if (error) throw error;
    } catch (e) {
      console.error('Failed to submit director review:', e);
      throw e;
    }
  }

  async closeCaseWithSettlement(caseId: string, closedBy: string): Promise<void> {
    try {
      const caseRow = await supabase
        .from('cases')
        .select('data')
        .eq('id', caseId)
        .maybeSingle();

      if (caseRow.error || !caseRow.data) {
        throw new Error('Case not found');
      }

      const existing = caseRow.data.data || {};
      const settlement = existing.settlement || {};

      const updated = {
        ...existing,
        settlement: {
          ...settlement,
          closedAt: new Date().toISOString(),
          closedBy,
          updatedAt: new Date().toISOString(),
        },
      };

      const { error } = await supabase
        .from('cases')
        .update({
          data: updated,
          case_status: 'Closed',
          closure_date: new Date().toISOString().split('T')[0],
          last_action_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (error) throw error;
    } catch (e) {
      console.error('Failed to close case with settlement:', e);
      throw e;
    }
  }
}
