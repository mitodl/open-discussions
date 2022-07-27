import { useQuery } from "react-query"
import type { UseQueryResult } from "react-query"
import type {
  Field,
  PaginatedFields,
  PaginatedUserListItems,
  PaginatedFieldListItems
} from "./interfaces"
import * as urls from "./urls"
import { useMemo } from "react"

const useFieldsList = () => {
  return useQuery<PaginatedFields>(urls.fieldsList)
}

const useFieldDetails = (name: string) => {
  return useQuery<Field>(urls.fieldDetails(name))
}

const useFieldListItems = (listId: number) => {
  const userListItems = useQuery<PaginatedUserListItems>(
    urls.userListItems(listId)
  )
  return useMemo(() => {
    const { data, ...others } = userListItems
    const lrData = data && {
      ...data,
      results: data.results.map(d => d.content_data)
    }
    return {
      data: lrData,
      ...others
    } as UseQueryResult<PaginatedFieldListItems>
  }, [userListItems])
}

export { useFieldsList, useFieldDetails, useFieldListItems, urls }
export type { Field, PaginatedUserListItems }
