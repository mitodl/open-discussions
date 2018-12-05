import React, { Component } from "react"

export default class ListWrapper extends Component {
  state = {
    editMode:       false,
    addWidgetForm:  false,
    editWidgetForm: null
  }

  addWidget = () => {
    this.setState({
      editMode:       true,
      addWidgetForm:  true,
      editWidgetForm: null
    })
  }

  renderAddWidgetButton = () => {
    return (
      <button
        className="btn btn-info col add-widget-btn"
        onClick={this.addWidget}
      >
        <i className="material-icons">add</i>
      </button>
    )
  }

  closeForm = () => {
    this.setState({
      addWidgetForm:  false,
      editWidgetForm: null
    })
  }

  toggleEditMode = () => {
    const { editMode } = this.state
    this.setState({
      editMode:       !editMode,
      addWidgetForm:  false,
      editWidgetForm: null
    })
  }

  editWidget = widgetId => {
    this.setState({
      editMode:       true,
      editWidgetForm: widgetId,
      addWidgetForm:  false
    })
  }

  render() {
    const { addWidgetForm, editWidgetForm, editMode } = this.state
    const { renderNewWidgetForm, renderEditWidgetForm, renderList } = this.props
    return (
      <div className="bg-secondary rounded card default-list-wrapper">
        <div
          className="edit-widget-list-bar btn-group card-header"
          role="group"
        >
          <button
            className={`btn btn-info col edit-widget-list-btn ${
              editMode ? "active" : ""
            }`}
            onClick={this.toggleEditMode}
          >
            <i className="material-icons">create</i>
          </button>
          {editMode ? this.renderAddWidgetButton() : null}
        </div>
        <div className="card-body">
          {addWidgetForm
            ? renderNewWidgetForm({ closeForm: this.closeForm })
            : null}
          {editWidgetForm !== null
            ? renderEditWidgetForm(editWidgetForm, {
              closeForm: this.closeForm
            })
            : null}
          {renderList({
            editMode:   editMode,
            editWidget: this.editWidget
          })}
        </div>
      </div>
    )
  }
}
