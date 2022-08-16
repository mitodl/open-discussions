import { useQuery } from "react-query"
import type { WidgetListResponse } from "ol-widgets"
import * as urls from "./urls"

const useWidgetList = (id?: number) => {
  return useQuery<WidgetListResponse>(
    urls.widgetList(id ?? NaN), { enabled: id !== undefined })
}

export { useWidgetList }
