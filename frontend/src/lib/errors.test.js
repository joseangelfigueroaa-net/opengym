import { describe, it, expect, beforeAll } from 'vitest'
import { setLang } from './i18n.js'
import { translateError } from './errors.js'

describe('server errors in Spanish', () => {
  beforeAll(() => setLang('es'))
  it('translates fixed phrases and leaves unknown ones as they are', () => {
    expect(translateError('not signed in')).toBe('No has iniciado sesión')
    expect(translateError('something new')).toBe('something new')
  })
  it('translates the messages built from numbers and fields, nested ones too', () => {
    expect(translateError('2026-10-25: exercise 2: sets must be a whole number from 1 to 10'))
      .toBe('2026-10-25: ejercicio 2: series debe ser un número entero de 1 a 10')
    expect(translateError('kg must be between 20 and 400')).toBe('peso debe estar entre 20 y 400')
  })
})
