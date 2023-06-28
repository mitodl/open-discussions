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

export const STAFFLISTS_LISTING = `${BASE}/stafflists`
export const STAFFLIST_VIEW = `${BASE}/stafflists/:id` as const
export const makeStaffListsViewPath = (id: number) =>
  generatePath(STAFFLIST_VIEW, { id })

export const TEMPORARY_ARTICLE_VIEW = `${BASE}/article/` as const

export const FORBIDDEN_VIEW = `${BASE}/forbidden`
export const NOTFOUND_VIEW = `${BASE}/not-found`
