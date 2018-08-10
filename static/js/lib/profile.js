// @flow
import R from "ramda"

import type { Profile, ImageForm } from "../flow/discussionTypes"

export const initials = R.pipe(
  R.split(/\s+/),
  R.slice(0, 2),
  R.map(item => (item ? item[0].toUpperCase() : "")),
  R.join("")
)

export const makeProfile = (props: Object): Profile => ({
  image:             null,
  image_small:       null,
  image_medium:      null,
  image_file:        null,
  image_small_file:  null,
  image_medium_file: null,
  bio:               null,
  headline:          null,
  ...props
})

export const newImageForm = (): ImageForm => ({
  edit:  null,
  image: null
})
