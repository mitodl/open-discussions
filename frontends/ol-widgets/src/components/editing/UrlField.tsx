import React from "react"
import { WidgetEditingFieldProps } from "./interfaces"

const UrlField: React.FC<WidgetEditingFieldProps> = props => {
  return <input type="text" {...props} />
}

export default UrlField
