import type { PaginationSearchParams } from "ol-util"
import { toQueryString } from "ol-util"

export const fieldsList = "/fields"

export const DEFAULT_PAGE_SIZE = 50

export const userListItems = (
  id: number,
  { limit = DEFAULT_PAGE_SIZE, offset = 0 }: PaginationSearchParams = {}
) => {
  const searchParams = toQueryString({ limit, offset })
  return `/userlists/${id}/items?${searchParams}`
}

export const userLists = ({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0
}: PaginationSearchParams = {}) => {
  const searchParams = toQueryString({ limit, offset })
  return `/userlists/?public=true&${searchParams}`
}

export const fieldDetails = (name: string) => `/fields/${name}/`
