'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'

const API_BASE = 'https://api.almostcrackd.ai'

// ─── types ────────────────────────────────────────────────────────────────────

type Flavor = {
  id: number
  slug: string
  description: string | null
  is_pinned: boolean
  created_datetime_utc: string
}

type Step = {
  id: number
  humor_flavor_id: number
  order_by: number
  description: string | null
  llm_system_prompt: string | null
  llm_user_prompt: string | null
  llm_temperature: number | null
  llm_input_type_id: number | null
  llm_output_type_id: number | null
  llm_model_id: number | null
  humor_flavor_step_type_id: number | null
}

type LlmModel = { id: number; name: string }
type ImageRow  = { id: number; url: string }

const INPUT_TYPES  = [{ id: 1, label: 'Image + Text' }, { id: 2, label: 'Text Only' }]
const OUTPUT_TYPES = [{ id: 1, label: 'String' }, { id: 2, label: 'Array' }]
const STEP_TYPES   = [
  { id: 1, label: 'Celebrity Recognition' },
  { id: 2, label: 'Image' },
  { id: 3, label: 'General' },
]

// ─── small reusable UI ───────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 5 }}>{children}</p>
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string | number, onChange: (v: string) => void, placeholder?: string, type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: 4, outline: 'none' }}
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 4 }: { value: string, onChange: (v: string) => void, placeholder?: string, rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: 4, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
    />
  )
}

function Select({ value, onChange, options }: { value: string | number, onChange: (v: string) => void, options: { id: number | string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: 4, outline: 'none' }}
    >
      <option value="">— select —</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
    </select>
  )
}

function Btn({ children, onClick, variant = 'default', small }: { children: React.ReactNode, onClick: () => void, variant?: 'default' | 'primary' | 'danger' | 'ghost', small?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)' },
    primary: { background: 'var(--accent)', color: 'var(--accent-fg)', border: '1px solid var(--accent)' },
    danger:  { background: 'transparent', color: '#c0392b', border: '1px solid #f5c6c0' },
    ghost:   { background: 'transparent', color: 'var(--text2)', border: '1px solid var(--border)' },
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles[variant],
        padding: small ? '4px 10px' : '7px 14px',
        fontSize: small ? 10 : 11,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        borderRadius: 4,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function Modal({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <p style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text2)' }}>{title}</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text2)', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string, children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

// ─── step form ────────────────────────────────────────────────────────────────

export type StepForm = {
  description: string
  llm_system_prompt: string
  llm_user_prompt: string
  llm_temperature: string
  llm_input_type_id: string
  llm_output_type_id: string
  llm_model_id: string
  humor_flavor_step_type_id: string
}

export function emptyStepForm(): StepForm {
  return { description: '', llm_system_prompt: '', llm_user_prompt: '', llm_temperature: '0.7', llm_input_type_id: '', llm_output_type_id: '', llm_model_id: '', humor_flavor_step_type_id: '' }
}

export function stepToForm(step: Step): StepForm {
  return {
    description: step.description ?? '',
    llm_system_prompt: step.llm_system_prompt ?? '',
    llm_user_prompt: step.llm_user_prompt ?? '',
    llm_temperature: String(step.llm_temperature ?? 0.7),
    llm_input_type_id: String(step.llm_input_type_id ?? ''),
    llm_output_type_id: String(step.llm_output_type_id ?? ''),
    llm_model_id: String(step.llm_model_id ?? ''),
    humor_flavor_step_type_id: String(step.humor_flavor_step_type_id ?? ''),
  }
}

function StepFormFields({ form, setForm, models }: { form: StepForm, setForm: (f: StepForm) => void, models: LlmModel[] }) {
  const set = (key: keyof StepForm) => (v: string) => setForm({ ...form, [key]: v })
  return (
    <>
      <Field label="Description"><Input value={form.description} onChange={set('description')} placeholder="What does this step do?" /></Field>
      <Field label="Step Type"><Select value={form.humor_flavor_step_type_id} onChange={set('humor_flavor_step_type_id')} options={STEP_TYPES} /></Field>
      <Field label="Input Type"><Select value={form.llm_input_type_id} onChange={set('llm_input_type_id')} options={INPUT_TYPES} /></Field>
      <Field label="Output Type"><Select value={form.llm_output_type_id} onChange={set('llm_output_type_id')} options={OUTPUT_TYPES} /></Field>
      <Field label="Model"><Select value={form.llm_model_id} onChange={set('llm_model_id')} options={models.map(m => ({ id: m.id, label: m.name }))} /></Field>
      <Field label="Temperature (0–1)"><Input type="number" value={form.llm_temperature} onChange={set('llm_temperature')} /></Field>
      <Field label="System Prompt"><Textarea value={form.llm_system_prompt} onChange={set('llm_system_prompt')} placeholder="Sets the tone and constraints…" rows={5} /></Field>
      <Field label="User Prompt"><Textarea value={form.llm_user_prompt} onChange={set('llm_user_prompt')} placeholder="Specific instructions. Use ${variable} syntax." rows={5} /></Field>
    </>
  )
}

// ─── highlight ${variables} in prompts ───────────────────────────────────────

export function PromptText({ text }: { text: string }) {
  const parts = text.split(/(\$\{[^}]+\}|\$[a-zA-Z_]\w*)/g)
  return (
    <p style={{ fontSize: 12, color: 'var(--text)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, i) =>
        /^(\$\{[^}]+\}|\$[a-zA-Z_]\w*)$/.test(part)
          ? <span key={i} style={{ backgroundColor: '#fffbe6', color: '#b7791f', borderRadius: 2, padding: '1px 4px', fontFamily: 'monospace', fontSize: 11 }}>{part}</span>
          : part
      )}
    </p>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function FlavorsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const [loading, setLoading]           = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [flavors, setFlavors]           = useState<Flavor[]>([])
  const [models, setModels]             = useState<LlmModel[]>([])
  const [images, setImages]             = useState<ImageRow[]>([])

  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null)
  const [steps, setSteps]                   = useState<Step[]>([])
  const [stepsLoading, setStepsLoading]     = useState(false)

  const [showNewFlavor, setShowNewFlavor]   = useState(false)
  const [newFlavorSlug, setNewFlavorSlug]   = useState('')
  const [newFlavorDesc, setNewFlavorDesc]   = useState('')

  const [stepModal, setStepModal]           = useState<{ mode: 'add' | 'edit', step?: Step } | null>(null)
  const [stepForm, setStepForm]             = useState<StepForm>(emptyStepForm())

  const [testImageId, setTestImageId]       = useState('')
  const [generating, setGenerating]         = useState(false)
  const [captions, setCaptions]             = useState<string[]>([])
  const [genError, setGenError]             = useState('')

  // ── auth + data load ──────────────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin, is_matrix_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
        setUnauthorized(true); setLoading(false); return
      }

      const [{ data: flavorData }, { data: modelData }, { data: imageData }] = await Promise.all([
        supabase.from('humor_flavors').select('*').order('created_datetime_utc', { ascending: false }),
        supabase.from('llm_models').select('id, name').order('name'),
        supabase.from('images').select('id, url').limit(50).order('created_at', { ascending: false }),
      ])

      setFlavors(flavorData ?? [])
      setModels(modelData ?? [])
      setImages(imageData ?? [])
      setLoading(false)
    }
    init()
  }, [router])

  // ── flavor CRUD ───────────────────────────────────────────────────────────

  async function loadFlavors() {
    const supabase = createClient()
    const { data } = await supabase.from('humor_flavors').select('*').order('created_datetime_utc', { ascending: false })
    setFlavors(data ?? [])
  }

  async function createFlavor() {
    if (!newFlavorSlug.trim()) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('humor_flavors').insert({
      slug: newFlavorSlug.trim(),
      description: newFlavorDesc.trim() || null,
      created_by_user_id: user?.id,
      modified_by_user_id: user?.id,
    })
    setShowNewFlavor(false); setNewFlavorSlug(''); setNewFlavorDesc('')
    loadFlavors()
  }

  async function deleteFlavor(id: number) {
    if (!confirm('Delete this flavor and all its steps?')) return
    const supabase = createClient()
    await supabase.from('humor_flavor_steps').delete().eq('humor_flavor_id', id)
    await supabase.from('humor_flavors').delete().eq('id', id)
    if (selectedFlavor?.id === id) setSelectedFlavor(null)
    loadFlavors()
  }

  // ── steps ─────────────────────────────────────────────────────────────────

  const loadSteps = useCallback(async (flavorId: number) => {
    setStepsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('humor_flavor_steps')
      .select('*')
      .eq('humor_flavor_id', flavorId)
      .order('order_by', { ascending: true })
    setSteps(data ?? [])
    setStepsLoading(false)
  }, [])

  async function openFlavor(flavor: Flavor) {
    setSelectedFlavor(flavor)
    setCaptions([]); setGenError('')
    await loadSteps(flavor.id)
  }

  async function saveStep() {
    if (!selectedFlavor) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      humor_flavor_id: selectedFlavor.id,
      description: stepForm.description || null,
      llm_system_prompt: stepForm.llm_system_prompt || null,
      llm_user_prompt: stepForm.llm_user_prompt || null,
      llm_temperature: stepForm.llm_temperature ? Number(stepForm.llm_temperature) : null,
      llm_input_type_id: stepForm.llm_input_type_id ? Number(stepForm.llm_input_type_id) : null,
      llm_output_type_id: stepForm.llm_output_type_id ? Number(stepForm.llm_output_type_id) : null,
      llm_model_id: stepForm.llm_model_id ? Number(stepForm.llm_model_id) : null,
      humor_flavor_step_type_id: stepForm.humor_flavor_step_type_id ? Number(stepForm.humor_flavor_step_type_id) : null,
      modified_by_user_id: user?.id,
    }

    if (stepModal?.mode === 'edit' && stepModal.step) {
      await supabase.from('humor_flavor_steps').update(payload).eq('id', stepModal.step.id)
    } else {
      const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.order_by)) + 1 : 1
      await supabase.from('humor_flavor_steps').insert({ ...payload, order_by: nextOrder, created_by_user_id: user?.id })
    }

    setStepModal(null)
    loadSteps(selectedFlavor.id)
  }

  async function deleteStep(stepId: number) {
    if (!confirm('Delete this step?')) return
    const supabase = createClient()
    await supabase.from('humor_flavor_steps').delete().eq('id', stepId)
    if (selectedFlavor) loadSteps(selectedFlavor.id)
  }

  async function moveStep(stepId: number, direction: 'up' | 'down') {
    const idx = steps.findIndex(s => s.id === stepId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= steps.length) return

    const supabase = createClient()
    const a = steps[idx], b = steps[swapIdx]

    await Promise.all([
      supabase.from('humor_flavor_steps').update({ order_by: b.order_by }).eq('id', a.id),
      supabase.from('humor_flavor_steps').update({ order_by: a.order_by }).eq('id', b.id),
    ])

    if (selectedFlavor) loadSteps(selectedFlavor.id)
  }

  // ── generate captions ─────────────────────────────────────────────────────

  async function generateCaptions() {
    if (!testImageId) { setGenError('Please select an image first.'); return }
    setGenerating(true); setCaptions([]); setGenError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const res = await fetch(`${API_BASE}/pipeline/generate-captions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: Number(testImageId) }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const data = await res.json()
      const list = Array.isArray(data) ? data : (data.captions ?? data.data ?? [])
      setCaptions(list.map((c: any) => c.content ?? c.caption ?? JSON.stringify(c)))
    } catch (err: any) {
      setGenError(err.message || 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text2)', fontSize: 12 }}>Loading…</div>

  if (unauthorized) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <p style={{ fontSize: 13, color: 'var(--text)' }}>Access denied.</p>
      <p style={{ fontSize: 12, color: 'var(--text2)' }}>You need superadmin or matrix admin access.</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ height: 3, backgroundColor: 'var(--green)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 32px' }}>
          <div>
            <p style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 2 }}>Admin</p>
            <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {selectedFlavor ? <><span style={{ color: 'var(--text2)', cursor: 'pointer' }} onClick={() => setSelectedFlavor(null)}>Flavors</span> / <em>{selectedFlavor.slug}</em></> : <em>Flavors.</em>}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark')}
              style={{ background: 'none', border: '1px solid var(--border)', padding: '5px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--text2)', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}
            >
              {theme === 'dark' ? '☀ Light' : theme === 'light' ? '⊙ System' : '☾ Dark'}
            </button>
            {!selectedFlavor && <Btn variant="primary" onClick={() => setShowNewFlavor(true)}>+ New Flavor</Btn>}
            {selectedFlavor && <Btn variant="primary" onClick={() => { setStepForm(emptyStepForm()); setStepModal({ mode: 'add' }) }}>+ Add Step</Btn>}
          </div>
        </div>
      </div>

      <div style={{ padding: '28px 32px', flex: 1 }}>

        {!selectedFlavor && (
          <div>
            {flavors.length === 0 && <p style={{ fontSize: 12, color: 'var(--text2)' }}>No flavors yet. Create your first one!</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {flavors.map(flavor => (
                <div
                  key={flavor.id}
                  style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 18, backgroundColor: 'var(--bg2)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onClick={() => openFlavor(flavor)}
                  className="flavor-card"
                >
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{flavor.slug}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 14, minHeight: 36 }}>
                    {flavor.description?.slice(0, 100) ?? '—'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: 'var(--text2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>View steps →</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); deleteFlavor(flavor.id) }}
                      style={{ fontSize: 10, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFlavor && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>

            <div>
              <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 14 }}>
                Steps · {steps.length}
              </p>

              {stepsLoading && <p style={{ fontSize: 12, color: 'var(--text2)' }}>Loading…</p>}

              {!stepsLoading && steps.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>No steps yet. Add your first step!</p>
              )}

              {!stepsLoading && steps.map((step, idx) => (
                <div key={step.id} style={{ marginBottom: 8 }}>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', backgroundColor: 'var(--bg2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text)' }}>
                          Step {step.order_by}
                        </span>
                        {step.description && (
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{step.description.slice(0, 60)}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button type="button" onClick={() => moveStep(step.id, 'up')} disabled={idx === 0}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 7px', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--border)' : 'var(--text2)', fontSize: 12 }}>
                          ↑
                        </button>
                        <button type="button" onClick={() => moveStep(step.id, 'down')} disabled={idx === steps.length - 1}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '2px 7px', cursor: idx === steps.length - 1 ? 'default' : 'pointer', color: idx === steps.length - 1 ? 'var(--border)' : 'var(--text2)', fontSize: 12 }}>
                          ↓
                        </button>
                        <Btn small onClick={() => { setStepForm(stepToForm(step)); setStepModal({ mode: 'edit', step }) }}>Edit</Btn>
                        <Btn small variant="danger" onClick={() => deleteStep(step.id)}>Delete</Btn>
                      </div>
                    </div>

                    <div style={{ padding: '8px 14px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {step.llm_input_type_id && <MetaTag label="in" value={INPUT_TYPES.find(t => t.id === step.llm_input_type_id)?.label ?? String(step.llm_input_type_id)} />}
                      {step.llm_output_type_id && <MetaTag label="out" value={OUTPUT_TYPES.find(t => t.id === step.llm_output_type_id)?.label ?? String(step.llm_output_type_id)} />}
                      {step.llm_temperature != null && <MetaTag label="temp" value={String(step.llm_temperature)} />}
                      {step.llm_model_id && <MetaTag label="model" value={models.find(m => m.id === step.llm_model_id)?.name ?? String(step.llm_model_id)} />}
                    </div>

                    {step.llm_system_prompt && (
                      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}>
                        <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 6 }}>System Prompt</p>
                        <PromptText text={step.llm_system_prompt} />
                      </div>
                    )}
                    {step.llm_user_prompt && (
                      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', backgroundColor: '#f9fef0' }}>
                        <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 6 }}>User Prompt</p>
                        <PromptText text={step.llm_user_prompt} />
                      </div>
                    )}
                  </div>

                  {idx < steps.length - 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 16px' }}>
                      <div style={{ width: 1, height: 14, backgroundColor: 'var(--border)', marginLeft: 14 }} />
                      <span style={{ fontSize: 9, color: 'var(--text2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>output → next step</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 20, backgroundColor: 'var(--bg2)', position: 'sticky', top: 90 }}>
              <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 16 }}>Test Flavor</p>

              <Field label="Select Test Image">
                <select
                  value={testImageId}
                  onChange={e => setTestImageId(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: 4, outline: 'none' }}
                >
                  <option value="">— pick an image —</option>
                  {images.map(img => (
                    <option key={img.id} value={img.id}>ID {img.id}</option>
                  ))}
                </select>
              </Field>

              {testImageId && images.find(i => i.id === Number(testImageId))?.url && (
                <div style={{ marginBottom: 14 }}>
                  <img
                    src={images.find(i => i.id === Number(testImageId))!.url}
                    alt="test"
                    style={{ width: '100%', borderRadius: 4, border: '1px solid var(--border)', maxHeight: 180, objectFit: 'cover' }}
                  />
                </div>
              )}

              <Btn variant="primary" onClick={generateCaptions}>
                {generating ? 'Generating…' : 'Generate Captions'}
              </Btn>

              {genError && <p style={{ fontSize: 12, color: '#c0392b', marginTop: 12 }}>{genError}</p>}

              {captions.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 10 }}>
                    Captions · {captions.length}
                  </p>
                  {captions.map((cap, i) => (
                    <div key={i} style={{ padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 6, backgroundColor: 'var(--bg)', fontSize: 13, lineHeight: 1.5 }}>
                      <span style={{ fontSize: 10, color: 'var(--text2)', marginRight: 8 }}>{i + 1}.</span>
                      {cap}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showNewFlavor && (
        <Modal title="New Humor Flavor" onClose={() => setShowNewFlavor(false)}>
          <Field label="Slug (unique identifier)">
            <Input value={newFlavorSlug} onChange={setNewFlavorSlug} placeholder="e.g. stan-twitter" />
          </Field>
          <Field label="Description">
            <Textarea value={newFlavorDesc} onChange={setNewFlavorDesc} placeholder="What makes this flavor unique?" rows={3} />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn variant="primary" onClick={createFlavor}>Create Flavor</Btn>
            <Btn variant="ghost" onClick={() => setShowNewFlavor(false)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      {stepModal && (
        <Modal title={stepModal.mode === 'edit' ? 'Edit Step' : 'Add Step'} onClose={() => setStepModal(null)}>
          <StepFormFields form={stepForm} setForm={setStepForm} models={models} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Btn variant="primary" onClick={saveStep}>Save Step</Btn>
            <Btn variant="ghost" onClick={() => setStepModal(null)}>Cancel</Btn>
          </div>
        </Modal>
      )}

      <style>{`
        .flavor-card:hover { border-color: var(--text) !important; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function MetaTag({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontSize: 11, color: 'var(--text2)' }}>
      <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 9, marginRight: 4 }}>{label}</span>
      <strong style={{ color: 'var(--text)' }}>{value}</strong>
    </span>
  )
}
