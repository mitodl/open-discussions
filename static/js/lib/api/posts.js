// @flow
import R from "ramda"
import { PATCH, DELETE } from "redux-hammock/constants"

import { fetchJSONWithAuthFailure, fetchWithAuthFailure } from "./fetch_auth"
import { objectToFormData } from "../forms"
import { emptyOrNil } from "../util"

import type { CreatePostPayload, Post } from "../../flow/discussionTypes"

export async function createPost(
  channelName: string,
  payload: CreatePostPayload
): Promise<Post> {
  const formData = objectToFormData(R.pick(["text", "url", "title"], payload))

  if (!emptyOrNil(payload.article)) {
    formData.append("article_content", JSON.stringify(payload.article))

    if (payload.cover_image) {
      formData.append("cover_image", payload.cover_image)
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

export async function editPost(postId: string, post: Post): Promise<Post> {
  const formData = objectToFormData(R.pick(["text", "title"], post))

  if (!emptyOrNil(post.article_content)) {
    formData.append("article_content", JSON.stringify(post.article_content))

    if (post.cover_image) {
      formData.append("cover_image", post.cover_image)
    }
  }

  return JSON.parse(
    await fetchWithAuthFailure(`/api/v0/posts/${postId}/`, {
      method: PATCH,
      body:   formData
    })
  )
}

export function deletePost(postId: string): Promise<Post> {
  return fetchWithAuthFailure(`/api/v0/posts/${postId}/`, {
    method: DELETE
  })
}
