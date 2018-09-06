// @flow
import R from "ramda"
import casual from "casual-browserify"

import type { Match } from "react-router"

export const arrayN = (min: number, max: number) =>
  R.range(0, casual.integer(min, max))

export const randomSelection = (n: number, xs: Array<any>) =>
  R.times(() => draw(xs), n)

export const draw = (xs: Array<any>) => xs[casual.integer(0, xs.length - 1)]

export function* incrementer(): Generator<number, *, *> {
  let int = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    yield int++
  }
}

export const makeMatch = (url: string): Match => ({
  url:     url,
  isExact: true,
  params:  {},
  path:    ""
})
