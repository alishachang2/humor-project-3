import { render, screen } from '@testing-library/react'
import { emptyStepForm, stepToForm, PromptText } from '@/app/flavors/page'

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
