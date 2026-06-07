// Shared option sets + colors for the shot dropdowns (extracted from ProjectDetail).
export const DEPT_STATUSES = ['Pending', 'WIP', 'Done', 'Approved', 'N/A']

export const TASK_OPTIONS = ['Roto', 'Prep', 'Paint', 'Tracking', 'CG', 'Comp', 'DMP', 'FX', 'Other']

export const STATUS_COLORS = {
  Pending:      { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  WIP:          { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  Done:         { bg: 'rgba(0,229,160,0.15)',   color: 'var(--green)' },
  Approved:     { bg: 'rgba(0,212,255,0.15)',   color: 'var(--accent)' },
  'N/A':        { bg: 'rgba(255,255,255,0.05)', color: 'var(--muted)' },
  'In-house':   { bg: 'rgba(0,212,255,0.12)',   color: 'var(--accent)' },
  'Outsourced': { bg: 'rgba(245,158,11,0.15)',  color: 'var(--coord)' },
}
