import React, { useCallback, useEffect, useMemo, useState } from "react"
import Button from "@mui/material/Button"
import AddIcon from '@mui/icons-material/Add'
import { keyBy } from "lodash"
import {
  Widget,
  WidgetInstance,
  WidgetListResponse,
  MuiEditWidgetDialog
} from "ol-widgets"
import { useWidgetList } from "../../api/widgets"


interface WidgetsListProps {
  isEditing: boolean
  widgetListId?: number
  className?: string
}

const WidgetList: React.FC<WidgetsListProps> = ({
  widgetListId,
  isEditing,
  className
}) => {
  const widgetsQuery = useWidgetList(widgetListId)
  const widgets = widgetsQuery.data?.widgets ?? []
  console.log(widgetsQuery)
  return (
    <section className={className}>
      {isEditing ?
        widgetsQuery.data && (
          <EditingWidgetsList widgetsList={widgetsQuery.data} />
        ) :
        widgets.map(widget => (
          <Widget
            key={widget.id}
            widget={widget}
            isEditing={false}
            className="ic-widget"
            actionsClassName="ic-widget-actions"
          />
        ))}
    </section>
  )
}

interface EditingWidgetsListProps {
  widgetsList: WidgetListResponse
}

/**
 * Handles frontend widget editing.
 * This component does NOT make API calls itself.
 */
const EditingWidgetsList: React.FC<EditingWidgetsListProps> = ({
  widgetsList
}) => {
  const { widgets: savedWidgets, available_widgets: specs } = widgetsList
  const [widgets, setWidgets] = useState<WidgetInstance[]>([])
  useEffect(() => {
    setWidgets(savedWidgets)
  }, [savedWidgets])

  const widgetsById = useMemo(() => keyBy(widgets, w => w.id), [widgets])
  const specsByType = useMemo(() => keyBy(specs, s => s.widget_type), [specs])

  const [widgetsOpen, setWidgetsOpen] = useState<Map<number, boolean>>(
    new Map()
  )
  const allOpen = useMemo(() => widgets.every(w => widgetsOpen.get(w.id)), [widgets, widgetsOpen])
  const handleToggleWidgetDetails = useCallback((widget: WidgetInstance) => {
    setWidgetsOpen(value => {
      const clone = new Map(value)
      clone.set(widget.id, !clone.get(widget.id))
      return clone
    })
  }, [])
  const handleToggleAll = useCallback(() => {
    if (allOpen) {
      setWidgetsOpen(new Map())
    } else {
      setWidgetsOpen(new Map(widgets.map(w => [w.id, true])))
    }
  }, [allOpen, widgets])

  const [editingWidgetId, setEditingWidgetId] = useState<number | null>(null)
  const editing = useMemo(() => {
    if (editingWidgetId === null) return null
    const widget = widgetsById[editingWidgetId]
    return { widget, spec: specsByType[widget.widget_type] }
  }, [editingWidgetId, widgetsById, specsByType])
  const handleBeginEdit = useCallback((widget: WidgetInstance) => {
    setEditingWidgetId(widget.id)
  }, [])
  const handleCancelEditing = useCallback(() => {
    setEditingWidgetId(null)
  }, [])
  const handleSubmitEdit = useCallback((edited: WidgetInstance) => {
    setEditingWidgetId(null)
    setWidgets(current => current.map(w => (w.id === edited.id ? edited : w)))
  }, [])
  const handleDelete = useCallback((deleted: WidgetInstance) => {
    console.log("DELETED!")
    setWidgets(current => current.filter(w => w.id !== deleted.id))
  }, [])
  return (
    <>
      <div className="ol-widget-editing-header">
        <Button size="small" color="secondary" startIcon={<AddIcon/>}>
          Add Widget
        </Button>
        <Button size="small" color="secondary" onClick={handleToggleAll}>
          {allOpen ? 'Collapse all' : 'Expand all'}
        </Button>
      </div>
      {widgets.map(widget => (
        <Widget
          key={widget.id}
          widget={widget}
          isEditing={true}
          isOpen={!!widgetsOpen.get(widget.id)}
          className="ic-widget"
          actionsClassName="ic-widget-actions"
          onVisibilityChange={handleToggleWidgetDetails}
          onEdit={handleBeginEdit}
          onDelete={handleDelete}
        />
      ))}
      {editing && (
        <MuiEditWidgetDialog
          fieldClassName="form-field"
          errorClassName="validation-message"
          onSubmit={handleSubmitEdit}
          widget={editing.widget}
          spec={editing.spec}
          isOpen={!!editing.widget}
          onClose={handleCancelEditing}
        />
      )}
    </>
  )
}

export default WidgetList
