import { faker } from "@faker-js/faker"
import type { Factory } from "ol-util/src/factories"
import type { User } from "../types/settings"

const makeUserSettings: Factory<User> = (overrides = {}) => {
  const hasConflict =
    (Number.isFinite(overrides.id) && overrides.is_authenticated === false) ||
    (overrides.id === null && overrides.is_authenticated === true)
  if (hasConflict) {
    throw new Error(
      "Conflicting values of id and is_authenticated detected. Suggest supplying one or the other, not both."
    )
  }

  const calculated: Partial<User> = {}
  if (Number.isFinite(overrides.id)) {
    calculated.is_authenticated = true
  } else if (overrides.is_authenticated) {
    calculated.id = faker.datatype.number()
  }
  return {
    id:               null,
    is_authenticated: false,
    is_list_staff:    false,
    ...calculated,
    ...overrides
  }
}

export { makeUserSettings }
