// @flow
import R from "ramda"

// a place for functions that work with Posts or Comments to live

export const addEditedMarker = R.compose(
  R.prop("text"),
  R.when(
    R.propEq("edited", true),
    R.evolve({
      text: str => str.concat(" _[edited by author]_")
    })
  )
)
