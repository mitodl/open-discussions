import { generatePath } from "react-router"

const BASE = "/infinite"

export const HOME = BASE

export const FIELD_VIEW = `${BASE}/fields/:name` as const
export const makeFieldViewPath = (name: string) =>
  generatePath(FIELD_VIEW, { name })

export const SEARCH = `${BASE}/search`
