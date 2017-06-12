import React from 'react';
import { Router } from 'react-router';
import { Provider } from 'react-redux';

import App from './containers/App';

export default class Root extends React.Component {
  props: {
    browserHistory: Object,
    onRouteUpdate:  () => void,
    store:          Store,
    routes:         Object,
  };

  render () {
    const {
      browserHistory,
      onRouteUpdate,
      store,
      routes
    } = this.props;

    return <div>
      <Provider store={store}>
        <Router history={browserHistory} onUpdate={onRouteUpdate} routes={routes} />
      </Provider>
    </div>;
  }
}

export const routes = {
  path: "/",
  component: App,
};
