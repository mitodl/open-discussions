require('react-hot-loader/patch');
/* global SETTINGS:false */
__webpack_public_path__ = SETTINGS.public_path;  // eslint-disable-line no-undef, camelcase
import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import ga from 'react-ga';
import { browserHistory } from 'react-router';
import { routes } from '../Router';

import configureStore from '../store/configureStore';
import Router from '../Router';

// Object.entries polyfill
import entries from 'object.entries';
if (!Object.entries) {
  entries.shim();
}

const store = configureStore();

let debug = SETTINGS.reactGaDebug === "true";
if (SETTINGS.gaTrackingID) {
  ga.initialize(SETTINGS.gaTrackingID, { debug: debug });
}

const rootEl = document.getElementById("container");

const renderApp = Component => {
  ReactDOM.render(
    <AppContainer>
      <Component
        browserHistory={browserHistory}
        store={store}
        onRouteUpdate={() => ga.pageview(window.location.pathname)}
        routes={routes}
      />
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
