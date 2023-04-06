import { generatePath } from "react-router"

const BASE = "/infinite"

export const HOME = BASE

export const FIELD_VIEW = `${BASE}/fields/:name/` as const
export const FIELD_EDIT = `${BASE}/fields/:name/manage/` as const
export const FIELD_EDIT_WIDGETS =
  `${BASE}/fields/:name/manage/widgets/` as const
export const makeFieldViewPath = (name: string) =>
  generatePath(FIELD_VIEW, { name })
export const makeFieldEditPath = (name: string) =>
  generatePath(FIELD_EDIT, { name })
export const makeFieldManageWidgetsPath = (name: string) =>
  generatePath(FIELD_EDIT_WIDGETS, { name })

export const SEARCH = `${BASE}/search`
export const DEMO = `${BASE}/demo`

export const USERLISTS_LISTING = `${BASE}/lists`
export const USERLIST_VIEW = `${BASE}/lists/:id` as const
export const FAVORITES_VIEW = `${BASE}/lists/favorites`
export const makeUserListViewPath = (id: number) =>
  generatePath(USERLIST_VIEW, { id })
