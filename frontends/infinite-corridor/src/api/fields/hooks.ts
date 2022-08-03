import { useMutation, useQuery, useQueryClient } from "react-query"
import {
  FieldChannel,
  FieldChannelAppearanceForm,
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

export { useFieldsList, useFieldDetails, useMutateFieldAppearance, urls }
