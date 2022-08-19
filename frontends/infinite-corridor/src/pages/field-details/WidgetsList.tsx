import React, { useCallback, useEffect, useMemo, useState } from "react"
import Button from "@mui/material/Button"
import AddIcon from "@mui/icons-material/Add"
import {
  Widget,
  WidgetListResponse,
  MuiManageWidgetDialog,
  WidgetSubmitHandler,
  AnonymousWidget
} from "ol-widgets"
import { useMutateWidgetsList, useWidgetList } from "../../api/widgets"

interface WidgetsListProps {
  isEditing: boolean
  widgetListId: number
  className?: string
  onFinishEditing?: () => void
}

const WidgetsList: React.FC<WidgetsListProps> = ({
  widgetListId,
  isEditing,
  onFinishEditing,
  className
}) => {
  const widgetsQuery = useWidgetList(widgetListId)
  const mutation = useMutateWidgetsList(widgetListId)
  const widgets = widgetsQuery.data?.widgets ?? []
  const onSubmit: EditingWidgetsListProps["onSubmit"] = useCallback(
    event => {
      if (event.touched) {
        mutation.mutate(event.widgets, {
          onSuccess: () => {
            if (onFinishEditing) onFinishEditing()
          }
        })
      }
    },
    [onFinishEditing, mutation]
  )
  const onCancel: EditingWidgetsListProps["onCancel"] = useCallback(() => {
    if (onFinishEditing) onFinishEditing()
  }, [onFinishEditing])
  return (
    <section className={className}>
      {isEditing ?
        widgetsQuery.data && (
          <EditingWidgetsList
            widgetsList={widgetsQuery.data}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
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

type SubmitWidgetsEvent = {
  touched: boolean
  widgets: AnonymousWidget[]
}

interface EditingWidgetsListProps {
  widgetsList: WidgetListResponse
  onSubmit: (event: SubmitWidgetsEvent) => void
  onCancel: () => void
}

/**
 * Handles frontend widget editing.
 * This component does NOT make API calls itself.
 */
const EditingWidgetsList: React.FC<EditingWidgetsListProps> = ({
  widgetsList,
  onSubmit,
  onCancel
}) => {
  const { widgets: savedWidgets, available_widgets: specs } = widgetsList
  const [widgets, setWidgets] = useState<AnonymousWidget[]>([])
  useEffect(() => {
    setWidgets(savedWidgets)
  }, [savedWidgets])

  const [addingWidget, setAddingWidget] = useState(false)

  /**
   * This tracks the widget objects themselves rather than ids. This is nice
   * since not all widgets have ids. But editing a widget produces a shallow
   * clone, so when edits happen we'll need to manually persist the expanded-or-
   * collapsed state.
   */
  const [widgetsOpen, setWidgetsOpen] = useState<Set<AnonymousWidget>>(
    new Set()
  )

  const allOpen = useMemo(
    () => widgets.every(w => widgetsOpen.has(w)),
    [widgets, widgetsOpen]
  )
  const handleToggleWidgetDetails = useCallback((widget: AnonymousWidget) => {
    setWidgetsOpen(current => {
      const clone = new Set(current)
      if (clone.has(widget)) {
        clone.delete(widget)
      } else {
        clone.add(widget)
      }
      return clone
    })
  }, [])
  const handleToggleAll = useCallback(() => {
    if (allOpen) {
      setWidgetsOpen(new Set())
    } else {
      setWidgetsOpen(new Set(widgets))
    }
  }, [allOpen, widgets])

  const [editingWidget, setEditingWidget] = useState<AnonymousWidget | null>(
    null
  )
  const handleBeginEdit = useCallback((widget: AnonymousWidget) => {
    setEditingWidget(widget)
  }, [])
  const handleCancelEditing = useCallback(() => {
    setEditingWidget(null)
    setAddingWidget(false)
  }, [])
  const handleSubmitEdit: WidgetSubmitHandler = useCallback(
    e => {
      setAddingWidget(false)
      setEditingWidget(null)
      if (e.type === "edit") {
        if (editingWidget === null) {
          throw new Error("An edit is underway, this should not be null.")
        }
        setWidgets(current =>
          current.map(w => (w === editingWidget ? e.widget : w))
        )
        setWidgetsOpen(currentlyOpen => {
          if (!currentlyOpen.has(editingWidget)) return currentlyOpen
          const clone = new Set(currentlyOpen)
          clone.delete(editingWidget)
          clone.add(e.widget)
          return clone
        })
      } else {
        setWidgets(current => [e.widget, ...current])
      }
      return null
    },
    [editingWidget]
  )
  const handleDelete = useCallback((deleted: AnonymousWidget) => {
    setWidgets(current => current.filter(w => w !== deleted))
  }, [])
  const handleAdd = useCallback(() => setAddingWidget(true), [])

  const handleDone = useCallback(() => {
    if (widgets !== savedWidgets) {
      onSubmit({ touched: true, widgets })
    } else {
      onSubmit({ touched: false, widgets })
    }
  }, [onSubmit, widgets, savedWidgets])

  return (
    <>
      <h4 className="ol-widget-editing-header">
        Manage Widgets
        <div className="ol-widget-button-group">
          <Button size="small" variant="outlined" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleDone}>
            Done
          </Button>
        </div>
      </h4>
      <div className="ol-widget-editing-header">
        <Button
          size="small"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          Add Widget
        </Button>
        <Button size="small" color="secondary" onClick={handleToggleAll}>
          {allOpen ? "Collapse all" : "Expand all"}
        </Button>
      </div>
      {widgets.map((widget, index) => (
        <Widget
          widget={widget}
          isEditing={true}
          isOpen={widgetsOpen.has(widget)}
          className="ic-widget"
          actionsClassName="ic-widget-actions"
          onVisibilityChange={handleToggleWidgetDetails}
          onEdit={handleBeginEdit}
          onDelete={handleDelete}
          key={index} // not a good key, but these do not all have ids
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
        onCancel={handleCancelEditing}
      />
    </>
  )
}

export default WidgetsList
