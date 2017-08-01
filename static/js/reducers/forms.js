//@flow
import { deriveReducer } from "../lib/form_actions"
import { newChannel } from "../lib/channels"
import { newPostForm } from "../lib/posts"

export const channelForm = deriveReducer("channel", newChannel)
export const postForm = deriveReducer("post", newPostForm)
