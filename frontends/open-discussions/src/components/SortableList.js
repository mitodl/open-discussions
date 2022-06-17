// @flow
import React from "react"
import { sortableContainer, sortableElement } from "react-sortable-hoc"

export const SortableItem = sortableElement(({ children }) => (
  <React.Fragment>{children}</React.Fragment>
))

export const SortableContainer = sortableContainer(({ children }) => (
  <React.Fragment>{children}</React.Fragment>
))
