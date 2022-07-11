import networkInterface from "ol-network-interface"
import { useQuery } from "react-query"
import type { FieldList } from "./interfaces"
import * as urls from "./urls"

const fetchFieldsList = async (): Promise<FieldList> => {
  const response = await networkInterface.get<FieldList>(urls.fieldsList)
  return response.body
}

export const useFieldsList = () => {
  return useQuery('fields', fetchFieldsList)
}