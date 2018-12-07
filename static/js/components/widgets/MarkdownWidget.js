// @flow
import React from "react"

import { Markdown } from "../Markdown"

type Props = {
  title: string,
  source: string
}

const MarkdownWidget = ({ title, source }: Props) => (
  <div className="widget-body card-body">
    <h5 className="widget-title card-title">{title}</h5>
    <Markdown source={source} className="widget-text card-text text-truncate" />
  </div>
)

export default MarkdownWidget
