// @flow
import R from 'ramda';

export const anyProcessing = R.any(R.propEq('processing', true));

export const allLoaded = R.all(R.propEq('loaded', true));

export const anyError = R.any(R.propSatisfies(R.complement(R.isNil), 'error'));
