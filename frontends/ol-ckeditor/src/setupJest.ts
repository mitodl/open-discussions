window.SETTINGS = {
  ckeditor_upload_url: "https://ckeditor_upload_url.com"
}

/**
 * CKEditor sometimes creates ResizeObservers, which JSDOM does not support.
 *
 * We don't need the associated functionality to work in our tests, but we do
 * need CKEditor not to throw an error when instantiated.
 */
class FakeResizeObserver {
  observe() {
    /** pass */
  }
  unobserve() {
    /** pass */
  }
  disconnect() {
    /** pass */
  }
}
const polyfillResizeObserver = () => {
  if (window.ResizeObserver !== undefined) {
    /**
     * If this throws... I guess our test env supports it natively now.
     * Welcome to the future!
     */
    throw new Error("ResizeObserver is already defined.")
  }
  window.ResizeObserver = FakeResizeObserver
}
polyfillResizeObserver()
