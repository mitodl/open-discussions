// @flow
import React from 'react';
import { connect } from 'react-redux';

import PostList from '../components/PostList';
import Card from '../components/Card';

import { actions } from '../actions';
import { setPostData } from '../actions/post';
import { safeBulkGet } from '../lib/maps';

class HomePage extends React.Component {
  componentWillMount () {
    this.fetchFrontpage();
  }

  fetchFrontpage = () => {
    const { dispatch } = this.props;

    dispatch(actions.frontpage.get()).then(posts => {
      dispatch(setPostData(posts));
    });
  };

  render() {
    const { posts, frontpage } = this.props;

    return (
      <div className="double-column">
        <div>Home page</div>
        <div className="first-column">
          <Card>
            <PostList
              posts={safeBulkGet(frontpage.data, posts.data)}
              showChannelLinks={true}
            />
          </Card>
        </div>
        <div className="second-column">
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    posts: state.posts,
    frontpage: state.frontpage
  };
};

export default connect(mapStateToProps)(HomePage);
