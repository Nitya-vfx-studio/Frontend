import { useState, useEffect, useRef } from 'react'
import { getInvoices, createInvoice, updateInvoice, deleteInvoice, getProjects } from '../api'
import Modal from '../components/Modal'

const STATUS_COLOR = { paid: 'var(--success)', partial: 'var(--warning)', unpaid: 'var(--error)' }

function getInvoiceStatus(inv) {
  if (inv.paid >= inv.amount && inv.amount > 0) return 'paid'
  if (inv.paid > 0) return 'partial'
  return 'unpaid'
}

export default function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [previewInv, setPreviewInv] = useState(null)
  const [saving, setSaving] = useState(false)
  const printRef = useRef()

  const [form, setForm] = useState({
    project_id: '', invoice_no: '', invoice_date: '', due_date: '',
    pay_month: '', studio_name: 'Nitya VFX Studio', pay_pct: '100', amount: '', paid: '0', notes: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [invRes, projRes] = await Promise.all([getInvoices(), getProjects()])
      setInvoices(invRes.data)
      setProjects(projRes.data)
    } catch {}
    setLoading(false)
  }

  const updateCalculatedAmount = (projId, pctStr) => {
    if (!projId) {
      setForm(f => ({ ...f, amount: '', invoice_no: '' }))
      return
    }
    const pct = parseFloat(pctStr) || 100
    const p = projects.find(proj => String(proj.id) === String(projId))
    if (!p) return
    const base = (p.inhouse_cost || 0) + (p.outsource_cost || 0)

    // Auto generated invoice number
    const existing = invoices.filter(i => String(i.project_id) === String(projId)).length
    const prefix = p.name ? p.name.replace(/[^A-Z0-9]/gi, '').substring(0, 6).toUpperCase() : 'INV'
    const generatedNo = `${prefix}-M${String(new Date().getMonth() + 1).padStart(2, '0')}-${existing + 1}`

    setForm(f => ({
      ...f,
      amount: String(Math.round(base * (pct / 100))),
      invoice_no: generatedNo
    }))
  }

  const handleProjectChange = (val) => {
    setForm(f => {
      const next = { ...f, project_id: val }
      updateCalculatedAmount(val, next.pay_pct)
      return next
    })
  }

  const handlePctChange = (val) => {
    setForm(f => {
      const next = { ...f, pay_pct: val }
      updateCalculatedAmount(next.project_id, val)
      return next
    })
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.invoice_no) return
    setSaving(true)
    try {
      await createInvoice({
        project_id: form.project_id ? parseInt(form.project_id) : null,
        invoice_no: form.invoice_no,
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        pay_month: form.pay_month || null,
        studio_name: form.studio_name || 'Nitya VFX Studio',
        amount: parseFloat(form.amount) || 0,
        paid: parseFloat(form.paid) || 0,
        notes: form.notes || null,
      })
      setShowCreate(false)
      setForm({ project_id: '', invoice_no: '', invoice_date: '', due_date: '', pay_month: '', studio_name: 'Nitya VFX Studio', pay_pct: '100', amount: '', paid: '0', notes: '' })
      await loadData()
    } catch {}
    setSaving(false)
  }

  async function markPaid(inv) {
    try {
      await updateInvoice(inv.id, { paid: inv.amount })
      await loadData()
    } catch {}
  }

  async function handleDelete(id) {
    if (!confirm('Delete this invoice?')) return
    try { await deleteInvoice(id); await loadData() } catch {}
  }

  function printInvoice() {
    const el = printRef.current
    if (!el) return
    const win = window.open('', '_blank')
    win.document.write(`<html><head><title>Invoice</title><style>
      body { font-family: sans-serif; padding: 2rem; color: #111; background-color: #fff; }
      table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1rem; }
      th, td { padding: 10px 14px; border: 1px solid #ddd; text-align: left; }
      th { background: #f5f5f5; }
      .header { display: flex; justify-content: space-between; margin-bottom: 2rem; }
      .studio { font-size: 1.5rem; font-weight: 800; }
      .inv-meta { font-size: 0.85rem; color: #555; }
      .text-right { text-align: right; }
      .total-row { font-weight: 800; font-size: 1.1rem; color: #00d4ff; }
    </style></head><body>${el.innerHTML}</body></html>`)
    win.document.close()
    win.print()
  }

  const totalAmount = invoices.reduce((s, i) => s + (i.amount || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + (i.paid || 0), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>
            Total: ₹{Math.round(totalAmount).toLocaleString('en-IN')} · Received: ₹{Math.round(totalPaid).toLocaleString('en-IN')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Invoice</button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : invoices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <h3>No invoices yet</h3>
          <p>Create your first invoice above.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['Invoice #', 'Project / Client', 'Month', 'Date', 'Due', 'Amount', 'Paid', 'Balance', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const st = getInvoiceStatus(inv)
                const bal = (inv.amount || 0) - (inv.paid || 0)
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>{inv.invoice_no}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700 }}>{inv.project_name || '—'}</div>
                      {inv.client && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inv.client}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.pay_month || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.invoice_date || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{inv.due_date || '—'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>₹{inv.amount?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--success)' }}>₹{inv.paid?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: bal > 0 ? 'var(--error)' : 'var(--success)' }}>₹{bal.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${STATUS_COLOR[st]}22`, color: STATUS_COLOR[st], border: `1px solid ${STATUS_COLOR[st]}44` }}>
                        {st.charAt(0).toUpperCase() + st.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setPreviewInv(inv)} title="Preview">👁</button>
                        {st !== 'paid' && (
                          <button className="btn btn-success btn-sm" onClick={() => markPaid(inv)} title="Mark Paid">✓</button>
                        )}
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(inv.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal title="New Invoice" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-control" value={form.project_id} onChange={e => handleProjectChange(e.target.value)}>
                  <option value="">— none —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Month</label>
                <input type="month" className="form-control" value={form.pay_month} onChange={e => setForm(f => ({ ...f, pay_month: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Payment %</label>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input type="number" min="1" max="100" className="form-control" value={form.pay_pct} onChange={e => handlePctChange(e.target.value)} placeholder="100" />
                  <span className="text-muted">%</span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Invoice No. *</label>
                <input className="form-control" value={form.invoice_no} onChange={e => setForm(f => ({ ...f, invoice_no: e.target.value }))} placeholder="INV-001" required />
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Date</label>
                <input type="date" className="form-control" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-control" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Studio Name</label>
                <input className="form-control" value={form.studio_name} onChange={e => setForm(f => ({ ...f, studio_name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input type="number" className="form-control" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 100000" min="0" />
              </div>
              <div className="form-group">
                <label className="form-label">Amount Paid (₹)</label>
                <input type="number" className="form-control" value={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.value }))} min="0" />
              </div>
            </div>
            <div className="form-group mt-2">
              <label className="form-label">Notes / Terms</label>
              <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment due within 30 days. Bank details: ..." />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Preview Modal */}
      {previewInv && (
        <Modal title="Invoice Preview" onClose={() => setPreviewInv(null)}>
          <div ref={printRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{previewInv.studio_name || 'Nitya VFX Studio'}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tax Invoice</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div><strong>Invoice #:</strong> {previewInv.invoice_no}</div>
                {previewInv.invoice_date && <div><strong>Date:</strong> {previewInv.invoice_date}</div>}
                {previewInv.due_date && <div><strong>Due:</strong> {previewInv.due_date}</div>}
              </div>
            </div>
            {previewInv.project_name && (
              <div style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                <strong>Project:</strong> {previewInv.project_name}
                {previewInv.client && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>({previewInv.client})</span>}
              </div>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <thead>
                <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 8px' }}>
                    VFX Services{previewInv.pay_month ? ` — ${previewInv.pay_month}` : ''}
                    {previewInv.project_name ? ` (${previewInv.project_name})` : ''}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700 }}>₹{previewInv.amount?.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '8px', fontWeight: 700 }}>Total</td>
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>₹{previewInv.amount?.toLocaleString('en-IN')}</td>
                </tr>
                {previewInv.paid > 0 && (
                  <>
                    <tr>
                      <td style={{ padding: '4px 8px', color: 'var(--success)' }}>Amount Paid</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--success)' }}>₹{previewInv.paid?.toLocaleString('en-IN')}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '4px 8px', fontWeight: 700 }}>Balance Due</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--error)' }}>₹{((previewInv.amount || 0) - (previewInv.paid || 0)).toLocaleString('en-IN')}</td>
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
            {previewInv.notes && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                <strong>Notes:</strong> {previewInv.notes}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setPreviewInv(null)}>Close</button>
            <button className="btn btn-primary" onClick={printInvoice}>🖨 Print / Save PDF</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
