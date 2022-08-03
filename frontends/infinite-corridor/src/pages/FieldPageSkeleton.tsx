import React from "react"
import { BannerPage } from "ol-util"
import Container from "@mui/material/Container"
import { useFieldDetails } from "../api/fields"
import FieldAvatar from "../components/FieldAvatar"

interface FieldSkeletonProps {
  children: React.ReactNode
  name: string
}

/**
 * Common structure for field-oriented pages.
 *
 * Renders the field title and avatar in a banner.
 */
const FieldSkeletonProps: React.FC<FieldSkeletonProps> = ({
  children,
  name
}) => {
  const field = useFieldDetails(name)

  return (
    <BannerPage
      src={field.data?.banner ?? ""}
      alt=""
      compactOnMobile
      bannerContent={
        <Container className="field-title-container">
          <div className="field-title-row">
            {field.data && (
              <>
                <FieldAvatar field={field.data} imageSize="medium" />
                <h2>{field.data.title}</h2>
              </>
            )}
          </div>
        </Container>
      }
    >
      {children}
    </BannerPage>
  )
}

export default FieldSkeletonProps
