// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import { MetaTags } from "ol-util"

import EditChannelBasicForm from "../../components/admin/EditChannelBasicForm"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import withSingleColumn from "../../hoc/withSingleColumn"
import withChannelHeader from "../../hoc/withChannelHeader"

import { actions } from "../../actions"
import {
  updatePostTypes,
  EDIT_CHANNEL_PAYLOAD,
  getChannelForm
} from "../../lib/channels"
import { channelURL } from "../../lib/url"
import { formatTitle } from "../../lib/title"
import { getChannelName } from "../../lib/util"
import { validateChannelBasicEditForm } from "../../lib/validation"
import { channelFormDispatchToProps } from "../../util/form_actions"

import type { Dispatch } from "redux"
import type { FormValue } from "../../flow/formTypes"
import type { Channel, ChannelForm } from "../../flow/discussionTypes"

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

type Props = {
  dispatch: Dispatch<*>,
  history: Object,
  channel: Channel,
  channelForm: FormValue<ChannelForm>,
  channelName: string,
  processing: boolean,
  beginChannelFormEdit: (c: Channel) => void
}

class EditChannelBasicPage extends React.Component<Props> {
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
    const { dispatch, channelName, beginChannelFormEdit } = this.props
    let { channel } = this.props
    if (!channel) {
      channel = await dispatch(actions.channels.get(channelName))
    }

    beginChannelFormEdit(channel)
  }

  onUpdate = (e: Object) => {
    const { dispatch, channelForm } = this.props

    let updates

    if (e.target.name === "moderator_notifications") {
      updates = {
        [e.target.name]: e.target.checked
      }
    } else {
      updates = {
        [e.target.name]: e.target.value
      }
    }

    if (e.target.name === "allowed_post_types") {
      // $FlowFixMe
      updates.allowed_post_types = updatePostTypes(
        channelForm.value.allowed_post_types,
        e.target.value,
        e.target.checked
      )
    }

    dispatch(
      actions.forms.formUpdate(
        R.merge(EDIT_CHANNEL_PAYLOAD, {
          value: updates
        })
      )
    )
  }

  onSubmit = (e: Object) => {
    const { dispatch, history, channelForm } = this.props

    e.preventDefault()

    const validation = validateChannelBasicEditForm(channelForm)

    if (!channelForm || !R.isEmpty(validation)) {
      dispatch(
        actions.forms.formValidate({
          ...EDIT_CHANNEL_PAYLOAD,
          errors: validation.value
        })
      )
    } else {
      const patchValue = R.pickAll(
        [
          "name",
          "channel_type",
          "allowed_post_types",
          "moderator_notifications",
          "ga_tracking_id"
        ],
        channelForm.value
      )
      dispatch(actions.channels.patch(patchValue)).then(channel => {
        history.push(channelURL(channel.name))
      })
    }
  }

  render() {
    const { channel, channelForm, processing, history } = this.props

    if (!channel) {
      return null
    }

    return (
      <React.Fragment>
        <MetaTags>
          <title>{formatTitle("Edit Channel")}</title>
        </MetaTags>
        <EditChannelNavbar channelName={channel.name} />
        {channelForm ? (
          <EditChannelBasicForm
            onSubmit={this.onSubmit}
            onUpdate={this.onUpdate}
            form={channelForm.value}
            history={history}
            validation={channelForm.errors}
            processing={processing}
          />
        ) : null}
      </React.Fragment>
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
    channelForm: getChannelForm(state.forms)
  }
}

export default R.compose(
  connect(mapStateToProps, channelFormDispatchToProps),
  withChannelHeader,
  withSingleColumn("edit-channel")
)(EditChannelBasicPage)
