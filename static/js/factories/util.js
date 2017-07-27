// @flow
import R from "ramda"
import casual from "casual-browserify"

let asciiNums = R.range(32, 127)

const randomChoice = (xs: Array<*>) => xs[Math.floor(Math.random() * xs.length)]

export const randomString = (n: number): string =>
  String.fromCharCode(...R.range(0, n).map(() => randomChoice(asciiNums)))

export const arrayN = (n: number) => R.range(0, casual.integer(1, n))

export function* incrementer(): Generator<number, *, *> {
  let int = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    yield int++
  }
}
