// @flow
import React from "react"
import R from "ramda"
import { Radio } from "@mitodl/mdl-react-components"

import Dialog from "../../components/Dialog"

import {
  DIALOG_EDIT_WIDGET_SELECT_TYPE,
  DIALOG_EDIT_WIDGET_CONFIGURATION
} from "../../actions/ui"

import type {
  WidgetDialogData,
  WidgetFieldSpec,
  WidgetSpec
} from "../../flow/widgetTypes"

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
    const { specs } = this.props

    return (
      <Radio
        className="radio"
        value={this.getValue(widgetTypeLens)}
        onChange={this.updateValue(widgetTypeLens)}
        options={specs.map(spec => ({
          label: spec.widget_type,
          value: spec.widget_type
        }))}
      />
    )
  }

  renderField = (fieldSpec: WidgetFieldSpec) => {
    const lens = R.lensPath(["configuration", [fieldSpec.field_name]])

    const value = this.getValue(lens)
    const valueOrDefault = value !== undefined ? value : fieldSpec.props.default
    switch (fieldSpec.input_type) {
    case "textarea":
      return (
        <textarea
          value={valueOrDefault}
          className="field"
          onChange={this.updateValue(lens)}
          minLength={fieldSpec.props.min_length}
          maxLength={fieldSpec.props.max_length}
          placeholder={fieldSpec.props.placeholder}
        />
      )
    case "number":
      return (
        <input
          type="number"
          className="field"
          value={valueOrDefault}
          onChange={this.updateValue(lens)}
          min={fieldSpec.props.min}
          max={fieldSpec.props.max}
        />
      )
    default:
      return (
        <input
          type="text"
          className="field"
          value={valueOrDefault}
          onChange={this.updateValue(lens)}
          minLength={fieldSpec.props.min_length}
          maxLength={fieldSpec.props.max_length}
          placeholder={fieldSpec.props.placeholder}
        />
      )
    }
  }

  renderConfiguration = () => {
    const { specs } = this.props

    const spec = specs.filter(
      spec => spec.widget_type === this.getValue(widgetTypeLens)
    )[0]

    return (
      <React.Fragment>
        <label className="widget-title-field">
          Widget title
          <input
            type="text"
            value={this.getValue(titleLens)}
            onChange={this.updateValue(titleLens)}
          />
        </label>
        {spec.form_spec.map(item => (
          <label key={item.field_name} className="configuration-field">
            {item.label}
            {this.renderField(item)}
          </label>
        ))}
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

    if (dialogData.state === DIALOG_EDIT_WIDGET_SELECT_TYPE) {
      setDialogData({
        ...dialogData,
        state: DIALOG_EDIT_WIDGET_CONFIGURATION
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

    const title = dialogData.isEditing ? "Edit widget" : "Add widget"
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
          : this.renderConfiguration()}
      </Dialog>
    )
  }
}
