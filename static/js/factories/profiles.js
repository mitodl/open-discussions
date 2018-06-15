// @flow
import casual from "casual-browserify"
import type { Profile } from "../flow/discussionTypes"

export const makeProfile = (username: string = casual.word): Profile => ({
  name:              casual.word,
  username:          username,
  image:             null,
  image_small:       null,
  image_medium:      null,
  image_file:        null,
  image_small_file:  null,
  image_medium_file: null,
  bio:               casual.word,
  headline:          casual.word
})
