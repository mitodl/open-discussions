// @flow
import R from "ramda"

export const markIsActive = R.curry((mark, state) => {
  // if the selection is empty we check to see if the relevant
  // mark is in storedMarks (basically if italic, bold, etc is enabled)
  // else we see if the mark is present in the selected range
  const { from, $from, to, empty } = state.selection
  return empty
    ? !!mark.isInSet(state.storedMarks || $from.marks())
    : state.doc.rangeHasMark(from, to, mark)
})

export const hasBlockType = R.curry((nodeType, state) => {
  const { $from, to, node } = state.selection

  if (node) {
    return node.hasMarkup(nodeType)
  }

  return to <= $from.end() && $from.parent.hasMarkup(nodeType)
})

export const getSelectedText = view =>
  view
    ? view.state.selection
      .content()
      .content.content.map(node => node.textContent)
      .join("")
    : ""

export const selectionIsEmpty = view => {
  if (!view) {
    return true
  }

  return (
    // we want to check whether the selection is "empty"
    // (i.e. the user has nothing selected) or the selection
    // is only whitespace. to check for whitespace we have
    // to get the currently selected text and
    // check to see if it's an empty string
    view.state.selection.empty || getSelectedText(view).trim() === ""
  )
}
