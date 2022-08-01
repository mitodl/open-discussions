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
import type { PaginationSearchParams } from "ol-util"

const useFieldsList = () => {
  return useQuery<PaginatedFields>(urls.fieldsList)
}

const useFieldDetails = (name: string) => {
  return useQuery<Field>(urls.fieldDetails(name))
}

const useFieldListItems = (
  listId: number,
  options?: PaginationSearchParams
) => {
  const userListItems = useQuery<PaginatedUserListItems>(
    urls.userListItems(listId, options)
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

export { useFieldsList, useFieldDetails, useFieldListItems }
