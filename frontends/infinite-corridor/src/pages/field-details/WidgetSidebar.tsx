import React from "react"
import { Widget } from "ol-widgets"
import { useWidgetList } from "../../api/widgets"

interface WidgetsSidebarProps {
  isEditing: boolean
  widgetListId?: number
}

const WidgetList: React.FC<WidgetsSidebarProps> = ({ widgetListId }) => {
  const widgetsQuery = useWidgetList(widgetListId)
  const widgets = widgetsQuery.data?.widgets ?? []
  return <section>
    {widgets.map(widget => <Widget className="ic-widget" key={widget.id} widget={widget} />)}
  </section>
}

export default WidgetList
