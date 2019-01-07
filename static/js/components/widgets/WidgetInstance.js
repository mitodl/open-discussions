// @flow
import React from "react"
import { SortableElement, SortableHandle } from "react-sortable-hoc"

import DefaultWidget from "./DefaultWidget"
import Card from "../Card"

import { validWidgetRenderers } from "../../lib/widgets"

import type { StatelessFunctionalComponent } from "react"
import type { WidgetInstance as WidgetInstanceType } from "../../flow/widgetTypes"

type Props = {
  deleteInstance: (widgetInstance: WidgetInstanceType) => void,
  startEditInstance: (widgetInstance: WidgetInstanceType) => void,
  widgetInstance: WidgetInstanceType,
  editing: boolean
}

const DragHandle = SortableHandle(() => (
  <i className="material-icons drag-handle">drag_handle</i>
))

const SortableWidgetInstance: StatelessFunctionalComponent<Props> = SortableElement(
  ({ widgetInstance, editing, deleteInstance, startEditInstance }: Props) => {
    const WidgetClass =
      validWidgetRenderers[widgetInstance.react_renderer] || DefaultWidget
    return (
      <Card className="widget">
        <WidgetClass widgetInstance={widgetInstance} />
        {editing ? (
          <React.Fragment>
            <hr />
            <div className="edit-buttons">
              <i
                className="material-icons edit"
                onClick={() => startEditInstance(widgetInstance)}
              >
                edit
              </i>
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
export default SortableWidgetInstance
