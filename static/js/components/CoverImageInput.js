// @flow
import React from "react"
import Dropzone from "react-dropzone"

import { editorUpdateFormShim } from "./Editor"

type Props = {
  image: ?File | string,
  onUpdate: Function,
  setPhotoError?: (err: string) => void
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

    if (this.node.current) {
      this.node.current.focus()
    }
  }

  clearCoverImage = () => {
    this.setCoverImage(undefined)
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
              <div className="desktop-upload-message">
                Optional: Add a cover image to your post<br />Drag an image here
                or<br />
                <button type="button" className="outlined">
                  Click to select an image
                </button>
              </div>
              <div className="mobile-upload-message">
                Click to select a photo.
              </div>
            </Dropzone>
          )}
        </div>
      </div>
    )
  }
}
