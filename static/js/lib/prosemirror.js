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
