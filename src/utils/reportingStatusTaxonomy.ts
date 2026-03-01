export type StatusGroup =
  | 'Draft'
  | 'In Review'
  | 'Submitted to Committee'
  | 'Approved'
  | 'Returned'
  | 'Rejected'
  | 'Closed'
  | 'Other';

export const STATUS_GROUP_LABELS: Record<StatusGroup, string> = {
  'Draft': 'Draft',
  'In Review': 'In Review',
  'Submitted to Committee': 'Submitted to Committee',
  'Approved': 'Approved',
  'Returned': 'Returned',
  'Rejected': 'Rejected',
  'Closed': 'Closed',
  'Other': 'Other',
};

export const STATUS_GROUP_ORDER: StatusGroup[] = [
  'Draft',
  'In Review',
  'Submitted to Committee',
  'Approved',
  'Returned',
  'Rejected',
  'Closed',
  'Other',
];

export function getStatusGroup(caseStatus: string): StatusGroup {
  const normalized = (caseStatus || '').trim().toLowerCase().replace(/[-\s]/g, '_');

  switch (normalized) {
    case 'draft':
      return 'Draft';

    case 'submitted':
    case 'under_verification':
    case 'under verification':
    case 'underverification':
      return 'Submitted to Committee';

    case 'under_review':
    case 'under review':
    case 'underreview':
    case 'in_review':
    case 'in review':
    case 'inreview':
    case 'in_progress':
    case 'in progress':
    case 'processing':
    case 'pending':
    case 'pending_review':
    case 'under_committee_review':
      return 'In Review';

    case 'approved':
      return 'Approved';

    case 'returned':
    case 'return':
    case 'needs_info':
    case 'needs info':
    case 'need_more_info':
    case 'need_info':
      return 'Returned';

    case 'rejected':
    case 'reject':
    case 'denied':
      return 'Rejected';

    case 'closed':
    case 'close':
    case 'completed':
    case 'disbursed':
    case 'settled':
      return 'Closed';

    default:
      return 'Other';
  }
}
