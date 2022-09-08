import React from "react"
import { WidgetEditingFieldProps } from "./interfaces"
import { EmbedlyCard } from "ol-util"

interface ExtraProps {
  showEmbed?: boolean
}

const UrlField: React.FC<WidgetEditingFieldProps & ExtraProps> = props => {
  const { showEmbed, ...others } = props

  return (
    <>
      <input type="text" {...others} />
      {showEmbed && (
        <EmbedlyCard className="ol-widget-url-preview" url={props.value} />
      )}
    </>
  )
}

export default UrlField
