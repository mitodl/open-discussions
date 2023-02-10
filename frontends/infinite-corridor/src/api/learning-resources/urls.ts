import type { PaginationSearchParams } from "ol-util"
import { toQueryString } from "ol-util"

const DEFAULT_PAGE_SIZE = 50

const resourceDetails = (type: string, id: number) => `/${type}s/${id}/`

const resourceListing = <Opts extends PaginationSearchParams>(
  type: string,
  options?: Opts
) => {
  const { limit = DEFAULT_PAGE_SIZE, offset = 0, ...others } = options ?? {}
  const searchParams = toQueryString({ limit, offset, ...others })
  return `/${type}s/?${searchParams}`
}
const userListItems = (id: number, options?: PaginationSearchParams) => {
  const { limit = DEFAULT_PAGE_SIZE, offset = 0, ...others } = options ?? {}
  const searchParams = toQueryString({ limit, offset, ...others })
  return `/userlists/${id}/items?${searchParams}`
}

type UserListOptions = { public?: boolean } & PaginationSearchParams
const userListsListing = (opts?: UserListOptions) =>
  resourceListing("userlist", opts)

const keys = {
  resourceDetails: (type: string, id: number) => [type, id, "details"],
  resourceListing: (type: string, options?: PaginationSearchParams) => {
    if (options === undefined) {
      return [type, "listing"]
    }
    return [type, "listing", options]
  },
  userListItems: (id: number, options?: PaginationSearchParams) => [
    "userlist",
    id,
    "items",
    options
  ],
  userListsListing: (opts?: UserListOptions) =>
    keys.resourceListing("userlist", opts),
  userListDetails: (id: number) => keys.resourceDetails("userlist", id)
}

const urls = {
  resourceDetails,
  resourceListing,
  userListDetails: (id: number) => resourceDetails("userlist", id),
  userListItems,
  userListsListing
}

export { urls, keys }
export type { UserListOptions }
