import type { PaginatedResult } from "ol-util"
import type { LearningResource, LearningResourceType } from "ol-search-ui"

type UserList = LearningResource & {
  image_description: string | null | undefined
  list_type: string
  title: string
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

interface FieldChannel {
  banner: string | null
  featured_list: UserList | null
  lists: UserList[]
  title: string
  name: string
  avatar: string | null
  avatar_small: string | null
  avatar_medium: string | null
  public_description: string
  is_moderator: boolean
  widget_list: number
}
export type FieldList = PaginatedResult<FieldChannel>

export interface FieldChannelForm {
  title: string
  public_description: string
  name?: string
  banner?: string | null
  avatar?: string | null
  lists?: Array<number>
  featured_list?: number
}

export type FormImage = {
  edit: Blob
  image: File
}

export type FieldChannelAppearanceForm = {
  title: string
  public_description: string
  avatar?: FormImage
  banner?: FormImage
}

export type FieldChannelBasicForm = {
  featured_list: number | null
  lists: Array<number>
}

export type FieldAppearanceEditValidation = {
  title: string
  public_description: string
}

type PaginatedFields = PaginatedResult<FieldChannel>

type PaginatedUserListItems = PaginatedResult<UserListItem>

type PaginatedUserLists = PaginatedResult<UserList>

type PaginatedFieldListItems = PaginatedResult<UserListItem["content_data"]>

export type {
  UserList,
  FieldChannel,
  PaginatedFields,
  UserListItem,
  PaginatedUserListItems,
  PaginatedUserLists,
  PaginatedFieldListItems
}
