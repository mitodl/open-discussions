import * as R from "ramda"

export const initials: (title: string) => string = R.pipe(
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  R.split(/\s+/),
  R.slice(0, 2),
  R.map((item: string) => (item ? item[0].toUpperCase() : "")),
  R.join("")
)

export const capitalize = (txt: string) =>
  txt[0].toUpperCase() + txt.slice(1).toLowerCase()
