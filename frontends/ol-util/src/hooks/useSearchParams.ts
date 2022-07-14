import { useCallback, useMemo } from "react"
import { useHistory } from "react-router"

/**
 * A hook for getting/setting search parameters of the CURRENT location. The API is a
 * subset of React Router's v6 useSearchParams hook.
 */
const useSearchParams = (): [
  URLSearchParams,
  (newSearchParams: URLSearchParams) => void
] => {
  const history = useHistory()
  const { search } = history.location
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
