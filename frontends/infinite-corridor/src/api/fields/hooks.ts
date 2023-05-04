import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FieldChannel,
  FieldChannelAppearanceForm,
  FieldChannelBasicForm,
  FieldList
} from "./interfaces"
import * as urls from "./urls"
import axios from "../../libs/axios"
import { fieldDetails } from "./urls"

const useFieldsList = () => {
  return useQuery<FieldList>(urls.fieldsList)
}

const useFieldDetails = (name: string) => {
  return useQuery<FieldChannel>(urls.fieldDetails(name))
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

export { useFieldsList, useFieldDetails, useMutateField }
