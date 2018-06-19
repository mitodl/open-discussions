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
  username: ?string,
  user_full_name: ?string,
  profile_ui_enabled: boolean,
  authenticated_site: {
    title: string,
    login_url: string,
    session_url: string,
    base_url: string,
    tos_url: string
  },
  is_authenticated: boolean,
  allow_anonymous: boolean,
  allow_email_auth: boolean,
  support_email: string
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
