// @flow
import casual from "casual-browserify"
import type { Profile } from "../flow/discussionTypes"

export const makeProfile = (
  username: string = casual.word,
  image: string = ""
): Profile => ({
  name:              casual.word,
  username:          username,
  image:             image,
  image_small:       image,
  image_medium:      image,
  image_file:        image,
  image_small_file:  image,
  image_medium_file: image,
  bio:               casual.word,
  headline:          casual.word
})
