/* oxlint-disable vitest/require-mock-type-parameters */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFeedStore } from '@/stores/feed'
import * as postsApi from '@/api/posts'

vi.mock('@/api/posts')
vi.mock('@/services/echo', () => ({
  connectEcho: vi.fn(() => ({
    channel: vi.fn(() => ({ listen: vi.fn().mockReturnThis() })),
    private: vi.fn(() => ({ listen: vi.fn().mockReturnThis() })),
    leave: vi.fn(),
  })),
}))

const mockPost1 = {
  id: 1,
  user_id: 10,
  content: 'Post do usuario 10',
  is_liked: false,
  likes_count: 0,
  comments_count: 0,
  comments: [],
  user: { id: 10, name: 'User 10', username: 'user10' },
  created_at: '2026-09-17T00:00:00Z',
} as any

const mockPost2 = {
  id: 2,
  user_id: 20,
  content: 'Post do usuario 20',
  is_liked: false,
  likes_count: 2,
  comments_count: 1,
  comments: [],
  user: { id: 20, name: 'User 20', username: 'user20' },
  created_at: '2026-09-17T00:01:00Z',
} as any

describe('Feed Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    if (typeof localStorage !== 'undefined' && localStorage?.clear) {
      localStorage.clear()
    }
  })

  it('fetchPosts populates general feed posts and marks isFiltered = false', async () => {
    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [mockPost1, mockPost2],
        current_page: 1,
        last_page: 1,
      },
    } as any)

    const store = useFeedStore()
    await store.fetchPosts(1)

    expect(store.posts).toHaveLength(2)
    expect(store.isFiltered).toBe(false)
  })

  it('fetchPosts with filters marks isFiltered = true', async () => {
    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [mockPost1],
        current_page: 1,
        last_page: 1,
      },
    } as any)

    const store = useFeedStore()
    await store.fetchPosts(1, { search: 'usuario 10' })

    expect(store.posts).toHaveLength(1)
    expect(store.isFiltered).toBe(true)
  })

  it('fetchUserPosts does NOT overwrite the general feed posts', async () => {
    // 1. First, load general feed
    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [mockPost1, mockPost2],
        current_page: 1,
        last_page: 1,
      },
    } as any)

    const store = useFeedStore()
    await store.fetchPosts(1)
    expect(store.posts).toHaveLength(2)

    // 2. Now visit a user profile and fetch user posts (e.g. user 10 only)
    vi.mocked(postsApi.getPosts).mockResolvedValueOnce({
      data: {
        data: [mockPost1],
        current_page: 1,
        last_page: 1,
      },
    } as any)

    await store.fetchUserPosts(10)

    // User posts has 1 post, but the general feed STILL has 2 posts!
    expect(store.userPosts).toHaveLength(1)
    expect(store.userPosts[0]!.id).toBe(1)
    expect(store.posts).toHaveLength(2)
    expect(store.isFiltered).toBe(false)
  })

  it('toggleLike updates posts in both feed and userPosts', async () => {
    const store = useFeedStore()
    store.posts = [{ ...mockPost1 }]
    store.userPosts = [{ ...mockPost1 }]

    vi.mocked(postsApi.toggleLike).mockResolvedValueOnce({
      data: {
        is_liked: true,
        likes_count: 1,
      },
    } as any)

    await store.toggleLike(1)

    expect(store.posts[0]!.is_liked).toBe(true)
    expect(store.posts[0]!.likes_count).toBe(1)
    expect(store.userPosts[0]!.is_liked).toBe(true)
    expect(store.userPosts[0]!.likes_count).toBe(1)
  })

  it('deletePost removes post from both feed and userPosts', async () => {
    const store = useFeedStore()
    store.posts = [{ ...mockPost1 }, { ...mockPost2 }]
    store.userPosts = [{ ...mockPost1 }]

    vi.mocked(postsApi.deletePost).mockResolvedValueOnce({} as any)

    await store.deletePost(1)

    expect(store.posts).toHaveLength(1)
    expect(store.posts[0]!.id).toBe(2)
    expect(store.userPosts).toHaveLength(0)
  })

  it('addComment adds comment to post in both feed and userPosts', async () => {
    const store = useFeedStore()
    store.posts = [{ ...mockPost1, comments: [] }]
    store.userPosts = [{ ...mockPost1, comments: [] }]

    vi.mocked(postsApi.addComment).mockResolvedValueOnce({
      data: {
        id: 99,
        post_id: 1,
        user_id: 10,
        content: 'Novo comentário',
      },
    } as any)

    await store.addComment(1, 'Novo comentário')

    expect(store.posts[0]!.comments_count).toBe(1)
    expect(store.posts[0]!.comments).toHaveLength(1)
    expect(store.userPosts[0]!.comments_count).toBe(1)
    expect(store.userPosts[0]!.comments).toHaveLength(1)
  })
})
