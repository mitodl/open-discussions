import type { PaginatedResult } from "./interfaces"

type Factory<T> = <K extends keyof T>(overrides?: Pick<T, K>) => T

const makePaginatedFactory =
  <T>(makeResult: Factory<T>) =>
  (
    count: number,
    {
      previous = null,
      next = null,
    }: {
      next?: string | null
      previous?: string | null
    } = {}
  ): PaginatedResult<T> => {
    const results = Array(count)
      .fill(null)
      .map(() => makeResult())
    return {
      results,
      count,
      next,
      previous,
    }
  }

export { makePaginatedFactory }
export type { Factory }