import { STATUS_CLASSES } from '../config/constants'

export function DeptBadge({ status }) {
  const cssClass = STATUS_CLASSES.DEPT[status] || 'badge-pending'
  return <span className={`badge ${cssClass}`}>{status}</span>
}

export function FeedbackBadge({ status }) {
  const cssClass = STATUS_CLASSES.FEEDBACK[status] || 'badge-pending'
  return <span className={`badge ${cssClass}`}>{status}</span>
}

export function TaskBadge({ status }) {
  const cssClass = STATUS_CLASSES.TASK[status] || 'badge-pending'
  return <span className={`badge ${cssClass}`}>{status}</span>
}

export function RoleBadge({ role }) {
  return <span className={`badge badge-${role}`}>{role}</span>
}

const TASK_TO_DEPT = {
  roto:     { label: 'Roto',     val: s => s.status_roto },
  prep:     { label: 'Paint',    val: s => s.status_paint },
  paint:    { label: 'Paint',    val: s => s.status_paint },
  tracking: { label: 'Tracking', val: s => s.status_tracking },
  cg:       { label: 'CG',       val: s => s.status_cg },
  comp:     { label: 'Comp',     val: s => s.status_comp },
  dmp:      { label: 'CG',       val: s => s.status_cg },
  fx:       { label: 'CG',       val: s => s.status_cg },
}

export function PipelineTracker({ shot }) {
  const taskKey = (shot.task_name || '').toLowerCase()
  const matched = TASK_TO_DEPT[taskKey]

  const depts = matched
    ? [{ label: matched.label, val: matched.val(shot) }].filter(d => d.val !== 'N/A')
    : [
        { label: 'Roto',     val: shot.status_roto },
        { label: 'Paint',    val: shot.status_paint },
        { label: 'Tracking', val: shot.status_tracking },
        { label: 'CG',       val: shot.status_cg },
        { label: 'Comp',     val: shot.status_comp },
      ].filter(d => d.val !== 'N/A')

  return (
    <div className="pipeline">
      {depts.map((d) => {
        const cssClass = STATUS_CLASSES.DEPT[d.val] || 'badge-pending'
        return (
          <div key={d.label} className={`pipeline-step badge ${cssClass}`}>
            {d.label}: {d.val}
          </div>
        )
      })}
    </div>
  )
}
