import React, { Component } from "react"

export default class FormWrapper extends Component {
  /**
   * _defaultFormWrapper is a basic wrapper for the widget form component. It handles closing the form after submit
   *    and renders a cancel button
   *
   * Props:
   *    updateWidgetList(data): updates the widget-list with data returned from the form submission
   *    renderForm(props): renders the the widget form with props that overwrite the default props
   *
   * Props (passed by _defaultListWrapper)
   *    closeForm(): closes the widget form
   */

  submitAndClose = data => {
    /**
     * submitAndClose takes data, updates the widget-list, and then closes the form. This function will overwrite the
     *    default onSubmit passed by WidgetList which only updates the widget-list
     *
     * inputs:
     *    data: the data returned by the form submission
     */
    const { updateWidgetList, closeForm } = this.props
    updateWidgetList(data)
    closeForm()
  }

  render() {
    const { renderForm, closeForm } = this.props
    return (
      <div className="widget-form card default-form-wrapper">
        {renderForm({ onSubmit: this.submitAndClose })}
        <div className="cancel-form-button card-footer">
          <button
            className="btn btn-danger btn-block widget-form-cancel-btn"
            onClick={closeForm}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }
}
