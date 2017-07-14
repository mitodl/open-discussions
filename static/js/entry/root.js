require('react-hot-loader/patch');
/* global SETTINGS:false */
__webpack_public_path__ = SETTINGS.public_path;  // eslint-disable-line no-undef, camelcase
import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';

import configureStore from '../store/configureStore';
import Router, { routes } from '../Router';

// Object.entries polyfill
import entries from 'object.entries';
if (!Object.entries) {
  entries.shim();
}

const store = configureStore();

const rootEl = document.getElementById("container");

const renderApp = Component => {
  ReactDOM.render(
    <AppContainer>
      <Component store={store}>
        {routes}
      </Component>
    </AppContainer>,
    rootEl
  );
};

renderApp(Router);

if (module.hot) {
  module.hot.accept('../Router', () => {
    const RouterNext = require('../Router').default;
    renderApp(RouterNext);
  });
}
