// @flow
import React from "react"
import R from "ramda"
import { Radio } from "@mitodl/mdl-react-components"

import Dialog from "../Dialog"
import WidgetField from "./WidgetField"

import {
  DIALOG_EDIT_WIDGET_SELECT_TYPE,
  DIALOG_EDIT_WIDGET_CONFIGURATION
} from "../../actions/ui"
import { validateWidgetDialog, validationMessage } from "../../lib/validation"

import type { WidgetDialogData, WidgetSpec } from "../../flow/widgetTypes"

type Props = {
  dialogOpen: boolean,
  dialogData: ?WidgetDialogData,
  setDialogData: (data: WidgetDialogData) => void,
  setDialogVisibility: (visible: boolean) => void,
  updateForm: (data: WidgetDialogData) => void,
  specs: Array<WidgetSpec>
}

const titleLens = R.lensPath(["title"])
const widgetTypeLens = R.lensPath(["widget_type"])
export default class WidgetEditDialog extends React.Component<Props> {
  updateValue = R.curry((lens: any, event: any) => {
    const { setDialogData, dialogData } = this.props
    if (!dialogData) {
      return
    }

    const updated = R.set(lens, event.target.value, dialogData.instance)
    setDialogData({
      ...dialogData,
      instance: updated
    })
  })

  getValue = (lens: any) => {
    const { dialogData } = this.props
    return (
      dialogData && dialogData.instance && R.view(lens, dialogData.instance)
    )
  }

  renderSelectWidgetType = () => {
    const { specs, dialogData } = this.props

    const validation = dialogData ? dialogData.validation : {}
    return (
      <React.Fragment>
        {validationMessage(validation.widget_type)}
        <Radio
          className="radio"
          value={this.getValue(widgetTypeLens)}
          onChange={this.updateValue(widgetTypeLens)}
          options={specs.map(spec => ({
            label: spec.widget_type,
            value: spec.widget_type
          }))}
        />
      </React.Fragment>
    )
  }

  renderWidgetInputs = () => {
    const { specs, dialogData } = this.props

    const validation = dialogData ? dialogData.validation : {}
    const spec = specs.filter(
      spec => spec.widget_type === this.getValue(widgetTypeLens)
    )[0]

    return (
      <React.Fragment>
        {validationMessage(validation.title)}
        <label className="widget-title-field">
          Widget title
          <input
            type="text"
            value={this.getValue(titleLens)}
            onChange={this.updateValue(titleLens)}
          />
        </label>
        {spec.form_spec.map(fieldSpec => {
          const lens = R.lensPath(["configuration", [fieldSpec.field_name]])
          return (
            <label key={fieldSpec.field_name} className="configuration-field">
              {fieldSpec.label}
              <WidgetField
                value={this.getValue(lens)}
                onChange={this.updateValue(lens)}
                fieldSpec={fieldSpec}
              />
            </label>
          )
        })}
      </React.Fragment>
    )
  }

  closeDialog = () => {
    const { setDialogVisibility } = this.props
    setDialogVisibility(false)
  }

  acceptDialog = () => {
    const { dialogData, setDialogData, updateForm } = this.props
    if (!dialogData) {
      // for flow
      return
    }

    const validation = validateWidgetDialog(dialogData)
    if (!R.isEmpty(validation)) {
      setDialogData({
        ...dialogData,
        validation
      })
      return
    }

    if (dialogData.state === DIALOG_EDIT_WIDGET_SELECT_TYPE) {
      setDialogData({
        ...dialogData,
        state:      DIALOG_EDIT_WIDGET_CONFIGURATION,
        validation: {}
      })
      return
    }

    updateForm(dialogData)
    this.closeDialog()
  }

  render() {
    const { dialogData, dialogOpen } = this.props
    if (!dialogData) {
      return null
    }

    const title =
      dialogData.state === DIALOG_EDIT_WIDGET_SELECT_TYPE
        ? "Select widget"
        : dialogData.isEditing
          ? "Edit widget"
          : "Add widget"
    const submitText =
      dialogData.state === DIALOG_EDIT_WIDGET_SELECT_TYPE
        ? "Next"
        : dialogData.isEditing
          ? "Update widget"
          : "Create widget"

    return (
      <Dialog
        open={dialogOpen}
        hideDialog={this.closeDialog}
        onAccept={this.acceptDialog}
        title={title}
        submitText={submitText}
      >
        {dialogData.state === DIALOG_EDIT_WIDGET_SELECT_TYPE
          ? this.renderSelectWidgetType()
          : this.renderWidgetInputs()}
      </Dialog>
    )
  }
}
