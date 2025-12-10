// @flow
import { frontPageEndpoint } from "../reducers/frontpage"
import { reportsEndpoint } from "../reducers/reports"
import { settingsEndpoint } from "../reducers/settings"
import { accountSettingsEndpoint } from "../reducers/account_settings"
import { embedlyEndpoint } from "../reducers/embedly"
import { profilesEndpoint } from "../reducers/profiles"
import { userWebsitesEndpoint } from "../reducers/websites"
import { userContributionsEndpoint } from "../reducers/user_contributions"
import { authEndpoint } from "../reducers/auth"
import { passwordResetEndpoint } from "../reducers/password_reset"
import { passwordChangeEndpoint } from "../reducers/password_change"
import { profileImageEndpoint } from "../reducers/profile_image"
import { searchEndpoint } from "../reducers/search"
import { widgetsEndpoint } from "../reducers/widgets"
import { livestreamEndpoint } from "../reducers/livestream"

import type { Dispatch } from "redux"

export const endpoints = [
  frontPageEndpoint,
  reportsEndpoint,
  settingsEndpoint,
  accountSettingsEndpoint,
  embedlyEndpoint,
  profilesEndpoint,
  userWebsitesEndpoint,
  userContributionsEndpoint,
  authEndpoint,
  passwordResetEndpoint,
  passwordChangeEndpoint,
  profileImageEndpoint,
  searchEndpoint,
  widgetsEndpoint,
  livestreamEndpoint
]

/**
 * takes an actionCreator and dispatch and returns a function that
 * dispatches the action created by that actionCreator to the store
 */
export function createActionHelper(
  dispatch: Dispatch<*>,
  actionCreator: Function
): (...args: any) => void {
  return (...args) => dispatch(actionCreator(...args))
}
