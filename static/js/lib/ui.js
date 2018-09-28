// @flow
/* global SETTINGS: false */
import R from "ramda"

import { showDropdown, hideDropdownDebounced } from "../actions/ui"

export const dropdownMenuFuncs = R.curry(
  (dispatch: Dispatch<*>, key: string) => ({
    showDropdown: () => dispatch(showDropdown(key)),
    hideDropdown: () => dispatch(hideDropdownDebounced(key))
  })
)

export const logoImageSrc = () =>
  SETTINGS.use_new_branding
    ? "/static/images/MIT_circle.svg"
    : "/static/images/mit-logo-transparent3.svg"
