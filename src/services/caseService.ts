import { supabase } from '../lib/supabase';
import type { Case, DocumentMetadata, AuditEvent, DoctorReview, SubmitGatingInfo, SettlementRecord } from '../types';
import { getSubmitGatingInfo } from '../utils/submitGating';

export const caseService = {
  async getCases(): Promise<Case[]> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        hospital:hospitals(name, code),
        created_by_user:users!cases_created_by_fkey(full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(c => ({
      caseId: c.id,
      caseNumber: c.case_number,
      hospitalId: c.hospital_id,
      hospitalName: c.hospital?.name || 'Unknown',
      bgrcCycleId: c.bgrc_cycle_id,
      processType: c.process_type,
      caseStatus: c.case_status,
      createdBy: c.created_by,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      lastActionAt: c.last_action_at,
      submittedAt: c.submitted_at,
      reviewedAt: c.reviewed_at,
      decisionAt: c.decision_at,
    }));
  },

  async getCaseById(caseId: string): Promise<Case | null> {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        hospital:hospitals(name, code),
        created_by_user:users!cases_created_by_fkey(full_name)
      `)
      .eq('id', caseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      caseId: data.id,
      caseNumber: data.case_number,
      hospitalId: data.hospital_id,
      hospitalName: data.hospital?.name || 'Unknown',
      bgrcCycleId: data.bgrc_cycle_id,
      processType: data.process_type,
      caseStatus: data.case_status,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastActionAt: data.last_action_at,
      submittedAt: data.submitted_at,
      reviewedAt: data.reviewed_at,
      decisionAt: data.decision_at,
    };
  },

  async updateCase(caseId: string, updates: Partial<Case>): Promise<void> {
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.caseStatus) dbUpdates.case_status = updates.caseStatus;
    if (updates.lastActionAt) dbUpdates.last_action_at = updates.lastActionAt;
    if (updates.submittedAt) dbUpdates.submitted_at = updates.submittedAt;
    if (updates.reviewedAt) dbUpdates.reviewed_at = updates.reviewedAt;
    if (updates.decisionAt) dbUpdates.decision_at = updates.decisionAt;

    const { error } = await supabase
      .from('cases')
      .update(dbUpdates)
      .eq('id', caseId);

    if (error) throw error;
  },

  async getDocuments(caseId: string): Promise<DocumentMetadata[]> {
    const caseData = await this.getCaseById(caseId);
    if (!caseData) return [];

    const { data: templates } = await supabase
      .from('document_templates')
      .select('*')
      .eq('process_type', caseData.processType)
      .order('display_order');

    const { data: existingDocs } = await supabase
      .from('document_metadata')
      .select('*')
      .eq('case_id', caseId);

    const docMap = new Map(existingDocs?.map(d => [d.doc_type, d]) || []);
    const documents: DocumentMetadata[] = [];

    for (const template of templates || []) {
      const existing = docMap.get(template.doc_type);

      if (existing) {
        documents.push({
          docId: existing.id,
          caseId: existing.case_id,
          category: existing.category,
          docType: existing.doc_type,
          fileName: existing.file_name,
          fileType: existing.file_type,
          mimeType: existing.file_type,
          size: existing.size,
          fileSize: existing.size,
          uploadedAt: existing.uploaded_at,
          uploadedBy: existing.uploaded_by,
          status: existing.status,
          notes: existing.notes,
          fileUrl: existing.file_url,
        });
      } else {
        const { data: newDoc } = await supabase
          .from('document_metadata')
          .insert({
            case_id: caseId,
            category: template.category,
            doc_type: template.doc_type,
            status: 'Missing',
          })
          .select()
          .single();

        if (newDoc) {
          documents.push({
            docId: newDoc.id,
            caseId: newDoc.case_id,
            category: newDoc.category,
            docType: newDoc.doc_type,
            status: newDoc.status,
          });
        }
      }
    }

    return documents;
  },

  async updateDocument(docId: string, updates: Partial<DocumentMetadata>): Promise<void> {
    const dbUpdates: any = {};

    if (updates.fileName) dbUpdates.file_name = updates.fileName;
    if (updates.fileType || updates.mimeType) dbUpdates.file_type = updates.fileType || updates.mimeType;
    if (updates.size !== undefined || updates.fileSize !== undefined) dbUpdates.size = updates.size ?? updates.fileSize;
    if (updates.uploadedAt) dbUpdates.uploaded_at = updates.uploadedAt;
    if (updates.uploadedBy) dbUpdates.uploaded_by = updates.uploadedBy;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.fileUrl !== undefined) dbUpdates.file_url = updates.fileUrl;

    if (updates.status === 'Verified') {
      dbUpdates.verified_at = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) dbUpdates.verified_by = user.id;
    }

    const { error } = await supabase
      .from('document_metadata')
      .update(dbUpdates)
      .eq('id', docId);

    if (error) throw error;
  },

  async addAuditEvent(event: Omit<AuditEvent, 'eventId'>): Promise<void> {
    const { error } = await supabase
      .from('audit_events')
      .insert({
        case_id: event.caseId,
        timestamp: event.timestamp || new Date().toISOString(),
        user_id: event.userId,
        user_role: event.userRole,
        action: event.action,
        notes: event.notes,
      });

    if (error) throw error;
  },

  async getAuditEvents(caseId: string): Promise<AuditEvent[]> {
    const { data, error } = await supabase
      .from('audit_events')
      .select(`
        *,
        user:users(full_name)
      `)
      .eq('case_id', caseId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return (data || []).map(e => ({
      eventId: e.id,
      caseId: e.case_id,
      timestamp: e.timestamp,
      userId: e.user_id,
      userRole: e.user_role,
      action: e.action,
      notes: e.notes,
    }));
  },

  async getDocumentTemplates() {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('process_type, display_order');

    if (error) throw error;
    return data || [];
  },

  async getHospitals() {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return (data || []).map(h => ({
      hospitalId: h.id,
      name: h.name,
      code: h.code,
      city: h.city,
      state: h.state,
      contactPerson: h.contact_person,
      phone: h.phone,
      email: h.email,
      isActive: h.is_active,
    }));
  },

  async getCommitteeDecision(caseId: string) {
    const { data, error } = await supabase
      .from('committee_reviews')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      reviewId: data.id,
      caseId: data.case_id,
      outcome: data.outcome || data.decision,
      approvedAmount: data.approved_amount,
      decisionDate: data.decision_date || data.review_date,
      comments: data.comments || data.remarks,
      reviewedBy: data.reviewed_by,
    };
  },

  async saveCommitteeDecision(caseId: string, decision: {
    outcome: string;
    approvedAmount?: number;
    comments?: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: existing } = await supabase
      .from('committee_reviews')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    const decisionData = {
      case_id: caseId,
      outcome: decision.outcome,
      decision: decision.outcome === 'Approved' || decision.outcome === 'Rejected' ? decision.outcome : 'Pending',
      approved_amount: decision.approvedAmount,
      decision_date: new Date().toISOString(),
      comments: decision.comments,
      remarks: decision.comments,
      reviewed_by: user?.id,
      review_date: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('committee_reviews')
        .update(decisionData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('committee_reviews')
        .insert(decisionData);

      if (error) throw error;
    }
  },

  async getInstallments(caseId: string) {
    const { data, error } = await supabase
      .from('funding_installments')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at');

    if (error) throw error;

    return (data || []).map(i => ({
      installmentId: i.id,
      caseId: i.case_id,
      label: i.label,
      amount: i.amount,
      dueDate: i.due_date,
      status: i.status,
    }));
  },

  async saveInstallments(caseId: string, installments: Array<{
    label: string;
    amount: number;
    dueDate?: string;
    status?: string;
  }>) {
    await supabase
      .from('funding_installments')
      .delete()
      .eq('case_id', caseId);

    if (installments.length === 0) return;

    const installmentData = installments.map(i => ({
      case_id: caseId,
      label: i.label,
      amount: i.amount,
      due_date: i.dueDate || null,
      status: i.status || 'Planned',
    }));

    const { error } = await supabase
      .from('funding_installments')
      .insert(installmentData);

    if (error) throw error;
  },

  async updateInstallmentStatus(installmentId: string, status: string) {
    const { error } = await supabase
      .from('funding_installments')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', installmentId);

    if (error) throw error;
  },

  async saveRejectionDetails(caseId: string, details: {
    reasonCategory: string;
    rejectionLevel: string;
    communicationStatus: string;
    referringHospital?: string;
    caseSummary: string;
  }) {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('rejection_reasons')
      .insert({
        case_id: caseId,
        reason_category: details.reasonCategory,
        detailed_reason: details.caseSummary,
        rejection_level: details.rejectionLevel,
        communication_status: details.communicationStatus,
        referring_hospital: details.referringHospital,
        case_summary: details.caseSummary,
        rejected_by: user?.id,
        rejection_date: new Date().toISOString(),
      });

    if (error) throw error;
  },

  async getRejectionDetails(caseId: string) {
    const { data, error } = await supabase
      .from('rejection_reasons')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      reasonId: data.id,
      caseId: data.case_id,
      reasonCategory: data.reason_category,
      rejectionLevel: data.rejection_level,
      communicationStatus: data.communication_status,
      referringHospital: data.referring_hospital,
      caseSummary: data.case_summary,
      rejectedBy: data.rejected_by,
      rejectionDate: data.rejection_date,
    };
  },

  async updateFinancialDetails(caseId: string, updates: { approvedAmount?: number }) {
    const { data: existing } = await supabase
      .from('financial_case_details')
      .select('case_id')
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('financial_case_details')
        .update({ approved_amount: updates.approvedAmount })
        .eq('case_id', caseId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('financial_case_details')
        .insert({
          case_id: caseId,
          approved_amount: updates.approvedAmount,
        });

      if (error) throw error;
    }
  },

  async getBeniProgramOps(caseId: string) {
    const { data, error } = await supabase
      .from('beni_program_ops')
      .select(`
        *,
        team_member:users!beni_program_ops_beni_team_member_fkey(full_name)
      `)
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      opsId: data.id,
      caseId: data.case_id,
      beniTeamMember: data.beni_team_member,
      beniTeamMemberName: data.team_member?.full_name,
      hamperSentDate: data.hamper_sent_date,
      voiceNoteReceivedAt: data.voice_note_received_at,
      notes: data.notes,
    };
  },

  async saveBeniProgramOps(caseId: string, ops: {
    beniTeamMember?: string;
    hamperSentDate?: string;
    voiceNoteReceivedAt?: string;
    notes?: string;
  }) {
    const { data: existing } = await supabase
      .from('beni_program_ops')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    const opsData = {
      case_id: caseId,
      beni_team_member: ops.beniTeamMember || null,
      hamper_sent_date: ops.hamperSentDate || null,
      voice_note_received_at: ops.voiceNoteReceivedAt || null,
      notes: ops.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase
        .from('beni_program_ops')
        .update(opsData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('beni_program_ops')
        .insert(opsData);

      if (error) throw error;
    }
  },

  async getFollowupMilestones(caseId: string) {
    const { data, error } = await supabase
      .from('followup_milestones')
      .select('*')
      .eq('case_id', caseId)
      .order('milestone_months');

    if (error) throw error;

    return (data || []).map(m => ({
      milestoneId: m.id,
      caseId: m.case_id,
      milestoneMonths: m.milestone_months,
      dueDate: m.due_date,
      followupDate: m.followup_date,
      reachedFlag: m.reached_flag,
      completed: m.completed,
    }));
  },

  async initializeFollowupMilestones(caseId: string, referenceDate: string) {
    const milestones = [3, 6, 9, 12, 18, 24];
    const baseDate = new Date(referenceDate);

    for (const months of milestones) {
      const dueDate = new Date(baseDate);
      dueDate.setMonth(dueDate.getMonth() + months);

      const { error } = await supabase
        .from('followup_milestones')
        .insert({
          case_id: caseId,
          milestone_months: months,
          due_date: dueDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error && error.code !== '23505') {
        throw error;
      }
    }
  },

  async updateFollowupMilestone(milestoneId: string, updates: {
    dueDate?: string;
    followupDate?: string;
    reachedFlag?: boolean;
    completed?: boolean;
  }) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
    if (updates.followupDate !== undefined) updateData.followup_date = updates.followupDate;
    if (updates.reachedFlag !== undefined) updateData.reached_flag = updates.reachedFlag;
    if (updates.completed !== undefined) updateData.completed = updates.completed;

    const { error } = await supabase
      .from('followup_milestones')
      .update(updateData)
      .eq('id', milestoneId);

    if (error) throw error;
  },

  async getFollowupMetricDefinitions(milestoneMonths: number) {
    const { data, error } = await supabase
      .from('followup_metric_definitions')
      .select('*')
      .eq('milestone_months', milestoneMonths)
      .order('display_order');

    if (error) throw error;

    return (data || []).map(d => ({
      definitionId: d.id,
      milestoneMonths: d.milestone_months,
      metricName: d.metric_name,
      metricType: d.metric_type,
      allowNa: d.allow_na,
      displayOrder: d.display_order,
    }));
  },

  async getFollowupMetricValues(caseId: string, milestoneMonths: number) {
    const { data, error } = await supabase
      .from('followup_metric_values')
      .select('*')
      .eq('case_id', caseId)
      .eq('milestone_months', milestoneMonths);

    if (error) throw error;

    return (data || []).map(v => ({
      valueId: v.id,
      caseId: v.case_id,
      milestoneMonths: v.milestone_months,
      metricKey: v.metric_name,
      valueText: v.value_text,
      valueBoolean: v.value_boolean,
    }));
  },

  async saveFollowupMetricValues(caseId: string, milestoneMonths: number, values: Array<{
    metricName: string;
    valueText?: string;
    valueBoolean?: boolean;
  }>) {
    for (const value of values) {
      const { error } = await supabase
        .from('followup_metric_values')
        .upsert({
          case_id: caseId,
          milestone_months: milestoneMonths,
          metric_name: value.metricName,
          value_text: value.valueText || null,
          value_boolean: value.valueBoolean !== undefined ? value.valueBoolean : null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'case_id,milestone_months,metric_name',
        });

      if (error) throw error;
    }
  },

  async getClinicalDetails(caseId: string) {
    const { data, error } = await supabase
      .from('clinical_case_details')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      caseId: data.case_id,
      diagnosis: data.diagnosis,
      summary: data.summary,
      doctorName: data.doctor_name,
      nicuDays: data.nicu_days,
      admissionDate: data.admission_date,
      dischargeDate: data.discharge_date,
    };
  },

  async getVolunteerUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('role', 'beni_volunteer')
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;

    return (data || []).map(u => ({
      userId: u.id,
      fullName: u.full_name,
      email: u.email,
    }));
  },

  async getDoctorReview(caseId: string): Promise<DoctorReview | null> {
    const { data, error } = await supabase
      .from('doctor_reviews')
      .select(`
        *,
        assigned_to:users!doctor_reviews_assigned_to_user_id_fkey(full_name)
      `)
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      reviewId: data.id,
      caseId: data.case_id,
      assignedToUserId: data.assigned_to_user_id,
      assignedToName: data.assigned_to?.full_name,
      submittedAt: data.submitted_at,
      outcome: data.outcome,
      comments: data.comments,
      gatingResult: data.gating_result,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async getClinicalReviewers(): Promise<Array<{ userId: string; fullName: string; email: string }>> {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('role', ['clinical_reviewer', 'clinical', 'hospital_doctor'])
      .eq('is_active', true)
      .order('full_name');

    if (error) throw error;

    return (data || []).map(u => ({
      userId: u.id,
      fullName: u.full_name,
      email: u.email,
    }));
  },

  async assignDoctorReview(caseId: string, assignedToUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: existing } = await supabase
      .from('doctor_reviews')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('doctor_reviews')
        .update({
          assigned_to_user_id: assignedToUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('doctor_reviews')
        .insert({
          case_id: caseId,
          assigned_to_user_id: assignedToUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    }

    await this.addAuditEvent({
      caseId,
      userId: user?.id || '',
      userRole: 'admin',
      action: 'Doctor Review Assigned',
      notes: `Assigned to clinical reviewer`,
      timestamp: new Date().toISOString(),
    });
  },

  async submitDoctorReview(
    caseId: string,
    outcome: 'Approved' | 'Approved_With_Comments' | 'Returned',
    comments?: string,
    gatingInfo?: SubmitGatingInfo
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('doctor_reviews')
      .update({
        submitted_at: new Date().toISOString(),
        outcome,
        comments: comments || null,
        gating_result: gatingInfo || {},
        updated_at: new Date().toISOString(),
      })
      .eq('case_id', caseId);

    if (error) throw error;

    const briefComment = comments ? comments.substring(0, 100) : '';
    await this.addAuditEvent({
      caseId,
      userId: user?.id || '',
      userRole: 'hospital_doctor',
      action: 'Clinical Review Submitted',
      notes: `Outcome: ${outcome}${briefComment ? ` - ${briefComment}` : ''}`,
      timestamp: new Date().toISOString(),
    });
  },

  async getClinicalReviewerCases(userId: string): Promise<Case[]> {
    const { data, error } = await supabase
      .from('doctor_reviews')
      .select(`
        case_id,
        cases(
          id,
          case_number,
          hospital_id,
          process_type,
          case_status,
          created_by,
          created_at,
          updated_at,
          last_action_at,
          submitted_at,
          reviewed_at,
          decision_at,
          hospital:hospitals(name, code)
        )
      `)
      .eq('assigned_to_user_id', userId)
      .not('submitted_at', 'is', null);

    if (error) throw error;

    return (data || [])
      .filter(r => r.cases)
      .map(r => {
        const c = r.cases;
        return {
          caseId: c.id,
          caseNumber: c.case_number,
          hospitalId: c.hospital_id,
          hospitalName: c.hospital?.name || 'Unknown',
          bgrcCycleId: c.bgrc_cycle_id || undefined,
          processType: c.process_type,
          caseStatus: c.case_status,
          createdBy: c.created_by,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          lastActionAt: c.last_action_at,
          submittedAt: c.submitted_at,
          reviewedAt: c.reviewed_at,
          decisionAt: c.decision_at,
        };
      });
  },

  async computeVariance(finalBillAmount?: number, referenceAmount?: number): Promise<{ variancePct: number | null; varianceFlag: boolean }> {
    if (!referenceAmount || referenceAmount === 0 || finalBillAmount === undefined) {
      return { variancePct: null, varianceFlag: false };
    }

    const variancePct = Math.abs((finalBillAmount - referenceAmount) / referenceAmount) * 100;
    return { variancePct: Math.round(variancePct * 10) / 10, varianceFlag: variancePct > 10 };
  },
};
