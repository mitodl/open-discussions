// @flow
import React from "react"
import R from "ramda"

const withSingleColumn = R.curry(
  (className: string, WrappedComponent: Class<React.Component<*, *>>) => {
    class WithSingleColumn extends React.Component<*, *> {
      render() {
        return (
          <div className={`main-content one-column ${className}`}>
            <WrappedComponent {...this.props} />
          </div>
        )
      }
    }
    return WithSingleColumn
  }
)

export default withSingleColumn
