import React from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, Route } from 'react-router-dom';

import App from './containers/App';
import withTracker from './util/withTracker';

export default class Router extends React.Component {
  props: {
    store:  Store,
  };

  render () {
    const { store, children } = this.props;

    return <div>
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    </div>;
  }
}

export const routes = (
  <Route url="/" component={withTracker(App)}/>
);
