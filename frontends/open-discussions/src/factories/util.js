// @flow
import R from "ramda"
import casual from "casual-browserify"

import type { Match, Location } from "react-router"

export const arrayN = (min: number, max: number) =>
  R.range(0, casual.integer(min, max))

export const randomSelection = (n: number, xs: Array<any>) =>
  R.times(() => draw(xs), n)

export const draw = (xs: Array<any>) => xs[casual.integer(0, xs.length - 1)]

export const makeMatch = (url: string): Match => ({
  url:     url,
  isExact: true,
  params:  {},
  path:    ""
})

export const makeLocation = (pathname: string): Location => ({
  pathname: pathname,
  search:   "",
  hash:     ""
})
