import type {Config} from '@jest/types'
import rootConfig from "../../jest.config"

const config: Config.InitialOptions = {
  ...rootConfig,
  rootDir: "../../",
}

export default config