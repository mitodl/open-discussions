// @flow
/* eslint-disable no-unused-vars */
declare var SETTINGS: {
  gaTrackingID: string,
  reactGaDebug: boolean,
  public_path: string,
  site_url: string,
  max_comment_depth: number,
  FEATURES: {
    [key: string]: boolean
  },
  username: ?string,
  user_full_name: ?string,
  user_id: ?number,
  profile_ui_enabled: boolean,
  authenticated_site: {
    title: string,
    login_url: string,
    session_url: string,
    base_url: string,
    tos_url: string
  },
  is_authenticated: boolean,
  is_admin: boolean,
  allow_saml_auth: boolean,
  search_page_size: number,
  search_min_length: number,
  allow_related_posts_ui: boolean,
  support_email: string,
  embedlyKey: string,
  sentry_dsn: string,
  release_version: string,
  environment: string,
  recaptchaKey: string,
  accepted_social_sites: Array<string>,
  ckeditor_upload_url: string,
  article_ui_enabled: boolean,
  algolia_appId: ?string,
  algolia_apiKey: ?string,
  course_ui_enabled: boolean,
  file_search_enabled: boolean,
  livestream_ui_enabled: boolean
}

// mocha
declare var it: Function
declare var beforeEach: Function
declare var afterEach: Function
declare var describe: Function

// webpack
declare var __webpack_public_path__: string // eslint-disable-line camelcase

declare var module: {
  hot: any
}
