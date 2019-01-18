// @flow
import React from "react"
import moment from "moment"
import Dotdotdot from "react-dotdotdot"
import striptags from "striptags"
import { AllHtmlEntities } from "html-entities"

const entities = new AllHtmlEntities()

import type { WidgetInstance } from "../../flow/widgetTypes"

type Props = {
  widgetInstance: WidgetInstance
}

const RssWidget = ({ widgetInstance: { json, title } }: Props) => {
  const entries = (json && json.entries) || []

  return (
    <React.Fragment>
      <span className="title">{title}</span>
      {entries.map(entry => (
        <div key={entry.link} className="entry">
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
      ))}
    </React.Fragment>
  )
}
export default RssWidget
