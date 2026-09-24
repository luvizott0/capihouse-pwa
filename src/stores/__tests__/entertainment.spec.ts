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
      stopListening: vi.fn<any>().mockReturnThis(),
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

  it('keeps separate post lists for movies and games and avoids refetching when tab is already loaded', async () => {
    const store = useEntertainmentStore()

    // 1. Initial tab is movies. Fetch page 1 for movies
    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [{ id: 1, entertainment_type: 'movie', category: 'entertainment' }],
        current_page: 1,
        last_page: 2,
      },
    } as any)

    await store.fetchEntertainmentPosts(1, { tab: 'movies' })
    expect(store.moviePosts).toHaveLength(1)
    expect(store.posts).toHaveLength(1)
    expect(store.hasLoaded).toBe(true)

    // 2. Switch to games tab: since games are not loaded yet, setActiveTab triggers fetch for games
    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [{ id: 2, entertainment_type: 'game', category: 'entertainment' }],
        current_page: 1,
        last_page: 1,
      },
    } as any)

    store.setActiveTab('games')
    // Wait for the async fetch triggered by setActiveTab
    await vi.waitFor(() => expect(store.gamePosts).toHaveLength(1))
    expect(store.activeTab).toBe('games')
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]!.id).toBe(2)
    // Verify movie posts were preserved!
    expect(store.moviePosts).toHaveLength(1)
    expect(store.moviePosts[0]!.id).toBe(1)

    // 3. Switch back to movies tab: already loaded, should NOT call getPosts again
    const callsBefore = vi.mocked(postsApi.getPosts).mock.calls.length
    store.setActiveTab('movies')
    expect(store.activeTab).toBe('movies')
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]!.id).toBe(1)
    expect(vi.mocked(postsApi.getPosts).mock.calls.length).toBe(callsBefore)
  })

  it('supports pending posts and flushing for real-time updates', async () => {
    const store = useEntertainmentStore()
    expect(store.pendingCount).toBe(0)

    // Setup Echo listener
    let postCreatedCallback: ((data: any) => void) | null = null
    const mockChannel = {
      listen: vi.fn<any>((event: string, cb: any) => {
        if (event === '.PostCreated') postCreatedCallback = cb
        return mockChannel
      }),
      stopListening: vi.fn<any>().mockReturnThis(),
    }
    const { connectEcho } = await import('@/services/echo')
    vi.mocked(connectEcho).mockReturnValue({
      channel: vi.fn<any>(() => mockChannel),
      leaveChannel: vi.fn<any>(),
    } as any)

    store.subscribeToEntertainment(999) // Current user ID is 999
    expect(postCreatedCallback).not.toBeNull()

    // 1. Post from another user in movies category
    postCreatedCallback!({
      post: {
        id: 301,
        user_id: 888,
        category: 'entertainment',
        entertainment_type: 'movie',
      },
    })

    expect(store.pendingCount).toBe(1)
    expect(store.pendingPosts).toHaveLength(1)
    expect(store.posts).toHaveLength(0) // Not yet prepended

    // 2. Flush pending posts
    store.flushPendingPosts()
    expect(store.pendingCount).toBe(0)
    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]!.id).toBe(301)
  })

  it('loads more posts on infinite scroll correctly', async () => {
    const store = useEntertainmentStore()

    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [{ id: 10, entertainment_type: 'game', category: 'entertainment' }],
        current_page: 1,
        last_page: 2,
      },
    } as any)

    store.setActiveTab('games')
    await vi.waitFor(() => expect(store.gamePosts).toHaveLength(1))
    expect(store.hasMorePages).toBe(true)
    expect(store.currentPage).toBe(1)

    // Load page 2
    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [{ id: 11, entertainment_type: 'game', category: 'entertainment' }],
        current_page: 2,
        last_page: 2,
      },
    } as any)

    await store.loadMorePosts()
    expect(store.gamePosts).toHaveLength(2)
    expect(store.currentPage).toBe(2)
    expect(store.hasMorePages).toBe(false)
  })
})
