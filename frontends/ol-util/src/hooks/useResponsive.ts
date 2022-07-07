import { useEffect, useReducer } from "react"
/**
 * Forces a re-render when the window is re-sized.
 *
 * See https://reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
 */
const useResponsive = () => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0)

  useEffect(() => {
    window.addEventListener("resize", forceUpdate)

    return () => {
      window.removeEventListener("resize", forceUpdate)
    }
  }, [])
}

export default useResponsive
