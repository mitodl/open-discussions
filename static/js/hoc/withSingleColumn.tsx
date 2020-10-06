import { Class } from "utility-types";

import React from "react";
import R from "ramda";

import { Grid, Cell } from "../components/Grid";

const withSingleColumn = R.curry((className: string, WrappedComponent: Class<React.Component<any, any>>) => {
  class WithSingleColumn extends React.Component<any, any> {

    static WrappedComponent: Class<React.Component<any, any>>;

    render() {
      return <Grid className={`main-content one-column ${className}`}>
            <Cell width={8}>
              <WrappedComponent {...this.props} />
            </Cell>
          </Grid>;
    }
  }

  WithSingleColumn.WrappedComponent = WrappedComponent;
  WithSingleColumn.displayName = `withSingleColumn(${WrappedComponent.name})`;
  return WithSingleColumn;
});

export default withSingleColumn;