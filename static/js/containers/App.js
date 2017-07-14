// @flow
import React from 'react';
import { Route } from 'react-router-dom';

import HomePage from './HomePage';

export default class App extends React.Component {
  render() {
    const { match } = this.props;
    return (
      <div>
        <Route exact path={match.url} component={HomePage}/>
      </div>
    );
  }
}
