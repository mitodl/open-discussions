// @flow
import React from "react"
import { connect } from "react-redux"
import isURL from "validator/lib/isURL"

import Embedly from "../components/Embedly"

import { actions } from "../actions"
import { ensureTwitterEmbedJS, handleTwitterWidgets } from "../lib/embed"

import type { Dispatch } from "redux"

const isValidEmbedlyUrl = (url: string): boolean =>
  isURL(url, { allow_underscores: true })

type Props = {
  embedly: Object,
  fetch: () => Promise<*>,
  url: string,
  debounceKey?: string
}
export class EmbedlyContainer extends React.Component<Props> {
  componentDidMount() {
    const { fetch } = this.props
    fetch()

    ensureTwitterEmbedJS()
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.url !== this.props.url) {
      this.props.fetch()
    }
  }

  render() {
    const { embedly, url } = this.props
    return isValidEmbedlyUrl(url) ? (
      <div className="embedly-preview">
        <Embedly embedly={embedly} />
      </div>
    ) : null
  }
}

const mapStateToProps = (state, ownProps) => ({
  embedly: state.embedly.data.get(ownProps.url)
})

const mapDispatchToProps = (dispatch: Dispatch<*>, ownProps) => ({
  fetch: async () => {
    const { url, debounceKey } = ownProps
    if (isValidEmbedlyUrl(url)) {
      const embedlyGetFunc = actions.embedly.get(url)
      if (debounceKey) {
        embedlyGetFunc.meta = {
          debounce: {
            time: 1000,
            key:  debounceKey
          }
        }
      }

      // $FlowFixMe
      const embedlyResponse = await dispatch(embedlyGetFunc)
      handleTwitterWidgets(embedlyResponse)
    }
  }
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(EmbedlyContainer)
