// @flow
import R from "ramda"
import { PATCH, DELETE } from "redux-hammock/constants"

import { fetchJSONWithAuthFailure, fetchWithAuthFailure } from "./fetch_auth"
import { objectToFormData } from "../../lib/forms"

import type { CreatePostPayload, Post } from "../../flow/discussionTypes"

export async function createPost(
  channelName: string,
  payload: CreatePostPayload
): Promise<Post> {
  const formData = objectToFormData(R.pick(["text", "url", "title"], payload))

  if (payload.article && payload.article.length !== 0) {
    formData.append("article_content", JSON.stringify(payload.article))

    if (payload.coverImage) {
      formData.append("cover_image", payload.coverImage)
    }
  }

  return JSON.parse(
    await fetchWithAuthFailure(`/api/v0/channels/${channelName}/posts/`, {
      method: "POST",
      body:   formData
    })
  )
}

export function getPost(postId: string): Promise<Post> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/`)
}

export function updateUpvote(postId: string, upvoted: boolean): Promise<Post> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: PATCH,
    body:   JSON.stringify({ upvoted })
  })
}

export function updateRemoved(postId: string, removed: boolean): Promise<Post> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: PATCH,
    body:   JSON.stringify({ removed })
  })
}

export function editPost(postId: string, post: Post): Promise<Post> {
  return fetchJSONWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: PATCH,
    body:   JSON.stringify(R.dissoc("url", post))
  })
}

export function deletePost(postId: string): Promise<Post> {
  return fetchWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: DELETE
  })
}
