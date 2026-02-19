import { NfiModal } from './design-system/NfiModal';
import { NfiBadge } from './design-system/NfiBadge';
import { FileText, Calendar, User, HardDrive, File } from 'lucide-react';
import type { DocumentMetadata } from '../types';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentMetadata | null;
  caseRef?: string;
}

export function DocumentPreviewModal({ isOpen, onClose, document: doc, caseRef }: DocumentPreviewModalProps) {
  if (!doc) return null;

  const fileSizeDisplay = doc.size
    ? doc.size > 1024 * 1024
      ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB`
      : `${(doc.size / 1024).toFixed(1)} KB`
    : 'Unknown';

  return (
    <NfiModal isOpen={isOpen} onClose={onClose} title="Document Preview" size="md">
      <div className="space-y-6">
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-[var(--nfi-border)]">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <File size={24} className="text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[var(--nfi-text)] truncate">{doc.docType}</p>
            <p className="text-sm text-[var(--nfi-text-secondary)] truncate">{doc.fileName || 'No file attached'}</p>
          </div>
          <NfiBadge
            tone={
              doc.status === 'Verified' ? 'success'
                : doc.status === 'Uploaded' ? 'warning'
                : doc.status === 'Rejected' ? 'error'
                : 'neutral'
            }
          >
            {doc.status.replace('_', ' ')}
          </NfiBadge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-3 bg-white border border-[var(--nfi-border)] rounded-lg">
            <FileText size={18} className="text-[var(--nfi-text-secondary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[var(--nfi-text-secondary)] uppercase font-medium">File Type</p>
              <p className="text-sm font-medium text-[var(--nfi-text)]">
                {doc.fileType === 'application/pdf' ? 'PDF Document' : doc.fileType || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white border border-[var(--nfi-border)] rounded-lg">
            <HardDrive size={18} className="text-[var(--nfi-text-secondary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[var(--nfi-text-secondary)] uppercase font-medium">File Size</p>
              <p className="text-sm font-medium text-[var(--nfi-text)]">{fileSizeDisplay}</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white border border-[var(--nfi-border)] rounded-lg">
            <Calendar size={18} className="text-[var(--nfi-text-secondary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[var(--nfi-text-secondary)] uppercase font-medium">Uploaded At</p>
              <p className="text-sm font-medium text-[var(--nfi-text)]">
                {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-white border border-[var(--nfi-border)] rounded-lg">
            <User size={18} className="text-[var(--nfi-text-secondary)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[var(--nfi-text-secondary)] uppercase font-medium">Uploaded By</p>
              <p className="text-sm font-medium text-[var(--nfi-text)]">{doc.uploadedBy || 'N/A'}</p>
            </div>
          </div>
        </div>

        {doc.notes && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700 uppercase font-medium mb-1">Notes</p>
            <p className="text-sm text-yellow-800">{doc.notes}</p>
          </div>
        )}

        <div className="border border-[var(--nfi-border)] rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-[var(--nfi-border)]">
            <p className="text-xs font-medium text-[var(--nfi-text-secondary)] uppercase">Document Preview</p>
          </div>
          <div className="flex flex-col items-center justify-center py-12 px-6 bg-white">
            <div className="w-20 h-24 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
              <FileText size={32} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-[var(--nfi-text)] mb-1">{doc.docType}</p>
            {caseRef && (
              <p className="text-xs text-[var(--nfi-text-secondary)] mb-3">Case: {caseRef}</p>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <FileText size={12} />
              Metadata-based preview (prototype)
            </div>
          </div>
        </div>
      </div>
    </NfiModal>
  );
}
