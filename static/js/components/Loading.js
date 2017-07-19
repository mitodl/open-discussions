// @flow
import React from 'react';
import R from 'ramda';

import type { RestState } from '../flow/restTypes';

const anyProcessing = R.any(R.propEq('processing', true));
const allLoaded = R.all(R.propEq('loaded', true));
const anyError = R.any(R.propSatisfies(R.complement(R.isNil), 'error'));

export default class Loading extends React.Component {
  props: {
    restStates:     Array<RestState<*>>,
    renderContents: Function,
  }

  render() {
    const { restStates, renderContents } = this.props;

    if (anyProcessing(restStates) || !allLoaded(restStates)) {
      return <div>Loading</div>;
    }

    if (anyError(restStates)) {
      return <div>Error loading page</div>;
    }

    return renderContents();
  }
}
