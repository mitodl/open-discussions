// @flow
import React from "react"
import { connect } from "react-redux"

import ChannelEditForm from "../../components/admin/ChannelEditForm"
import { actions } from "../../actions"
import { channelURL } from "../../lib/url"

import type { Dispatch } from "redux"
import type { FormValue } from "../../flow/formTypes"
import type { ChannelEditable } from "../../flow/discussionTypes"

class CreateChannelPage extends React.Component {
  props: {
    dispatch:     Dispatch,
    history:      Object,
    channelForm:  FormValue<ChannelEditable>,
  }

  componentWillMount() {
    const { dispatch } = this.props
    dispatch(actions.forms.channel.create())
  }

  onUpdate = (e: Object) => {
    const { dispatch } = this.props
    dispatch(actions.forms.channel.update({
      [e.target.name]: e.target.value
    }))
  }

  onSubmit = (e: Object) => {
    const { dispatch, history, channelForm } = this.props

    e.preventDefault()

    dispatch(actions.channels.post(channelForm.value)).then((channel) => {
      history.push(channelURL(channel.name))
    })
  }

  render() {
    const { channelForm } = this.props

    return (
      <div>
        <ChannelEditForm
          onSubmit={this.onSubmit}
          onUpdate={this.onUpdate}
          channel={channelForm.value}
        />
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    channelForm: state.channelForm,
  }
}

export default connect(mapStateToProps)(CreateChannelPage)
