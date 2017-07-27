// @flow
import casual from "casual-browserify"

export const makeChannel = (privateChannel: boolean = false) => ({
  name:               casual.word,
  title:              casual.title,
  channel_type:       privateChannel ? "private" : "public",
  public_description: casual.description,
  num_users:          casual.integer(0, 500)
})
