import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import type { DoctorReview, IntakeCompleteness, User } from '../../types';
import { getSubmitGatingInfo } from '../../utils/submitGating';
import { NfiButton } from '../design-system/NfiButton';
import { NfiCard } from '../design-system/NfiCard';
import { useAppContext } from '../../App';
import { useToast } from '../design-system/Toast';

interface DoctorReviewTabProps {
  caseId: string;
  currentUser: User | null;
}

export function DoctorReviewTab({ caseId, currentUser }: DoctorReviewTabProps) {
  const { provider, mode } = useAppContext();
  const { showToast } = useToast();
  const [review, setReview] = useState<DoctorReview | null>(null);
  const [intakeCompleteness, setIntakeCompleteness] = useState<IntakeCompleteness | null>(null);
  const [clinicalReviewers, setClinicalReviewers] = useState<Array<{ userId: string; fullName: string; email: string }>>([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');
  const [submitComments, setSubmitComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = currentUser?.roles.includes('admin') || currentUser?.roles.includes('leadership');
  const isClinicalReviewer = !!currentUser?.roles.some((r) => r === 'clinical_reviewer' || r === 'clinical' || r === 'hospital_doctor');
  const isAssignedReviewer = isClinicalReviewer && review?.assignedToUserId === currentUser?.userId;

  useEffect(() => {
    loadData();
  }, [caseId]);

  async function loadData() {
    setError(null);
    try {
      setLoading(true);
      const [reviewResult, completenessResult, reviewersResult] = await Promise.allSettled([
        provider.getDoctorReview(caseId),
        provider.getIntakeCompleteness(caseId),
        provider.listUsersByRole('clinical_reviewer'),
      ]);

      const reviewData = reviewResult.status === 'fulfilled' ? reviewResult.value : null;
      setReview(reviewData);
      setSelectedReviewerId(reviewData?.assignedToUserId || '');

      if (completenessResult.status === 'fulfilled') {
        setIntakeCompleteness(completenessResult.value);
      } else {
        setIntakeCompleteness(null);
      }

      if (reviewersResult.status === 'fulfilled') {
        setClinicalReviewers(reviewersResult.value);
      } else {
        setClinicalReviewers([]);
      }

      if (reviewResult.status === 'rejected' || completenessResult.status === 'rejected' || reviewersResult.status === 'rejected') {
        if (mode === 'DB') {
          setError('Some clinical review data could not be loaded. Please check DB configuration and permissions.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignReviewer() {
    if (!selectedReviewerId) {
      setError('Please select a clinical reviewer');
      return;
    }

    try {
      await provider.assignDoctorReviewer(caseId, selectedReviewerId);
      await loadData();
      setError(null);
      showToast('Clinical reviewer assigned successfully', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign reviewer');
    }
  }

  async function handleSubmitReview(outcome: 'Approved' | 'Approved_With_Comments' | 'Returned') {
    if (!isAssignedReviewer) return;

    try {
      setIsSubmitting(true);
      const gatingInfo = getSubmitGatingInfo(intakeCompleteness, true, review);
      await provider.submitDoctorReview(
        caseId,
        outcome,
        outcome === 'Approved_With_Comments' ? submitComments : undefined,
        gatingInfo
      );
      await loadData();
      setSubmitComments('');
      setError(null);
      showToast('Clinical review submitted successfully', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <NfiCard>
        <div className="p-6 text-center text-[#6B7280]">Loading review data...</div>
      </NfiCard>
    );
  }

  return (
    <div className="space-y-6">
      <NfiCard title="Clinical Review Assignment">
        {isAdmin ? (
          <div className="space-y-4 p-6">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Assign to Clinical Reviewer
              </label>
              <select
                value={selectedReviewerId}
                onChange={(e) => setSelectedReviewerId(e.target.value)}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#156C78]"
              >
                <option value="">-- Select Reviewer --</option>
                {clinicalReviewers.map(r => (
                  <option key={r.userId} value={r.userId}>
                    {r.fullName} ({r.email})
                  </option>
                ))}
              </select>
              {clinicalReviewers.length === 0 && (
                <p className="text-sm text-[#6B7280] mt-2">No clinical reviewers available yet.</p>
              )}
            </div>
            <NfiButton
              onClick={handleAssignReviewer}
              disabled={!selectedReviewerId || clinicalReviewers.length === 0}
              variant="primary"
              size="sm"
            >
              Assign Reviewer
            </NfiButton>
          </div>
        ) : (
          <div className="p-6">
            {review?.assignedToName ? (
              <div className="flex items-center gap-2 text-[#156C78]">
                <CheckCircle size={18} />
                <span>Assigned to: <strong>{review.assignedToName}</strong></span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#F59E0B]">
                <Clock size={18} />
                <span>Not yet assigned</span>
              </div>
            )}
          </div>
        )}
      </NfiCard>

      {review?.assignedToName && (
        <NfiCard title="Review Status">
          <div className="p-6 space-y-4">
            {review.submittedAt ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-green-600" />
                  <span className="font-medium text-[#111827]">
                    Outcome: <span className="text-green-700">{review.outcome?.replace(/_/g, ' ')}</span>
                  </span>
                </div>
                <div className="text-sm text-[#6B7280]">
                  Submitted on: {new Date(review.submittedAt).toLocaleDateString()}
                </div>
                {review.comments && (
                  <div className="mt-3 p-3 bg-[#F3F4F6] rounded border border-[#E5E7EB]">
                    <p className="text-sm text-[#4B5563]"><strong>Comments:</strong> {review.comments}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[#F59E0B]">
                <Clock size={18} />
                <span>Awaiting clinical review submission</span>
              </div>
            )}
          </div>
        </NfiCard>
      )}

      {isAssignedReviewer && !review?.submittedAt && (
        <NfiCard title="Submit Clinical Review">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Review Comments (optional)
              </label>
              <textarea
                value={submitComments}
                onChange={(e) => setSubmitComments(e.target.value)}
                placeholder="Add any comments about this case..."
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#156C78] min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <NfiButton
                onClick={() => handleSubmitReview('Returned')}
                disabled={isSubmitting}
                variant="danger"
                size="sm"
              >
                Return for Revisions
              </NfiButton>
              <NfiButton
                onClick={() => handleSubmitReview('Approved')}
                disabled={isSubmitting}
                variant="primary"
                size="sm"
              >
                Approve
              </NfiButton>
              <NfiButton
                onClick={() => handleSubmitReview('Approved_With_Comments')}
                disabled={isSubmitting || !submitComments}
                variant="success"
                size="sm"
              >
                Approve with Comments
              </NfiButton>
            </div>
          </div>
        </NfiCard>
      )}

      {error && (
        <NfiCard>
          <div className="p-6 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={18} className="text-red-600" />
            <span className="text-red-700">{error}</span>
          </div>
        </NfiCard>
      )}
    </div>
  );
}
