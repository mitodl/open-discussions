// @flow
import React from "react"
import moment from "moment"
import Dotdotdot from "react-dotdotdot"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"

const entities = new AllHtmlEntities()

import type { WidgetComponentProps } from "../../flow/widgetTypes"

const RssWidget = ({ widgetInstance: { json } }: WidgetComponentProps) => {
  const entries = (json && json.entries) || []

  return entries.map((entry, idx) => (
    <div key={idx} className="entry">
      <div className="entry-title">
        <a href={entry.link} target="_blank" rel="noopener noreferrer">
          {entry.title}
        </a>
      </div>
      <Dotdotdot clamp={3} className="description">
        {entities.decode(striptags(entry.description))}
      </Dotdotdot>
      <span className="time">
        {entry.timestamp ? moment(entry.timestamp).fromNow() : null}
      </span>
    </div>
  ))
}
export default RssWidget
