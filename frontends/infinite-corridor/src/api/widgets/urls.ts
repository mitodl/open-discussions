import type { WidgetInstance } from "ol-widgets"

type WidgetId = WidgetInstance["id"]

export const widgetList = (id: WidgetId) => `/widget_lists/${id}/`
