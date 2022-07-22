import React from "react"
import { useParams } from "react-router"
import { BannerPage } from "ol-util"
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabList from '@mui/lab/TabList'
import TabPanel from '@mui/lab/TabPanel'
import Container from "@mui/material/Container"
import Divider from "@mui/material/Divider"
import Grid from "@mui/material/Grid"

type RouteParams = {
  name: string
}

const lipsum = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Vestibulum rhoncus est pellentesque elit ullamcorper dignissim cras tincidunt. Quis lectus nulla at volutpat diam ut venenatis. Nulla aliquet porttitor lacus luctus accumsan. Proin fermentum leo vel orci porta non pulvinar. Habitasse platea dictumst vestibulum rhoncus est. Ac tincidunt vitae semper quis lectus nulla at volutpat diam. Cursus vitae congue mauris rhoncus. Eget nunc lobortis mattis aliquam faucibus. A scelerisque purus semper eget duis. Et odio pellentesque diam volutpat commodo sed egestas. Sapien faucibus et molestie ac feugiat. Id ornare arcu odio ut sem nulla pharetra diam sit. Et magnis dis parturient montes nascetur ridiculus mus mauris. Mauris sit amet massa vitae. Felis bibendum ut tristique et egestas quis. Viverra adipiscing at in tellus integer feugiat scelerisque varius morbi.

Duis convallis convallis tellus id interdum velit laoreet id. At tellus at urna condimentum. Morbi enim nunc faucibus a pellentesque sit amet porttitor. Vulputate mi sit amet mauris commodo quis imperdiet. Scelerisque viverra mauris in aliquam. Quam viverra orci sagittis eu volutpat odio facilisis. Commodo elit at imperdiet dui accumsan. Lorem dolor sed viverra ipsum nunc aliquet. Dui vivamus arcu felis bibendum ut tristique et. Elementum integer enim neque volutpat ac tincidunt vitae semper quis. Arcu vitae elementum curabitur vitae nunc sed velit dignissim. Dolor morbi non arcu risus quis varius. Eget magna fermentum iaculis eu non diam phasellus vestibulum lorem. A diam maecenas sed enim. Pharetra et ultrices neque ornare aenean euismod elementum nisi quis. Morbi non arcu risus quis. Eget magna fermentum iaculis eu. Diam quam nulla porttitor massa id neque aliquam vestibulum.

Lectus sit amet est placerat in egestas. Nulla facilisi cras fermentum odio eu. Diam ut venenatis tellus in. Natoque penatibus et magnis dis parturient. Dignissim cras tincidunt lobortis feugiat vivamus at augue. Est placerat in egestas erat imperdiet sed euismod nisi. Posuere morbi leo urna molestie at elementum. Sodales ut etiam sit amet nisl purus in. Commodo sed egestas egestas fringilla phasellus faucibus scelerisque. Id faucibus nisl tincidunt eget nullam non nisi est. Egestas diam in arcu cursus euismod quis viverra nibh.

Odio euismod lacinia at quis risus sed vulputate. Volutpat lacus laoreet non curabitur gravida. Donec enim diam vulputate ut pharetra. Maecenas accumsan lacus vel facilisis. Mi in nulla posuere sollicitudin. Amet volutpat consequat mauris nunc congue nisi vitae suscipit tellus. Nisl purus in mollis nunc sed id. Enim nec dui nunc mattis enim ut tellus elementum sagittis. Diam phasellus vestibulum lorem sed. Mattis nunc sed blandit libero volutpat sed cras ornare. Gravida quis blandit turpis cursus in hac habitasse platea. Ultrices eros in cursus turpis massa tincidunt. Sagittis eu volutpat odio facilisis mauris sit amet massa vitae. Faucibus vitae aliquet nec ullamcorper sit amet. Morbi tincidunt augue interdum velit euismod in pellentesque. Quam vulputate dignissim suspendisse in est ante in nibh mauris. Quis blandit turpis cursus in hac. Quam elementum pulvinar etiam non quam lacus suspendisse. Leo integer malesuada nunc vel risus commodo viverra maecenas. Ac feugiat sed lectus vestibulum mattis ullamcorper velit sed ullamcorper.

Aliquam eleifend mi in nulla posuere sollicitudin aliquam. Massa eget egestas purus viverra accumsan in nisl nisi scelerisque. Volutpat blandit aliquam etiam erat. Nulla facilisi nullam vehicula ipsum. Maecenas pharetra convallis posuere morbi. Bibendum est ultricies integer quis auctor elit sed vulputate. Integer malesuada nunc vel risus commodo viverra maecenas. Malesuada fames ac turpis egestas integer eget. Viverra vitae congue eu consequat ac felis donec et odio. Vel orci porta non pulvinar neque laoreet. Odio pellentesque diam volutpat commodo sed egestas egestas. Senectus et netus et malesuada fames. Dictum varius duis at consectetur lorem donec massa sapien.
`

const FieldPage: React.FC = () => {
  const { name } = useParams<RouteParams>()

  const [value, setValue] = React.useState('1')

  const handleChange = (event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue)
  }

  const background = (r, g, b) => ({
    sx: { backgroundColor: `rgba(${r},${g}, ${b}, 0.25)` }
  })


  return (
    <BannerPage src="/static/images/lawn_and_river_banner.png" compactOnMobile>
      <TabContext value={value}>
        <Container>
          <Grid container spacing={1}>
            <Grid item xs={8} {...background(255, 0, 0)}>
              <TabList onChange={handleChange} aria-label="lab API tabs example">
                <Tab label="Item One" value="1" />
                <Tab label="Item Two" value="2" />
                <Tab label="Item Three" value="3" />
              </TabList>
            </Grid>
            <Grid item xs={4} {...background(0, 255, 0)}>
              More Stufff
            </Grid>
          </Grid>
        </Container>
        <Divider />
        <Container>
          <Grid container spacing={1}>
            <Grid item xs={8} {...background(255, 255, 0)}>
              <TabPanel value="1">AAAAAA {lipsum}</TabPanel>
              <TabPanel value="2">BBBBBB {lipsum}</TabPanel>
              <TabPanel value="3">CCCCC {lipsum}</TabPanel>
            </Grid>
            <Grid item xs={4} {...background(0, 255, 255)}>
              <ul>
                {Array(20).fill(0).map((a, i) => <li key={i}>Hi</li>)}
              </ul>
            </Grid>
          </Grid>
        </Container>
      </TabContext>
    </BannerPage>
  )
}

export default FieldPage

/**


 */
