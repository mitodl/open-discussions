import React from "react"
import { Widget } from "ol-widgets"
import { useWidgetList } from "../../api/widgets"

interface WidgetsSidebarProps {
  isEditing: boolean
  widgetListId?: number
  className?: string
}

const WidgetList: React.FC<WidgetsSidebarProps> = ({ widgetListId, className }) => {
  const widgetsQuery = useWidgetList(widgetListId)
  const widgets = widgetsQuery.data?.widgets ?? []
  return (
    <section className={className}>
      {widgets.map(widget => <Widget className="ic-widget" key={widget.id} widget={widget} />)}
    </section>
  )
}

export default WidgetList
