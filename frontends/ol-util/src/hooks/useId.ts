import { useRef } from "react"

const getId = () => Math.random().toString(16).replace('.', ':')

/**
 * Returns an ID that is stable across renders, similar to the [`useId`](https://reactjs.org/docs/hooks-reference.html#useid)
 * hook in React 18+.
 * 
 * Useful, e.g., for generating unique element ids.
 */
const useId = (): string => {
  const idRef = useRef(getId())
  return idRef.current
}

export default useId