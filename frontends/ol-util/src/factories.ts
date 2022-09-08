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

export { makePaginatedFactory }
export type { Factory }
