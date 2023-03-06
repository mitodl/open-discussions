// @flow
/* global SETTINGS: false */
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import MetaTags from "../../components/MetaTags"

import EditChannelAppearanceForm from "../../components/admin/EditChannelAppearanceForm"
import EditChannelNavbar from "../../components/admin/EditChannelNavbar"
import withSingleColumn from "../../hoc/withSingleColumn"
import withChannelHeader from "../../hoc/withChannelHeader"

import { actions } from "../../actions"
import { EDIT_CHANNEL_PAYLOAD, getChannelForm } from "../../lib/channels"
import { channelURL } from "../../lib/url"
import { formatTitle } from "../../lib/title"
import { getChannelName } from "../../lib/util"
import { validateChannelAppearanceEditForm } from "../../lib/validation"
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
  updateChannelForm: (e: Object) => void,
  beginChannelFormEdit: (c: Channel) => void
}

export class EditChannelAppearancePage extends React.Component<Props> {
  componentDidMount() {
    this.loadData()
  }

  componentDidUpdate(prevProps: Props) {
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

  onSubmit = async (e: Object) => {
    const { dispatch, history, channelForm } = this.props

    e.preventDefault()

    const validation = validateChannelAppearanceEditForm(channelForm)

    if (!channelForm || !R.isEmpty(validation)) {
      dispatch(
        actions.forms.formValidate({
          ...EDIT_CHANNEL_PAYLOAD,
          errors: validation.value
        })
      )
      return
    }

    const formValue = channelForm.value
    const channelName = formValue.name
    const patchValue = R.omit(
      ["avatar", "banner", !SETTINGS.is_admin ? "title" : null],
      formValue
    )
    const promises = [dispatch(actions.channels.patch(patchValue))]

    if (formValue.avatar) {
      promises.push(
        dispatch(
          actions.channelAvatar.patch(
            channelName,
            formValue.avatar.edit,
            formValue.avatar.image.name
          )
        )
      )
    }
    if (formValue.banner) {
      promises.push(
        dispatch(
          actions.channelBanner.patch(
            channelName,
            formValue.banner.edit,
            formValue.banner.image.name
          )
        )
      )
    }
    await Promise.all(promises)
    if (formValue.avatar || formValue.banner) {
      await dispatch(actions.channels.get(channelName))
    }

    history.push(channelURL(channelName))
  }

  render() {
    const { channel, channelForm, processing, history, updateChannelForm } =
      this.props

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
          <EditChannelAppearanceForm
            channel={channel}
            onSubmit={this.onSubmit}
            onUpdate={updateChannelForm}
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
  const processing =
    state.channels.processing ||
    state.channelAvatar.processing ||
    state.channelBanner.processing
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
)(EditChannelAppearancePage)
