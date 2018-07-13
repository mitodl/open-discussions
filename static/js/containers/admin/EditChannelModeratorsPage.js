// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import EditChannelModeratorsForm from "../../components/admin/EditChannelModeratorsForm"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import withSingleColumn from "../../hoc/withSingleColumn"

import { actions } from "../../actions"
import { newModeratorsForm } from "../../lib/channels"
import { formatTitle } from "../../lib/title"
import { getChannelName } from "../../lib/util"

import type { Dispatch } from "redux"
import type { FormValue } from "../../flow/formTypes"
import type {
  Channel,
  ChannelModerators,
  ChannelModeratorsForm
} from "../../flow/discussionTypes"

const EDIT_CHANNEL_KEY = "channel:edit:moderators"
const EDIT_CHANNEL_PAYLOAD = { formKey: EDIT_CHANNEL_KEY }
const getForm = R.prop(EDIT_CHANNEL_KEY)

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

class EditChannelModeratorsPage extends React.Component<*, void> {
  props: {
    dispatch: Dispatch<*>,
    history: Object,
    channel: Channel,
    channelForm: FormValue<ChannelModeratorsForm>,
    channelName: string,
    moderators: ChannelModerators,
    processing: boolean
  }

  componentDidMount() {
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

  loadData = async () => {
    const { dispatch, channel, channelName, moderators } = this.props
    if (!channel) {
      await dispatch(actions.channels.get(channelName))
    }

    if (!moderators) {
      await dispatch(actions.channelModerators.get(channelName))
    }

    this.beginFormEdit()
  }

  beginFormEdit = () => {
    const { dispatch, channel, moderators } = this.props
    dispatch(
      actions.forms.formBeginEdit(
        R.merge(EDIT_CHANNEL_PAYLOAD, {
          value: newModeratorsForm(channel, moderators)
        })
      )
    )
  }

  render() {
    const { channel, channelForm, processing } = this.props

    if (!channelForm) {
      return null
    }

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        <EditChannelNavbar channelName={channel.name} />
        <EditChannelModeratorsForm
          form={channelForm.value}
          validation={channelForm.errors}
          processing={processing}
        />
      </React.Fragment>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const channelName = getChannelName(ownProps)
  const channel = state.channels.data.get(channelName)
  const processing =
    state.channels.processing || state.channelModerators.processing
  const moderators = state.channelModerators.data.get(channelName)
  return {
    channel,
    moderators,
    channelName,
    processing,
    channelForm: getForm(state.forms)
  }
}

export default R.compose(
  connect(mapStateToProps),
  withSingleColumn("edit-channel")
)(EditChannelModeratorsPage)
