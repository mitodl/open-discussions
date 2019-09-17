// @flow
import React from "react"
import R from "ramda"
import { connect } from "react-redux"

import ArticleEditor from "../components/ArticleEditor"

import withSingleColumn from "../hoc/withSingleColumn"

import { editorUpdateFormShim } from "../components/Editor"
import { actions } from "../actions"
import { getChannelForm } from "../lib/channels"
import { channelFormDispatchToProps } from "../util/form_actions"

import type { Channel, ChannelForm } from "../flow/discussionTypes"
import type { FormValue } from "../flow/formTypes"
import type { Dispatch } from "redux"

type Props = {
  channel: Channel,
  dispatch: Dispatch<*>,
  channelForm: FormValue<ChannelForm>,
  channelName: string,
  beginChannelFormEdit: Function,
  endChannelFormEdit: Function,
  patchChannel: Function,
  updateChannelForm: Function
}

export class ChannelAboutPage extends React.Component<Props> {
  renderAboutContent = () => {
    const { channel, updateChannelForm, channelForm } = this.props

    // key props are necessary here to force react to render
    // a new ArticleEditor when we switch from viewing to editing
    // instead of passing new props to the existing component
    //
    // this is because the ArticleEditor relies on DOM manipulation
    // to render itself correctly, so it breaks some of React's
    // assumptions
    return channelForm ? (
      <ArticleEditor
        key="edit"
        initialData={channel.about || []}
        onChange={editorUpdateFormShim("about", updateChannelForm)}
      />
    ) : (
      <ArticleEditor key="view" readOnly initialData={channel.about || []} />
    )
  }

  saveChannelAbout = async () => {
    const { channelForm, patchChannel, endChannelFormEdit } = this.props

    const patchValue = R.pickAll(["name", "about"], channelForm.value)
    await patchChannel(patchValue)
    endChannelFormEdit()
  }

  renderChannelEditUI = () => {
    const { beginChannelFormEdit, channelForm, channel } = this.props

    return channelForm ? (
      <button className="save-button" onClick={this.saveChannelAbout}>
        Save
      </button>
    ) : (
      <button
        className="edit-button"
        onClick={() => beginChannelFormEdit(channel)}
      >
        Edit
      </button>
    )
  }

  render() {
    const { channel } = this.props

    return (
      <React.Fragment>
        {channel ? this.renderAboutContent() : null}
        {channel && channel.user_is_moderator
          ? this.renderChannelEditUI()
          : null}
      </React.Fragment>
    )
  }
}

const mapStateToProps = state => ({
  channelForm: getChannelForm(state.forms)
})

const mapDispatchToProps = (dispatch: Dispatch<*>) => ({
  patchChannel: channelData => dispatch(actions.channels.patch(channelData)),
  ...channelFormDispatchToProps(dispatch)
})

export default R.compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withSingleColumn("home-page")
)(ChannelAboutPage)
