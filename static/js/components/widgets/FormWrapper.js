import React, { Component } from "react"

export default class FormWrapper extends Component {

  submitAndClose = data => {
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
