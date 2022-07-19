import type { PaginatedResult } from "ol-util"

export interface Field {
  title: string
  name: string
  avatar_small: string | null
}
export type FieldList = PaginatedResult<Field>
