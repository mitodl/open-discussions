// @flow
import { GET, INITIAL_STATE } from "redux-hammock/constants"
import type { Bootcamp } from "../flow/discussionTypes"
import * as bootcampAPI from "../lib/api/bootcamps"

const updateBootcampHandler = (
  payload: Bootcamp,
  data: Map<number, Bootcamp>
): Map<number, Bootcamp> => {
  const update = new Map(data)
  update.set(payload.id, payload)
  return update
}

export const bootcampsEndpoint = {
  name:              "bootcamps",
  verbs:             [GET],
  initialState:      { ...INITIAL_STATE, data: new Map() },
  getFunc:           (id: number) => bootcampAPI.getBootcamp(id),
  getSuccessHandler: updateBootcampHandler
}
