import React, { Component } from "react"
import Select from "react-select"
import { makeOptionsFromList, makeOptionsFromObject } from "../../lib/widgets"

export default class WidgetForm extends Component {
  /**
   * WidgetForm is a dynamically generated form with input fields defined by a configuration JSON blob
   *
   * Props:
   *    formData: the default values for the form. If null, all inputs will start blank
   *    onSubmit(widgetClass, data): the behavior to take when the form is submitted
   *    widgetClass: the class of the widget being edited or the empty string for a new widget
   *    widgetClassConfigurations: object containing available configurations for the available widget classes
   *    widgetClasses: list of available widget classes
   *
   * State:
   *    formData: keeps track of the current input of the form
   *    widgetClass: keeps track of the current chosen class
   */
  state = {
    formData:    this.props.formData,
    widgetClass: this.props.widgetClass
  }

  onChange(key, value) {
    /**
     * Update formData with the new value on input form change
     */
    const { formData } = this.state
    this.setState({
      formData: {
        ...formData,
        [key]: value
      }
    })
  }

  onSubmit = event => {
    /**
     * Submit widget class and form data with onSubmit from props
     */
    event.preventDefault()

    const { onSubmit } = this.props
    const { formData, widgetClass } = this.state
    onSubmit(widgetClass, formData)
  }

  makeWidgetClassSelect = () => {
    /**
     * makeWidgetClassSelect makes a react-select component
     */
    const { widgetClasses } = this.props
    return (
      <Select
        className="widget-form-input-select widget-class-input-select"
        onChange={option => this.setState({ widgetClass: option.value })}
        options={makeOptionsFromList(widgetClasses)}
        placeholder="Choose a widget class"
      />
    )
  }

  render() {
    /**
     * Render a wrapper which handles form title and choosing which class of widget to configure
     */
    const { widgetClasses, widgetClassConfigurations } = this.props
    const { widgetClass } = this.state
    return (
      <form onSubmit={this.onSubmit}>
        <div className="widget-form-input-group widget-class-input-group">
          <label className="widget-form-input-label widget-class-label">
            {`Configure ${widgetClass} Widget`}
          </label>
          {widgetClasses.length > 1 ? this.makeWidgetClassSelect() : null}
        </div>
        {this.renderInputs(widgetClassConfigurations[widgetClass])}
      </form>
    )
  }

  renderInputs = model => {
    /**
     * Render widget form inputs based on the configuration of widgetClass
     *
     * inputs:
     *    model: a list of input fields that contain:
     *      key: a unique key
     *      inputType: the type of input field
     *      props: props to put on the input field
     */
    if (model === undefined) {
      return
    }
    const { formData } = this.props
    const formUI = model.map(field => {
      const { key, inputType, props, choices, label } = field

      const inputProps = {
        className:    `widget-form-input-${inputType} widget-form-input-${key}`,
        defaultValue: null,
        key:          key,
        onChange:     event => {
          this.onChange(key, event.target.value)
        },
        ...props
      }

      // Set default values if they exist
      if (inputType === "select") {
        inputProps.defaultValue = []
      } else {
        inputProps.defaultValue = formData[key]
      }

      // Create options for select parameters and set defaultValue
      if (inputType === "select") {
        inputProps.options = makeOptionsFromObject(choices)
        if (key in formData && formData[key]) {
          for (const option of inputProps.options) {
            if (formData[key].includes(option.value)) {
              inputProps.defaultValue.push(option)
            }
          }
        }
      }

      let input
      if (inputType === "select") {
        inputProps.onChange = selection => {
          this.onChange(key, selection.map(option => option.value))
        }
        input = <Select {...inputProps} />
      } else if (inputType === "textarea") {
        input = <textarea {...inputProps} />
      } else {
        input = <input {...inputProps} type="text" />
      }

      return (
        <div className="widget-form-input-group" key={key}>
          <label
            className="widget-form-input-label"
            htmlFor={key}
            key={`${key}-label`}
          >
            {label}
          </label>
          {input}
        </div>
      )
    })
    return (
      <div className="widget-form-body">
        {formUI}
        <button className="widget-form-submit-btn" type="submit">
          Submit
        </button>
      </div>
    )
  }
}
