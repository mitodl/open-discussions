// @flow
import { assert } from 'chai';
import sinon from 'sinon';
import configureTestStore from 'redux-asserts';

import rootReducer from '../reducers';
import { actions } from '../actions';
import { makePost } from '../factories/posts';
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
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.posts);
    });

    it('should have some state', () => {
      assert.deepEqual(
        store.getState().posts,
        { loaded: false, processing: false }
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
      const { posts: { data }} = store.getState();
      assert.deepEqual(post, data.get('my great post wow'));
    });
  });

  describe('channels reducer', () => {
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.channels);
    });

    it('should have some state', () => {
      const { channels } = store.getState();
      assert.deepEqual(channels, {
        loaded: false, processing: false
      });
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
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.postsForChannel);
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
    beforeEach(() => {
      dispatchThen = store.createDispatchThen(state => state.frontpage);
    });

    it('should let you get the frontpage', () => {
      const { requestType, successType } = actions.frontpage.get;
      return dispatchThen(
        actions.frontpage.get(),
        [ requestType, successType ]
      ).then(({ data }) => {
        assert.equal(data.size, 20);
      });
    });
  });
});
