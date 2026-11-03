// superadmin.helpers.test · borrador, validación y cuerpo de envío del formulario de administrador
import { describe, expect, it } from 'vitest'
import { initialDraft, toSaveInput, validateDraft } from './superadmin.helpers'
import type { AdminUser } from '../types/superadmin.types'

const admin: AdminUser = { id: 9, companyId: 3, email: 'a@x.co', firstName: 'Ana', isActive: false }

describe('initialDraft', () => {
  it('vacío para crear, con la primera empresa', () => expect(initialDraft(undefined, 4)).toMatchObject({ firstName: '', companyId: '4', isActive: true, documentType: 'CC' }))
  it('copia al administrador que se edita', () => expect(initialDraft(admin)).toMatchObject({ firstName: 'Ana', companyId: '3', isActive: false }))
})

describe('validateDraft', () => {
  const base = { ...initialDraft(undefined, 1), firstName: 'Ana', email: 'a@x.co', password: '12345678' }
  it('acepta un alta completa', () => expect(validateDraft(base, false)).toBeNull())
  it('exige nombre', () => expect(validateDraft({ ...base, firstName: ' ' }, false)).toMatch(/nombre/))
  it('exige correo al crear', () => expect(validateDraft({ ...base, email: '' }, false)).toMatch(/correo/))
  it('exige 8 caracteres al crear', () => expect(validateDraft({ ...base, password: '1234' }, false)).toMatch(/8 caracteres/))
  it('al editar la clave es opcional', () => expect(validateDraft({ ...base, email: '', password: '' }, true)).toBeNull())
  it('al editar una clave corta se rechaza', () => expect(validateDraft({ ...base, password: '123' }, true)).toMatch(/8 caracteres/))
  it('exige nombre de empresa si es nueva', () => expect(validateDraft({ ...base, companyMode: 'new' }, false)).toMatch(/empresa/))
  it('exige elegir empresa si es existente', () => expect(validateDraft({ ...base, companyId: '' }, false)).toMatch(/empresa/))
})

describe('toSaveInput', () => {
  const draft = { ...initialDraft(undefined, 2), firstName: ' Ana ', email: ' A@X.CO ', password: '12345678', document: ' ' }
  it('crear con empresa existente', () => expect(toSaveInput(draft)).toMatchObject({ companyId: 2, create: { firstName: 'Ana', email: 'a@x.co', document: undefined } }))
  it('crear con empresa nueva', () => {
    const input = toSaveInput({ ...draft, companyMode: 'new', company: { name: ' Norte ', phone: '', address: '', city: 'Cali' } })
    expect(input).toMatchObject({ newCompany: { name: 'Norte', phone: undefined, city: 'Cali' } })
  })
  it('editar manda solo lo editable y la clave si se escribió', () => {
    expect(toSaveInput({ ...draft, password: '' }, 9)).toMatchObject({ adminId: 9, update: { firstName: 'Ana', password: undefined } })
  })
})
