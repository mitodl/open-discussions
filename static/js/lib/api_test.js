/* global SETTINGS: false */
import { assert } from 'chai';
import sinon from 'sinon';

import { patchThing } from './api';
import * as fetchFuncs from 'redux-hammock/django_csrf_fetch';

describe('api', function() {
  this.timeout(5000);  // eslint-disable-line no-invalid-this

  let sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });
  afterEach(function() {
    sandbox.restore();

    for (let cookie of document.cookie.split(";")) {
      let key = cookie.split("=")[0].trim();
      document.cookie = `${key}=`;
    }
  });

  describe('REST functions', () => {
    const THING_RESPONSE = {
      a: "thing"
    };

    let fetchStub;
    beforeEach(() => {
      fetchStub = sandbox.stub(fetchFuncs, 'fetchJSONWithCSRF');
    });

    it('patches a thing', () => {
      fetchStub.returns(Promise.resolve(THING_RESPONSE));

      return patchThing('jane', THING_RESPONSE).then(thing => {
        assert.ok(fetchStub.calledWith('/api/v0/thing/jane/', {
          method: 'PATCH',
          body: JSON.stringify(THING_RESPONSE)
        }));
        assert.deepEqual(thing, THING_RESPONSE);
      });
    });

    it('fails to patch a thing', () => {
      fetchStub.returns(Promise.reject());
      return patchThing('jane', THING_RESPONSE).catch(() => {
        assert.ok(fetchStub.calledWith('/api/v0/thing/jane/', {
          method: 'PATCH',
          body: JSON.stringify(THING_RESPONSE)
        }));
      });
    });
  });
});
