import React, { Component } from "react"

export default class WidgetWrapper extends Component {
  /**
   * _defaultWidgetWrapper is a basic wrapper for the widget component. It renders a header bar with edit buttons when
   *    the listWrapper passes editMode = true to it.
   *
   * Props:
   *    id: the id of the widget
   *    position: the position of the widget in the widget-list
   *    listLength: the length of the widget-list
   *    moveWidget(newPosition): moves the widget to newPosition
   *    deleteWidget(): deletes the widget form the widget-list
   *    renderWidget(): renders the body of the widget in appropriate renderer
   *
   * Props (passed by _defaultListWrapper)
   *    editWidget(): renders an edit widget form for the widget
   *    editMode: a boolean indicating whether the edit bar should be rendered or not
   */

  moveWidgetUp = () => {
    /**
     * moveWidgetUp moves the widget up one position. It's an onClick function for the edit bar
     */
    const { moveWidget, position } = this.props
    moveWidget(position - 1)
  }

  moveWidgetDown = () => {
    /**
     * moveWidgetDown moves the widget down one position. It's an onClick function for the edit bar
     */
    const { moveWidget, position } = this.props
    moveWidget(position + 1)
  }

  editWidget = () => {
    /**
     * editWidget activates editMode for the widget. It's an onClick function for the edit bar
     */
    const { editWidget, id } = this.props
    editWidget(id)
  }

  deleteWidget = () => {
    /**
     * deleteWidget deletes the widget. It's an onClick function for the edit bar
     */
    const { deleteWidget } = this.props
    deleteWidget()
  }

  renderEditBar = () => {
    /**
     * renderEditBar renders the edit bar for the widget
     */
    const { position, listLength } = this.props
    return (
      <div className="edit-widget-bar btn-group card-header">
        <button
          className="btn btn-info col"
          disabled={position === 0}
          onClick={this.moveWidgetUp}
          title="Move widget up"
        >
          <i className="material-icons">keyboard_arrow_up</i>
        </button>
        <button
          className="btn btn-info col"
          disabled={position === listLength - 1}
          onClick={this.moveWidgetDown}
          title="Move widget down"
        >
          <i className="material-icons">keyboard_arrow_down</i>
        </button>
        <button
          className="btn btn-info col"
          onClick={this.editWidget}
          title="Update widget"
        >
          <i className="material-icons">create</i>
        </button>
        <button
          className="btn btn-danger col"
          onClick={this.deleteWidget}
          title="Delete widget"
        >
          <i className="material-icons">clear</i>
        </button>
      </div>
    )
  }

  render() {
    const { editMode, renderWidget, id } = this.props
    return (
      <div className="widget card bg-light" id={`widget-${id}`}>
        {editMode ? this.renderEditBar() : null}
        {renderWidget()}
      </div>
    )
  }
}
