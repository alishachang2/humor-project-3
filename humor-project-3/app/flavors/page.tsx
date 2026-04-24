'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'


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

type LlmModel  = { id: number; name: string }
type ImageRow   = { id: string; url: string }
type ImageSet   = { id: number; slug: string; description: string | null; created_datetime_utc: string; images: ImageRow[] }

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

// ─── caption response parsing ─────────────────────────────────────────────────

export function parseCaptionsResponse(data: unknown): string[] {
  const list = Array.isArray(data) ? data : ((data as any)?.captions ?? (data as any)?.data ?? [])
  return (list as any[]).map(c => c.content ?? c.caption ?? JSON.stringify(c))
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
  const [imageSets, setImageSets]       = useState<ImageSet[]>([])
  const [imageSetsError, setImageSetsError] = useState('')
  const [showLibrary, setShowLibrary]   = useState(false)

  const [selectedFlavor, setSelectedFlavor] = useState<Flavor | null>(null)
  const [steps, setSteps]                   = useState<Step[]>([])
  const [stepsLoading, setStepsLoading]     = useState(false)

  const [showNewFlavor, setShowNewFlavor]   = useState(false)
  const [newFlavorSlug, setNewFlavorSlug]   = useState('')
  const [newFlavorDesc, setNewFlavorDesc]   = useState('')

  const [searchQuery, setSearchQuery]       = useState('')

  const [stepModal, setStepModal]           = useState<{ mode: 'add' | 'edit', step?: Step } | null>(null)
  const [stepForm, setStepForm]             = useState<StepForm>(emptyStepForm())

  const [testImageId, setTestImageId]       = useState('')
  const [generating, setGenerating]         = useState(false)
  const [captions, setCaptions]             = useState<string[]>([])
  const [genError, setGenError]             = useState('')
  const [uploading, setUploading]           = useState(false)
  const [uploadError, setUploadError]       = useState('')

  type SetRunRow = { imageId: string; url: string; status: 'pending' | 'running' | 'done' | 'error'; captions: string[]; error?: string }
  const [selectedTestSet, setSelectedTestSet] = useState<ImageSet | null>(null)
  const [setRunRows, setSetRunRows]           = useState<SetRunRow[]>([])
  const [setRunning, setSetRunning]           = useState(false)

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

      const [{ data: flavorData }, { data: modelData }, { data: imageData }, { data: setsRaw, error: setsError }] = await Promise.all([
        supabase.from('humor_flavors').select('*').order('created_datetime_utc', { ascending: false }),
        supabase.from('llm_models').select('id, name').order('name'),
        supabase.from('images').select('id, url').limit(50).order('created_datetime_utc', { ascending: false }),
        supabase.from('study_image_sets').select('id, slug, description, created_datetime_utc, study_image_set_image_mappings(images(id, url))').order('created_datetime_utc', { ascending: false }),
      ])

      setFlavors(flavorData ?? [])
      setModels(modelData ?? [])
      setImages(imageData ?? [])

      if (setsError) {
        setImageSetsError(`Image sets failed to load: ${setsError.message}`)
      } else {
        const normalized = (setsRaw ?? []).map((s: any) => ({
          id: s.id, slug: s.slug, description: s.description, created_datetime_utc: s.created_datetime_utc,
          images: (s.study_image_set_image_mappings ?? []).map((r: any) => r.images).filter(Boolean),
        }))
        setImageSets(normalized)
      }
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

      const res = await fetch('/api/generate-captions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId: testImageId, humorFlavorId: selectedFlavor?.id }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        // data.error is a boolean in the pipeline response — use data.message for the real text
        const msg = data?.message ?? data?.detail ?? (typeof data?.error === 'string' ? data.error : null) ?? `API error: ${res.status}`
        throw new Error(`Pipeline ${res.status}: ${msg}`)
      }

      // Pipeline inserts captions asynchronously — wait briefly before querying.
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Fetch the actual caption content directly from the captions table.
      const { data: rows, error: fetchErr } = await supabase
        .from('captions')
        .select('content')
        .eq('image_id', testImageId)
        .eq('humor_flavor_id', selectedFlavor?.id)
        .order('created_datetime_utc', { ascending: false })
        .limit(10)

      if (fetchErr) throw new Error(`Failed to load captions: ${fetchErr.message}`)
      const captionTexts = (rows ?? []).map((r: any) => r.content).filter(Boolean) as string[]
      if (captionTexts.length === 0) throw new Error('No captions returned — check that the image ID is valid and the pipeline is configured.')
      setCaptions(captionTexts)
    } catch (err: any) {
      setGenError(err.message || 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  // ── generate captions for full image set ─────────────────────────────────

  async function generateCaptionsForSet(set: ImageSet) {
    if (!selectedFlavor) return
    if (set.images.length === 0) { setGenError('This set has no images.'); return }

    setSelectedTestSet(set)
    setSetRunning(true)
    setSetRunRows(set.images.map(img => ({ imageId: img.id, url: img.url, status: 'pending', captions: [] })))

    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setGenError('Not logged in'); setSetRunning(false); return }

    for (const img of set.images) {
      setSetRunRows(prev => prev.map(r => r.imageId === img.id ? { ...r, status: 'running' } : r))

      try {
        const res = await fetch('/api/generate-captions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId: img.id, humorFlavorId: selectedFlavor.id }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          const msg = data?.message ?? data?.detail ?? (typeof data?.error === 'string' ? data.error : null) ?? `API error: ${res.status}`
          throw new Error(`Pipeline ${res.status}: ${msg}`)
        }

        await new Promise(resolve => setTimeout(resolve, 1500))

        const { data: rows } = await supabase
          .from('captions')
          .select('content')
          .eq('image_id', img.id)
          .eq('humor_flavor_id', selectedFlavor.id)
          .order('created_datetime_utc', { ascending: false })
          .limit(5)

        const texts = (rows ?? []).map((r: any) => r.content).filter(Boolean) as string[]
        setSetRunRows(prev => prev.map(r => r.imageId === img.id ? { ...r, status: 'done', captions: texts } : r))
      } catch (err: any) {
        setSetRunRows(prev => prev.map(r => r.imageId === img.id ? { ...r, status: 'error', error: err.message } : r))
      }
    }

    setSetRunning(false)
  }

  // ── upload image ─────────────────────────────────────────────────────────

  async function uploadImage(file: File) {
    setUploading(true); setUploadError('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const token = session.access_token
      const base = process.env.NEXT_PUBLIC_PIPELINE_URL

      // Step 1: get presigned S3 upload URL
      const presignRes = await fetch(`${base}/pipeline/generate-presigned-url`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type }),
      })
      if (!presignRes.ok) throw new Error(`Presign failed: ${presignRes.status}`)
      const { presignedUrl, cdnUrl } = await presignRes.json()

      // Step 2: upload bytes directly to S3
      const s3Res = await fetch(presignedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`)

      // Step 3: register the CDN URL with the pipeline
      const registerRes = await fetch(`${base}/pipeline/upload-image-from-url`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      })
      if (!registerRes.ok) throw new Error(`Register failed: ${registerRes.status}`)
      const { imageId } = await registerRes.json()

      setImages(prev => [{ id: imageId, url: cdnUrl }, ...prev])
      setTestImageId(imageId)
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
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
            {!selectedFlavor && (
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search flavors…"
                style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: 4, outline: 'none', width: 200 }}
              />
            )}
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
            {(() => {
              const q = searchQuery.trim().toLowerCase()
              const filtered = q
                ? flavors.filter(f => f.slug.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q))
                : flavors
              return (
                <>
                  {filtered.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                      {flavors.length === 0 ? 'No flavors yet. Create your first one!' : 'No flavors match your search.'}
                    </p>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {filtered.map(flavor => (
                      <div
                        key={flavor.id}
                        style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 18, backgroundColor: 'var(--bg2)', cursor: 'pointer', transition: 'border-color 0.15s' }}
                        onClick={() => openFlavor(flavor)}
                        className="flavor-card"
                      >
                        <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{flavor.slug}</p>
                        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5, marginBottom: 8, minHeight: 36 }}>
                          {flavor.description?.slice(0, 100) ?? '—'}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 14, letterSpacing: '0.04em' }}>
                          {new Date(flavor.created_datetime_utc).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                </>
              )
            })()}
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

              {(() => {
                const selectedImg = testImageId ? [...images, ...imageSets.flatMap(s => s.images)].find(i => i.id === testImageId) : null
                return (
                  <>
                    {selectedImg ? (
                      <div style={{ marginBottom: 14 }}>
                        <img
                          src={selectedImg.url}
                          alt="test"
                          style={{ width: '100%', borderRadius: 4, border: '1px solid var(--border)', maxHeight: 180, objectFit: 'cover', marginBottom: 8 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLibrary(true)}
                          style={{ width: '100%', padding: '6px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg)', color: 'var(--text2)', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                        >
                          Change Image
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowLibrary(true)}
                        style={{ width: '100%', marginBottom: 14, padding: '20px', fontSize: 12, border: '1px dashed var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text2)', cursor: 'pointer', textAlign: 'center' }}
                      >
                        <div style={{ fontSize: 22, marginBottom: 6 }}>🖼</div>
                        <div style={{ letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10 }}>Browse Image Library</div>
                      </button>
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

                    {/* Set run results */}
                    {setRunRows.length > 0 && (
                      <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <p style={{ fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text2)' }}>
                            {selectedTestSet?.slug} · {setRunRows.length} images
                          </p>
                          {setRunning && <span style={{ fontSize: 10, color: 'var(--accent)' }}>Running…</span>}
                        </div>
                        {setRunRows.map(row => (
                          <div key={row.imageId} style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg2)' }}>
                              <img src={row.url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }} />
                              <span style={{ fontSize: 10, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.imageId}</span>
                              <span style={{
                                fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                                color: row.status === 'done' ? '#27ae60' : row.status === 'error' ? '#c0392b' : row.status === 'running' ? 'var(--accent)' : 'var(--text2)',
                              }}>
                                {row.status === 'running' ? '●' : row.status === 'done' ? '✓' : row.status === 'error' ? '✗' : '·'} {row.status}
                              </span>
                            </div>
                            {row.status === 'error' && (
                              <p style={{ fontSize: 11, color: '#c0392b', padding: '6px 10px' }}>{row.error}</p>
                            )}
                            {row.captions.map((cap, i) => (
                              <div key={i} style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', fontSize: 12, lineHeight: 1.5 }}>
                                <span style={{ fontSize: 10, color: 'var(--text2)', marginRight: 6 }}>{i + 1}.</span>{cap}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
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

      {showLibrary && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 32, overflowY: 'auto' }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, width: '100%', maxWidth: 900, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <p style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 6 }}>Study Image Sets</p>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Study image set library</h2>
                <p style={{ fontSize: 13, color: 'var(--text2)' }}>Choose an image set to test your flavor.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text2)' }}>{imageSets.length} Sets</span>
                <button type="button" onClick={() => setShowLibrary(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text2)', lineHeight: 1 }}>×</button>
              </div>
            </div>

            {imageSetsError && <p style={{ fontSize: 12, color: '#c0392b', marginBottom: 16 }}>{imageSetsError}</p>}

            {/* Upload option at the top */}
            <div style={{ marginBottom: 20, padding: 16, border: '1px dashed var(--border)', borderRadius: 8 }}>
              <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 8 }}>Or upload your own</p>
              <label style={{ cursor: uploading ? 'default' : 'pointer' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }} />
                <span style={{ display: 'inline-block', padding: '7px 14px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 4, background: 'var(--bg2)', color: 'var(--text2)', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: uploading ? 'default' : 'pointer' }}>
                  {uploading ? 'Uploading…' : '+ Upload Image'}
                </span>
              </label>
              {uploadError && <p style={{ fontSize: 11, color: '#c0392b', marginTop: 8 }}>{uploadError}</p>}
              {images.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                  {images.map(img => (
                    <img key={img.id} src={img.url} alt="" title={`Image ${img.id}`}
                      onClick={() => { setTestImageId(img.id); setShowLibrary(false); setCaptions([]); setGenError('') }}
                      style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
                        border: testImageId === img.id ? '2px solid var(--accent)' : '2px solid transparent' }}
                    />
                  ))}
                </div>
              )}
            </div>

            {!imageSetsError && imageSets.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text2)' }}>No image sets found.</p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
              {imageSets.map(set => (
                <div key={set.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20, background: 'var(--bg2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <p style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: 4 }}>Image Set</p>
                      <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{set.slug}</p>
                      {set.description && (
                        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{set.description}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, marginLeft: 12 }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {set.images.length} {set.images.length === 1 ? 'Image' : 'Images'}
                      </span>
                      {set.images.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { generateCaptionsForSet(set); setShowLibrary(false) }}
                          style={{ fontSize: 10, padding: '5px 10px', border: '1px solid var(--accent)', borderRadius: 4, background: 'var(--accent)', color: '#fff', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                        >
                          Run Set
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                    {set.images.map(img => (
                      <img
                        key={img.id}
                        src={img.url}
                        alt=""
                        title={`Image ID ${img.id}`}
                        onClick={() => { setTestImageId(img.id); setShowLibrary(false); setCaptions([]); setGenError('') }}
                        style={{
                          width: 48, height: 48, objectFit: 'cover', borderRadius: 6,
                          border: testImageId === img.id ? '2px solid var(--accent)' : '2px solid transparent',
                          cursor: 'pointer', transition: 'opacity 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      />
                    ))}
                    {set.images.length === 0 && (
                      <p style={{ fontSize: 11, color: 'var(--text2)' }}>No images in this set.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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
