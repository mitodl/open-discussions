// @flow
import { fetchJSONWithAuthFailure } from "./fetch_auth"

import type { Bootcamp } from "../../flow/discussionTypes"

export function getBootcamp(bootcampId: number): Promise<Bootcamp> {
  return fetchJSONWithAuthFailure(`/api/v0/bootcamps/${bootcampId}/`)
}
