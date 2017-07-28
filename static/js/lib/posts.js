// @flow

import type { PostForm } from "../flow/discussionTypes"

export const newPostForm = (): PostForm => ({
  isText: true,
  text:   "",
  url:    "",
  title:  ""
})
