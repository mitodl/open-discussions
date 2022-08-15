import React from "react"
import { Link } from "react-router-dom"
import * as routes from "./urls"
import { BannerPage } from "ol-util"
import Container from "@mui/material/Container"
import { useFieldDetails } from "../api/fields"
import FieldAvatar from "../components/FieldAvatar"
import FieldMenu from "../components/FieldMenu"

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
      omitBackground={field.isLoading}
      compactOnMobile
      bannerContent={
        <Container className="field-title-container">
          <div className="field-title-row">
            {field.data && (
              <>
                <FieldAvatar field={field.data} imageSize="medium" />
                <h1>
                  <Link to={routes.makeFieldViewPath(field.data.name)}>
                    {field.data.title}
                  </Link>
                </h1>
                <div className="field-controls">
                  {field.data?.is_moderator ? (
                    <FieldMenu field={field.data} />
                  ) : null}
                </div>
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
