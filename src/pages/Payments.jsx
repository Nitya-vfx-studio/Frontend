import { useState, useEffect } from 'react'
import { getPayments, createPayment, deletePayment, getOutsource, getProjects } from '../api'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [projects, setProjects] = useState([])
  const [vendors, setVendors] = useState([])
  const [outsourceEntries, setOutsourceEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ vendor: '', pay_month: '', project_id: '', pay_pct: '100', amount: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [payRes, projRes, osRes] = await Promise.all([getPayments(), getProjects(), getOutsource({})])
      setPayments(payRes.data)
      setProjects(projRes.data)
      setOutsourceEntries(osRes.data)
      // Collect unique vendors from outsource entries
      const vSet = new Set(osRes.data.map(e => e.vendor))
      setVendors(Array.from(vSet).sort())
    } catch {}
    setLoading(false)
  }

  const updateCalculatedAmount = (vendor, projId, pctStr) => {
    if (!vendor || !projId) {
      setForm(f => ({ ...f, amount: '' }))
      return
    }
    const pct = parseFloat(pctStr) || 100
    const total = outsourceEntries
      .filter(e => e.vendor === vendor && String(e.project_id) === String(projId))
      .reduce((sum, e) => sum + (e.cost || 0), 0)
    setForm(f => ({ ...f, amount: String(Math.round(total * (pct / 100))) }))
  }

  const handleVendorChange = (val) => {
    setForm(f => {
      const next = { ...f, vendor: val }
      updateCalculatedAmount(val, next.project_id, next.pay_pct)
      return next
    })
  }

  const handleProjectChange = (val) => {
    setForm(f => {
      const next = { ...f, project_id: val }
      updateCalculatedAmount(next.vendor, val, next.pay_pct)
      return next
    })
  }

  const handlePctChange = (val) => {
    setForm(f => {
      const next = { ...f, pay_pct: val }
      updateCalculatedAmount(next.vendor, next.project_id, val)
      return next
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.vendor) return
    setSaving(true)
    try {
      await createPayment({
        vendor: form.vendor,
        pay_month: form.pay_month || null,
        project_id: form.project_id ? parseInt(form.project_id) : null,
        amount: parseFloat(form.amount) || 0,
        note: form.note || null,
      })
      setForm({ vendor: '', pay_month: '', project_id: '', pay_pct: '100', amount: '', note: '' })
      setMsg('Payment recorded!')
      setTimeout(() => setMsg(''), 3000)
      await loadData()
    } catch {}
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this payment?')) return
    try { await deletePayment(id); await loadData() } catch {}
  }

  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0)

  // Group by vendor
  const byVendor = {}
  for (const p of payments) {
    if (!byVendor[p.vendor]) byVendor[p.vendor] = []
    byVendor[p.vendor].push(p)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Outsource Payments</h1>
          <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: 2 }}>
            Total paid: ₹{Math.round(totalPaid).toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Record payment card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 800, marginBottom: '1rem', fontSize: '0.9rem' }}>Record Vendor Payment</div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Vendor</label>
            <input className="form-control" list="vendor-list" value={form.vendor} onChange={e => handleVendorChange(e.target.value)} placeholder="Select or type" required />
            <datalist id="vendor-list">
              {vendors.map(v => <option key={v} value={v} />)}
            </datalist>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Month</label>
            <input type="month" className="form-control" value={form.pay_month} onChange={e => setForm(f => ({ ...f, pay_month: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Project</label>
            <select className="form-control" value={form.project_id} onChange={e => handleProjectChange(e.target.value)}>
              <option value="">— none —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Pay %</label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="number" min="1" max="100" className="form-control" value={form.pay_pct} onChange={e => handlePctChange(e.target.value)} placeholder="100" />
              <span className="text-muted">%</span>
            </div>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Amount (₹)</label>
            <input type="number" className="form-control" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 15000" min="0" required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Note</label>
            <input className="form-control" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Advance payment" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ alignSelf: 'flex-end' }}>
            {saving ? '...' : '+ Record'}
          </button>
        </form>
        {msg && <div style={{ marginTop: 8, color: 'var(--success)', fontWeight: 700, fontSize: '0.8rem' }}>✓ {msg}</div>}
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <h3>No payments recorded</h3>
        </div>
      ) : (
        Object.entries(byVendor).map(([vendor, pays]) => {
          // Sum up contracted outsource costs for this vendor
          const contractTotal = outsourceEntries
            .filter(e => e.vendor === vendor)
            .reduce((sum, e) => sum + (e.cost || 0), 0)
          
          const vendorTotal = pays.reduce((s, p) => s + (p.amount || 0), 0)
          const balance = contractTotal - vendorTotal

          return (
            <div key={vendor} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '10px 10px 0 0', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ fontWeight: 800 }}>{vendor}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', fontFamily: 'monospace' }}>
                  <div style={{ color: 'var(--muted)' }}>Contract: <span style={{ fontWeight: 700, color: 'var(--text)' }}>₹{Math.round(contractTotal).toLocaleString('en-IN')}</span></div>
                  <div style={{ color: 'var(--success)' }}>Paid: <span style={{ fontWeight: 700 }}>₹{Math.round(vendorTotal).toLocaleString('en-IN')}</span></div>
                  <div style={{ color: balance > 0 ? 'var(--warning)' : 'var(--success)' }}>Balance: <span style={{ fontWeight: 700 }}>₹{Math.round(balance).toLocaleString('en-IN')}</span></div>
                </div>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '0 0 10px 10px', borderTop: 'none' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                      {['Month', 'Project', 'Amount', 'Note', 'Date', ''].map(h => (
                        <th key={h} style={{ padding: '8px 14px', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pays.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{p.pay_month || '—'}</td>
                        <td style={{ padding: '8px 14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.project_name || '—'}</td>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', color: 'var(--warning)', fontWeight: 700 }}>₹{p.amount?.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px 14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.note || '—'}</td>
                        <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.created_at?.slice(0, 10)}</td>
                        <td style={{ padding: '8px 14px' }}>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
