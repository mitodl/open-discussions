// @flow
import R from "ramda"
import casual from "casual-browserify"

export const arrayN = (min: number, max: number) =>
  R.range(0, casual.integer(min, max))

export const randomSelection = (n: number, xs: Array<any>) =>
  R.times(() => xs[casual.integer(0, xs.length - 1)], n)

export function* incrementer(): Generator<number, *, *> {
  let int = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    yield int++
  }
}
