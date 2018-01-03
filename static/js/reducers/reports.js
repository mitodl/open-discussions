// @flow
import * as api from "../lib/api"
import { POST, INITIAL_STATE } from "redux-hammock/constants"

import type { GenericReport } from "../flow/discussionTypes"

export const reportsEndpoint = {
  name:         "reports",
  verbs:        [POST],
  postFunc:     (report: GenericReport) => api.reportContent(report),
  initialState: { ...INITIAL_STATE }
}
