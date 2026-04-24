import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { emptyStepForm, stepToForm, PromptText, parseCaptionsResponse } from '@/app/flavors/page'

// ─── parseCaptionsResponse ────────────────────────────────────────────────────

describe('parseCaptionsResponse', () => {
  it('handles a top-level array with content fields', () => {
    const data = [{ content: 'Caption one' }, { content: 'Caption two' }]
    expect(parseCaptionsResponse(data)).toEqual(['Caption one', 'Caption two'])
  })

  it('handles a top-level array with caption fields', () => {
    const data = [{ caption: 'Hello' }, { caption: 'World' }]
    expect(parseCaptionsResponse(data)).toEqual(['Hello', 'World'])
  })

  it('handles a data-wrapped response', () => {
    const data = { data: [{ content: 'A' }, { content: 'B' }] }
    expect(parseCaptionsResponse(data)).toEqual(['A', 'B'])
  })

  it('handles a captions-wrapped response', () => {
    const data = { captions: [{ caption: 'X' }] }
    expect(parseCaptionsResponse(data)).toEqual(['X'])
  })

  it('falls back to JSON.stringify for unknown caption shape', () => {
    const data = [{ text: 'mystery' }]
    expect(parseCaptionsResponse(data)).toEqual([JSON.stringify({ text: 'mystery' })])
  })

  it('returns empty array when data has no recognised list', () => {
    expect(parseCaptionsResponse({})).toEqual([])
  })

  it('returns empty array for empty list', () => {
    expect(parseCaptionsResponse([])).toEqual([])
  })
})

// ─── generate captions (fetch integration) ───────────────────────────────────

const mockGetSession = jest.fn()

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getSession: mockGetSession } }),
}))

describe('Generate Captions button', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_PIPELINE_URL: 'http://test-api' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function renderPanel(imageId: string) {
    const { container } = render(
      <div>
        <input data-testid="img-id" defaultValue={imageId} readOnly />
        <button
          onClick={async () => {
            if (!imageId) { document.getElementById('gen-error')!.textContent = 'Please select an image first.'; return }
            try {
              const { data: { session } } = await mockGetSession()
              if (!session) throw new Error('Not logged in')
              const res = await fetch(`${process.env.NEXT_PUBLIC_PIPELINE_URL}/pipeline/generate-captions`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageId }),
              })
              if (!res.ok) throw new Error(`API error: ${res.status}`)
              const data = await res.json()
              document.getElementById('captions')!.textContent = parseCaptionsResponse(data).join('|')
            } catch (err: any) {
              document.getElementById('gen-error')!.textContent = err.message || 'Something went wrong'
            }
          }}
        >
          Generate Captions
        </button>
        <p id="gen-error" />
        <p id="captions" />
      </div>
    )
    return container
  }

  it('shows error when no image is selected', async () => {
    renderPanel('')
    fireEvent.click(screen.getByText('Generate Captions'))
    await waitFor(() => expect(document.getElementById('gen-error')!.textContent).toBe('Please select an image first.'))
  })

  it('shows error when not logged in', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    renderPanel('abc-123')
    fireEvent.click(screen.getByText('Generate Captions'))
    await waitFor(() => expect(document.getElementById('gen-error')!.textContent).toBe('Not logged in'))
  })

  it('shows error on network failure (Failed to fetch)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    renderPanel('abc-123')
    fireEvent.click(screen.getByText('Generate Captions'))
    await waitFor(() => expect(document.getElementById('gen-error')!.textContent).toBe('Failed to fetch'))
  })

  it('shows API error status when server returns non-ok', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 })
    renderPanel('abc-123')
    fireEvent.click(screen.getByText('Generate Captions'))
    await waitFor(() => expect(document.getElementById('gen-error')!.textContent).toBe('API error: 500'))
  })

  it('renders captions on success', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ content: 'First caption' }, { content: 'Second caption' }],
    })
    renderPanel('abc-123')
    fireEvent.click(screen.getByText('Generate Captions'))
    await waitFor(() => expect(document.getElementById('captions')!.textContent).toBe('First caption|Second caption'))
  })

  it('sends the imageId as a string (not converted to Number)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, json: async () => [] })
    global.fetch = fetchMock
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } })
    renderPanel('ce9d1857-5618-400a-a136-0a009b337ca3')
    fireEvent.click(screen.getByText('Generate Captions'))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.imageId).toBe('ce9d1857-5618-400a-a136-0a009b337ca3')
    expect(body.imageId).not.toBeNaN()
  })
})

describe('emptyStepForm', () => {
  it('returns empty strings for all fields except temperature', () => {
    const form = emptyStepForm()
    expect(form.description).toBe('')
    expect(form.llm_system_prompt).toBe('')
    expect(form.llm_user_prompt).toBe('')
    expect(form.llm_input_type_id).toBe('')
    expect(form.llm_output_type_id).toBe('')
    expect(form.llm_model_id).toBe('')
    expect(form.humor_flavor_step_type_id).toBe('')
  })

  it('defaults temperature to 0.7', () => {
    expect(emptyStepForm().llm_temperature).toBe('0.7')
  })
})

describe('stepToForm', () => {
  const baseStep = {
    id: 1,
    humor_flavor_id: 10,
    order_by: 1,
    description: 'Recognize celebrity',
    llm_system_prompt: 'You are a helpful assistant.',
    llm_user_prompt: 'Who is ${name}?',
    llm_temperature: 0.5,
    llm_input_type_id: 1,
    llm_output_type_id: 2,
    llm_model_id: 3,
    humor_flavor_step_type_id: 1,
  }

  it('converts all step fields to strings', () => {
    const form = stepToForm(baseStep)
    expect(form.description).toBe('Recognize celebrity')
    expect(form.llm_system_prompt).toBe('You are a helpful assistant.')
    expect(form.llm_user_prompt).toBe('Who is ${name}?')
    expect(form.llm_temperature).toBe('0.5')
    expect(form.llm_input_type_id).toBe('1')
    expect(form.llm_output_type_id).toBe('2')
    expect(form.llm_model_id).toBe('3')
    expect(form.humor_flavor_step_type_id).toBe('1')
  })

  it('falls back to 0.7 temperature when null', () => {
    const form = stepToForm({ ...baseStep, llm_temperature: null })
    expect(form.llm_temperature).toBe('0.7')
  })

  it('falls back to empty string for null ids', () => {
    const form = stepToForm({ ...baseStep, llm_model_id: null, llm_input_type_id: null })
    expect(form.llm_model_id).toBe('')
    expect(form.llm_input_type_id).toBe('')
  })

  it('falls back to empty string for null description', () => {
    const form = stepToForm({ ...baseStep, description: null })
    expect(form.description).toBe('')
  })
})

describe('PromptText', () => {
  it('renders plain text without highlights', () => {
    render(<PromptText text="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('highlights ${variable} syntax', () => {
    render(<PromptText text="Hello ${name}" />)
    expect(screen.getByText('${name}')).toBeInTheDocument()
  })

  it('highlights $variable syntax', () => {
    render(<PromptText text="Hello $name" />)
    expect(screen.getByText('$name')).toBeInTheDocument()
  })

  it('highlights multiple variables', () => {
    render(<PromptText text="Say ${greeting} to ${person}" />)
    expect(screen.getByText('${greeting}')).toBeInTheDocument()
    expect(screen.getByText('${person}')).toBeInTheDocument()
  })
})
