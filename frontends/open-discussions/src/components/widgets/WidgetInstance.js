// @flow
import React from "react"
import { SortableElement } from "react-sortable-hoc"

import { Card } from "ol-util"
import DragHandle from "./DragHandle"

import { validWidgetRenderers } from "../../lib/widgets"

import type { StatelessFunctionalComponent } from "react"
import type { WidgetInstance as WidgetInstanceType } from "../../flow/widgetTypes"

type Props = {
  expanded: boolean,
  deleteInstance: (widgetInstance: WidgetInstanceType) => void,
  startEditInstance: (widgetInstance: WidgetInstanceType) => void,
  widgetInstance: WidgetInstanceType,
  editing: boolean,
  toggleExpanded: () => void
}

const SortableWidgetInstance: StatelessFunctionalComponent<Props> =
  SortableElement(
    ({
      expanded,
      widgetInstance,
      editing,
      deleteInstance,
      toggleExpanded,
      startEditInstance
    }: Props) => {
      const WidgetClass = validWidgetRenderers[widgetInstance.widget_type]
      return (
        <Card className="widget">
          <div className="title-row">
            <span className="title">{widgetInstance.title}</span>
            {editing ? (
              <span
                className="toggle-collapse material-icons"
                onClick={toggleExpanded}
              >
                {expanded ? "keyboard_arrow_up" : "keyboard_arrow_down"}
              </span>
            ) : null}
          </div>
          {expanded ? <WidgetClass widgetInstance={widgetInstance} /> : null}
          {editing ? (
            <React.Fragment>
              <hr />
              <div className="edit-buttons">
                <i
                  className="material-icons edit widget-button"
                  onClick={() => startEditInstance(widgetInstance)}
                >
                  edit
                </i>
                <i
                  className="material-icons delete widget-button"
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
