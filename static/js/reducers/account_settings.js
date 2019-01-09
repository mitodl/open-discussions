// @flow
import * as api from "../lib/api/api"
import { INITIAL_STATE, GET } from "redux-hammock/constants"

export const accountSettingsEndpoint = {
  name:         "accountSettings",
  initialState: { ...INITIAL_STATE, data: [] },
  verbs:        [GET],
  getFunc:      () => api.getSocialAuthTypes()
}
