import React, { useCallback, useEffect, useMemo, useState } from "react"
import Button from "@mui/material/Button"
import AddIcon from '@mui/icons-material/Add'
import { keyBy } from "lodash"
import {
  Widget,
  WidgetInstance,
  WidgetListResponse,
  MuiManageWidgetDialog,
  WidgetSubmitHandler
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
  const [addingWidget, setAddingWidget] = useState(false)

  const widgetsById = useMemo(() => keyBy(widgets, w => w.id), [widgets])

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
  const editingWidget = editingWidgetId === null ? null : widgetsById[editingWidgetId]
  const handleBeginEdit = useCallback((widget: WidgetInstance) => {
    setEditingWidgetId(widget.id)
  }, [])
  const handleCancelEditing = useCallback(() => {
    setEditingWidgetId(null)
    setAddingWidget(false)
  }, [])
  const handleSubmitEdit: WidgetSubmitHandler = useCallback(e => {
    setAddingWidget(false)
    setEditingWidgetId(null)
    if (e.type === 'edit') {
      setWidgets(current => current.map(w => (w.id === e.widget.id ? e.widget : w)))
    } else {
      setWidgets(current => [e.widget, ...current])
    }
  }, [])
  const handleDelete = useCallback((deleted: WidgetInstance) => {
    setWidgets(current => current.filter(w => w.id !== deleted.id))
  }, [])
  const handleAdd = useCallback(() => setAddingWidget(true), [])
  return (
    <>
      <div className="ol-widget-editing-header">
        <Button size="small" color="secondary" startIcon={<AddIcon/>} onClick={handleAdd}>
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
      <MuiManageWidgetDialog
        isOpen={!!editingWidget || addingWidget}
        className="ic-widget-editing-dialog"
        fieldClassName="form-field"
        errorClassName="validation-message"
        onSubmit={handleSubmitEdit}
        widget={editingWidget}
        specs={specs}
        onClose={handleCancelEditing}
      />
    </>
  )
}

export default WidgetList
