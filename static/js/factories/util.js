// @flow
import R from 'ramda';

let asciiNums = R.range(32, 127);

const randomChoice = (xs: Array<*>) => (
  xs[Math.floor(Math.random() * xs.length)]
);

export const randomString = (n: number): string => (
  String.fromCharCode(...R.range(0, n).map(() => randomChoice(asciiNums)))
);
