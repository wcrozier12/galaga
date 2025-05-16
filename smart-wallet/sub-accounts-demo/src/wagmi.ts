import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { baseSepolia, base } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { parseEther, toHex } from 'viem';
// @ts-nocheck 
export function getConfig() {
  return createConfig({
    chains: [baseSepolia, base],
    connectors: [
      coinbaseWallet({
        appName: "My Sub Account Demo",
        preference: {
          keysUrl: "https://scw-dev.cbhq.net/connect",
          options: "smartWalletOnly",
        },
        subAccounts: {
          enableAutoSubAccounts: true,
        },
        paymasterUrls: {
          [baseSepolia.id]: "https://api.developer.coinbase.com/rpc/v1/base/Rd8EVaLBQ9hFOtp3Dz3R9ffnxCZQC2DC",
          [base.id]: "https://scw-dev.cbhq.net/paymaster",
        },
      }),
    ],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [baseSepolia.id]: http(),
      [base.id]: http(),
    },
  });
}

declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getConfig>;
  }
}
