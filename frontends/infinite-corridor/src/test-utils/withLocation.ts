/**
 * I doubt this will be used elsewhere and upon creation of auth flow, this and its usage can be deleted
 * but as we're building while using the old auth flow, I opted to keep this separate from its one use
 * unabashedly "stolen" from https://github.com/mitodl/ocw-studio/blob/cc/fix-useless-test/static/js/test_util.ts#L177
 */
export const withFakeLocation = async (
  cb: () => Promise<void> | void
): Promise<void> => {
  const originalLocation = window.location
  // @ts-expect-error We're deleting a required property, but we're about to re-assign it.
  delete window.location
  try {
    // copying an object with spread converts getters/setters to normal properties
    window.location = { ...originalLocation }
    await cb()
  } finally {
    window.location = originalLocation
  }
}
