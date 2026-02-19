import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SeedData {
  hospitals: any[];
  users: any[];
  cases: any[];
  beneficiaryProfiles: any[];
  familyProfiles: any[];
  clinicalDetails: any[];
  financialDetails: any[];
  documentTemplates: any[];
  documents: any[];
  committeeReviews: any[];
  fundingInstallments: any[];
  beniPrograms: any[];
  followupMilestones: any[];
  followupMetricValues: any[];
  rejectionReasons: any[];
  auditEvents: any[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { seedData } = await req.json();

    console.log("Starting database reseed...");
    await clearAllData(supabase);
    console.log("Data cleared");

    await seedAllData(supabase, seedData);
    console.log("All data seeded successfully");

    await updateSeedVersion(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Database reseeded successfully",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Seeding error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function clearAllData(supabase: any) {
  const tables = [
    "followup_metric_values",
    "followup_metric_definitions",
    "followup_milestones",
    "beni_program_ops",
    "funding_installments",
    "rejection_reasons",
    "committee_reviews",
    "audit_events",
    "followup_schedules",
    "document_metadata",
    "financial_case_details",
    "clinical_case_details",
    "family_profiles",
    "beneficiary_profiles",
    "cases",
    "document_templates",
    "bgrc_cycles",
    "users",
    "hospitals",
  ];

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    throw new Error("SUPABASE_DB_URL not found");
  }

  try {
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
    const client = new Client(dbUrl);
    await client.connect();

    for (const table of tables) {
      try {
        await client.queryObject(`DELETE FROM ${table}`);
        console.log(`Cleared ${table}`);
      } catch (err) {
        console.warn(`Warning clearing ${table}:`, err.message);
      }
    }

    await client.end();
  } catch (err) {
    console.error("Failed to clear data:", err);
    throw err;
  }
}

async function seedAllData(supabase: any, seedData: SeedData) {
  const hospitalMap = new Map<string, string>();
  const userMap = new Map<string, string>();
  const caseMap = new Map<string, string>();

  console.log("Starting hospital seeding...");
  await seedHospitals(supabase, seedData.hospitals, hospitalMap);

  console.log("Starting BGRC cycles seeding...");
  const bgrcCycleId = await seedBgrcCycles(supabase);

  console.log("Starting users seeding...");
  await seedUsers(supabase, seedData, hospitalMap, userMap);

  console.log("Starting cases seeding...");
  await seedCases(supabase, seedData.cases, hospitalMap, userMap, caseMap, bgrcCycleId);

  console.log("Starting beneficiary profiles seeding...");
  await seedBeneficiaryProfiles(supabase, seedData.beneficiaryProfiles, caseMap);

  console.log("Starting family profiles seeding...");
  await seedFamilyProfiles(supabase, seedData.familyProfiles, caseMap);

  console.log("Starting clinical details seeding...");
  await seedClinicalDetails(supabase, seedData.clinicalDetails, caseMap);

  console.log("Starting financial details seeding...");
  await seedFinancialDetails(supabase, seedData.financialDetails, caseMap);

  console.log("Starting document templates seeding...");
  await seedDocumentTemplates(supabase, seedData.documentTemplates);

  console.log("Starting documents seeding...");
  await seedDocuments(supabase, seedData.documents, caseMap, userMap);

  console.log("Starting committee reviews seeding...");
  await seedCommitteeReviews(supabase, seedData.committeeReviews, caseMap, userMap);

  console.log("Starting funding installments seeding...");
  await seedFundingInstallments(supabase, seedData.fundingInstallments, caseMap);

  console.log("Starting BENI programs seeding...");
  await seedBeniPrograms(supabase, seedData.beniPrograms, caseMap, userMap);

  console.log("Starting followup milestones seeding...");
  await seedFollowupMilestones(supabase, seedData.followupMilestones, caseMap);

  console.log("Starting followup metric values seeding...");
  await seedFollowupMetricValues(supabase, seedData.followupMetricValues, caseMap);

  console.log("Starting rejection reasons seeding...");
  await seedRejectionReasons(supabase, seedData.rejectionReasons, caseMap, userMap);

  console.log("Starting audit events seeding...");
  await seedAuditEvents(supabase, seedData.auditEvents, caseMap, userMap);
}

async function seedHospitals(
  supabase: any,
  hospitals: any[],
  hospitalMap: Map<string, string>
) {
  const hospitalsData = hospitals.map((h) => ({
    name: h.name,
    code: h.code,
    city: h.city,
    state: h.state,
    contact_person: `Contact - ${h.name}`,
    phone: "+91-" + String(Math.floor(Math.random() * 9000000000 + 1000000000)).slice(0, 10),
    email: `contact@${h.code.toLowerCase()}.com`,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from("hospitals")
    .insert(hospitalsData)
    .select("id, code");

  if (error) {
    throw new Error(`Failed to seed hospitals: ${error.message}`);
  }

  data?.forEach((h: any) => {
    const original = hospitals.find((oh) => oh.code === h.code);
    if (original) {
      hospitalMap.set(original.code, h.id);
    }
  });
}

async function seedBgrcCycles(supabase: any): Promise<string> {
  const cycles = [
    {
      cycle_name: "BGRC-2024-Q1",
      start_date: "2024-01-01",
      end_date: "2024-03-31",
      is_active: true,
    },
    {
      cycle_name: "BGRC-2024-Q2",
      start_date: "2024-04-01",
      end_date: "2024-06-30",
      is_active: true,
    },
  ];

  const { data, error } = await supabase
    .from("bgrc_cycles")
    .insert(cycles)
    .select("id");

  if (error) {
    throw new Error(`Failed to seed BGRC cycles: ${error.message}`);
  }

  return data?.[0]?.id || "";
}

async function seedUsers(
  supabase: any,
  seedData: any,
  hospitalMap: Map<string, string>,
  userMap: Map<string, string>
) {
  const insertUsers = seedData.users.map((u: any) => ({
    email: u.email,
    full_name: u.fullName,
    role: u.role,
    hospital_id: u.hospitalId ? hospitalMap.get(u.hospitalId.code) : null,
    is_active: true,
  }));

  const { data, error } = await supabase
    .from("users")
    .insert(insertUsers)
    .select("id, email");

  if (error) {
    throw new Error(`Failed to seed users: ${error.message}`);
  }

  data?.forEach((u: any) => {
    const original = seedData.users.find((ou: any) => ou.email === u.email);
    if (original) {
      userMap.set(original.email, u.id);
    }
  });
}

async function seedCases(
  supabase: any,
  caseList: any[],
  hospitalMap: Map<string, string>,
  userMap: Map<string, string>,
  caseMap: Map<string, string>,
  bgrcCycleId: string
) {
  const insertCases = caseList.map((c) => ({
    case_number: c.caseNumber,
    hospital_id: hospitalMap.get(c.hospitalId.code) || "",
    bgrc_cycle_id: bgrcCycleId,
    process_type: c.processType,
    case_status: c.caseStatus,
    created_by: Array.from(userMap.values())[0],
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
    last_action_at: c.lastActionAt.toISOString(),
    submitted_at: c.submittedAt?.toISOString() || null,
    reviewed_at: c.reviewedAt?.toISOString() || null,
    decision_at: c.decisionAt?.toISOString() || null,
  }));

  const { data, error } = await supabase
    .from("cases")
    .insert(insertCases)
    .select("id, case_number");

  if (error) {
    throw new Error(`Failed to seed cases: ${error.message}`);
  }

  data?.forEach((c: any) => {
    caseMap.set(c.case_number, c.id);
  });
}

async function seedBeneficiaryProfiles(
  supabase: any,
  profiles: any[],
  caseMap: Map<string, string>
) {
  const insertProfiles = profiles.map((p) => ({
    case_id: caseMap.get(p.caseId) || "",
    baby_name: p.babyName,
    gender: p.gender,
    dob: p.dob.toISOString().split("T")[0],
    birth_weight_kg: parseFloat(p.birthWeightKg.toFixed(3)),
    current_weight_kg: parseFloat(p.currentWeightKg.toFixed(3)),
    morbidity: p.morbidity,
    mortality: p.mortality,
  }));

  const { error } = await supabase.from("beneficiary_profiles").insert(insertProfiles);
  if (error) {
    throw new Error(`Failed to seed beneficiary profiles: ${error.message}`);
  }
}

async function seedFamilyProfiles(
  supabase: any,
  profiles: any[],
  caseMap: Map<string, string>
) {
  const insertProfiles = profiles.map((p) => ({
    case_id: caseMap.get(p.caseId) || "",
    father_name: p.fatherName,
    mother_name: p.motherName,
    phone: p.phone,
    address: p.address,
    city: p.city,
    state: p.state,
    pincode: p.pincode,
    income_band: p.incomeBand,
  }));

  const { error } = await supabase.from("family_profiles").insert(insertProfiles);
  if (error) {
    throw new Error(`Failed to seed family profiles: ${error.message}`);
  }
}

async function seedClinicalDetails(
  supabase: any,
  details: any[],
  caseMap: Map<string, string>
) {
  const insertDetails = details.map((d) => ({
    case_id: caseMap.get(d.caseId) || "",
    diagnosis: d.diagnosis,
    summary: d.summary,
    doctor_name: d.doctorName,
    nicu_days: d.nicuDays,
    admission_date: d.admissionDate.toISOString().split("T")[0],
    discharge_date: d.dischargeDate.toISOString().split("T")[0],
  }));

  const { error } = await supabase
    .from("clinical_case_details")
    .insert(insertDetails);
  if (error) {
    throw new Error(`Failed to seed clinical details: ${error.message}`);
  }
}

async function seedFinancialDetails(
  supabase: any,
  details: any[],
  caseMap: Map<string, string>
) {
  const insertDetails = details.map((d) => ({
    case_id: caseMap.get(d.caseId) || "",
    nicu_cost: d.nicuCost,
    pharmacy_cost: d.pharmacyCost,
    other_charges: d.otherCharges,
    total_billed: d.totalBilled,
    discount: d.discount,
    final_bill_amount: d.finalBillAmount,
    approved_amount: d.approvedAmount,
  }));

  const { error } = await supabase
    .from("financial_case_details")
    .insert(insertDetails);
  if (error) {
    throw new Error(`Failed to seed financial details: ${error.message}`);
  }
}

async function seedDocumentTemplates(supabase: any, templates: any[]) {
  const insertTemplates = templates.map((t) => ({
    process_type: t.processType,
    category: t.category,
    doc_type: t.docType,
    mandatory_flag: t.mandatoryFlag,
    display_order: t.displayOrder,
  }));

  const { error } = await supabase.from("document_templates").insert(insertTemplates);
  if (error) {
    throw new Error(`Failed to seed document templates: ${error.message}`);
  }
}

async function seedDocuments(
  supabase: any,
  documents: any[],
  caseMap: Map<string, string>,
  userMap: Map<string, string>
) {
  const insertDocuments = documents.map((d) => ({
    case_id: caseMap.get(d.caseId) || "",
    category: d.category,
    doc_type: d.docType,
    file_name: d.fileName,
    file_type: d.fileType,
    size: d.size,
    status: d.status,
    uploaded_at: d.uploadedAt?.toISOString() || null,
    uploaded_by: Array.from(userMap.values())[0],
    verified_at: d.verifiedAt?.toISOString() || null,
    verified_by: Array.from(userMap.values())[0],
    notes: d.notes,
    file_url: d.fileUrl,
  }));

  const { error } = await supabase.from("document_metadata").insert(insertDocuments);
  if (error) {
    throw new Error(`Failed to seed documents: ${error.message}`);
  }
}

async function seedCommitteeReviews(
  supabase: any,
  reviews: any[],
  caseMap: Map<string, string>,
  userMap: Map<string, string>
) {
  const insertReviews = reviews.map((r) => ({
    case_id: caseMap.get(r.caseId) || "",
    review_date: r.reviewDate.toISOString(),
    decision: r.decision,
    outcome: r.outcome,
    amount_sanctioned: r.approvedAmount,
    approved_amount: r.approvedAmount,
    remarks: r.remarks,
    reviewed_by: Array.from(userMap.values())[0],
    decision_date: r.decisionDate?.toISOString() || null,
    comments: r.comments,
  }));

  const { error } = await supabase.from("committee_reviews").insert(insertReviews);
  if (error) {
    throw new Error(`Failed to seed committee reviews: ${error.message}`);
  }
}

async function seedFundingInstallments(
  supabase: any,
  installments: any[],
  caseMap: Map<string, string>
) {
  const insertInstallments = installments.map((i) => ({
    case_id: caseMap.get(i.caseId) || "",
    label: i.label,
    amount: i.amount,
    due_date: i.dueDate.toISOString().split("T")[0],
    status: i.status,
  }));

  const { error } = await supabase
    .from("funding_installments")
    .insert(insertInstallments);
  if (error) {
    throw new Error(`Failed to seed funding installments: ${error.message}`);
  }
}

async function seedBeniPrograms(
  supabase: any,
  programs: any[],
  caseMap: Map<string, string>,
  userMap: Map<string, string>
) {
  const insertPrograms = programs.map((p) => ({
    case_id: caseMap.get(p.caseId) || "",
    beni_team_member:
      Array.from(userMap.values())[Math.floor(Math.random() * userMap.size)] || null,
    hamper_sent_date: p.hamperSentDate.toISOString().split("T")[0],
    voice_note_received_at: p.voiceNoteReceivedAt?.toISOString() || null,
    notes: p.notes,
  }));

  const { error } = await supabase.from("beni_program_ops").insert(insertPrograms);
  if (error) {
    throw new Error(`Failed to seed BENI programs: ${error.message}`);
  }
}

async function seedFollowupMilestones(
  supabase: any,
  milestones: any[],
  caseMap: Map<string, string>
) {
  const insertMilestones = milestones.map((m) => ({
    case_id: caseMap.get(m.caseId) || "",
    milestone_months: m.milestoneMonths,
    due_date: m.dueDate.toISOString().split("T")[0],
    followup_date: m.followupDate?.toISOString() || null,
    reached_flag: m.reachedFlag,
    completed: m.completed,
  }));

  const { error } = await supabase.from("followup_milestones").insert(insertMilestones);
  if (error) {
    throw new Error(`Failed to seed followup milestones: ${error.message}`);
  }
}

async function seedFollowupMetricValues(
  supabase: any,
  values: any[],
  caseMap: Map<string, string>
) {
  const insertValues = values.map((v) => ({
    case_id: caseMap.get(v.caseId) || "",
    milestone_months: v.milestoneMonths,
    metric_name: v.metricName,
    value_text: v.valueText,
    value_boolean: v.valueBoolean,
  }));

  if (insertValues.length > 0) {
    const { error } = await supabase
      .from("followup_metric_values")
      .insert(insertValues);
    if (error) {
      throw new Error(`Failed to seed followup metric values: ${error.message}`);
    }
  }
}

async function seedRejectionReasons(
  supabase: any,
  reasons: any[],
  caseMap: Map<string, string>,
  userMap: Map<string, string>
) {
  const insertReasons = reasons.map((r) => ({
    case_id: caseMap.get(r.caseId) || "",
    rejection_date: r.rejectionDate.toISOString(),
    reason_category: r.reasonCategory,
    detailed_reason: r.detailedReason,
    rejected_by: Array.from(userMap.values())[0],
    rejection_level: r.rejectionLevel,
    communication_status: r.communicationStatus,
    referring_hospital: r.referringHospital,
    case_summary: r.caseSummary,
  }));

  const { error } = await supabase.from("rejection_reasons").insert(insertReasons);
  if (error) {
    throw new Error(`Failed to seed rejection reasons: ${error.message}`);
  }
}

async function seedAuditEvents(
  supabase: any,
  events: any[],
  caseMap: Map<string, string>,
  userMap: Map<string, string>
) {
  const insertEvents = events.map((e) => ({
    case_id: caseMap.get(e.caseId) || "",
    timestamp: e.timestamp.toISOString(),
    user_id: Array.from(userMap.values())[0],
    user_role: e.userRole,
    action: e.action,
    notes: e.notes,
  }));

  const { error } = await supabase.from("audit_events").insert(insertEvents);
  if (error) {
    throw new Error(`Failed to seed audit events: ${error.message}`);
  }
}

async function updateSeedVersion(supabase: any) {
  const { error } = await supabase.from("app_settings").upsert({
    key: "seed_version",
    value: "1",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to update seed version: ${error.message}`);
  }
}
