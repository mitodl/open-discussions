// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import Card from "../../components/Card"
import CreateChannelForm from "../../components/admin/CreateChannelForm"

import { actions } from "../../actions"
import { channelURL } from "../../lib/url"
import { newChannelForm } from "../../lib/channels"
import { formatTitle } from "../../lib/title"

import type { Dispatch } from "redux"
import type { FormValue } from "../../flow/formTypes"
import type { ChannelForm } from "../../flow/discussionTypes"

const CREATE_CHANNEL_KEY = "channel:new"
const CREATE_CHANNEL_PAYLOAD = { formKey: CREATE_CHANNEL_KEY }
const getForm = R.prop(CREATE_CHANNEL_KEY)

class CreateChannelPage extends React.Component<*, void> {
  props: {
    dispatch: Dispatch<*>,
    history: Object,
    channelForm: FormValue<ChannelForm>
  }

  componentDidMount() {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formBeginEdit(
        R.merge(CREATE_CHANNEL_PAYLOAD, {
          value: newChannelForm()
        })
      )
    )
  }

  componentWillUnmount() {
    const { dispatch } = this.props
    dispatch(actions.forms.formEndEdit(CREATE_CHANNEL_PAYLOAD))
  }

  onUpdate = (e: Object) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate(
        R.merge(CREATE_CHANNEL_PAYLOAD, {
          value: {
            [e.target.name]: e.target.value
          }
        })
      )
    )
  }

  onSubmit = (e: Object) => {
    const { dispatch, history, channelForm } = this.props

    e.preventDefault()

    dispatch(actions.channels.post(channelForm.value)).then(channel => {
      history.push(channelURL(channel.name))
    })
  }

  render() {
    const { channelForm } = this.props

    if (!channelForm) {
      return null
    }

    return (
      <div className="content">
        <MetaTags>
          <title>{formatTitle("Create a Channel")}</title>
        </MetaTags>
        <div className="main-content">
          <Card title="Create a Channel">
            <CreateChannelForm
              onSubmit={this.onSubmit}
              onUpdate={this.onUpdate}
              form={channelForm.value}
            />
          </Card>
        </div>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    channelForm: getForm(state.forms)
  }
}

export default connect(mapStateToProps)(CreateChannelPage)
