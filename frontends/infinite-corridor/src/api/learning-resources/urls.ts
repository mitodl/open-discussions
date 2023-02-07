import type { PaginationSearchParams } from "ol-util"
import { toQueryString } from "ol-util"

const DEFAULT_PAGE_SIZE = 50

const resourceDetails = (type: string, id: number) => `/${type}s/${id}/`
const updateResource = (type: string, id: number) => `/${type}s/${id}/`
const createResource = (type: string) => `/${type}s/`
const deleteResource = (type: string, id: number) => `/${type}s/${id}/`

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
const favoritesListing = (opts?: PaginationSearchParams) =>
  resourceListing("favorite", opts)
const createUserList = () => createResource("userlist")
const updateUserList = (id: number) => updateResource("userlist", id)
const deleteUserList = (id: number) => deleteResource("userlist", id)

const topics = () => "/topics/"

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
  topics:           () => ["topics"],
  userListsListing: (opts?: UserListOptions) =>
    keys.resourceListing("userlist", opts),
  userListDetails:  (id: number) => keys.resourceDetails("userlist", id),
  favoritesListing: (opts?: PaginationSearchParams) =>
    keys.resourceListing("favorite", opts)
}

const urls = {
  resourceDetails,
  resourceListing,
  userListItems,
  userListsListing,
  createUserList,
  updateUserList,
  deleteUserList,
  favoritesListing,
  topics
}

export { urls, keys }
export type { UserListOptions }
