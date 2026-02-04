import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { gameDataStore } from './state/gameDataStore'

// Trigger game data loading immediately at app startup
// This runs before React renders, so the loading state is active from the start
gameDataStore.getState().loadGameData()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
