// @flow
import R from "ramda"

export const anyProcessing = R.any(R.propEq("processing", true))

export const allLoaded = R.both(
  R.complement(R.isEmpty),
  R.all(R.propEq("loaded", true))
)

const hasError = R.propSatisfies(R.complement(R.isNil), "error")

export const anyError = R.any(hasError)

export const anyErrorExcept404 = R.compose(
  R.any(
    R.either(
      R.propSatisfies(R.isNil, "errorStatusCode"),
      R.propSatisfies(R.complement(R.equals(404)), "errorStatusCode")
    )
  ),
  R.map(R.prop("error")),
  R.filter(hasError)
)
