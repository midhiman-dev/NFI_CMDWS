import { supabase } from '../lib/supabase';
import { formatDateDMY } from '../utils/dateFormat';


export const adminService = {
  async getUsers() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        hospital:hospitals(name)
      `)
      .order('full_name');

    if (error) throw error;

    return (data || []).map(u => ({
      userId: u.id,
      email: u.email,
      fullName: u.full_name,
      role: u.role,
      hospitalId: u.hospital_id,
      hospitalName: u.hospital?.name,
      isActive: u.is_active,
      createdAt: u.created_at,
    }));
  },

  async createUser(user: {
    email: string;
    fullName: string;
    role: string;
    hospitalId?: string;
    isActive?: boolean;
  }) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        hospital_id: user.hospitalId || null,
        is_active: user.isActive !== undefined ? user.isActive : true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateUser(userId: string, updates: {
    email?: string;
    fullName?: string;
    role?: string;
    hospitalId?: string;
    isActive?: boolean;
  }) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.fullName !== undefined) updateData.full_name = updates.fullName;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.hospitalId !== undefined) updateData.hospital_id = updates.hospitalId || null;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  },

  async deleteUser(userId: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  },

  async getHospitals() {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
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
      createdAt: h.created_at,
    }));
  },

  async createHospital(hospital: {
    name: string;
    code: string;
    city: string;
    state: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  }) {
    const { data, error } = await supabase
      .from('hospitals')
      .insert({
        name: hospital.name,
        code: hospital.code,
        city: hospital.city,
        state: hospital.state,
        contact_person: hospital.contactPerson || null,
        phone: hospital.phone || null,
        email: hospital.email || null,
        is_active: hospital.isActive !== undefined ? hospital.isActive : true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateHospital(hospitalId: string, updates: {
    name?: string;
    code?: string;
    city?: string;
    state?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
  }) {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.code !== undefined) updateData.code = updates.code;
    if (updates.city !== undefined) updateData.city = updates.city;
    if (updates.state !== undefined) updateData.state = updates.state;
    if (updates.contactPerson !== undefined) updateData.contact_person = updates.contactPerson || null;
    if (updates.phone !== undefined) updateData.phone = updates.phone || null;
    if (updates.email !== undefined) updateData.email = updates.email || null;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase
      .from('hospitals')
      .update(updateData)
      .eq('id', hospitalId);

    if (error) throw error;
  },

  async deleteHospital(hospitalId: string) {
    const { error } = await supabase
      .from('hospitals')
      .delete()
      .eq('id', hospitalId);

    if (error) throw error;
  },

  async getDocumentTemplates() {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('process_type')
      .order('category')
      .order('display_order');

    if (error) throw error;

    return (data || []).map(d => ({
      templateId: d.id,
      processType: d.process_type,
      category: d.category,
      docType: d.doc_type,
      mandatoryFlag: d.mandatory_flag,
      conditionNotes: d.condition_notes,
      displayOrder: d.display_order,
    }));
  },

  async createDocumentTemplate(template: {
    processType: string;
    category: string;
    docType: string;
    mandatoryFlag?: boolean;
    conditionNotes?: string;
    displayOrder?: number;
  }) {
    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        process_type: template.processType,
        category: template.category,
        doc_type: template.docType,
        mandatory_flag: template.mandatoryFlag || false,
        condition_notes: template.conditionNotes || null,
        display_order: template.displayOrder || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateDocumentTemplate(templateId: string, updates: {
    processType?: string;
    category?: string;
    docType?: string;
    mandatoryFlag?: boolean;
    conditionNotes?: string;
    displayOrder?: number;
  }) {
    const updateData: any = {};

    if (updates.processType !== undefined) updateData.process_type = updates.processType;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.docType !== undefined) updateData.doc_type = updates.docType;
    if (updates.mandatoryFlag !== undefined) updateData.mandatory_flag = updates.mandatoryFlag;
    if (updates.conditionNotes !== undefined) updateData.condition_notes = updates.conditionNotes || null;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;

    const { error } = await supabase
      .from('document_templates')
      .update(updateData)
      .eq('id', templateId);

    if (error) throw error;
  },

  async deleteDocumentTemplate(templateId: string) {
    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
  },

  async applyDocumentTemplateToCase(caseId: string, processType: string) {
    const { data: templates } = await supabase
      .from('document_templates')
      .select('*')
      .eq('process_type', processType);

    if (!templates) return;

    const { data: existingDocs } = await supabase
      .from('document_metadata')
      .select('category, doc_type')
      .eq('case_id', caseId);

    const existingSet = new Set(
      (existingDocs || []).map(d => `${d.category}:${d.doc_type}`)
    );

    const toInsert = templates
      .filter(t => !existingSet.has(`${t.category}:${t.doc_type}`))
      .map(t => ({
        case_id: caseId,
        category: t.category,
        doc_type: t.doc_type,
        status: 'Missing',
      }));

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from('document_metadata')
        .insert(toInsert);

      if (error) throw error;
    }

    return toInsert.length;
  },

  async getFollowupMetricDefinitions() {
    const { data, error } = await supabase
      .from('followup_metric_definitions')
      .select('*')
      .order('milestone_months')
      .order('display_order');

    if (error) throw error;

    return (data || []).map(d => ({
      definitionId: d.id,
      milestoneMonths: d.milestone_months,
      metricName: d.metric_name,
      metricType: d.metric_type,
      allowNa: d.allow_na,
      displayOrder: d.display_order,
      createdAt: d.created_at,
    }));
  },

  async createFollowupMetricDefinition(definition: {
    milestoneMonths: number;
    metricName: string;
    metricType: string;
    allowNa?: boolean;
    displayOrder?: number;
  }) {
    const { data, error } = await supabase
      .from('followup_metric_definitions')
      .insert({
        milestone_months: definition.milestoneMonths,
        metric_name: definition.metricName,
        metric_type: definition.metricType,
        allow_na: definition.allowNa || false,
        display_order: definition.displayOrder || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFollowupMetricDefinition(definitionId: string, updates: {
    milestoneMonths?: number;
    metricName?: string;
    metricType?: string;
    allowNa?: boolean;
    displayOrder?: number;
  }) {
    const updateData: any = {};

    if (updates.milestoneMonths !== undefined) updateData.milestone_months = updates.milestoneMonths;
    if (updates.metricName !== undefined) updateData.metric_name = updates.metricName;
    if (updates.metricType !== undefined) updateData.metric_type = updates.metricType;
    if (updates.allowNa !== undefined) updateData.allow_na = updates.allowNa;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;

    const { error } = await supabase
      .from('followup_metric_definitions')
      .update(updateData)
      .eq('id', definitionId);

    if (error) throw error;
  },

  async deleteFollowupMetricDefinition(definitionId: string) {
    const { error } = await supabase
      .from('followup_metric_definitions')
      .delete()
      .eq('id', definitionId);

    if (error) throw error;
  },

  async getBgrcCycles() {
    const { data, error } = await supabase
      .from('bgrc_cycles')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;

    return (data || []).map(c => ({
      cycleId: c.id,
      cycleName: c.cycle_name,
      startDate: c.start_date,
      endDate: c.end_date,
      isActive: c.is_active,
      createdAt: c.created_at,
    }));
  },

  async createBgrcCycle(cycle: {
    cycleName: string;
    startDate: string;
    endDate: string;
    isActive?: boolean;
  }) {
    const { data, error } = await supabase
      .from('bgrc_cycles')
      .insert({
        cycle_name: cycle.cycleName,
        start_date: cycle.startDate,
        end_date: cycle.endDate,
        is_active: cycle.isActive !== undefined ? cycle.isActive : true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateBgrcCycle(cycleId: string, updates: {
    cycleName?: string;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }) {
    const updateData: any = {};

    if (updates.cycleName !== undefined) updateData.cycle_name = updates.cycleName;
    if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
    if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase
      .from('bgrc_cycles')
      .update(updateData)
      .eq('id', cycleId);

    if (error) throw error;
  },

  async deleteBgrcCycle(cycleId: string) {
    const { error } = await supabase
      .from('bgrc_cycles')
      .delete()
      .eq('id', cycleId);

    if (error) throw error;
  },

  async getCasesForCycle(cycleId: string) {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        hospital:hospitals(name),
        beneficiary:beneficiary_profiles(baby_name)
      `)
      .eq('bgrc_cycle_id', cycleId);

    if (error) throw error;

    return (data || []).map(c => ({
      caseId: c.id,
      caseNumber: c.case_number,
      hospitalName: c.hospital?.name,
      babyName: c.beneficiary?.baby_name,
      caseStatus: c.case_status,
    }));
  },

  async assignCaseToCycle(caseId: string, cycleId: string) {
    const { error } = await supabase
      .from('cases')
      .update({ bgrc_cycle_id: cycleId })
      .eq('id', caseId);

    if (error) throw error;
  },

  async unassignCaseFromCycle(caseId: string) {
    const { error } = await supabase
      .from('cases')
      .update({ bgrc_cycle_id: null })
      .eq('id', caseId);

    if (error) throw error;
  },

  async getAllCases() {
    const { data, error } = await supabase
      .from('cases')
      .select(`
        *,
        hospital:hospitals(name),
        beneficiary:beneficiary_profiles(baby_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(c => ({
      caseId: c.id,
      caseNumber: c.case_number,
      hospitalId: c.hospital_id,
      hospitalName: c.hospital?.name,
      babyName: c.beneficiary?.baby_name,
      caseStatus: c.case_status,
      processType: c.process_type,
      bgrcCycleId: c.bgrc_cycle_id,
      createdAt: c.created_at,
    }));
  },

  async getBeneficiaryExportData() {
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select(`
        *,
        hospital:hospitals(*),
        beneficiary:beneficiary_profiles(*),
        family:family_profiles(*),
        clinical:clinical_case_details(*),
        financial:financial_case_details(*)
      `);

    if (casesError) throw casesError;

    return (cases || []).map((c, index) => ({
      slNo: index + 1,
      nfiBn: c.case_number,
      nameOfBeneficiary: c.beneficiary?.baby_name || '',
      gender: c.beneficiary?.gender || '',
      dob: c.beneficiary?.dob || '',
      fatherName: c.family?.father_name || '',
      motherName: c.family?.mother_name || '',
      address: c.family?.address || '',
      city: c.family?.city || '',
      state: c.family?.state || '',
      pincode: c.family?.pincode || '',
      phone: c.family?.phone || '',
      hospitalName: c.hospital?.name || '',
      hospitalCity: c.hospital?.city || '',
      hospitalState: c.hospital?.state || '',
      diagnosis: c.clinical?.diagnosis || '',
      admissionDate: c.clinical?.admission_date || '',
      dischargeDate: c.clinical?.discharge_date || '',
      nicuDays: c.clinical?.nicu_days || '',
      birthWeight: c.beneficiary?.birth_weight_kg || '',
      finalBillAmount: c.financial?.final_bill_amount || '',
      approvedAmount: c.financial?.approved_amount || '',
      caseStatus: c.case_status,
    }));
  },

  async getRejectionExportData() {
    const { data: rejections, error } = await supabase
      .from('rejection_reasons')
      .select(`
        *,
        case:cases!inner(
          case_number,
          hospital:hospitals(name),
          beneficiary:beneficiary_profiles(baby_name, dob)
        )
      `)
      .order('rejection_date', { ascending: false });

    if (error) throw error;

    return (rejections || []).map((r, index) => ({
      fySlNo: index + 1,
      nfiBn: r.case?.case_number || '',
      nameOfBeneficiary: r.case?.beneficiary?.baby_name || '',
      ageInDays: r.case?.beneficiary?.dob
        ? Math.floor((new Date().getTime() - new Date(r.case.beneficiary.dob).getTime()) / (1000 * 60 * 60 * 24))
        : '',
      hospital: r.case?.hospital?.name || '',
      reasonForRejection: r.reason_category || '',
      statusOfRejection: r.rejection_level || '',
      statusOfCommunication: r.communication_status || '',
      dateOfRejection: formatDateDMY(r.rejection_date),
      referringHospital: r.referring_hospital || '',
      remarks: r.detailed_reason || '',
    }));
  },

  async listHospitalProcessMaps() {
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

    return (data || []).map(row => ({
      mapId: row.id,
      hospitalId: row.hospital_id,
      hospitalName: row.hospital?.name || '',
      processType: row.process_type,
      isActive: row.is_active,
      effectiveFromDate: row.effective_from_date,
      updatedAt: row.updated_at,
    }));
  },

  async createHospitalProcessMap(data: {
    hospitalId: string;
    processType: string;
    isActive: boolean;
    effectiveFromDate: string;
  }) {
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
  },

  async updateHospitalProcessMap(mapId: string, updates: {
    processType?: string;
    isActive?: boolean;
    effectiveFromDate?: string;
  }) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.processType !== undefined) updateData.process_type = updates.processType;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.effectiveFromDate !== undefined) updateData.effective_from_date = updates.effectiveFromDate;

    const { data: row, error } = await supabase
      .from('hospital_process_maps')
      .update(updateData)
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
  },

  async deleteHospitalProcessMap(mapId: string) {
    const { error } = await supabase
      .from('hospital_process_maps')
      .delete()
      .eq('id', mapId);

    if (error) throw error;
  },
};
