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
  expanded: { [string]: boolean },
  deleteInstance: (widgetInstance: WidgetInstanceType) => void,
  widgetInstances: Array<WidgetInstanceType>,
  setExpanded: (widgetInstanceIds: Array<string>, expanded: boolean) => void,
  editing: boolean
}

const SortableWidgetList: StatelessFunctionalComponent<Props> =
  SortableContainer(
    ({
      widgetInstances,
      expanded,
      deleteInstance,
      editing,
      setExpanded,
      startAddInstance,
      startEditInstance
    }: Props) => {
      const widgetKeys = widgetInstances.map(getWidgetKey)
      const anyCollapsed = widgetKeys.filter(key => !expanded[key]).length > 0
      return (
        <div className="widget-list">
          {editing ? (
            <div className="manage-widgets">
              <span className="add-widget" onClick={() => startAddInstance()}>
                + Add widget
              </span>
              <span
                className="toggle-collapse-all"
                onClick={() => setExpanded(widgetKeys, anyCollapsed)}
              >
                {anyCollapsed ? "Expand" : "Collapse"} all
              </span>
            </div>
          ) : null}
          {widgetInstances.map((widgetInstance, i) => {
            const key = getWidgetKey(widgetInstance)
            const instanceIsExpanded = !!expanded[key]
            return (
              <WidgetInstance
                startEditInstance={startEditInstance}
                widgetInstance={widgetInstance}
                key={key}
                index={i}
                editing={editing}
                deleteInstance={deleteInstance}
                expanded={!editing || instanceIsExpanded}
                toggleExpanded={() => setExpanded([key], !instanceIsExpanded)}
              />
            )
          })}
        </div>
      )
    }
  )
export default SortableWidgetList
