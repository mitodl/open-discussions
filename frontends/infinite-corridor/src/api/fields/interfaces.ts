import type { PaginatedResult } from "ol-util"

export interface FieldChannel {
  title: string
  name: string
  banner: string | null
  avatar: string | null
  avatar_small: string | null
  avatar_medium: string | null
  public_description: string
  is_moderator: boolean
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

export type FieldAppearanceEditValidation = {
  title: string
  public_description: string
}
