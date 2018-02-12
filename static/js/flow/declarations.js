// @flow
/* eslint-disable no-unused-vars */
declare var SETTINGS: {
  gaTrackingID: string,
  reactGaDebug: boolean,
  public_path: string,
  max_comment_depth: number,
  FEATURES: {
    [key: string]: boolean,
  },
  username: string,
  authenticated_site: {
    title: string,
    login_url: string,
    session_url: string,
    base_url: string,
    tos_url: string
  }
}

// mocha
declare var it: Function
declare var beforeEach: Function
declare var afterEach: Function
declare var describe: Function

// webpack
declare var __webpack_public_path__: string // eslint-disable-line camelcase

declare var module: {
  hot: any,
}
