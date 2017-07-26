// @flow
import { assert } from 'chai';
import sinon from 'sinon';
import configureTestStore from 'redux-asserts';
import { INITIAL_STATE } from 'redux-hammock/constants';

import rootReducer from '../reducers';
import { actions } from '../actions';
import * as api from '../lib/api';
import { makePost, makeChannelPostList } from '../factories/posts';
import { makeChannel } from '../factories/channels';
import { setPostData } from '../actions/post';

describe('reducers', () => {
  let sandbox, store, dispatchThen;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    store = configureTestStore(rootReducer);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('posts reducer', () => {
    let getPostStub;
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.posts);
      getPostStub = sandbox.stub(api, 'getPost');
      getPostStub.callsFake(async (id) => {
        let post = makePost();
        post.id = id;
        return post;
      });
    });

    it('should have some initial state', () => {
      assert.deepEqual(
        store.getState().posts,
        { ...INITIAL_STATE, data: new Map }
      );
    });

    it('should let you fetch a post', () => {
      const { requestType, successType } = actions.posts.get;
      return dispatchThen(
        actions.posts.get('mypostid'),
        [ requestType, successType ]
      ).then(posts => {
        let post = posts.data.get('mypostid');
        assert.equal(post.id, 'mypostid');
        assert.isString(post.title);
      });
    });

    it('should allow for multiple posts to coexist', () => {
      return Promise.all([
        store.dispatch(actions.posts.get('first')),
        store.dispatch(actions.posts.get('second')),
      ]).then(() => {
        let { posts: { data }} = store.getState();
        assert.equal(data.get('first').id, 'first');
        assert.equal(data.get('second').id, 'second');
        assert.equal(data.size, 2);
      });
    });

    it('should allow setting a post record separately', () => {
      let post = makePost();
      post.id = 'my great post wow';
      store.dispatch(setPostData(post));
      const { posts } = store.getState();
      assert.deepEqual(post, posts.data.get('my great post wow'));
      assert.isTrue(posts.loaded);
    });

    it('should let you set a list of posts separately', () => {
      let posts = makeChannelPostList();
      store.dispatch(setPostData(posts));
      const { posts: { data }} = store.getState();
      assert.equal(data.size, 20);
    });
  });

  describe('channels reducer', () => {
    let getChannelStub;
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.channels);
      getChannelStub = sandbox.stub(api, 'getChannel');
      getChannelStub.callsFake(async (name) => {
        let channel = makeChannel();
        channel.name = name;
        return channel;
      });
    });

    it('should have some initial state', () => {
      assert.deepEqual(
        store.getState().channels,
        { ...INITIAL_STATE, data: new Map }
      );
    });

    it('should let you get a channel', () => {
      const { requestType, successType } = actions.channels.get;
      return dispatchThen(
        actions.channels.get('wowowowow'),
        [ requestType, successType ]
      ).then(channels => {
        let channel = channels.data.get('wowowowow');
        assert.isString(channel.name);
        assert.equal(channel.theme_type, "public");
      });
    });

    it('should support multiple channels', () => {
      return Promise.all([
        store.dispatch(actions.channels.get('first')),
        store.dispatch(actions.channels.get('second')),
      ]).then(() => {
        let { channels: { data }} = store.getState();
        assert.equal(data.get('first').name, 'first');
        assert.equal(data.get('second').name, 'second');
        assert.equal(data.size, 2);
      });
    });
  });

  describe('postsForChannel reducer', () => {
    let getPostsForChannelStub;
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.postsForChannel);
      getPostsForChannelStub = sandbox.stub(api, 'getPostsForChannel');
      getPostsForChannelStub.returns(Promise.resolve(makeChannelPostList()));
    });

    it('should have some initial state', () => {
      assert.deepEqual(
        store.getState().postsForChannel,
        { ...INITIAL_STATE, data: new Map }
      );
    });

    it('should let you get the posts for a channel', () => {
      const { requestType, successType } = actions.postsForChannel.get;
      return dispatchThen(
        actions.postsForChannel.get('channel'),
        [ requestType, successType ]
      ).then(({ data }) => {
        let channel = data.get('channel');
        assert.isArray(channel);
        assert.lengthOf(channel, 20);
      });
    });

    it('should support multiple channels', () => {
      return Promise.all([
        store.dispatch(actions.postsForChannel.get('first')),
        store.dispatch(actions.postsForChannel.get('second')),
      ]).then(() => {
        let { postsForChannel: { data }} = store.getState();
        assert.isArray(data.get('first'));
        assert.isArray(data.get('second'));
        assert.equal(data.size, 2);
      });
    });
  });

  describe('frontpage reducer', () => {
    let frontpageStub;
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.frontpage);
      frontpageStub = sandbox.stub(api, 'getFrontpage');
      frontpageStub.returns(Promise.resolve(makeChannelPostList()));
    });

    it('should have some initial state', () => {
      assert.deepEqual(
        store.getState().frontpage,
        { ...INITIAL_STATE, data: [] }
      );
    });

    it('should let you get the frontpage', () => {
      const { requestType, successType } = actions.frontpage.get;
      return dispatchThen(
        actions.frontpage.get(),
        [ requestType, successType ]
      ).then(({ data }) => {
        assert.lengthOf(data, 20);
      });
    });
  });

  describe('comments reducer', () => {
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.comments);
    });

    it('should have some initial state', () => {
      assert.deepEqual(
        store.getState().comments,
        { ...INITIAL_STATE, data: new Map }
      );
    });

    it('should let you get the comments for a Post', () => {
      let post = makePost();
      const { requestType, successType } = actions.comments.get;
      return dispatchThen(
        actions.comments.get(post),
        [ requestType, successType ],
      ).then(({ data }) => {
        let comments = data.get(post.id);
        assert.isArray(comments);
        assert.isNotEmpty(comments[0].replies);
      });
    });
  });
});
