import React from 'react'
import { createRoot } from 'react-dom/client'

const container = document.getElementById('container')!
const root = createRoot(container)

const App = () => {
  return (
    <div>
      <p>Hello, World. Neato!</p>
      <img style={{width: 300}} src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/MIT_infinite_corridor_02.jpg/1920px-MIT_infinite_corridor_02.jpg" />
    </div>
  )
}

root.render(<App />)
