import { generatePath } from "react-router"

const BASE = "/infinite"

export const HOME = BASE

export const FIELD_VIEW = `${BASE}/fields/:name/` as const
export const FIELD_EDIT = `${BASE}/fields/:name/manage/` as const
export const makeFieldViewPath = (name: string) =>
  generatePath(FIELD_VIEW, { name })
export const makeFieldEditPath = (name: string) =>
  generatePath(FIELD_EDIT, { name })
export const SEARCH = `${BASE}/search`
