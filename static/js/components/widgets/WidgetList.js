// @flow
import React from "react"
import { SortableContainer } from "react-sortable-hoc"

import WidgetInstance from "./WidgetInstance"

import type { StatelessFunctionalComponent } from "react"
import type { WidgetInstance as WidgetInstanceType } from "../../flow/widgetTypes"

type Props = {
  startAddInstance: () => void,
  startEditInstance: (widgetInstance: WidgetInstanceType) => void,
  clearForm: () => void,
  deleteInstance: (widgetInstance: WidgetInstanceType) => void,
  submitForm: () => Promise<void>,
  widgetInstances: Array<WidgetInstanceType>,
  editing: boolean
}

const SortableWidgetList: StatelessFunctionalComponent<Props> = SortableContainer(
  ({
    widgetInstances,
    editing,
    clearForm,
    submitForm,
    deleteInstance,
    startAddInstance,
    startEditInstance
  }: Props) => {
    return (
      <div className="widget-list">
        {editing ? (
          <div className="manage-widgets">
            <div className="header-one">
              <span className="manage-title">Manage widgets</span>
              <button className="cancel" onClick={clearForm}>
                Cancel
              </button>
              <button className="submit" onClick={submitForm}>
                Done
              </button>
            </div>
            <div className="header-two">
              <span className="add-widget" onClick={() => startAddInstance()}>
                + Add widget
              </span>
            </div>
          </div>
        ) : null}
        {widgetInstances.map((widgetInstance, i) => (
          <WidgetInstance
            startEditInstance={startEditInstance}
            widgetInstance={widgetInstance}
            key={i}
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
