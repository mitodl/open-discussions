import type { PaginatedResult } from "ol-util"
import type { UserList } from "ol-search-ui"

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

export type { FieldChannel, PaginatedFields }
