import { useCallback, useMemo } from "react"
import { useHistory, useLocation } from "react-router"

/**
 * A hook for getting/setting search parameters of the CURRENT location. The API is a
 * subset of React Router's v6 useSearchParams hook.
 */
const useSearchParams = (): [
  URLSearchParams,
  (newSearchParams: URLSearchParams) => void
] => {
  const history = useHistory()
  /**
   * Do not get location directly from `useHistory`... The return value of
   * `useHistory` is mutable: if we just get location off of it, changes to
   * location will not trigger a re-render.
   */
  const { search } = useLocation()
  const searchParams = useMemo(() => new URLSearchParams(search), [search])
  const setSearchParams = useCallback(
    (newParams: URLSearchParams) => {
      history.replace({ search: newParams.toString() })
    },
    [history]
  )
  return [searchParams, setSearchParams]
}

export default useSearchParams
