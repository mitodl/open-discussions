// @flow
import R from "ramda"

import { showDropdown, hideDropdownDebounced } from "../actions/ui"

export const dropdownMenuFuncs = R.curry(
  (dispatch: Dispatch<*>, key: string) => ({
    showDropdown: () => dispatch(showDropdown(key)),
    hideDropdown: () => dispatch(hideDropdownDebounced(key))
  })
)
