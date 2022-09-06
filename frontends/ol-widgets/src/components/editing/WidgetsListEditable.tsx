import React, { useCallback, useEffect, useMemo, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import Button from "@mui/material/Button"
import AddIcon from "@mui/icons-material/Add"
import { uniqueId, zip } from "lodash"
import { RenderActive, SortableItem, SortableList, SortEndEvent } from "ol-util"
import Widget from "../Widget"
import type { WidgetListResponse, AnonymousWidget } from "../../interfaces"
import type {
  WidgetSubmitHandler,
  WidgetDialogClasses
} from "./ManageWidgetDialog"
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
  dialogClasses?: WidgetDialogClasses
}

/**
 * An wrapper with an id for objects that might not have ids.
 */
interface Wrapped<T> {
  id: string
  wraps: T
}

const mustGetId = (widget: AnonymousWidget) => {
  const { id } = widget as AnonymousWidget & { id?: unknown }
  if (typeof id === "string" || typeof id === "number") {
    return String(id)
  }
  throw new Error("Expected widget to have an id but it did not.")
}
const mustFindWrapper = <T, >(wrappers: Wrapped<T>[], item: T) => {
  const wrapped = wrappers.find(w => w.wraps === item)
  if (!wrapped) {
    throw new Error("Could not find item.")
  }
  return wrapped
}

const useWidgetVisibilities = (wrappers: Wrapped<AnonymousWidget>[]) => {
  const [widgetsOpen, setWidgetsOpen] = useState<Set<string>>(new Set())

  const allOpen = useMemo(
    () => wrappers.every(w => widgetsOpen.has(w.id)),
    [wrappers, widgetsOpen]
  )
  const toggle = useCallback(
    (widget: AnonymousWidget) => {
      const wrapper = mustFindWrapper(wrappers, widget)
      setWidgetsOpen(current => {
        const clone = new Set(current)
        if (clone.has(wrapper.id)) {
          clone.delete(wrapper.id)
        } else {
          clone.add(wrapper.id)
        }
        return clone
      })
    },
    [wrappers]
  )
  const toggleAll = useCallback(() => {
    if (allOpen) {
      setWidgetsOpen(new Set())
    } else {
      setWidgetsOpen(new Set(wrappers.map(w => w.id)))
    }
  }, [allOpen, wrappers])

  const visibility = { open: widgetsOpen, allOpen }
  const modifyVisibility = {
    set: setWidgetsOpen,
    toggle,
    toggleAll
  }
  return [visibility, modifyVisibility] as const
}

const useWidgetEditingDialog = (
  wrappedWidgets: Wrapped<AnonymousWidget>[],
  setWrappers: Dispatch<SetStateAction<Wrapped<AnonymousWidget>[]>>
) => {
  const [dialogMode, setDialogMode] = useState<DialogMode>(DialogMode.Closed)

  const [editingWidget, setEditingWidget] =
    useState<Wrapped<AnonymousWidget> | null>(null)

  const handleBeginEdit = useCallback(
    (widget: AnonymousWidget) => {
      const wrapper = mustFindWrapper(wrappedWidgets, widget)
      setEditingWidget(wrapper)
      setDialogMode(DialogMode.Editing)
    },
    [wrappedWidgets]
  )
  const handleCancelEditing = useCallback(() => {
    setDialogMode(DialogMode.Closed)
  }, [])
  const handleSubmitEdit: WidgetSubmitHandler = useCallback(
    e => {
      setDialogMode(DialogMode.Closed)
      if (e.type === "edit") {
        if (editingWidget === null) {
          throw new Error("An edit is underway, this should not be null.")
        }
        setWrappers(current =>
          current.map(w =>
            w === editingWidget ? { id: editingWidget.id, wraps: e.widget } : w
          )
        )
      } else {
        const newId = uniqueId("new_widget")
        setWrappers(current => [{ id: newId, wraps: e.widget }, ...current])
      }
      return null
    },
    [editingWidget, setWrappers]
  )

  const handleAdd = useCallback(() => {
    setEditingWidget(null)
    setDialogMode(DialogMode.Adding)
  }, [])

  const dialog = {
    mode:   dialogMode,
    widget: editingWidget?.wraps
  }
  const handlers = {
    beginEdit: handleBeginEdit,
    beginAdd:  handleAdd,
    cancel:    handleCancelEditing,
    submit:    handleSubmitEdit
  }
  return [dialog, handlers] as const
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
  dialogClasses
}) => {
  const { widgets: savedWidgets, available_widgets: specs } = widgetsList
  /**
   * Newly created widgets do not have ids until they are saved to the database.
   * So instead let's work with wrappers that always have ids.
   */
  const [wrappers, setWrappers] = useState<Wrapped<AnonymousWidget>[]>([])

  const [visibility, modifyVisibility] = useWidgetVisibilities(wrappers)
  const [dialog, dialogHandlers] = useWidgetEditingDialog(wrappers, setWrappers)

  useEffect(() => {
    const wrapped = savedWidgets.map(w => ({ wraps: w, id: mustGetId(w) }))
    setWrappers(wrapped)
  }, [savedWidgets])

  const handleDelete = useCallback(
    (deleted: AnonymousWidget) => {
      const wrapper = mustFindWrapper(wrappers, deleted)
      setWrappers(current => current.filter(w => w !== wrapper))
    },
    [wrappers, setWrappers]
  )

  const handleDone = useCallback(() => {
    const widgets = wrappers.map(w => w.wraps)
    const touched = zip(widgets, savedWidgets).some(([w1, w2]) => w1 !== w2)
    onSubmit({ touched, widgets })
  }, [onSubmit, wrappers, savedWidgets])

  const itemIds = useMemo(() => wrappers.map(w => w.id), [wrappers])

  const renderDragging: RenderActive = useCallback(
    active => {
      const wrapper = active.data.current as Wrapped<AnonymousWidget>
      return (
        <Widget
          widget={wrapper.wraps}
          isEditing={true}
          isOpen={visibility.open.has(wrapper.id)}
          className={widgetClassName}
        />
      )
    },
    [visibility, widgetClassName]
  )

  const onSortEnd = useCallback((e: SortEndEvent<string>) => {
    setWrappers(current => {
      const lookup = Object.fromEntries(current.map(w => [w.id, w]))
      return e.itemIds.map(id => lookup[id])
    })
  }, [])

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
            onClick={dialogHandlers.beginAdd}
          >
            Add widget
          </Button>
          <Button
            size="small"
            color="secondary"
            onClick={modifyVisibility.toggleAll}
          >
            {visibility.allOpen ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      </div>
      <SortableList
        itemIds={itemIds}
        renderActive={renderDragging}
        onSortEnd={onSortEnd}
      >
        {wrappers.map(wrapper => (
          <SortableItem key={wrapper.id} id={wrapper.id} data={wrapper}>
            {handleProps => (
              <Widget
                widget={wrapper.wraps}
                isEditing={true}
                isOpen={visibility.open.has(wrapper.id)}
                className={widgetClassName}
                onVisibilityChange={modifyVisibility.toggle}
                onEdit={dialogHandlers.beginEdit}
                onDelete={handleDelete}
                handleProps={handleProps}
              />
            )}
          </SortableItem>
        ))}
      </SortableList>
      <ManageWidgetDialog
        isOpen={dialog.mode !== DialogMode.Closed}
        classes={dialogClasses}
        onSubmit={dialogHandlers.submit}
        widget={dialog.widget}
        specs={specs}
        onCancel={dialogHandlers.cancel}
      />
    </>
  )
}

export default WidgetsListEditable

export type { WidgetsListEditableProps }
