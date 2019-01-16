// @flow
import React from "react"
import { SortableContainer } from "react-sortable-hoc"

import WidgetInstance from "./WidgetInstance"

import { getWidgetKey } from "../../lib/widgets"

import type { StatelessFunctionalComponent } from "react"
import type { WidgetInstance as WidgetInstanceType } from "../../flow/widgetTypes"

type Props = {
  startAddInstance: () => void,
  startEditInstance: (widgetInstance: WidgetInstanceType) => void,
  clearForm: () => void,
  deleteInstance: (widgetInstance: WidgetInstanceType) => void,
  widgetInstances: Array<WidgetInstanceType>,
  editing: boolean
}

const SortableWidgetList: StatelessFunctionalComponent<Props> = SortableContainer(
  ({
    widgetInstances,
    editing,
    deleteInstance,
    startAddInstance,
    startEditInstance
  }: Props) => {
    return (
      <div className="widget-list">
        {editing ? (
          <div className="manage-widgets">
            <span className="add-widget" onClick={() => startAddInstance()}>
              + Add widget
            </span>
          </div>
        ) : null}
        {widgetInstances.map((widgetInstance, i) => (
          <WidgetInstance
            startEditInstance={startEditInstance}
            widgetInstance={widgetInstance}
            key={getWidgetKey(widgetInstance)}
            index={i}
            editing={editing}
            deleteInstance={deleteInstance}
          />
        ))}
      </div>
    )
  }
)
export default SortableWidgetList
