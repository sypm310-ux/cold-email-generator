import { useState, useRef, useEffect } from 'react'
import './App.css'

const API_BASE = '/api'

const HISTORY_KEY = 'cold-email-history'

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveHistory(items) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
  } catch (_) {}
}

const TONE_OPTIONS = ['Direct', 'Friendly', 'Curious', 'Formal', 'Witty', 'Bold']

export default function App() {
  const [mode, setMode] = useState('cold') // 'cold' | 'followup' | 'sequence'
  const [tone, setTone] = useState('Direct')

  // Their info
  const [firstName, setFirstName] = useState('')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [hook, setHook] = useState('')

  // Your pitch
  const [productOrService, setProductOrService] = useState('')
  const [valueProp, setValueProp] = useState('')

  // Call to action
  const [cta, setCta] = useState('Ask for a 15-min call')

  // Follow-up fields
  const [originalSubject, setOriginalSubject] = useState('')
  const [originalBody, setOriginalBody] = useState('')
  const [followUpNumber, setFollowUpNumber] = useState(1)

  // Tone learning
  const [toneExamples, setToneExamples] = useState('')
  const [toneStatus, setToneStatus] = useState(null)
  const [toneLoading, setToneLoading] = useState(false)
  const [tonePreview, setTonePreview] = useState('')
  const [toneOpen, setToneOpen] = useState(false)

  // Generation state
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState([])
  const [activeVariant, setActiveVariant] = useState(0)
  const [error, setError] = useState(null)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [refineLoading, setRefineLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState(() => loadHistory())

  const leftScrollRef = useRef(null)
  useEffect(() => {
    if (mode === 'followup' && leftScrollRef.current) {
      leftScrollRef.current.scrollTop = 0
    }
  }, [mode])

  const activeEmail = variants[activeVariant] || null
  const activeBody = activeEmail?.body || ''

  function resetResults() {
    setVariants([])
    setActiveVariant(0)
    setError(null)
  }

  async function handleToneSave() {
    const text = toneExamples.trim()
    if (!text) return

    setToneLoading(true)
    setToneStatus(null)
    setTonePreview('')

    try {
      const res = await fetch(`${API_BASE}/tone-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examplesText: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to analyze style')

      setToneStatus('Style saved. New emails will mimic this tone.')
      if (data.profile) {
        const snippet = String(data.profile)
        setTonePreview(snippet.length > 400 ? `${snippet.slice(0, 400)}…` : snippet)
      }
    } catch (err) {
      setToneStatus(err.message)
    } finally {
      setToneLoading(false)
    }
  }

  function buildCommonPayload() {
    return {
      productOrService: productOrService.trim(),
      tone,
      firstName: firstName.trim() || undefined,
      role: role.trim() || undefined,
      company: company.trim() || undefined,
      hook: hook.trim() || undefined,
      valueProp: valueProp.trim() || undefined,
      cta: cta || undefined,
      extraContext:
        mode === 'sequence'
          ? 'This is part of a multi-email outbound sequence. Write a strong first email.'
          : undefined,
    }
  }

  async function generateVariants(e) {
    if (e) e.preventDefault()
    setError(null)
    resetResults()
    setLoading(true)

    try {
      const commonPayload = buildCommonPayload()

      const makeCold = () =>
        fetch(`${API_BASE}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(commonPayload),
        })

      const makeFollowUp = () =>
        fetch(`${API_BASE}/generate-follow-up`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalSubject: originalSubject.trim(),
            originalBody: originalBody.trim(),
            followUpNumber,
            ...commonPayload,
          }),
        })

      const requestFactory = mode === 'followup' ? makeFollowUp : makeCold

      const responses = await Promise.all([requestFactory(), requestFactory(), requestFactory()])
      const datas = await Promise.all(responses.map((r) => r.json()))

      const okVariants = datas
        .map((data, idx) => {
          if (!responses[idx].ok || !data?.subject || !data?.body) return null
          return { subject: data.subject, body: data.body }
        })
        .filter(Boolean)

      if (!okVariants.length) {
        throw new Error(datas[0]?.error || 'Failed to generate email')
      }

      setVariants(okVariants)
      setActiveVariant(0)
      setHasGenerated(true)

      const entry = {
        id: crypto.randomUUID?.() ?? `id-${Date.now()}`,
        subject: okVariants[0].subject,
        body: okVariants[0].body,
        createdAt: new Date().toISOString(),
      }
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, 100)
        saveHistory(next)
        return next
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function pasteFromVariant() {
    if (activeEmail) {
      setOriginalSubject(activeEmail.subject)
      setOriginalBody(activeEmail.body)
    }
  }

  async function handleRefine(operation) {
    if (!activeEmail) return
    setRefineLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: activeEmail.subject,
          body: activeEmail.body,
          operation,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to refine email')

      const next = [...variants]
      next[activeVariant] = { subject: data.subject, body: data.body }
      setVariants(next)
    } catch (err) {
      setError(err.message)
    } finally {
      setRefineLoading(false)
    }
  }

  function handleCopy() {
    if (!activeEmail) return
    const text = `Subject: ${activeEmail.subject}\n\n${activeEmail.body}`
    navigator.clipboard.writeText(text)
    setToast('✓ Copied to clipboard')
    setTimeout(() => setToast(null), 2000)
  }

  function openHistoryItem(item) {
    setVariants([{ subject: item.subject, body: item.body }])
    setActiveVariant(0)
    setHasGenerated(true)
    setHistoryOpen(false)
  }

  function deleteHistoryItem(id, e) {
    e.stopPropagation()
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id)
      saveHistory(next)
      return next
    })
  }

  function formatHistoryDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  const wordCount = activeBody
    ? activeBody
        .split(/\s+/)
        .map((w) => w.trim())
        .filter(Boolean).length
    : 0

  const paragraphCount = activeBody
    ? activeBody
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean).length
    : 0

  const avatarInitial = firstName?.trim()?.[0]?.toUpperCase() || 'Y'
  const recipientDisplay = firstName ? `${firstName} at ${company || 'their company'}` : 'your prospect'

  return (
    <div className="app">
      <header className="top-nav">
        <div className="nav-left">
          <div className="nav-logo">✉</div>
          <div className="nav-title">
            <div className="nav-title-main">Cold Outbound Lab</div>
            <div className="nav-title-sub">Powered by Gemini 2.5 Flash</div>
          </div>
        </div>
        <div className="nav-center">
          <div className="nav-modes" role="tablist" aria-label="Mode">
            {['cold', 'followup', 'sequence'].map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`nav-mode-btn ${mode === m ? 'active' : ''}`}
                onClick={() => {
                  setMode(m)
                  setError(null)
                  resetResults()
                }}
              >
                {m === 'cold' ? 'Cold email' : m === 'followup' ? 'Follow-up' : 'Sequence'}
              </button>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <button
            type="button"
            className="nav-ghost-btn"
            onClick={() => setHistoryOpen(true)}
          >
            History
          </button>
        </div>
      </header>

      <div className="layout">
        {/* Left column: inputs */}
        <aside className="col col-left">
          <div className="left-inner">
            <div className="left-scroll" ref={leftScrollRef}>
              <div className="sidebar-section s1">
                {/* TONE */}
                <div className="section-label">TONE</div>
                <div className="tone-pills">
                  {TONE_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`tone-pill ${tone === opt ? 'active' : ''}`}
                      onClick={() => setTone(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Follow-up context: show at top when in Follow-up mode so panel visibly changes */}
              {mode === 'followup' && (
                <div className="sidebar-section sidebar-section-followup">
                  <div className="section-label">FOLLOW-UP CONTEXT</div>
                  <div className="field-group">
                    <div className="field-label">
                      <span>Original subject</span>
                    </div>
                    <input
                      className="field-input"
                      type="text"
                      value={originalSubject}
                      onChange={(e) => setOriginalSubject(e.target.value)}
                      placeholder="Subject of the email you sent"
                    />
                  </div>
                  <div className="field-group">
                    <div className="field-label">
                      <span>Original email body</span>
                    </div>
                    <textarea
                      className="field-textarea"
                      value={originalBody}
                      onChange={(e) => setOriginalBody(e.target.value)}
                      placeholder="Paste the body of your first email here"
                      rows={4}
                    />
                  </div>
                  {activeEmail && (
                    <div className="field-group">
                      <button type="button" className="secondary-btn" onClick={pasteFromVariant}>
                        Use current email as original
                      </button>
                    </div>
                  )}
                  <div className="field-group">
                    <div className="field-label">
                      <span>Follow-up number</span>
                    </div>
                    <select
                      className="field-select"
                      value={followUpNumber}
                      onChange={(e) => setFollowUpNumber(Number(e.target.value))}
                    >
                      <option value={1}>1st follow-up</option>
                      <option value={2}>2nd follow-up</option>
                      <option value={3}>3rd follow-up</option>
                      <option value={4}>4th follow-up</option>
                      <option value={5}>5th follow-up</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="sidebar-section s2">
                {/* THEIR INFO */}
                <div className="section-label">THEIR INFO</div>
                <div className="field-group">
                  <div className="field-row">
                    <div className="field-group">
                      <div className="field-label">
                        <span>First name</span>
                      </div>
                      <input
                        className="field-input"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Alex"
                      />
                    </div>
                    <div className="field-group">
                      <div className="field-label">
                        <span>Role</span>
                      </div>
                      <input
                        className="field-input"
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        placeholder="e.g. VP Sales"
                      />
                    </div>
                  </div>
                </div>
                <div className="field-group">
                  <div className="field-label">
                    <span>Company</span>
                  </div>
                  <input
                    className="field-input"
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme SaaS"
                  />
                </div>
                <div className="field-group">
                  <div className="field-label">
                    <span>Hook</span>
                    <span className="field-hint">personalisation</span>
                  </div>
                  <textarea
                    className="field-textarea"
                    value={hook}
                    onChange={(e) => setHook(e.target.value)}
                    placeholder="Recent funding, new role, post they wrote, metric you can help with…"
                  />
                </div>
              </div>

              <div className="sidebar-section s3">
                {/* YOUR PITCH */}
                <div className="section-label">YOUR PITCH</div>
                <div className="field-group">
                  <div className="field-label">
                    <span>Product / service</span>
                  </div>
                  <input
                    className="field-input"
                    type="text"
                    value={productOrService}
                    onChange={(e) => setProductOrService(e.target.value)}
                    placeholder="e.g. Analytics co-pilot for B2B sales teams"
                    required
                  />
                </div>
                <div className="field-group">
                  <div className="field-label">
                    <span>Value prop</span>
                  </div>
                  <textarea
                    className="field-textarea"
                    value={valueProp}
                    onChange={(e) => setValueProp(e.target.value)}
                    placeholder="e.g. Cut time-to-insights from days to minutes, reduce churn by 20%…"
                  />
                </div>
              </div>

              <div className="sidebar-section s4">
                {/* CALL TO ACTION */}
                <div className="section-label">CALL TO ACTION</div>
                <div className="field-group">
                  <select
                    className="field-select cta-select"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                  >
                    <option>Ask for a 15-min call</option>
                    <option>Share a resource</option>
                    <option>Ask a qualifying question</option>
                    <option>Invite to demo</option>
                    <option>Custom…</option>
                  </select>
                </div>
              </div>

              <div className="sidebar-section s5">
                {/* Learn my writing style */}
                <button
                  type="button"
                  className="tone-accordion-toggle"
                  onClick={() => setToneOpen((x) => !x)}
                >
                  <span>✦ Learn my writing style</span>
                  <span className="tone-accordion-chevron">{toneOpen ? '▾' : '▸'}</span>
                </button>
                {toneOpen && (
                  <div className="tone-accordion-body">
                    <label className="tone-label">
                      <span>Previous emails (5–20)</span>
                      <textarea
                        className="tone-textarea"
                        value={toneExamples}
                        onChange={(e) => setToneExamples(e.target.value)}
                        placeholder="Paste 5–20 of your own emails here, separated by blank lines or ---"
                      />
                    </label>
                    <div className="tone-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={handleToneSave}
                        disabled={toneLoading || !toneExamples.trim()}
                      >
                        {toneLoading ? 'Analyzing…' : 'Analyse style'}
                      </button>
                    </div>
                    {toneStatus && <div className="tone-status">{toneStatus}</div>}
                    {tonePreview && <pre className="tone-preview">{tonePreview}</pre>}
                  </div>
                )}
              </div>
            </div>

            <div className="generate-bar">
              {error && <div className="tone-status">{error}</div>}
              <button
                type="button"
                className="generate-btn"
                onClick={generateVariants}
                disabled={loading || !productOrService.trim()}
              >
                {loading && <span className="generate-spinner" />}
                <span>
                  {loading ? 'Generating…' : hasGenerated ? 'Regenerate' : 'Generate email →'}
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* Center column: output */}
        <section className="col col-center">
          <div className="center-toolbar">
            <div className="variant-tabs">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`variant-tab ${activeVariant === idx ? 'active' : ''}`}
                  onClick={() => {
                    if (variants[idx]) setActiveVariant(idx)
                  }}
                  disabled={!variants[idx]}
                >
                  V{idx + 1}
                </button>
              ))}
            </div>
            <div className="refine-actions">
              <button
                type="button"
                className="refine-btn"
                onClick={() => handleRefine('shorter')}
                disabled={refineLoading || !activeEmail}
              >
                Shorter
              </button>
              <button
                type="button"
                className="refine-btn"
                onClick={() => handleRefine('punchier')}
                disabled={refineLoading || !activeEmail}
              >
                Punchier
              </button>
              <button
                type="button"
                className="refine-btn"
                onClick={() => handleRefine('more-formal')}
                disabled={refineLoading || !activeEmail}
              >
                More formal
              </button>
              <button
                type="button"
                className="refine-btn primary"
                onClick={handleCopy}
                disabled={!activeEmail}
              >
                Copy ↗
              </button>
            </div>
          </div>

          <div className={`email-preview-card${activeEmail ? ' has-email' : ''}`}>
            <div className="email-header">
              <div className="email-header-main">
                <div className="avatar">{avatarInitial}</div>
                <div className="email-meta">
                  <div className="email-meta-line">
                    You → {firstName || 'Prospect'}
                  </div>
                  <div className="email-meta-address">you@yourcompany.com</div>
                </div>
              </div>
              <div className="email-timestamp">Just now</div>
            </div>

            <div className="email-subject-label">SUBJECT</div>
            <div className="email-subject">
              {activeEmail ? activeEmail.subject : `Intro for ${recipientDisplay}`}
            </div>

            {activeEmail ? (
              <div className="email-body">{activeEmail.body}</div>
            ) : (
              <div className="email-body">
                <div className="skeleton-lines">
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                </div>
                <div className="skeleton-caption">Your email appears here</div>
              </div>
            )}
          </div>
        </section>

        {/* Right column: stats */}
        <aside className="col col-right">
          <div className="stats-section">
            <div className="stat-item">
              <div className="stat-number">{wordCount}</div>
              <div className="stat-label">words · under 90 is ideal</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">{paragraphCount}</div>
              <div className="stat-label">paragraphs · sweet spot</div>
            </div>
          </div>
        </aside>
      </div>

      {/* History drawer */}
      {historyOpen && (
        <div className="history-overlay" onClick={() => setHistoryOpen(false)} aria-hidden="false">
          <div
            className="history-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Email history"
          >
            <div className="history-header">
              <h2 className="history-title">History</h2>
              <button
                type="button"
                className="history-close"
                onClick={() => setHistoryOpen(false)}
                aria-label="Close history"
              >
                ×
              </button>
            </div>
            <div className="history-list">
              {history.length === 0 ? (
                <p className="history-empty">No saved emails yet. Generate one to see it here.</p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="history-item"
                    onClick={() => openHistoryItem(item)}
                  >
                    <div className="history-item-subject">
                      {item.subject.length > 52 ? `${item.subject.slice(0, 52)}…` : item.subject}
                    </div>
                    <div className="history-item-meta">
                      <span className="history-item-date">{formatHistoryDate(item.createdAt)}</span>
                      <button
                        type="button"
                        className="history-item-delete"
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                        aria-label="Delete this email"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
