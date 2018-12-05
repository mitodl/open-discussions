import React, { Component } from "react"

export default class ListWrapper extends Component {
  /**
   * _defaultListWrapper is a basic wrapper for the widget-list component. It tracks when the user is adding or
   * editing a widget and passes that status down to the widget and form wrappers so that they can render appropriately
   *
   * Props:
   *    renderNewWidgetForm(props): renders a New Widget Form and passes props to the FormWrapper
   *    renderEditWidgetForm(widgetId, props): renders an Edit Widget Form for the widget with id widgetId and
   *      passes props to the FormWrapper
   *    renderList(props): renders the list of widgets, passing props to each widgetWrapper
   */
  state = {
    editMode:       false,
    addWidgetForm:  false,
    editWidgetForm: null
  }

  addWidget = () => {
    /**
     * addWidget is the onClick for the addWidgetButton. It sets the state so that a new widget form is rendered
     */
    this.setState({
      editMode:       true,
      addWidgetForm:  true,
      editWidgetForm: null
    })
  }

  renderAddWidgetButton = () => {
    /**
     * renderAddWidgetButton creates a button to add a new widget
     */
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
    /**
     * closeForm sets the state so that no forms are rendered
     */
    this.setState({
      addWidgetForm:  false,
      editWidgetForm: null
    })
  }

  toggleEditMode = () => {
    /**
     * toggleEditMode toggles the value of editMode
     */
    const { editMode } = this.state
    this.setState({
      editMode:       !editMode,
      addWidgetForm:  false,
      editWidgetForm: null
    })
  }

  editWidget = widgetId => {
    /**
     * editWidget sets the state so that an edit widget form is rendered
     *
     * inputs:
     *    widgetId: the widget to edit
     */
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
