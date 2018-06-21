// @flow
import R from "ramda"

export const initials = R.pipe(
  R.split(/\s+/),
  R.slice(0, 2),
  R.map(item => (item ? item[0].toUpperCase() : "")),
  R.join("")
)
