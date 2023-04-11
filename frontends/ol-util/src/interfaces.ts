type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

interface PaginatedResult<T> {
  count: number
  next: null | string
  previous: null | string
  results: T[]
}

interface PaginationSearchParams {
  offset?: number
  limit?: number
}

export { PaginationSearchParams, PaginatedResult, PartialBy, RequiredBy }
