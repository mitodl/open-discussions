import React from "react"
import { useParams } from "react-router"
import { BannerPage} from "ol-util"

type RouteParams = {
  name: string
}

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()

  return (
    <BannerPage.Wrapper>
      <BannerPage.Header>
        <BannerPage.Container>
          <BannerPage.Image src={"/static/images/lawn_and_river_banner.png"} tall compactOnMobile />
        </BannerPage.Container>
      </BannerPage.Header>
      Field Page for {name}
    </BannerPage.Wrapper>
  )
}

export default FieldPage
