import type { PaginatedResult } from "ol-util"

export interface Field {
  title: string
  name: string
}
export type FieldList = PaginatedResult<Field>