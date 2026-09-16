import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FormattedContent from '@/components/ui/FormattedContent.vue'

describe('FormattedContent', () => {
  it('renders plain text without mentions', () => {
    const wrapper = mount(FormattedContent, {
      props: { content: 'Olá a todos da casa!' },
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    expect(wrapper.text()).toBe('Olá a todos da casa!')
    expect(wrapper.findAll('.mention-link').length).toBe(0)
  })

  it('detects and renders @mentions as links', () => {
    const wrapper = mount(FormattedContent, {
      props: { content: 'Olá @capivara_amiga, tudo bem?' },
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to" class="mention-link"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    const mentionLinks = wrapper.findAll('.mention-link')
    expect(mentionLinks.length).toBe(1)
    expect(mentionLinks[0]?.text()).toBe('@capivara_amiga')
    expect(mentionLinks[0]?.attributes('href')).toBe('/profile/capivara_amiga')
  })

  it('renders multiple @mentions correctly', () => {
    const wrapper = mount(FormattedContent, {
      props: { content: '@user1 e @user2 venham ver isso!' },
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to" class="mention-link"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    const mentionLinks = wrapper.findAll('.mention-link')
    expect(mentionLinks.length).toBe(2)
    expect(mentionLinks[0]?.text()).toBe('@user1')
    expect(mentionLinks[1]?.text()).toBe('@user2')
  })
})