'use client'

import './globals.css'
// parseEther is not used directly here anymore after user removed Send Transaction button
// import { parseEther } from 'viem' 
// useAccount, useConnect, useDisconnect are now primarily used in Navbar.tsx
// useSendTransaction, useSignMessage were part of sections user removed.
// import { useAccount, useConnect, useDisconnect, useSendTransaction, useSignMessage } from 'wagmi'
import { MiniGame } from './MiniGame'
import { Navbar } from './Navbar' // Import Navbar

function App() {
  // Account info, connect/disconnect buttons, and related hooks (account, connectors, connect, disconnect, status, error)
  // have been moved to the Navbar component.
  // Send Transaction and Sign Message sections and their hooks (sendTransactionAsync, data, signMessage, signData)
  // were removed by the user in a previous step.

  return (
    <>
      <Navbar /> {/* Navbar is placed at the top, outside app-container for full-width styling */}
      <div className="app-container"> {/* This container will hold the main content below the navbar */}
        {/* 
          The Account section previously here is now part of the Navbar.
          Example:
          <div className="account-info">
            <h2>Account</h2>
            ...
          </div>
        */}

        {/* 
          The Connect section previously here is now part of the Navbar.
          Example:
          <div className="connect-section">
            <h2>Connect</h2>
            ...
          </div>
        */}

        {/* 
          The Send Transaction and Sign Message sections were removed by the user.
          Example:
          <div>Send Transaction</div>
          <button type="button" onClick={async () => sendTransactionAsync({...})}>
            Send Transaction
          </button>
          ...
          <div>Sign Message</div>
          <button type="button" onClick={() => signMessage({...})}>
            Sign Message
          </button>
          ...
        */}

        <div className="mini-game-container"> 
          <MiniGame />
        </div>
      </div>
    </>
  )
}

export default App
