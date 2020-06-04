// @flow
/* global SETTINGS: false */
import React from "react"
import { OPEN_CONTENT, PROFESSIONAL, CERTIFICATE } from "../lib/constants"

const OPEN_CONTENT_ICON = "/static/images/open_content_icon.png"
const PROFESSIONAL_ICON = "/static/images/professional_icon.png"
const CERTIFICATE_ICON = "/static/images/certificate_icon.png"

const iconMap = {
  [OPEN_CONTENT]: OPEN_CONTENT_ICON,
  [PROFESSIONAL]: PROFESSIONAL_ICON,
  [CERTIFICATE]:  CERTIFICATE_ICON
}

const tooltipTextMap = {
  [OPEN_CONTENT]: "For those looking to learn now",
  [PROFESSIONAL]: "For those looking to invest in professional development",
  [CERTIFICATE]:  "Recieve a certificate upon completion"
}

type Props = {|
  iconKey: string
|}

const LearningResourceIcon = (props: Props) => {
  const { iconKey } = props

  return (
    <span className="learning-resource-icon" key={iconKey}>
      <span className="icon-tooltip-text">{tooltipTextMap[iconKey]}</span>
      <img src={iconMap[iconKey]} />
    </span>
  )
}

export default LearningResourceIcon
