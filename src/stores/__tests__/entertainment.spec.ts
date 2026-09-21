/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEntertainmentStore } from '@/stores/entertainment'
import * as postsApi from '@/api/posts'

vi.mock('@/api/posts')
vi.mock('@/services/echo', () => ({
  connectEcho: vi.fn<any>(() => ({
    channel: vi.fn<any>(() => ({
      listen: vi.fn<any>().mockReturnThis(),
    })),
  })),
}))

describe('Entertainment Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  it('initializes with default values', () => {
    const store = useEntertainmentStore()
    expect(store.posts).toEqual([])
    expect(store.activeTab).toBe('movies')
    expect(store.isLoading).toBe(false)
  })

  it('fetches entertainment posts and populates state', async () => {
    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 101,
            user_id: 1,
            category: 'entertainment',
            entertainment_type: 'movie',
            content: 'Ótimo filme',
            metadata: {
              film_title: 'Oppenheimer',
              rating: 5,
            },
            likes_count: 2,
            comments_count: 0,
            is_liked: false,
          },
        ],
        current_page: 1,
        last_page: 1,
      },
    } as any)

    const store = useEntertainmentStore()
    await store.fetchEntertainmentPosts(1)

    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]!.id).toBe(101)
    expect(store.hasLoaded).toBe(true)
  })

  it('toggles like optimistically', async () => {
    const store = useEntertainmentStore()
    store.posts = [
      {
        id: 101,
        user_id: 1,
        category: 'entertainment',
        is_liked: false,
        likes_count: 2,
      } as any,
    ]

    vi.mocked(postsApi.toggleLike).mockResolvedValueOnce({
      data: {
        is_liked: true,
        likes_count: 3,
      },
    } as any)

    await store.toggleLike(101)

    expect(store.posts[0]!.is_liked).toBe(true)
    expect(store.posts[0]!.likes_count).toBe(3)
  })

  it('adds comment and increments comments_count', async () => {
    const store = useEntertainmentStore()
    store.posts = [
      {
        id: 101,
        comments_count: 0,
        comments: [],
      } as any,
    ]

    vi.mocked(postsApi.addComment).mockResolvedValueOnce({
      data: {
        id: 501,
        post_id: 101,
        content: 'Show de bola',
      },
    } as any)

    await store.addComment(101, 'Show de bola')

    expect(store.posts[0]!.comments_count).toBe(1)
    expect(store.posts[0]!.comments).toHaveLength(1)
    expect(store.posts[0]!.comments![0]!.id).toBe(501)
  })

  it('deletes post and removes it from list', async () => {
    const store = useEntertainmentStore()
    store.posts = [
      { id: 101 } as any,
      { id: 102 } as any,
    ]

    vi.mocked(postsApi.deletePost).mockResolvedValueOnce({} as any)

    await store.deletePost(101)

    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]!.id).toBe(102)
  })
})
