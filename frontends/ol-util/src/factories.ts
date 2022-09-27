import { faker } from "@faker-js/faker"
import type { PaginatedResult } from "./interfaces"
import { times } from "lodash"

type Factory<T, U = never> = (overrides?: Partial<T>, options?: U) => T

const makePaginatedFactory =
  <T>(makeResult: Factory<T>) =>
    (
      count: number,
      {
        previous = null,
        next = null
      }: {
      next?: string | null
      previous?: string | null
    } = {}
    ): PaginatedResult<T> => {
      const results = times(count, () => makeResult())
      return {
        results,
        count,
        next,
        previous
      }
    }

/**
 * Make a random URL with `faker`, but standardize it to what browsers use.
 */
const makeUrl = (): string => new URL(faker.internet.url()).toString()

export { makePaginatedFactory, makeUrl }
export type { Factory }
