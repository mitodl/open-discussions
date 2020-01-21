// @flow
import { useLocation } from "react-router-dom"
import qs from "query-string"

export function useLRDrawerParams() {
  const { search } = useLocation()
  // eslint-disable-next-line camelcase
  const { lr_id, type } = qs.parse(search)

  return {
    objectId:   lr_id,
    objectType: type
  }
}
