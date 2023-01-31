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

type UserListOptions = {
  public?: boolean
} & PaginationSearchParams
const userLists = ({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  public: isPublic
}: UserListOptions = {}) => {
  const searchParams = toQueryString({ limit, offset, public: isPublic })
  return `/userlists/?${searchParams}`
}

export { resource, userListItems, userLists }
export type { UserListOptions }
