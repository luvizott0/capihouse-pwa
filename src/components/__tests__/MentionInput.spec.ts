import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import MentionInput from '@/components/ui/MentionInput.vue'
import * as usersApi from '@/api/users'
import type { User } from '@/types/models'

vi.mock('@/api/users', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getUsers: vi.fn<() => any>(),
}))

describe('MentionInput', () => {
  const mockUsers: User[] = [
    {
      id: 1,
      name: 'Alice Cooper',
      username: 'alice',
      status: 'approved',
      role: 'user',
      email: 'alice@example.com',
      created_at: '',
      updated_at: '',
    } as unknown as User,
    {
      id: 2,
      name: 'Bob Marley',
      username: 'bob',
      status: 'approved',
      role: 'user',
      email: 'bob@example.com',
      created_at: '',
      updated_at: '',
    } as unknown as User,
  ]

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(usersApi.getUsers).mockResolvedValue({ data: mockUsers } as any)
  })

  it('renders textarea with modelValue', () => {
    const wrapper = mount(MentionInput, {
      props: {
        modelValue: 'Bio inicial',
        type: 'textarea',
      },
    })

    const textarea = wrapper.find('textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.element.value).toBe('Bio inicial')
  })

  it('triggers mention popup on typing @ and includes @todos by default', async () => {
    const wrapper = mount(MentionInput, {
      props: {
        modelValue: '',
        type: 'textarea',
      },
    })
    await flushPromises()

    const textarea = wrapper.find('textarea')
    textarea.element.value = 'Olá @'
    textarea.element.selectionStart = 5
    textarea.element.selectionEnd = 5
    await textarea.trigger('input')
    await flushPromises()

    expect(wrapper.find('.mention-dropdown').exists()).toBe(true)
    const items = wrapper.findAll('.mention-item')
    // First item should be @todos because allowEveryone defaults to true
    expect(items[0]?.text()).toContain('@todos')
  })

  it('excludes @todos when allowEveryone is false (e.g. for user bio)', async () => {
    const wrapper = mount(MentionInput, {
      props: {
        modelValue: '',
        type: 'textarea',
        allowEveryone: false,
      },
    })
    await flushPromises()

    const textarea = wrapper.find('textarea')
    textarea.element.value = 'Morando com @'
    textarea.element.selectionStart = 13
    textarea.element.selectionEnd = 13
    await textarea.trigger('input')
    await flushPromises()

    expect(wrapper.find('.mention-dropdown').exists()).toBe(true)
    const items = wrapper.findAll('.mention-item')
    // No @todos should be present
    const hasEveryone = items.some((item) => item.text().includes('@todos'))
    expect(hasEveryone).toBe(false)
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]?.text()).toContain('@alice')
  })
})
