import React, { useCallback } from "react"
import {
  Widget,
  WidgetsListEditable,
  WidgetsListEditableProps,
  WidgetDialogClasses
} from "ol-widgets"
import { useMutateWidgetsList, useWidgetList } from "../../api/widgets"

interface WidgetsListProps {
  isEditing: boolean
  widgetListId: number
  className?: string
  onFinishEditing?: () => void
}

const dialogClasses: WidgetDialogClasses = {
  dialog:     "ic-widget-editing-dialog",
  field:      "form-field",
  error:      "validation-message",
  label:      "field-label",
  detail:     "field-detail",
  fieldGroup: "form-item"
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
  const onSubmit: WidgetsListEditableProps["onSubmit"] = useCallback(
    event => {
      if (event.touched) {
        mutation.mutate(event.widgets, {
          onSuccess: () => {
            if (onFinishEditing) onFinishEditing()
          }
        })
      } else {
        if (onFinishEditing) onFinishEditing()
      }
    },
    [onFinishEditing, mutation]
  )
  const onCancel: WidgetsListEditableProps["onCancel"] = useCallback(() => {
    if (onFinishEditing) onFinishEditing()
  }, [onFinishEditing])
  return (
    <section className={className}>
      {isEditing ?
        widgetsQuery.data && (
          <WidgetsListEditable
            widgetsList={widgetsQuery.data}
            onSubmit={onSubmit}
            onCancel={onCancel}
            headerClassName="ic-widget-editing-header"
            widgetClassName="ic-widget"
            dialogClasses={dialogClasses}
          />
        ) :
        widgets.map(widget => (
          <Widget
            key={widget.id}
            widget={widget}
            isEditing={false}
            className="ic-widget"
          />
        ))}
    </section>
  )
}

export default WidgetsList
