// @flow
import { assert } from 'chai';
import R from 'ramda';

import { safeBulkGet } from './maps';

describe('Map helper utils', () => {
  describe('safeBulkGet', () => {
    let keys = [
      'just',
      'write',
      'more',
      'tests',
    ];

    it('should accept a list of IDs and a Map, and return the right entries', () => {
      let map = new Map;
      keys.forEach(key => {
        map.set(key, R.toUpper(key));
      });
      assert.deepEqual(R.map(R.toUpper, keys), safeBulkGet(keys, map));
    });

    it('should return an empty list, given an empty Map', () => {
      assert.isEmpty(safeBulkGet(keys, new Map));
    });

    it('should return an empty list, given no keys', () => {
      let map = new Map;
      keys.forEach(key => {
        map.set(key, R.toUpper(key));
      });
      assert.isEmpty(safeBulkGet([], map));
    });
  });
});
