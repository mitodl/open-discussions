import networkInterface from "ol-network-interface"
import type { PaginatedResult } from "ol-util"
import { useQuery } from "react-query"

export interface Field {
  title: string
  name: string
}
export type FieldList = PaginatedResult<Field>

const fetchFieldsList = async (): Promise<FieldList> => {
  const response = await networkInterface.get<FieldList>("/api/v0/fields")
  return response.body
}

export const useFieldsList = () => {
  return useQuery('fields', fetchFieldsList)
}