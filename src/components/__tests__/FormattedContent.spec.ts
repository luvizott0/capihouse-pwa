import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import FormattedContent from '@/components/ui/FormattedContent.vue'
import { useExternalLinkStore } from '@/stores/externalLink'

describe('FormattedContent', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders plain text without mentions or links', () => {
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
    expect(wrapper.findAll('.external-link-anchor').length).toBe(0)
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

  it('renders @todos as a special badge without creating a router-link', () => {
    const wrapper = mount(FormattedContent, {
      props: { content: 'Atenção @todos, reunião hoje com @amigo!' },
      global: {
        stubs: {
          RouterLink: {
            template: '<a :href="to" class="mention-link"><slot /></a>',
            props: ['to'],
          },
        },
      },
    })

    const everyonePill = wrapper.find('.mention-everyone-pill')
    expect(everyonePill.exists()).toBe(true)
    expect(everyonePill.text()).toContain('@todos')

    const mentionLinks = wrapper.findAll('.mention-link')
    expect(mentionLinks.length).toBe(1)
    expect(mentionLinks[0]?.text()).toBe('@amigo')
  })

  it('detects and renders external https and http links', () => {
    const wrapper = mount(FormattedContent, {
      props: { content: 'Acesse https://capihouse.com.br e também http://exemplo.org para ver mais.' },
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    const linkAnchors = wrapper.findAll('.external-link-anchor')
    expect(linkAnchors.length).toBe(2)
    expect(linkAnchors[0]?.text()).toContain('https://capihouse.com.br')
    expect(linkAnchors[1]?.text()).toContain('http://exemplo.org')
  })

  it('detects www. links and normalizes to https', () => {
    const wrapper = mount(FormattedContent, {
      props: { content: 'Confira no www.youtube.com/watch?v=123 agora!' },
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    const linkAnchors = wrapper.findAll('.external-link-anchor')
    expect(linkAnchors.length).toBe(1)
    expect(linkAnchors[0]?.text()).toContain('www.youtube.com/watch?v=123')
    expect(linkAnchors[0]?.attributes('href')).toBe('https://www.youtube.com/watch?v=123')
  })

  it('excludes trailing punctuation like periods or exclamation marks from the link URL', () => {
    const wrapper = mount(FormattedContent, {
      props: { content: 'Visite https://google.com. É muito bom!' },
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    const linkAnchor = wrapper.find('.external-link-anchor')
    expect(linkAnchor.exists()).toBe(true)
    expect(linkAnchor.attributes('href')).toBe('https://google.com')
    // Punctuation is rendered as surrounding text
    expect(wrapper.text()).toContain('. É muito bom!')
  })

  it('clicking external link triggers externalLinkStore.open', async () => {
    const wrapper = mount(FormattedContent, {
      props: { content: 'Veja em https://github.com/luvizott0' },
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    const store = useExternalLinkStore()
    const openSpy = vi.spyOn(store, 'open')

    const linkAnchor = wrapper.find('.external-link-anchor')
    await linkAnchor.trigger('click')

    expect(openSpy).toHaveBeenCalledWith('https://github.com/luvizott0')
    expect(store.isOpen).toBe(true)
    expect(store.url).toBe('https://github.com/luvizott0')
  })

  it('does not render an inline copy button beside the external link', () => {
    const wrapper = mount(FormattedContent, {
      props: { content: 'Link: https://teste.com' },
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    const copyBtn = wrapper.find('.link-quick-copy-btn')
    expect(copyBtn.exists()).toBe(false)
  })
})