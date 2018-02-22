// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import DocumentTitle from "react-document-title"

import Card from "../../components/Card"
import EditChannelForm from "../../components/admin/EditChannelForm"
import { actions } from "../../actions"
import { editChannelForm } from "../../lib/channels"
import { channelURL } from "../../lib/url"
import { formatTitle } from "../../lib/title"
import { getChannelName } from "../../lib/util"
import { validateChannelEditForm } from "../../lib/validation"
import { ChannelBreadcrumbs } from "../../components/ChannelBreadcrumbs"

import type { Dispatch } from "redux"
import type { FormValue } from "../../flow/formTypes"
import type { Channel } from "../../flow/discussionTypes"

const EDIT_CHANNEL_KEY = "channel:edit"
const EDIT_CHANNEL_PAYLOAD = { formKey: EDIT_CHANNEL_KEY }
const getForm = R.prop(EDIT_CHANNEL_KEY)

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

class EditChannelPage extends React.Component<*, void> {
  props: {
    dispatch: Dispatch,
    history: Object,
    channel: Channel,
    channelForm: FormValue,
    channelName: string,
    processing: boolean
  }

  componentWillMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps) {
    if (shouldLoadData(prevProps, this.props)) {
      this.loadData()
    }
  }

  componentWillUnmount() {
    const { dispatch } = this.props
    dispatch(actions.forms.formEndEdit(EDIT_CHANNEL_PAYLOAD))
  }

  loadData = () => {
    const { dispatch, channel, channelName } = this.props
    if (!channel) {
      dispatch(actions.channels.get(channelName)).then(() => {
        this.beginFormEdit()
      })
    } else {
      this.beginFormEdit()
    }
  }

  beginFormEdit = () => {
    const { dispatch, channel } = this.props
    dispatch(
      actions.forms.formBeginEdit(
        R.merge(EDIT_CHANNEL_PAYLOAD, {
          value: editChannelForm(channel)
        })
      )
    )
  }

  onUpdate = (e: Object) => {
    const { dispatch } = this.props
    dispatch(
      actions.forms.formUpdate(
        R.merge(EDIT_CHANNEL_PAYLOAD, {
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

    const validation = validateChannelEditForm(channelForm)

    if (!channelForm || !R.isEmpty(validation)) {
      dispatch(
        actions.forms.formValidate({
          ...EDIT_CHANNEL_PAYLOAD,
          errors: validation.value
        })
      )
    } else {
      dispatch(actions.channels.patch(channelForm.value)).then(channel => {
        history.push(channelURL(channel.name))
      })
    }
  }

  render() {
    const { channel, channelForm, processing, history } = this.props

    if (!channelForm) {
      return null
    }

    return (
      <div className="content">
        <DocumentTitle title={formatTitle("Edit Channel")} />
        <div className="main-content">
          <ChannelBreadcrumbs channel={channel} />
          <Card title="Edit Channel">
            <EditChannelForm
              onSubmit={this.onSubmit}
              onUpdate={this.onUpdate}
              form={channelForm.value}
              history={history}
              validation={channelForm.errors}
              processing={processing}
            />
          </Card>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing = state.channels.processing
  return {
    channel,
    channelName,
    processing,
    channelForm: getForm(state.forms)
  }
}

export default connect(mapStateToProps)(EditChannelPage)
