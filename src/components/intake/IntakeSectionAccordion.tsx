import { ChevronDown, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { NfiButton } from '../design-system/NfiButton';
import { SectionStatus } from '../../utils/intakeValidation';

interface IntakeSectionAccordionProps {
  title: string;
  sectionId: string;
  status: SectionStatus;
  completionPercent: number;
  children: React.ReactNode;
  onSave: () => Promise<void>;
  errors?: Record<string, string>;
  isDirty?: boolean;
}

export function IntakeSectionAccordion({
  title,
  sectionId,
  status,
  completionPercent,
  children,
  onSave,
  errors = {},
  isDirty = false,
}: IntakeSectionAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;
  const isComplete = status === 'complete';
  const isInProgress = status === 'in_progress';

  return (
    <div className="border border-[var(--nfi-border)] rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-white hover:bg-[var(--nfi-bg-light)] transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3 flex-1 text-left">
          <ChevronDown
            size={20}
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--nfi-text)' }}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--nfi-text)]">{title}</h3>
            <p className="text-sm text-[var(--nfi-text-light)]">{completionPercent}% complete</p>
          </div>
          {isComplete ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={20} style={{ color: 'var(--nfi-success)' }} />
              <span className="text-sm font-medium text-[var(--nfi-success)]">Complete</span>
            </div>
          ) : isInProgress ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-amber-700">In progress</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--nfi-text-light)]">Not started</span>
            </div>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-[var(--nfi-border)] bg-[var(--nfi-bg-light)] p-6">
          <div className="space-y-4">
            {children}

            {hasErrors && (
              <div className="mt-4 p-4 bg-[var(--nfi-error-bg)] border border-[var(--nfi-error-border)] rounded-lg">
                <p className="text-sm font-medium text-[var(--nfi-error)]">Validation errors:</p>
                <ul className="mt-2 space-y-1">
                  {Object.entries(errors).map(([field, message]) => (
                    <li key={field} className="text-sm text-[var(--nfi-error)]">
                      • {message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--nfi-border)]">
              <NfiButton
                variant="secondary"
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                Close
              </NfiButton>
              <NfiButton
                variant="primary"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                loading={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Section'}
              </NfiButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
