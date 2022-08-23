import { useRef } from "react"
import { uniqueId } from "lodash"

/**
 * A partial backport of React 18's `useId` hook. Useful for generating ids for
 * form elements. See https://reactjs.org/docs/hooks-reference.html#useid for more.
 */
const useId = (): string => {
  const id = useRef<string | undefined>()
  if (id.current === undefined) {
    id.current = uniqueId("useid:")
  }
  return id.current
}

export default useId
