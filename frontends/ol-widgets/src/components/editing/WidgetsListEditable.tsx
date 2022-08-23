import React, { useCallback, useEffect, useMemo, useState } from "react"
import Button from "@mui/material/Button"
import AddIcon from "@mui/icons-material/Add"
import Widget from "../Widget"
import type { WidgetListResponse, AnonymousWidget } from "../../interfaces"
import type { WidgetSubmitHandler } from "./ManageWidgetDialog"
import ManageWidgetDialog from "./ManageWidgetDialog"

type SubmitWidgetsEvent = {
  touched: boolean
  widgets: AnonymousWidget[]
}

enum DialogMode {
  Closed = "closed",
  Editing = "editing",
  Adding = "adding"
}

interface WidgetsListEditableProps {
  widgetsList: WidgetListResponse
  onSubmit: (event: SubmitWidgetsEvent) => void
  onCancel: () => void
  headerClassName?: string
  widgetClassName?: string
  errorClassName?: string
  fieldClassName?: string
  dialogClassName?: string
}

/**
 * Get a unique key identifying the widget.
 *
 * The intent here is a key function for React lists that works for widgets that
 * have been saved to the database (and therefore have their own id) as well as
 * widgets that have not been saved to the database (and so do not have an id yet).
 */
const getWidgetKey = (widget: AnonymousWidget): string => {
  const withId = widget as AnonymousWidget & { id: unknown }
  if (typeof withId.id === "string") {
    return withId.id
  }
  /**
   * This is not particularly efficient for a React list. However, it should be
   * fine. Our widget lists seem to be quite small (dozens of widgets, not thousands)
   * and each widget is fairly.
   */
  return JSON.stringify(widget)
}

/**
 * Handles frontend widget editing.
 * This component does NOT make API calls itself.
 */
const WidgetsListEditable: React.FC<WidgetsListEditableProps> = ({
  widgetsList,
  onSubmit,
  onCancel,
  headerClassName,
  widgetClassName,
  dialogClassName,
  fieldClassName,
  errorClassName
}) => {
  const { widgets: savedWidgets, available_widgets: specs } = widgetsList
  const [widgets, setWidgets] = useState<AnonymousWidget[]>([])
  useEffect(() => {
    setWidgets(savedWidgets)
  }, [savedWidgets])

  const [dialogMode, setDialogMode] = useState<DialogMode>(DialogMode.Closed)

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
    setDialogMode(DialogMode.Editing)
  }, [])
  const handleCancelEditing = useCallback(() => {
    setDialogMode(DialogMode.Closed)
  }, [])
  const handleSubmitEdit: WidgetSubmitHandler = useCallback(
    e => {
      setDialogMode(DialogMode.Closed)
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
  const handleAdd = useCallback(() => {
    setEditingWidget(null)
    setDialogMode(DialogMode.Adding)
  }, [])

  const handleDone = useCallback(() => {
    if (widgets !== savedWidgets) {
      onSubmit({ touched: true, widgets })
    } else {
      onSubmit({ touched: false, widgets })
    }
  }, [onSubmit, widgets, savedWidgets])

  return (
    <>
      <div className={headerClassName}>
        <h4 className="ol-widget-editing-header-row">
          Manage Widgets
          <div>
            <Button size="small" variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="small" variant="contained" onClick={handleDone}>
              Done
            </Button>
          </div>
        </h4>
        <div className="ol-widget-editing-header-row">
          <Button
            size="small"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Add widget
          </Button>
          <Button size="small" color="secondary" onClick={handleToggleAll}>
            {allOpen ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      </div>
      {widgets.map(widget => (
        <Widget
          widget={widget}
          isEditing={true}
          isOpen={widgetsOpen.has(widget)}
          className={widgetClassName}
          onVisibilityChange={handleToggleWidgetDetails}
          onEdit={handleBeginEdit}
          onDelete={handleDelete}
          key={getWidgetKey(widget)}
        />
      ))}
      <ManageWidgetDialog
        isOpen={dialogMode !== DialogMode.Closed}
        className={dialogClassName}
        fieldClassName={fieldClassName}
        errorClassName={errorClassName}
        onSubmit={handleSubmitEdit}
        widget={editingWidget}
        specs={specs}
        onCancel={handleCancelEditing}
      />
    </>
  )
}

export default WidgetsListEditable

export type { WidgetsListEditableProps }
