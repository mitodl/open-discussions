import type { PaginatedResult } from "ol-util"
import type { LearningResource, LearningResourceType } from "ol-search-ui"

type UserList = LearningResource & {
  image_description: string | null | undefined
  list_type: string
  short_description?: string
  object_type: LearningResourceType.Userlist | LearningResourceType.LearningPath
  privacy_level: string
  author: number
  author_name: string
  item_count: number
}

type UserListItem = {
  id: number
  is_favorite: boolean
  object_id: number
  position: number
  program: number
  content_type: string
  content_data: LearningResource
}

interface Field {
  title: string
  name: string
  banner: string | null
  featured_list: UserList | null
  lists: UserList[]
  avatar_small: string | null
  avatar_medium: string | null
  public_description: string
}

type PaginatedFields = PaginatedResult<Field>

type PaginatedUserListItems = PaginatedResult<UserListItem>

type PaginatedFieldListItems = PaginatedResult<UserListItem["content_data"]>

export type {
  UserList,
  Field,
  PaginatedFields,
  UserListItem,
  PaginatedUserListItems,
  PaginatedFieldListItems
}
