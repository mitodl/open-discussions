import type { PaginatedResult } from "ol-util"

export interface Field {
  title: string
  name: string
  banner: string | null
  avatar_small: string | null
  avatar_medium: string | null
  public_description: string
}
export type FieldList = PaginatedResult<Field>
