// @flow
import React from "react"
import Cropper from "react-cropper"
import browser from "detect-browser"

type Props = {
  updatePhotoEdit: (b: Blob) => void,
  photo: Object,
  uploaderBodyHeight: () => number,
  width: number,
  height: number
}

export default class CropperWrapper extends React.Component<Props> {
  cropper: Cropper

  cropperHelper = () => {
    const { updatePhotoEdit, height, width } = this.props
    let canvas
    if (this.cropper) {
      if (browser.name === "safari" || browser.name === "ios") {
        canvas = this.cropper.getCroppedCanvas()
      } else {
        canvas = this.cropper.getCroppedCanvas({
          width,
          height
        })
      }
      canvas.toBlob(blob => updatePhotoEdit(blob), "image/jpeg")
    }
  }

  render() {
    const { photo, height, width, uploaderBodyHeight } = this.props

    return (
      <Cropper
        ref={cropper => (this.cropper = cropper)}
        style={{ height: uploaderBodyHeight() }}
        className="photo-upload-dialog photo-active-item cropper"
        src={photo.preview}
        aspectRatio={width / height}
        guides={true}
        cropend={this.cropperHelper}
        ready={this.cropperHelper}
      />
    )
  }
}
