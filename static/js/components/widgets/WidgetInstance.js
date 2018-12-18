// @flow
import React from "react"
import { SortableElement, SortableHandle } from "react-sortable-hoc"

import DefaultWidget from "./DefaultWidget"
import Card from "../Card"

import { validWidgetRenderers } from "../../lib/widgets"

import type { WidgetInstance as WidgetInstanceType } from "../../flow/widgetTypes"
import type { FormValue } from "../../flow/formTypes"

type Props = {
  deleteInstance: (widgetInstance: WidgetInstanceType) => void,
  widgetInstance: WidgetInstanceType,
  form: FormValue<Array<WidgetInstanceType>>
}

const DragHandle = SortableHandle(() => (
  <i className="material-icons drag-handle">drag_handle</i>
))

export default SortableElement(
  ({ widgetInstance, form, deleteInstance }: Props) => {
    const WidgetClass =
      validWidgetRenderers[widgetInstance.react_renderer] || DefaultWidget
    return (
      <Card className="widget" key={widgetInstance.id}>
        <WidgetClass widgetInstance={widgetInstance} />
        {form ? (
          <React.Fragment>
            <hr />
            <div className="edit-buttons">
              <i
                className="material-icons delete"
                onClick={() => deleteInstance(widgetInstance)}
              >
                delete
              </i>
              <DragHandle />
            </div>
          </React.Fragment>
        ) : null}
      </Card>
    )
  }
)
