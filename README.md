# OpenBounty

A decentralized bounty platform built on Ethereum, allowing users to create funded tasks, submit work, and receive rewards through smart contracts.

## Overview

OpenBounty uses an Ethereum smart contract to manage bounty creation, submissions, winner selection, and reward distribution.

The platform removes the need for a centralized intermediary to hold and distribute bounty funds.

## Features

- **Create Bounties:** Create a bounty by depositing ETH and setting a submission deadline.
- **Submit Work:** Participants submit their work using an IPFS CID.
- **One Submission Per Wallet:** Each wallet can submit once per bounty.
- **Winner Selection:** The bounty creator selects a winning submission after the deadline.
- **Reward Withdrawal:** Winners withdraw their rewards independently.
- **Bounty Cancellation:** Creators can cancel bounties that have no submissions.
- **Unused Reward Recovery:** Creators can reclaim funds when a bounty expires without submissions.
- **Abandoned Bounty Recovery:** Anyone can trigger the refund process if the creator does not select a winner within seven days after the deadline.

## Tech Stack

| Component | Technology |
|---|---|
| Smart Contracts | Solidity |
| Development Environment | Hardhat |
| Frontend | React + TypeScript |
| Build Tool | Vite |
| Blockchain Interaction | Ethers.js |
| Wallet | MetaMask |
| Network | Ethereum Sepolia |
| Work Storage | IPFS |

## Project Structure

```text
OpenBounty/
├── contracts/
│   └── OpenBounty.sol
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── contract.ts
│   │   └── main.tsx
│   └── package.json
├── scripts/
│   └── deploy.ts
├── test/
│   └── OpenBounty.ts
├── hardhat.config.ts
├── package.json
└── README.md
```

## Smart Contract

**Network:** Ethereum Sepolia

**Contract Address:**

`0xeb24487bF189B9FDE17Ccac8f2084401E26C3206`

- [View on Etherscan](https://sepolia.etherscan.io/address/0xeb24487bF189B9FDE17Ccac8f2084401E26C3206)
- [View on Blockscout](https://eth-sepolia.blockscout.com/address/0xeb24487bF189B9FDE17Ccac8f2084401E26C3206)
- [View on Sourcify](https://sourcify.dev/server/repo-ui/11155111/0xeb24487bF189B9FDE17Ccac8f2084401E26C3206)

The contract source code has been verified on the above explorers.

## How It Works

### 1. Create a Bounty

A creator deposits ETH into the contract and specifies a deadline.

### 2. Submit Work

Participants submit an IPFS CID referencing their work.

### 3. Select a Winner

After the submission deadline, the creator can select one submission as the winner.

### 4. Claim the Reward

The contract credits the winner's pending withdrawal balance. The winner calls `claimReward()` to withdraw the funds.

### 5. Handle Unclaimed Bounties

- If nobody submits work, the creator can reclaim the reward after the deadline.
- If submissions exist but the creator does not select a winner within seven days, anyone can trigger the abandoned-bounty refund.
- The refund is credited to the creator's pending withdrawal balance.

## Local Setup

### Prerequisites

- Node.js
- npm
- MetaMask
- Sepolia test ETH

### Clone the Repository

```bash
git clone https://github.com/shivansh-rgb-code/OpenBounty.git
cd OpenBounty
```

### Install Dependencies

```bash
npm install
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Run Local Deployment

```bash
npx hardhat run scripts/deploy.ts
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open the local Vite URL displayed in your terminal.

## Environment Configuration

For Sepolia deployment, configure the following Hardhat keystore variables:

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY`
- `ETHERSCAN_API_KEY`

Never commit private keys, RPC credentials, or `.env` files containing secrets.

Deploy using:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

## Security Considerations

- Bounty funds are held by the smart contract.
- Reward withdrawals use a withdrawal-based payment pattern.
- The contract prevents duplicate submissions from the same wallet for a bounty.
- Winner selection is restricted to the bounty creator.
- Abandoned bounties have a fallback refund mechanism.

This project is an educational portfolio project and has not undergone an independent professional security audit. Use testnet funds only.

## Future Improvements

- Improved IPFS upload integration.
- Better bounty filtering and search.
- Transaction history and event indexing.
- More comprehensive frontend testing.
- Additional smart contract security testing.

## Deployed URL

https://creative-pony-2e920e.netlify.app/

## License

MIT
