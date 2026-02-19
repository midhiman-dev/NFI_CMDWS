import { AppStore } from '../types';
import { seedData } from './seedData';

const STORAGE_KEY = 'nfi_cmdws_store';

class MockStore {
  private data: AppStore;

  constructor() {
    this.data = this.loadFromStorage();
  }

  private loadFromStorage(): AppStore {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return seedData();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  resetToSeed(): void {
    this.data = seedData();
    this.saveToStorage();
  }

  getData(): AppStore {
    return JSON.parse(JSON.stringify(this.data));
  }

  getUsers() {
    return [...this.data.users];
  }

  getHospitals() {
    return [...this.data.hospitals];
  }

  getCases() {
    return [...this.data.cases];
  }

  getCaseById(caseId: string) {
    return this.data.cases.find((c) => c.caseId === caseId);
  }

  getChildProfile(caseId: string) {
    return this.data.childProfiles.find((cp) => cp.caseId === caseId);
  }

  getFamilyProfile(caseId: string) {
    return this.data.familyProfiles.find((fp) => fp.caseId === caseId);
  }

  getClinicalDetails(caseId: string) {
    return this.data.clinicalDetails.find((cd) => cd.caseId === caseId);
  }

  getFinancialDetails(caseId: string) {
    return this.data.financialDetails.find((fd) => fd.caseId === caseId);
  }

  getDocuments(caseId: string) {
    return this.data.documents.filter((d) => d.caseId === caseId);
  }

  getDocumentTemplates() {
    return [...this.data.documentTemplates];
  }

  getCommitteeDecision(caseId: string) {
    return this.data.committeeDecisions.find((cd) => cd.caseId === caseId);
  }

  getFundingInstallments(caseId: string) {
    return this.data.fundingInstallments.filter((fi) => fi.caseId === caseId);
  }

  getRejectionDetails(caseId: string) {
    return this.data.rejections.find((r) => r.caseId === caseId);
  }

  getBeniProgram(caseId: string) {
    return this.data.beniPrograms.find((bp) => bp.caseId === caseId);
  }

  getFollowupEvents(caseId: string) {
    return this.data.followupEvents.filter((fe) => fe.caseId === caseId);
  }

  getFollowupMetricDefs() {
    return [...this.data.followupMetricDefs];
  }

  getFollowupMetricValues(caseId: string) {
    return this.data.followupMetricValues.filter((fmv) => fmv.caseId === caseId);
  }

  getAuditEvents(caseId: string) {
    return this.data.auditEvents.filter((ae) => ae.caseId === caseId);
  }

  updateCase(caseId: string, updates: Partial<Omit<any, 'caseId'>>) {
    const idx = this.data.cases.findIndex((c) => c.caseId === caseId);
    if (idx >= 0) {
      this.data.cases[idx] = { ...this.data.cases[idx], ...updates, updatedAt: new Date().toISOString() };
      this.saveToStorage();
    }
  }

  addAuditEvent(event: Omit<any, 'eventId'>) {
    const newEvent = {
      ...event,
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    this.data.auditEvents.push(newEvent);
    this.saveToStorage();
  }

  updateDocument(docId: string, updates: Partial<any>) {
    const idx = this.data.documents.findIndex((d) => d.docId === docId);
    if (idx >= 0) {
      this.data.documents[idx] = { ...this.data.documents[idx], ...updates };
      this.saveToStorage();
    }
  }

  updateCommitteeDecision(caseId: string, updates: Partial<any>) {
    const idx = this.data.committeeDecisions.findIndex((cd) => cd.caseId === caseId);
    if (idx >= 0) {
      this.data.committeeDecisions[idx] = { ...this.data.committeeDecisions[idx], ...updates };
    } else {
      this.data.committeeDecisions.push({
        decisionId: `dec_${Date.now()}`,
        caseId,
        outcome: 'Pending',
        ...updates,
      });
    }
    this.saveToStorage();
  }

  addCase(caseData: any) {
    this.data.cases.push(caseData);
    this.saveToStorage();
  }

  addChildProfile(profile: any) {
    this.data.childProfiles.push(profile);
    this.saveToStorage();
  }

  addFamilyProfile(profile: any) {
    this.data.familyProfiles.push(profile);
    this.saveToStorage();
  }

  addClinicalDetails(details: any) {
    this.data.clinicalDetails.push(details);
    this.saveToStorage();
  }

  addFinancialDetails(details: any) {
    this.data.financialDetails.push(details);
    this.saveToStorage();
  }

  addDocument(doc: any) {
    this.data.documents.push(doc);
    this.saveToStorage();
  }

  getAllAuditEvents() {
    return [...this.data.auditEvents];
  }

  getAllDocuments() {
    return [...this.data.documents];
  }

  getAllFollowupEvents() {
    return [...this.data.followupEvents];
  }

  getAllFundingInstallments() {
    return [...this.data.fundingInstallments];
  }

  updateChildProfile(caseId: string, updates: Partial<any>) {
    const idx = this.data.childProfiles.findIndex((cp) => cp.caseId === caseId);
    if (idx >= 0) {
      this.data.childProfiles[idx] = { ...this.data.childProfiles[idx], ...updates };
      this.saveToStorage();
    }
  }

  updateFamilyProfile(caseId: string, updates: Partial<any>) {
    const idx = this.data.familyProfiles.findIndex((fp) => fp.caseId === caseId);
    if (idx >= 0) {
      this.data.familyProfiles[idx] = { ...this.data.familyProfiles[idx], ...updates };
      this.saveToStorage();
    }
  }

  updateClinicalDetails(caseId: string, updates: Partial<any>) {
    const idx = this.data.clinicalDetails.findIndex((cd) => cd.caseId === caseId);
    if (idx >= 0) {
      this.data.clinicalDetails[idx] = { ...this.data.clinicalDetails[idx], ...updates };
      this.saveToStorage();
    }
  }

  updateFinancialDetails(caseId: string, updates: Partial<any>) {
    const idx = this.data.financialDetails.findIndex((fd) => fd.caseId === caseId);
    if (idx >= 0) {
      this.data.financialDetails[idx] = { ...this.data.financialDetails[idx], ...updates };
      this.saveToStorage();
    }
  }
}

export const mockStore = new MockStore();
