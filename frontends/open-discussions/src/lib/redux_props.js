// @flow
import R from "ramda"

export const mergeAndInjectProps = R.curry(
  (injectProps, stateProps, dispatchProps, ownProps) => ({
    ...ownProps,
    ...stateProps,
    ...dispatchProps,
    ...injectProps(stateProps, dispatchProps, ownProps)
  })
)
