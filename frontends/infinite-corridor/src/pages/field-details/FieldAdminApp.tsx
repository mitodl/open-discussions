import React from "react"
import { Route } from "react-router-dom"

import EditFieldPage from "./EditFieldPage"
import { FIELD_EDIT } from "../urls"

const FieldAdminApp: React.FC = () => {
  return (
    <Route path={FIELD_EDIT}>
      <EditFieldPage />
    </Route>
  )
}

export default FieldAdminApp
