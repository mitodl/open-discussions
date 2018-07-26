// @flow
import casual from "casual-browserify"
import type { Profile } from "../flow/discussionTypes"

export const makeProfile = (
  username: string = casual.word,
  image: string = ""
): Profile => ({
  name:                 casual.word,
  username:             username,
  image:                image,
  image_small:          casual.url,
  image_medium:         casual.url,
  image_file:           image,
  image_small_file:     image,
  image_medium_file:    image,
  bio:                  casual.word,
  headline:             casual.word,
  profile_image_small:  casual.url,
  profile_image_medium: casual.url
})
