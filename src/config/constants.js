export const ROLES = [
  { value: 'admin',       label: '🛡️ Admin',       hint: 'Full access to all features' },
  { value: 'coordinator', label: '🎯 Coordinator',  hint: 'Manage shots, artists and projects' },
  { value: 'artist',      label: '🎨 Artist',        hint: 'Time tracking and your assigned shots' },
]

export const DEPARTMENTS = ['Roto', 'Paint', 'Tracking', 'CG', 'Comp']

export const STATUS_CLASSES = {
  // Department / Shot status
  DEPT: {
    'Pending': 'badge-pending',
    'WIP': 'badge-wip',
    'Done': 'badge-done',
    'Approved': 'badge-approved',
    'N/A': 'badge-na',
  },
  // Feedback status
  FEEDBACK: {
    'Pending': 'badge-pending',
    'Approved': 'badge-approved',
    'Changes Required': 'badge-changes',
    'No Feedback': 'badge-no-feedback',
  },
  // Task status
  TASK: {
    'Pending': 'badge-pending',
    'WIP': 'badge-wip',
    'Resolved': 'badge-resolved',
    'Approved': 'badge-approved',
    'Changes Req.': 'badge-changes',
  }
}
