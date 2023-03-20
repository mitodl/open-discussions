import type { Dispatch, SetStateAction } from "react"
import { useMemo, useState } from "react"

interface Toggler extends Dispatch<SetStateAction<boolean>> {
  toggle: () => void
  on: () => void
  off: () => void
  set: Dispatch<SetStateAction<boolean>>
}

/**
 * Wrapper around boolean `useState` that provides render-stable toggler
 * functions.
 */
const useToggle = (initialValue: boolean): [boolean, Toggler] => {
  const [value, setValue] = useState(initialValue)

  const toggler: Toggler = useMemo(() => {
    return Object.assign(setValue, {
      on:     () => setValue(true),
      off:    () => setValue(false),
      toggle: () => setValue(current => !current),
      set:    setValue
    })
  }, [])

  return [value, toggler]
}

export default useToggle
