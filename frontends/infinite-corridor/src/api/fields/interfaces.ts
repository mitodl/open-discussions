import type { PaginatedResult } from "ol-util"
import type { UserListItem, UserList } from "ol-search-ui"

interface Field {
  title: string
  name: string
  banner: string | null
  featured_list: UserList
  lists: UserList[]
  avatar_small: string | null
  avatar_medium: string | null
  public_description: string
}

type PaginatedFields = PaginatedResult<Field>

type PaginatedUserListItems = PaginatedResult<UserListItem>

type PaginatedFieldListItems = PaginatedResult<UserListItem["content_data"]>

export {
  Field,
  PaginatedFields,
  UserListItem,
  PaginatedUserListItems,
  PaginatedFieldListItems
}
