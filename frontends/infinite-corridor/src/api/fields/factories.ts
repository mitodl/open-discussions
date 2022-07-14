import casual from "casual"
import { makePaginatedFactory, Factory } from "ol-util"
import type { Field } from "./interfaces"

const makeField: Factory<Field> = (overrides) => ({
  name: casual.name,
  title: casual.title,
  ...overrides,
})

const makeFieldList = makePaginatedFactory(makeField)

export { makeField, makeFieldList }
