// @flow
import React from "react"
import Cropper from "react-cropper"
import browser from "detect-browser"

type Props = {
  updatePhotoEdit: (b: Blob) => void,
  photo: Object,
  uploaderBodyHeight: () => number
}

export default class CropperWrapper extends React.Component<Props> {
  cropperRef: Cropper

  constructor(props: Props) {
    super(props)
    this.cropperRef = React.createRef()
  }

  cropperHelper = () => {
    const { updatePhotoEdit } = this.props
    let canvas
    if (this.cropperRef.current) {
      const cropper = this.cropperRef.current
      if (browser.name === "safari" || browser.name === "ios") {
        canvas = cropper.getCroppedCanvas()
      } else {
        canvas = cropper.getCroppedCanvas({
          width:  512,
          height: 512
        })
      }
      canvas.toBlob(blob => updatePhotoEdit(blob), "image/jpeg")
    }
  }

  render() {
    const { photo, uploaderBodyHeight } = this.props

    return (
      <Cropper
        ref={this.cropperRef}
        style={{ height: uploaderBodyHeight() }}
        className="photo-upload-dialog photo-active-item cropper"
        src={photo.preview}
        aspectRatio={1 / 1}
        guides={true}
        cropend={this.cropperHelper}
        ready={this.cropperHelper}
      />
    )
  }
}
