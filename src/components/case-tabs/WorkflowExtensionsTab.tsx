import { useEffect, useMemo, useState } from 'react';
import { NfiCard } from '../design-system/NfiCard';
import { NfiField } from '../design-system/NfiField';
import { NfiButton } from '../design-system/NfiButton';
import { useToast } from '../design-system/Toast';
import { useAppContext } from '../../App';
import { caseService } from '../../services/caseService';
import { getAuthState } from '../../utils/auth';
import type { Case, User, UserRole, WorkflowExtensions } from '../../types';

interface Props {
  caseId: string;
  caseData: Case;
  currentUser: User | null;
  onUpdate: () => void;
}

const EMPTY_WORKFLOW: WorkflowExtensions = {};

function mergeWorkflow(base: WorkflowExtensions, patch: Partial<WorkflowExtensions>): WorkflowExtensions {
  return {
    ...base,
    ...patch,
    interview: {
      ...base.interview,
      ...patch.interview,
    },
    appeal: {
      ...base.appeal,
      ...patch.appeal,
    },
    funding: {
      ...base.funding,
      ...patch.funding,
      campaign: {
        ...base.funding?.campaign,
        ...patch.funding?.campaign,
      },
      sponsorQuantification: {
        ...base.funding?.sponsorQuantification,
        ...patch.funding?.sponsorQuantification,
      },
    },
  };
}

function parseNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function snippet(text?: string, maxLen = 100): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}...`;
}

export function WorkflowExtensionsTab({ caseId, caseData, currentUser, onUpdate }: Props) {
  const { provider } = useAppContext();
  const { showToast } = useToast();
  const authState = getAuthState();
  const [workflowExt, setWorkflowExt] = useState<WorkflowExtensions>(EMPTY_WORKFLOW);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [appealDecision, setAppealDecision] = useState<'Approved' | 'Rejected' | ''>('');
  const [directorDecision, setDirectorDecision] = useState<'Approved' | 'Returned' | ''>('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await provider.getWorkflowExt(caseId);
        if (!alive) return;
        const next = data || EMPTY_WORKFLOW;
        setWorkflowExt(next);
        setAppealDecision(next.appeal?.status === 'Approved' || next.appeal?.status === 'Rejected' ? next.appeal.status : '');
        setDirectorDecision(
          next.funding?.sponsorQuantification?.status === 'Approved'
            ? 'Approved'
            : next.funding?.sponsorQuantification?.status === 'Returned'
            ? 'Returned'
            : ''
        );
      } catch {
        if (alive) showToast('Failed to load workflow extensions', 'error');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [caseId, provider, showToast]);

  const actorUserId = currentUser?.userId || 'unknown';
  const actorName = currentUser?.fullName || 'Unknown User';
  const actorRole = (authState.activeRole || currentUser?.roles?.[0] || 'hospital_spoc') as UserRole;

  const hasAnyRole = (roles: UserRole[]) =>
    (authState.activeRole ? roles.includes(authState.activeRole) : false) ||
    !!currentUser?.roles?.some(role => roles.includes(role));

  const canEditBase = hasAnyRole(['verifier', 'admin', 'leadership']);
  const canDirectorDecide = hasAnyRole(['admin', 'leadership']);
  const isDraftCase = caseData.caseStatus === 'Draft';
  const canEditInterview = canEditBase && !isDraftCase;
  const canEditFunding = canEditBase;
  const canEditSponsorDraft = canEditBase;
  const showAppealCard = caseData.caseStatus === 'Rejected' || !!workflowExt.appeal?.requested;
  const showCampaignCard = canEditBase;
  const showDirectorSection = workflowExt.funding?.sponsorQuantification?.status === 'PendingDirectorApproval';

  const actorSummary = useMemo(() => `${actorName} (${actorRole})`, [actorName, actorRole]);

  async function persistAndAudit(patch: Partial<WorkflowExtensions>, action: string, notes: string) {
    setBusy(true);
    try {
      await provider.saveWorkflowExt(caseId, patch);
      setWorkflowExt(prev => mergeWorkflow(prev, patch));
      showToast('Saved successfully', 'success');
    } catch {
      showToast('Failed to save data', 'error');
      setBusy(false);
      return;
    }

    try {
      await caseService.addAuditEvent({
        caseId,
        userId: actorUserId,
        userRole: actorRole,
        action,
        notes,
        timestamp: new Date().toISOString(),
      });
    } catch {
      showToast('Data saved, but failed to write audit event', 'error');
    } finally {
      onUpdate();
      setBusy(false);
    }
  }

  async function saveInterviewDraft() {
    const patch: Partial<WorkflowExtensions> = {
      interview: {
        ...workflowExt.interview,
        status: workflowExt.interview?.status || 'NotStarted',
      },
    };
    await persistAndAudit(
      patch,
      'Interview saved',
      `${actorSummary} saved interview draft${workflowExt.interview?.outcome ? ` (outcome: ${workflowExt.interview.outcome})` : ''}.`
    );
  }

  async function completeInterview() {
    if (!workflowExt.interview?.outcome || !workflowExt.interview?.notes?.trim()) {
      showToast('Outcome and notes are required to complete interview', 'error');
      return;
    }
    const patch: Partial<WorkflowExtensions> = {
      interview: {
        ...workflowExt.interview,
        status: 'Completed',
        interviewedAt: new Date().toISOString(),
        interviewedByUserId: actorUserId,
        interviewedByName: actorName,
      },
    };
    await persistAndAudit(
      patch,
      `Interview completed: ${workflowExt.interview.outcome}`,
      `${actorSummary} completed interview with outcome ${workflowExt.interview.outcome}.`
    );
  }

  async function requestAppeal() {
    if (!workflowExt.appeal?.requestReason?.trim()) {
      showToast('Appeal request reason is required', 'error');
      return;
    }
    const patch: Partial<WorkflowExtensions> = {
      appeal: {
        ...workflowExt.appeal,
        requested: true,
        status: 'Pending',
        requestedAt: new Date().toISOString(),
        requestedByUserId: actorUserId,
        requestedByName: actorName,
      },
    };
    await persistAndAudit(
      patch,
      'Appeal requested',
      `${actorSummary} requested appeal. Reason: ${snippet(workflowExt.appeal.requestReason)}`
    );
  }

  async function saveAppealDecision() {
    if (!canDirectorDecide) return;
    if (!appealDecision) {
      showToast('Please select a decision', 'error');
      return;
    }
    if (!workflowExt.appeal?.decisionComments?.trim()) {
      showToast('Decision comments are required', 'error');
      return;
    }
    const patch: Partial<WorkflowExtensions> = {
      appeal: {
        ...workflowExt.appeal,
        status: appealDecision,
        decidedAt: new Date().toISOString(),
        decidedByUserId: actorUserId,
        decidedByName: actorName,
      },
    };
    await persistAndAudit(
      patch,
      appealDecision === 'Approved' ? 'Appeal approved' : 'Appeal rejected',
      `${actorSummary} ${appealDecision === 'Approved' ? 'approved' : 'rejected'} appeal. Comment: ${snippet(workflowExt.appeal.decisionComments)}`
    );
  }

  async function saveCampaign() {
    const patch: Partial<WorkflowExtensions> = {
      funding: {
        ...workflowExt.funding,
        campaign:
          workflowExt.funding?.channel === 'Campaign'
            ? {
                ...workflowExt.funding?.campaign,
                updatedAt: new Date().toISOString(),
              }
            : workflowExt.funding?.campaign,
      },
    };
    await persistAndAudit(
      patch,
      'Campaign updated',
      `${actorSummary} updated funding channel: ${workflowExt.funding?.channel || 'DirectSponsor'}${workflowExt.funding?.channel === 'Campaign' ? ` (status: ${workflowExt.funding?.campaign?.status || 'Draft'})` : ''}.`
    );
  }

  async function saveSponsorDraft() {
    const patch: Partial<WorkflowExtensions> = {
      funding: {
        ...workflowExt.funding,
        sponsorQuantification: {
          ...workflowExt.funding?.sponsorQuantification,
          status: workflowExt.funding?.sponsorQuantification?.status || 'NotStarted',
        },
      },
    };
    await persistAndAudit(
      patch,
      'Sponsor quantification saved',
      `${actorSummary} saved sponsor quantification draft.`
    );
  }

  async function submitSponsorForDirectorApproval() {
    const sponsorName = workflowExt.funding?.sponsorQuantification?.sponsorName?.trim();
    const proposedAmount = workflowExt.funding?.sponsorQuantification?.proposedAmount;
    if (!sponsorName || proposedAmount === undefined) {
      showToast('Sponsor name and proposed amount are required', 'error');
      return;
    }
    const patch: Partial<WorkflowExtensions> = {
      funding: {
        ...workflowExt.funding,
        sponsorQuantification: {
          ...workflowExt.funding?.sponsorQuantification,
          status: 'PendingDirectorApproval',
          submittedAt: new Date().toISOString(),
          submittedByUserId: actorUserId,
          submittedByName: actorName,
        },
      },
    };
    await persistAndAudit(
      patch,
      'Sponsor quantification submitted for director approval',
      `${actorSummary} submitted sponsor quantification for director approval.`
    );
  }

  async function saveDirectorSponsorDecision() {
    if (!canDirectorDecide || !showDirectorSection) return;
    if (!directorDecision) {
      showToast('Please select a director decision', 'error');
      return;
    }
    if (directorDecision === 'Returned' && !workflowExt.funding?.sponsorQuantification?.directorComments?.trim()) {
      showToast('Comments are required when returning quantification', 'error');
      return;
    }
    const patch: Partial<WorkflowExtensions> = {
      funding: {
        ...workflowExt.funding,
        sponsorQuantification: {
          ...workflowExt.funding?.sponsorQuantification,
          status: directorDecision,
          decidedAt: new Date().toISOString(),
          decidedByUserId: actorUserId,
          decidedByName: actorName,
        },
      },
    };
    await persistAndAudit(
      patch,
      directorDecision === 'Approved' ? 'Director approved sponsor quantification' : 'Director returned sponsor quantification',
      `${actorSummary} ${directorDecision === 'Approved' ? 'approved' : 'returned'} sponsor quantification.${workflowExt.funding?.sponsorQuantification?.directorComments ? ` Comment: ${snippet(workflowExt.funding.sponsorQuantification.directorComments)}` : ''}`
    );
  }

  if (loading) {
    return <div className="py-8 text-center text-[var(--nfi-text-secondary)]">Loading workflow extensions...</div>;
  }

  return (
    <div className="space-y-6">
      <NfiCard className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Beneficiary Interview</h3>
        {isDraftCase && (
          <p className="text-sm text-[var(--nfi-text-secondary)]">Interview is disabled while case is in Draft status.</p>
        )}
        <NfiField label="Outcome">
          <select
            className="nfi-input w-full"
            value={workflowExt.interview?.outcome || ''}
            disabled={!canEditInterview || busy}
            onChange={(e) =>
              setWorkflowExt(prev =>
                mergeWorkflow(prev, {
                  interview: {
                    ...prev.interview,
                    outcome: (e.target.value || undefined) as 'Proceed' | 'NeedFollowUp' | 'UnableToContact' | undefined,
                  },
                })
              )
            }
          >
            <option value="">Select outcome</option>
            <option value="Proceed">Proceed</option>
            <option value="NeedFollowUp">Need Follow-up</option>
            <option value="UnableToContact">Unable to contact</option>
          </select>
        </NfiField>
        <NfiField label="Notes">
          <textarea
            className="nfi-input w-full resize-none"
            rows={4}
            value={workflowExt.interview?.notes || ''}
            disabled={!canEditInterview || busy}
            onChange={(e) =>
              setWorkflowExt(prev =>
                mergeWorkflow(prev, {
                  interview: {
                    ...prev.interview,
                    notes: e.target.value,
                  },
                })
              )
            }
            placeholder="Enter interview notes"
          />
        </NfiField>
        <div className="flex gap-3">
          <NfiButton onClick={saveInterviewDraft} disabled={!canEditInterview || busy}>Save Draft</NfiButton>
          <NfiButton variant="secondary" onClick={completeInterview} disabled={!canEditInterview || busy}>
            Mark Interview Completed
          </NfiButton>
        </div>
      </NfiCard>

      {showAppealCard && (
        <NfiCard className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Appeal</h3>
          <NfiField label="Appeal Request Reason">
            <textarea
              className="nfi-input w-full resize-none"
              rows={3}
              value={workflowExt.appeal?.requestReason || ''}
              disabled={!canEditBase || busy || !!workflowExt.appeal?.requested}
              onChange={(e) =>
                setWorkflowExt(prev =>
                  mergeWorkflow(prev, {
                    appeal: {
                      ...prev.appeal,
                      requestReason: e.target.value,
                    },
                  })
                )
              }
              placeholder="Why is appeal requested?"
            />
          </NfiField>
          <NfiButton onClick={requestAppeal} disabled={!canEditBase || busy || !!workflowExt.appeal?.requested}>
            Request Appeal
          </NfiButton>

          {canDirectorDecide && (
            <div className="pt-4 border-t border-[var(--nfi-border)] space-y-4">
              <h4 className="font-medium text-[var(--nfi-text)]">Decision</h4>
              <NfiField label="Decision">
                <select
                  className="nfi-input w-full"
                  value={appealDecision}
                  disabled={busy}
                  onChange={(e) => setAppealDecision((e.target.value || '') as 'Approved' | 'Rejected' | '')}
                >
                  <option value="">Select decision</option>
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                </select>
              </NfiField>
              <NfiField label="Decision Comments">
                <textarea
                  className="nfi-input w-full resize-none"
                  rows={3}
                  value={workflowExt.appeal?.decisionComments || ''}
                  disabled={busy}
                  onChange={(e) =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        appeal: {
                          ...prev.appeal,
                          decisionComments: e.target.value,
                        },
                      })
                    )
                  }
                  placeholder="Decision comments"
                />
              </NfiField>
              <NfiButton onClick={saveAppealDecision} disabled={busy}>Save Decision</NfiButton>
            </div>
          )}
        </NfiCard>
      )}

      {showCampaignCard && (
        <NfiCard className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Campaign Variant</h3>
          <NfiField label="Funding Channel">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={(workflowExt.funding?.channel || 'DirectSponsor') === 'DirectSponsor'}
                  disabled={!canEditFunding || busy}
                  onChange={() =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        funding: {
                          ...prev.funding,
                          channel: 'DirectSponsor',
                        },
                      })
                    )
                  }
                />
                <span className="text-sm text-[var(--nfi-text)]">Direct Sponsor</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  checked={workflowExt.funding?.channel === 'Campaign'}
                  disabled={!canEditFunding || busy}
                  onChange={() =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        funding: {
                          ...prev.funding,
                          channel: 'Campaign',
                        },
                      })
                    )
                  }
                />
                <span className="text-sm text-[var(--nfi-text)]">Campaign</span>
              </label>
            </div>
          </NfiField>

          {workflowExt.funding?.channel === 'Campaign' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NfiField label="Campaign Name">
                <input
                  className="nfi-input w-full"
                  value={workflowExt.funding?.campaign?.campaignName || ''}
                  disabled={!canEditFunding || busy}
                  onChange={(e) =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        funding: {
                          ...prev.funding,
                          campaign: {
                            ...prev.funding?.campaign,
                            campaignName: e.target.value,
                          },
                        },
                      })
                    )
                  }
                />
              </NfiField>
              <NfiField label="Platform">
                <input
                  className="nfi-input w-full"
                  value={workflowExt.funding?.campaign?.platform || ''}
                  disabled={!canEditFunding || busy}
                  onChange={(e) =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        funding: {
                          ...prev.funding,
                          campaign: {
                            ...prev.funding?.campaign,
                            platform: e.target.value,
                          },
                        },
                      })
                    )
                  }
                />
              </NfiField>
              <NfiField label="Link">
                <input
                  className="nfi-input w-full"
                  value={workflowExt.funding?.campaign?.link || ''}
                  disabled={!canEditFunding || busy}
                  onChange={(e) =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        funding: {
                          ...prev.funding,
                          campaign: {
                            ...prev.funding?.campaign,
                            link: e.target.value,
                          },
                        },
                      })
                    )
                  }
                />
              </NfiField>
              <NfiField label="Status">
                <select
                  className="nfi-input w-full"
                  value={workflowExt.funding?.campaign?.status || 'Draft'}
                  disabled={!canEditFunding || busy}
                  onChange={(e) =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        funding: {
                          ...prev.funding,
                          campaign: {
                            ...prev.funding?.campaign,
                            status: e.target.value as 'Draft' | 'Active' | 'Closed',
                          },
                        },
                      })
                    )
                  }
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                </select>
              </NfiField>
              <NfiField label="Target Amount">
                <input
                  type="number"
                  className="nfi-input w-full"
                  value={workflowExt.funding?.campaign?.targetAmount ?? ''}
                  disabled={!canEditFunding || busy}
                  onChange={(e) =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        funding: {
                          ...prev.funding,
                          campaign: {
                            ...prev.funding?.campaign,
                            targetAmount: parseNumber(e.target.value),
                          },
                        },
                      })
                    )
                  }
                />
              </NfiField>
              <NfiField label="Raised Amount">
                <input
                  type="number"
                  className="nfi-input w-full"
                  value={workflowExt.funding?.campaign?.raisedAmount ?? ''}
                  disabled={!canEditFunding || busy}
                  onChange={(e) =>
                    setWorkflowExt(prev =>
                      mergeWorkflow(prev, {
                        funding: {
                          ...prev.funding,
                          campaign: {
                            ...prev.funding?.campaign,
                            raisedAmount: parseNumber(e.target.value),
                          },
                        },
                      })
                    )
                  }
                />
              </NfiField>
            </div>
          )}

          <NfiButton onClick={saveCampaign} disabled={!canEditFunding || busy}>Save</NfiButton>
        </NfiCard>
      )}

      <NfiCard className="space-y-4">
        <h3 className="text-lg font-semibold text-[var(--nfi-text)]">Sponsor Quantification + Director Approval</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NfiField label="Sponsor Name">
            <input
              className="nfi-input w-full"
              value={workflowExt.funding?.sponsorQuantification?.sponsorName || ''}
              disabled={!canEditSponsorDraft || busy}
              onChange={(e) =>
                setWorkflowExt(prev =>
                  mergeWorkflow(prev, {
                    funding: {
                      ...prev.funding,
                      sponsorQuantification: {
                        ...prev.funding?.sponsorQuantification,
                        sponsorName: e.target.value,
                      },
                    },
                  })
                )
              }
            />
          </NfiField>
          <NfiField label="Proposed Amount">
            <input
              type="number"
              className="nfi-input w-full"
              value={workflowExt.funding?.sponsorQuantification?.proposedAmount ?? ''}
              disabled={!canEditSponsorDraft || busy}
              onChange={(e) =>
                setWorkflowExt(prev =>
                  mergeWorkflow(prev, {
                    funding: {
                      ...prev.funding,
                      sponsorQuantification: {
                        ...prev.funding?.sponsorQuantification,
                        proposedAmount: parseNumber(e.target.value),
                      },
                    },
                  })
                )
              }
            />
          </NfiField>
        </div>
        <NfiField label="Notes">
          <textarea
            className="nfi-input w-full resize-none"
            rows={3}
            value={workflowExt.funding?.sponsorQuantification?.notes || ''}
            disabled={!canEditSponsorDraft || busy}
            onChange={(e) =>
              setWorkflowExt(prev =>
                mergeWorkflow(prev, {
                  funding: {
                    ...prev.funding,
                    sponsorQuantification: {
                      ...prev.funding?.sponsorQuantification,
                      notes: e.target.value,
                    },
                  },
                })
              )
            }
          />
        </NfiField>
        <div className="flex gap-3">
          <NfiButton onClick={saveSponsorDraft} disabled={!canEditSponsorDraft || busy}>Save Draft</NfiButton>
          <NfiButton variant="secondary" onClick={submitSponsorForDirectorApproval} disabled={!canEditSponsorDraft || busy}>
            Submit for Director Approval
          </NfiButton>
        </div>

        {showDirectorSection && (
          <div className="pt-4 border-t border-[var(--nfi-border)] space-y-4">
            <h4 className="font-medium text-[var(--nfi-text)]">Director Decision</h4>
            <NfiField label="Decision">
              <select
                className="nfi-input w-full"
                value={directorDecision}
                disabled={!canDirectorDecide || busy}
                onChange={(e) => setDirectorDecision((e.target.value || '') as 'Approved' | 'Returned' | '')}
              >
                <option value="">Select decision</option>
                <option value="Approved">Approve</option>
                <option value="Returned">Return</option>
              </select>
            </NfiField>
            <NfiField label="Comments">
              <textarea
                className="nfi-input w-full resize-none"
                rows={3}
                value={workflowExt.funding?.sponsorQuantification?.directorComments || ''}
                disabled={!canDirectorDecide || busy}
                onChange={(e) =>
                  setWorkflowExt(prev =>
                    mergeWorkflow(prev, {
                      funding: {
                        ...prev.funding,
                        sponsorQuantification: {
                          ...prev.funding?.sponsorQuantification,
                          directorComments: e.target.value,
                        },
                      },
                    })
                  )
                }
              />
            </NfiField>
            <NfiButton onClick={saveDirectorSponsorDecision} disabled={!canDirectorDecide || busy}>Save Decision</NfiButton>
          </div>
        )}
      </NfiCard>
    </div>
  );
}
