// @flow
import React from "react"
import { SortableContainer } from "react-sortable-hoc"

import WidgetInstance from "./WidgetInstance"

import type { WidgetInstance as WidgetInstanceType } from "../../flow/widgetTypes"
import type { FormValue } from "../../flow/formTypes"

type Props = {
  clearForm: () => void,
  deleteInstance: (widgetInstance: WidgetInstanceType) => void,
  submitForm: () => void,
  widgetInstances: Array<WidgetInstanceType>,
  form: FormValue<Array<WidgetInstanceType>>
}

export default SortableContainer(
  ({ widgetInstances, form, clearForm, submitForm, deleteInstance }: Props) => {
    return (
      <div className="widget-list">
        {form ? (
          <div className="manage-widgets">
            <div className="header-one">
              <span className="manage-title">Manage widgets</span>
              <button className="cancel" onClick={() => clearForm()}>
                Cancel
              </button>
              <button className="submit" onClick={() => submitForm()}>
                Done
              </button>
            </div>
          </div>
        ) : null}
        {widgetInstances.map((widgetInstance, i) => (
          <WidgetInstance
            widgetInstance={widgetInstance}
            key={widgetInstance.id}
            index={i}
            form={form}
            deleteInstance={deleteInstance}
          />
        ))}
      </div>
    )
  }
)
