// @flow
import React from "react"
import R from "ramda"

import { Grid, Cell } from "../components/Grid"

const withTwoColumns = R.curry(
  (className: string, WrappedComponent: Class<React.Component<*, *>>) => {
    class WithTwoColumns extends React.Component<*, *> {
      static WrappedComponent: Class<React.Component<*, *>>

      render() {
        const { renderSidebar } = this.props

        return (
          <Grid className={`main-content two-column ${className}`}>
            <Cell width={8}>
              <WrappedComponent {...this.props} />
            </Cell>
            {renderSidebar ? <Cell width={4}>{renderSidebar()}</Cell> : null}
          </Grid>
        )
      }
    }

    WithTwoColumns.WrappedComponent = WrappedComponent
    WithTwoColumns.displayName = `withTwoColumns(${WrappedComponent.name})`
    return WithTwoColumns
  }
)

export default withTwoColumns
