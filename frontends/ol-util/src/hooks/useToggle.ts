import type { Dispatch, SetStateAction } from "react"
import { useCallback, useMemo, useState } from "react"

interface Toggler extends Dispatch<SetStateAction<boolean>> {
  toggle: () => void;
  on: () => void;
  off: () => void;
  set: Dispatch<SetStateAction<boolean>>;
}

/**
 * Wrapper around boolean `useState` that provides render-stable toggler
 * functions.
 */
const useToggle = (initialValue: boolean): [boolean, Toggler] => {
  const [value, setValue] = useState(initialValue)
  const toggle = useCallback(() => setValue(v => !v), [])
  const on = useCallback(() => setValue(true), [])
  const off = useCallback(() => setValue(false), [])

  const toggler: Toggler = useMemo(() => {
    return Object.assign(setValue, {
      on,
      off,
      toggle,
      set: setValue,
    })
    // This is safe because none of the above have any dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [value, toggler]
}

export default useToggle
