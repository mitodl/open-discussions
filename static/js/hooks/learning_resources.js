// @flow
import { useLocation } from "react-router-dom"
import qs from "query-string"

export function useLRDrawerParams() {
  const { search } = useLocation()
  const { drawerObjectID, drawerObjectType } = qs.parse(search)

  return {
    objectId:   drawerObjectID,
    objectType: drawerObjectType
  }
}
