/* global SETTINGS:false */
__webpack_public_path__ = `http://${SETTINGS.host}:8062/`;  // eslint-disable-line no-undef, camelcase
import ReactDOM from 'react-dom';
import ga from 'react-ga';
import { browserHistory } from 'react-router';

import configureStore from './store/configureStore';
import { makeRoutes } from './routes';

const store = configureStore();

let debug = SETTINGS.reactGaDebug === "true";
ga.initialize(SETTINGS.gaTrackingID, { debug: debug });

ReactDOM.render(
  makeRoutes(browserHistory, store, () => ga.pageview(window.location.pathname)),
  document.getElementById("container")
);
