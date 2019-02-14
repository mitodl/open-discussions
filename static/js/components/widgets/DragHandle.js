// @flow
import React from "react"
import { SortableHandle } from "react-sortable-hoc"

const DragHandle = SortableHandle(() => (
  <i className="material-icons drag-handle widget-button">reorder</i>
))
export default DragHandle
