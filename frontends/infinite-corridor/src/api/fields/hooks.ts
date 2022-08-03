import { useMutation, useQuery, useQueryClient, UseQueryResult } from "react-query"
import {
  FieldChannel,
  FieldChannelAppearanceForm,
  FieldList,
  PaginatedFieldListItems,
  PaginatedUserListItems
} from "./interfaces"
import * as urls from "./urls"
import axios from "../../libs/axios"
import { fieldDetails } from "./urls"
import { PaginationSearchParams } from "ol-util"
import { useMemo } from "react"

const useFieldsList = () => {
  return useQuery<FieldList>(urls.fieldsList)
}

const useFieldDetails = (name: string) => {
  return useQuery<FieldChannel>(urls.fieldDetails(name))
}

const editFieldChannelAppearance = async (
  name: string,
  data: FieldChannelAppearanceForm
) => {
  const { data: response } = await axios.patch(`${fieldDetails(name)}`, data)
  return response
}

const useMutateFieldAppearance = (field: FieldChannel) => {
  const queryClient = useQueryClient()
  return useMutation(
    (data: FieldChannelAppearanceForm) => {
      return editFieldChannelAppearance(field.name, data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(fieldDetails(field.name))
      }
    }
  )
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

export { useFieldsList, useFieldDetails, useMutateFieldAppearance, useFieldListItems }
