import { useQuery } from "react-query"
import { Field, FieldList } from "./interfaces"
import * as urls from "./urls"

const useFieldsList = () => {
  return useQuery<FieldList>(urls.fieldsList)
}

const useFieldDetails = (name: string) => {
  return useQuery<Field>(urls.fieldDetails(name))
}

export { useFieldsList, useFieldDetails, urls }
export type { Field, FieldList }
