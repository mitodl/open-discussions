// @flow
import React from "react"
import R from "ramda"

import { Grid, Cell } from "../components/Grid"

const withSingleColumn = R.curry(
  (className: string, WrappedComponent: Class<React.Component<*, *>>) => {
    class WithSingleColumn extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        return (
          <Grid className={`main-content one-column ${className}`}>
            <Cell width={12}>
              <WrappedComponent {...this.props} />
            </Cell>
          </Grid>
        )
      }
    }

    WithSingleColumn.WrappedComponent = WrappedComponent
    WithSingleColumn.displayName = `withSingleColumn(${WrappedComponent.name})`
    return WithSingleColumn
  }
)

export default withSingleColumn
