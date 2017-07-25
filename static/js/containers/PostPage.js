// @flow
import React from 'react';
import { connect } from 'react-redux';
import R from 'ramda';

import Card from '../components/Card';
import Loading from '../components/Loading';
import ChannelBreadcrumbs from '../components/ChannelBreadcrumbs';
import PostDisplay from '../components/PostDisplay';

import { actions } from '../actions';
import { anyProcessing, allLoaded } from '../util/rest';

import type { Dispatch } from 'redux';
import type { Match } from 'react-router';

class PostPage extends React.Component {
  props: {
    match:            Match,
    dispatch:         Dispatch,
    posts:            Object,
    channels:         Object,
  };

  getMatchParams = () => {
    const { match: { params }} = this.props;
    return [params.postID, params.channelName];
  }

  updateRequirements = () => {
    const { dispatch, channels, posts } = this.props;
    const [postID, channelName] = this.getMatchParams();

    if (R.isNil(posts.data.get(postID)) && R.isNil(posts.error)) {
      dispatch(actions.posts.get(postID));
    }
    if (R.isNil(channels.data.get(channelName)) && R.isNil(channels.error)) {
      dispatch(actions.channels.get(channelName));
    }
  }

  componentWillMount() {
    this.updateRequirements();
  }

  componentDidUpdate() {
    const { channels, posts } = this.props;
    let restStates = [ channels, posts ];

    if (!anyProcessing(restStates) || allLoaded(restStates)) {
      this.updateRequirements();
    }
  }

  renderContents(postID, posts, channelName, channels) {
    const post = posts.get(postID);
    const channel = channels.get(channelName);

    if (R.isNil(channel) || R.isNil(post)) {
      return null;
    }
    return (
      <div className="double-column">
        <ChannelBreadcrumbs channel={channel} />
        <div className="first-column">
          <Card>
            <PostDisplay post={post} expanded />
          </Card>
        </div>
      </div>
    );
  }

  render() {
    const { posts, channels } = this.props;
    const [postId, channelName] = this.getMatchParams();

    return (
      <Loading
        restStates={[ posts, channels ]}
        renderContents={() => this.renderContents(postId, posts.data, channelName, channels.data)}
      />
    );
  }
}

const mapStateToProps = state => ({
  posts: state.posts,
  channels: state.channels,
});

export default connect(mapStateToProps)(PostPage);
