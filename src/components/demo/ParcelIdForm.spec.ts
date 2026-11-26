/**
 * @vitest-environment jsdom
 */
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

const locate = vi.fn()
vi.mock('@/lib/search/locateParcelById', () => ({ locateParcelById: locate }))
const { default: ParcelIdForm } = await import('@/components/demo/ParcelIdForm.vue')

afterEach(() => locate.mockReset())

async function submit(value: string) {
  const wrapper = mount(ParcelIdForm)
  await wrapper.find('input').setValue(value)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  return wrapper
}

describe('ParcelIdForm', () => {
  it('identifiant valide et parcelle trouvée : émet le point', async () => {
    locate.mockResolvedValue({ lon: 3.69, lat: 43.39 })
    const wrapper = await submit('34301000000AS0136')
    expect(locate).toHaveBeenCalledWith(expect.objectContaining({ dep: '34', section: 'AS' }))
    expect(wrapper.emitted('locate')?.[0]).toEqual([{ lon: 3.69, lat: 43.39 }])
    expect(wrapper.find('.fr-error-text').exists()).toBe(false)
  })

  it('format invalide : message d’erreur, pas de recherche', async () => {
    const wrapper = await submit('34_301_AS')
    expect(locate).not.toHaveBeenCalled()
    expect(wrapper.find('.fr-error-text').text()).toContain('34_301_000_000_AS_0136')
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })

  it('parcelle introuvable : message d’erreur', async () => {
    locate.mockResolvedValue(null)
    const wrapper = await submit('34_301_000_000_AS_9999')
    expect(wrapper.emitted('locate')).toBeUndefined()
    expect(wrapper.find('.fr-error-text').text()).toContain('introuvable')
  })
})
