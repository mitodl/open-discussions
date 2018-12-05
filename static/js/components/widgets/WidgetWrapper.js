import React, { Component } from "react"

export default class WidgetWrapper extends Component {

  moveWidgetUp = () => {
    const { moveWidget, position } = this.props
    moveWidget(position - 1)
  }

  moveWidgetDown = () => {
    const { moveWidget, position } = this.props
    moveWidget(position + 1)
  }

  editWidget = () => {
    const { editWidget, id } = this.props
    editWidget(id)
  }

  deleteWidget = () => {
    const { deleteWidget } = this.props
    deleteWidget()
  }

  renderEditBar = () => {
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
