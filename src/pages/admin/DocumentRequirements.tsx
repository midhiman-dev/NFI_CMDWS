import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { NfiCard } from '../../components/design-system/NfiCard';
import { NfiBadge } from '../../components/design-system/NfiBadge';
import { NfiButton } from '../../components/design-system/NfiButton';
import { NfiField } from '../../components/design-system/NfiField';
import { NfiModal } from '../../components/design-system/NfiModal';
import { useToast } from '../../components/design-system/Toast';
import { adminService } from '../../services/adminService';
import { Plus, Edit2, Trash2, FileCheck } from 'lucide-react';

const PROCESS_TYPES = ['New', 'Renewal', 'Revision'];
const CATEGORIES = ['GENERAL', 'MEDICAL', 'FINANCIAL', 'FINAL', 'COMMUNICATION'];

export function DocumentRequirements() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedCase, setSelectedCase] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    processType: '',
    category: '',
    docType: '',
    mandatoryFlag: false,
    conditionNotes: '',
    displayOrder: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [templatesData, casesData] = await Promise.all([
        adminService.getDocumentTemplates(),
        adminService.getAllCases(),
      ]);
      setTemplates(templatesData);
      setCases(casesData);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Failed to load data', 'error');
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      processType: '',
      category: '',
      docType: '',
      mandatoryFlag: false,
      conditionNotes: '',
      displayOrder: 0,
    });
    setShowModal(true);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      processType: template.processType,
      category: template.category,
      docType: template.docType,
      mandatoryFlag: template.mandatoryFlag,
      conditionNotes: template.conditionNotes || '',
      displayOrder: template.displayOrder,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.processType || !formData.category || !formData.docType) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingTemplate) {
        await adminService.updateDocumentTemplate(editingTemplate.templateId, formData);
        showToast('Template updated successfully', 'success');
      } else {
        await adminService.createDocumentTemplate(formData);
        showToast('Template created successfully', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving template:', error);
      showToast(error.message || 'Failed to save template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await adminService.deleteDocumentTemplate(templateId);
      showToast('Template deleted successfully', 'success');
      loadData();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      showToast(error.message || 'Failed to delete template', 'error');
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedCase) {
      showToast('Please select a case', 'error');
      return;
    }

    const caseData = cases.find(c => c.caseId === selectedCase);
    if (!caseData) return;

    setSubmitting(true);
    try {
      const count = await adminService.applyDocumentTemplateToCase(selectedCase, caseData.processType);
      showToast(`Added ${count} document checklist items to case`, 'success');
      setShowApplyModal(false);
      setSelectedCase('');
    } catch (error: any) {
      console.error('Error applying template:', error);
      showToast(error.message || 'Failed to apply template', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--nfi-text)]">Document Requirements</h1>
            <p className="text-[var(--nfi-text-secondary)] mt-1">Manage document requirement templates</p>
          </div>
          <div className="flex gap-3">
            <NfiButton variant="secondary" onClick={() => setShowApplyModal(true)}>
              <FileCheck size={16} className="mr-1" />
              Apply to Case
            </NfiButton>
            <NfiButton onClick={handleCreate}>
              <Plus size={16} className="mr-1" />
              Add Template
            </NfiButton>
          </div>
        </div>

        <NfiCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--nfi-border)]">
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Process Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Category</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Doc Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Mandatory</th>
                  <th className="text-left py-3 px-4 font-semibold text-[var(--nfi-text)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.templateId} className="border-b border-[var(--nfi-border)] hover:bg-gray-50">
                    <td className="py-3 px-4"><NfiBadge tone="accent">{template.processType}</NfiBadge></td>
                    <td className="py-3 px-4"><NfiBadge tone="neutral">{template.category}</NfiBadge></td>
                    <td className="py-3 px-4 font-medium text-[var(--nfi-text)]">{template.docType}</td>
                    <td className="py-3 px-4">
                      <NfiBadge tone={template.mandatoryFlag ? 'error' : 'neutral'}>
                        {template.mandatoryFlag ? 'Yes' : 'No'}
                      </NfiBadge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(template)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(template.templateId)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NfiCard>
      </div>

      <NfiModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTemplate ? 'Edit Template' : 'Create Template'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Process Type" required>
              <select
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.processType}
                onChange={(e) => setFormData({ ...formData, processType: e.target.value })}
              >
                <option value="">Select...</option>
                {PROCESS_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </NfiField>

            <NfiField label="Category" required>
              <select
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </NfiField>
          </div>

          <NfiField label="Document Type" required>
            <input
              type="text"
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={formData.docType}
              onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
            />
          </NfiField>

          <NfiField label="Condition Notes">
            <textarea
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              rows={3}
              value={formData.conditionNotes}
              onChange={(e) => setFormData({ ...formData, conditionNotes: e.target.value })}
            />
          </NfiField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NfiField label="Mandatory">
              <select
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.mandatoryFlag ? 'yes' : 'no'}
                onChange={(e) => setFormData({ ...formData, mandatoryFlag: e.target.value === 'yes' })}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </NfiField>

            <NfiField label="Display Order">
              <input
                type="number"
                className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </NfiField>
          </div>

          <div className="flex gap-3 pt-4">
            <NfiButton onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </NfiButton>
            <NfiButton variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </NfiButton>
          </div>
        </div>
      </NfiModal>

      <NfiModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        title="Apply Template to Case"
      >
        <div className="space-y-4">
          <p className="text-[var(--nfi-text-secondary)]">
            This will add missing document checklist items to the selected case based on its process type.
          </p>

          <NfiField label="Select Case" required>
            <select
              className="w-full px-3 py-2 border border-[var(--nfi-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--nfi-primary)]"
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value)}
            >
              <option value="">Select case...</option>
              {cases.map((c) => (
                <option key={c.caseId} value={c.caseId}>
                  {c.caseNumber} - {c.babyName || 'Unnamed'} ({c.processType})
                </option>
              ))}
            </select>
          </NfiField>

          <div className="flex gap-3 pt-4">
            <NfiButton onClick={handleApplyTemplate} disabled={submitting}>
              {submitting ? 'Applying...' : 'Apply'}
            </NfiButton>
            <NfiButton variant="secondary" onClick={() => setShowApplyModal(false)}>
              Cancel
            </NfiButton>
          </div>
        </div>
      </NfiModal>
    </Layout>
  );
}
