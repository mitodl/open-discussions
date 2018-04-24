// @flow
import React from "react"

export default class Embedly extends React.Component<*> {
  renderEmbed() {
    const { embedly } = this.props

    // the response includes HTML which can be used to load a rich embed
    // (either a video or the 'rich' type)
    if (embedly.html) {
      return (
        <div
          className="embed-container"
          dangerouslySetInnerHTML={{ __html: embedly.html }}
        />
      )
    }

    if (embedly.type === "photo") {
      return (
        <div className="photo">
          <img src={embedly.url} />
        </div>
      )
    }

    return (
      <a href={embedly.url} target="_blank" className="link">
        {embedly.thumbnail_url
          ? <div className="thumbnail">
            <img src={embedly.thumbnail_url} />
          </div>
          : null}
        <div className="link-summary">
          <h2>
            {embedly.title}
          </h2>
          <div className="description">
            {embedly.description}
          </div>
        </div>
      </a>
    )
  }

  render() {
    const { embedly } = this.props

    return (
      <div className="embedly">
        {embedly && embedly.type !== "error" ? this.renderEmbed() : null}
      </div>
    )
  }
}
