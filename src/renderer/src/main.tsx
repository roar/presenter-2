import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import App from './App'
import { componentVisualizerStore } from './store/componentVisualizerStore'
import { syncComponentVisualizerEffect } from './utils/componentVisualizerEffect'

if (import.meta.env.DEV) {
  syncComponentVisualizerEffect(componentVisualizerStore.getSnapshot())
  componentVisualizerStore.subscribe(() => {
    syncComponentVisualizerEffect(componentVisualizerStore.getSnapshot())
  })

  window.addEventListener('keydown', (event) => {
    const isToggleKey = event.key.toLowerCase() === 'k'
    const hasModifier = event.metaKey || event.ctrlKey

    if (!isToggleKey || !hasModifier || !event.shiftKey) {
      return
    }

    event.preventDefault()
    componentVisualizerStore.toggle()
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
