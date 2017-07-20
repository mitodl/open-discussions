// @flow
import React from 'react';
import { Route } from 'react-router-dom';

import HomePage from './HomePage';

import type { Match } from 'react-router';

export default class App extends React.Component {
  props: {
    match: Match,
  }

  render() {
    const { match } = this.props;
    return (
      <div>
        <Route exact path={match.url} component={HomePage}/>
      </div>
    );
  }
}
