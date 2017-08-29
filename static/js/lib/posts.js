// @flow

import type { PostForm, Post } from "../flow/discussionTypes"

export const newPostForm = (): PostForm => ({
  isText: true,
  text:   "",
  url:    "",
  title:  ""
})

export const formatCommentsCount = (post: Post): string =>
  post.num_comments === 1 ? "1 Comment" : `${post.num_comments || 0} Comments`
