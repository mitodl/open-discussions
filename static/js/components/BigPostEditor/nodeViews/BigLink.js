// @flow
import React from "react"

import Embedly, { EmbedlyLoader } from "../../Embedly"

type Props = {
  href: string,
  getEmbedly: Function,
  embedly?: Object,
  embedlyInFlight: boolean
}

export default class BigLink extends React.Component<Props> {
  componentDidMount() {
    const { getEmbedly, href } = this.props
    getEmbedly(href)
  }

  render() {
    const { href, embedly, embedlyInFlight } = this.props

    if (!embedly && embedlyInFlight) {
      return <EmbedlyLoader primaryColor="#c9bfbf" secondaryColor="#c9c8c8" />
    }

    if (href !== "" && embedly && embedly.type !== "error") {
      return <Embedly embedly={embedly} />
    }

    return <div className="embedly">ERROR</div>
  }
}
