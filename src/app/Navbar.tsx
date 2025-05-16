'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function Navbar() {
  const account = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()

  return (
    <nav className="navbar-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', flexDirection: 'column' }}>
      <div className="navbar-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
        {account.status === 'connected' ? (
          <>
            <div className="account-details">
              <span>Status: {account.status}</span>
              {account.addresses && account.addresses.length > 0 && (
                <span>
                  Address: {account.addresses[0].substring(0, 6)}...
                  {account.addresses[0].substring(account.addresses[0].length - 4)}
                </span>
              )}
              <span>Chain: {account.chainId}</span>
            </div>
            <button type="button" onClick={() => disconnect()}>
              Disconnect
            </button>
          </>
        ) : (
          connectors
            .filter((connector) => connector.name === 'Coinbase Wallet')
            .map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                type="button"
              >
                Connect Smart Wallet
              </button>
            ))
        )}
        {status === 'pending' && <div className="navbar-status">Connecting...</div>}
        {error && <div className="navbar-error">Error: {error.message}</div>}
      </div>
    </nav>
  )
} 