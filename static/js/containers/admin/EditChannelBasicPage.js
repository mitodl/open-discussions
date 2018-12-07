// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"
import { MetaTags } from "react-meta-tags"

import EditChannelBasicForm from "../../components/admin/EditChannelBasicForm"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import withSingleColumn from "../../hoc/withSingleColumn"

import { actions } from "../../actions"
import { editChannelForm, updateLinkType } from "../../lib/channels"
import { channelURL } from "../../lib/url"
import { formatTitle } from "../../lib/title"
import { getChannelName } from "../../lib/util"
import { validateChannelBasicEditForm } from "../../lib/validation"

import type { Dispatch } from "redux"
import type { FormValue } from "../../flow/formTypes"
import type { Channel, ChannelForm } from "../../flow/discussionTypes"
import withChannelHeader from "../../hoc/withChannelHeader"

const EDIT_CHANNEL_KEY = "channel:edit:basic"
const EDIT_CHANNEL_PAYLOAD = { formKey: EDIT_CHANNEL_KEY }
const getForm = R.prop(EDIT_CHANNEL_KEY)

const shouldLoadData = R.complement(R.allPass([R.eqProps("channelName")]))

type Props = {
  dispatch: Dispatch<*>,
  history: Object,
  channel: Channel,
  channelForm: FormValue<ChannelForm>,
  channelName: string,
  processing: boolean
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
    const { dispatch, channel, channelName } = this.props
    if (!channel) {
      await dispatch(actions.channels.get(channelName))
    }

    this.beginFormEdit()
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
    const { dispatch, channelForm } = this.props
    const updates = {
      [e.target.name]: e.target.value
    }
    if (e.target.name === "link_type") {
      // $FlowFixMe
      updates.link_type = updateLinkType(
        channelForm.value.link_type,
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
        ["name", "channel_type", "description", "link_type"],
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
    channelForm: getForm(state.forms)
  }
}

export default R.compose(
  connect(mapStateToProps),
  withChannelHeader(false),
  withSingleColumn("edit-channel")
)(EditChannelBasicPage)
