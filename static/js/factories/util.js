// @flow
import R from "ramda"
import casual from "casual-browserify"

export const arrayN = (n: number) => R.range(0, casual.integer(1, n))

export function* incrementer(): Generator<number, *, *> {
  let int = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    yield int++
  }
}
