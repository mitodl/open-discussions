import { useQuery } from "react-query"
import { Field, FieldList } from "./interfaces"
import * as urls from "./urls"

const useFieldsList = () => {
  return useQuery<FieldList>(urls.fieldsList)
}

export { useFieldsList, urls }
export type { Field, FieldList }
