// @flow
import React from "react"
import Dropzone from "react-dropzone"

import { editorUpdateFormShim } from "./Editor"

type Props = {
  image: ?File | string,
  onUpdate: Function,
  setPhotoError?: (err: string) => void,
  hideCoverImageInput: Function
}

export default class CoverImageInput extends React.Component<Props> {
  node: { current: null | React$ElementRef<typeof HTMLDivElement> }

  constructor(props: Props) {
    super(props)
    this.node = React.createRef()
  }

  setCoverImage = (image: ?File) => {
    const { onUpdate } = this.props
    editorUpdateFormShim("cover_image", onUpdate)(image)
  }

  handleImageDrop = (images: Array<File>) => {
    const [image] = images
    this.setCoverImage(image)

    // this is to prevent a strange interaction with the ckeditor on MacOS
    // see https://github.com/mitodl/open-discussions/pull/1676#issuecomment-453261791
    if (this.node.current) {
      this.node.current.focus()
    }
  }

  clearCoverImage = () => {
    this.setCoverImage(undefined)
  }

  hideCoverImageInput = (e: Event) => {
    const { hideCoverImageInput } = this.props

    e.preventDefault()
    e.stopPropagation()
    hideCoverImageInput()
  }

  render() {
    const { image, setPhotoError } = this.props

    return (
      <div className="article-banner-image-wrapper" ref={this.node}>
        <div className="article-banner-image">
          {image ? (
            <div className="cover-img-container">
              <img
                src={
                  typeof image === "string" || image instanceof String
                    ? image
                    : URL.createObjectURL(image)
                }
              />
              <button
                className="high-contrast-outlined"
                type="button"
                onClick={this.clearCoverImage}
              >
                remove image
              </button>
            </div>
          ) : (
            <Dropzone
              onDrop={this.handleImageDrop}
              className="photo-active-item photo-dropzone dashed-border"
              accept="image/*"
              onDropRejected={() => {
                if (setPhotoError) {
                  setPhotoError("Please select a valid photo")
                }
              }}
            >
              <div className="cover-image-message">
                <i className="material-icons">add_photo_alternate</i>
                <button type="button" className="outlined">
                  Upload cover image
                </button>
                <a
                  className="navy small-text"
                  onClick={this.hideCoverImageInput}
                  href="#"
                >
                  remove cover image
                </a>
              </div>
            </Dropzone>
          )}
        </div>
      </div>
    )
  }
}
