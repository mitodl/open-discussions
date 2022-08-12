import {
  useMutation,
  useQuery,
  useQueryClient,
  UseQueryResult
} from "react-query"
import {
  FieldChannel,
  FieldChannelAppearanceForm,
  FieldChannelBasicForm,
  FieldList,
  PaginatedFieldListItems,
  PaginatedUserListItems,
  PaginatedUserLists
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

const usePublicLists = (options?: PaginationSearchParams) => {
  const userLists = useQuery<PaginatedUserLists>(urls.userLists(options))
  return useMemo(() => {
    const { data, ...others } = userLists
    const lrData = data && {
      ...data,
      results: data.results
    }
    return {
      data: lrData,
      ...others
    } as UseQueryResult<PaginatedUserLists>
  }, [userLists])
}

const editFieldChannel = async (
  name: string,
  data: FieldChannelBasicForm | FieldChannelAppearanceForm
) => {
  const { data: response } = await axios.patch(`${fieldDetails(name)}`, data)
  return response
}

const useMutateField = (field: FieldChannel) => {
  const queryClient = useQueryClient()
  return useMutation(
    (data: FieldChannelBasicForm | FieldChannelAppearanceForm) => {
      return editFieldChannel(field.name, data)
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

export {
  useFieldsList,
  useFieldDetails,
  useFieldListItems,
  usePublicLists,
  useMutateField
}
