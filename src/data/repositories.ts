import { supabase } from '../lib/supabase';

export const casesRepository = {
  async getAllCases() {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCaseById(caseId: string) {
    const { data, error } = await supabase.from('cases').select('*').eq('id', caseId).maybeSingle();

    if (error) throw error;
    return data;
  },

  async getCasesByStatus(status: string) {
    const { data, error } = await supabase.from('cases').select('*').eq('case_status', status);

    if (error) throw error;
    return data || [];
  },

  async getCasesStats() {
    const { data: allCases, error } = await supabase.from('cases').select('case_status');

    if (error) throw error;

    const stats = {
      total: allCases?.length || 0,
      draft: allCases?.filter((c: any) => c.case_status === 'Draft').length || 0,
      submitted: allCases?.filter((c: any) => c.case_status === 'Submitted').length || 0,
      underVerification: allCases?.filter((c: any) => c.case_status === 'Under_Verification').length || 0,
      underReview: allCases?.filter((c: any) => c.case_status === 'Under_Review').length || 0,
      approved: allCases?.filter((c: any) => c.case_status === 'Approved').length || 0,
      rejected: allCases?.filter((c: any) => c.case_status === 'Rejected').length || 0,
      returned: allCases?.filter((c: any) => c.case_status === 'Returned').length || 0,
    };

    return stats;
  },
};

export const beneficiaryRepository = {
  async getByCase(caseId: string) {
    const { data, error } = await supabase
      .from('beneficiary_profiles')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

export const familyRepository = {
  async getByCase(caseId: string) {
    const { data, error } = await supabase
      .from('family_profiles')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

export const clinicalRepository = {
  async getByCase(caseId: string) {
    const { data, error } = await supabase
      .from('clinical_case_details')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

export const financialRepository = {
  async getByCase(caseId: string) {
    const { data, error } = await supabase
      .from('financial_case_details')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

export const documentsRepository = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('document_metadata')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getTemplates() {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('display_order');

    if (error) throw error;
    return data || [];
  },

  async getStats() {
    const { data, error } = await supabase.from('document_metadata').select('status');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      missing: data?.filter((d: any) => d.status === 'Missing').length || 0,
      uploaded: data?.filter((d: any) => d.status === 'Uploaded').length || 0,
      verified: data?.filter((d: any) => d.status === 'Verified').length || 0,
      notApplicable: data?.filter((d: any) => d.status === 'Not_Applicable').length || 0,
    };

    return stats;
  },
};

export const committeeRepository = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('committee_reviews')
      .select('*')
      .eq('case_id', caseId)
      .order('review_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getStats() {
    const { data, error } = await supabase.from('committee_reviews').select('outcome');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      approved: data?.filter((c: any) => c.outcome === 'Approved').length || 0,
      rejected: data?.filter((c: any) => c.outcome === 'Rejected').length || 0,
      pending: data?.filter((c: any) => c.outcome === 'Pending').length || 0,
      deferred: data?.filter((c: any) => c.outcome === 'Deferred').length || 0,
    };

    return stats;
  },
};

export const installmentsRepository = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('funding_installments')
      .select('*')
      .eq('case_id', caseId)
      .order('due_date');

    if (error) throw error;
    return data || [];
  },

  async getStats() {
    const { data, error } = await supabase.from('funding_installments').select('status');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      planned: data?.filter((i: any) => i.status === 'Planned').length || 0,
      requested: data?.filter((i: any) => i.status === 'Requested').length || 0,
      paid: data?.filter((i: any) => i.status === 'Paid').length || 0,
    };

    return stats;
  },
};

export const followupRepository = {
  async getMilestonesByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('followup_milestones')
      .select('*')
      .eq('case_id', caseId)
      .order('milestone_months');

    if (error) throw error;
    return data || [];
  },

  async getMetricValuesByCaseAndMilestone(caseId: string, milestoneMonths: number) {
    const { data, error } = await supabase
      .from('followup_metric_values')
      .select('*')
      .eq('case_id', caseId)
      .eq('milestone_months', milestoneMonths);

    if (error) throw error;
    return data || [];
  },

  async getMetricDefinitions(milestoneMonths: number) {
    const { data, error } = await supabase
      .from('followup_metric_definitions')
      .select('*')
      .eq('milestone_months', milestoneMonths)
      .order('display_order');

    if (error) throw error;
    return data || [];
  },
};

export const beniRepository = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('beni_program_ops')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

export const rejectionRepository = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('rejection_reasons')
      .select('*')
      .eq('case_id', caseId)
      .order('rejection_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

export const auditRepository = {
  async getByCaseId(caseId: string) {
    const { data, error } = await supabase
      .from('audit_events')
      .select('*')
      .eq('case_id', caseId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};

export const hospitalsRepository = {
  async getAll() {
    const { data, error } = await supabase.from('hospitals').select('*').order('name');

    if (error) throw error;
    return data || [];
  },

  async getStats() {
    const { data, error } = await supabase.from('hospitals').select('id');

    if (error) throw error;
    return {
      total: data?.length || 0,
    };
  },
};

export const usersRepository = {
  async getAll() {
    const { data, error } = await supabase.from('users').select('*').order('full_name');

    if (error) throw error;
    return data || [];
  },

  async getByRole(role: string) {
    const { data, error } = await supabase.from('users').select('*').eq('role', role);

    if (error) throw error;
    return data || [];
  },

  async getStats() {
    const { data, error } = await supabase.from('users').select('role');

    if (error) throw error;

    const stats: Record<string, number> = {
      total: data?.length || 0,
    };

    const roles = ['admin', 'hospital_spoc', 'hospital_doctor', 'verifier', 'committee_member', 'beni_volunteer', 'accounts'];
    for (const role of roles) {
      stats[role] = data?.filter((u: any) => u.role === role).length || 0;
    }

    return stats;
  },
};
