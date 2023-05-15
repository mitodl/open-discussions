import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AnonymousWidget, WidgetListResponse } from "ol-widgets"
import * as urls from "./urls"
import axios from "../../libs/axios"

const useWidgetList = (id: number) => {
  return useQuery<WidgetListResponse>([urls.widgetList(id)], {
    enabled: id !== undefined
  })
}

const editWidgetsList = async (id: number, widgets: AnonymousWidget[]) => {
  const payload = { id, widgets }
  const { data: response } = await axios.patch(urls.widgetList(id), payload)
  return response
}

const useMutateWidgetsList = (id: number) => {
  const queryClient = useQueryClient()
  return useMutation(
    (data: AnonymousWidget[]) => {
      return editWidgetsList(id, data)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries([urls.widgetList(id)])
      }
    }
  )
}

export { useWidgetList, useMutateWidgetsList }
