import type { PaginationSearchParams } from "ol-util"
import { toQueryString } from "ol-util"

const DEFAULT_PAGE_SIZE = 50

const resource = (type: string, id: number): string => `/${type}s/${id}`

const userListItems = (
  id: number,
  { limit = DEFAULT_PAGE_SIZE, offset = 0 }: PaginationSearchParams = {}
) => {
  const searchParams = toQueryString({ limit, offset })
  return `/userlists/${id}/items?${searchParams}`
}

const resourceList = <Opts extends PaginationSearchParams>(
  type: string,
  options?: Opts
) => {
  const { limit = DEFAULT_PAGE_SIZE, offset = 0, ...others } = options ?? {}
  const searchParams = toQueryString({ limit, offset, ...others })
  return `/${type}s/?${searchParams}`
}

type UserListOptions = { public?: boolean } & PaginationSearchParams
const userLists = (opts?: UserListOptions) =>
  resourceList<UserListOptions>("userlist", opts)
const favorites = (opts?: PaginationSearchParams) =>
  resourceList("favorite", opts)

export { resource, userListItems, userLists, favorites }
export type { UserListOptions }
