# BRSCPP - Blockchain Real-time Settlement Crypto Payment Protocol

**BRSCPP** is a **non-custodial Web3 payment infrastructure** designed for **instant cryptocurrency settlements without KYC**. It provides a direct **wallet-to-wallet** settlement system with locked price quotes, integrated using **Chainlink Oracles**.

**Merchants** can register, obtain their API Key, or use the WP Plugin (coming soon) or embed HTML code to **easily implement payment functionality in their DApps, PHP, or HTML websites.**

**Merchants** set their prices in fiat currency on their web stores but can receive crypto payments equivalent to that price, secured by **double on-chain price verification**.

**Current Phase:** Live MVP

**Current Chains:** Sepolia Testnet

**Future Chains:** Ethereum, Polygon, BSC

**Currently Supported Tokens:** ETH

**Future Supported Tokens:** USDC, USDT

**Landing Page** https://pp.slavy.space/ 

---

## What Does BRSCPP Offer?

BRSCPP is the ideal solution for decentralized applications (dApps) and websites that want to accept crypto payments while minimizing risk and complexity.

* **Non-Custodial:** Funds are transferred directly from the customer's wallet to the merchant's wallet. There are no intermediaries and no custody risks.
* **Price Protection:** We use Chainlink Oracles to lock the price quote (e.g., ETH/USD) for a short period during payment, eliminating cryptocurrency volatility risks during the transaction window.
* **Instant Settlement:** After the transaction is confirmed, funds are instantly in your wallet.
* **Developer Friendly:** Easy integration via a **REST API** and a ready-to-use **WordPress plugin**.

---

## Architecture and Technology (Overview)

The protocol operates on a blockchain network, facilitating direct communication between the merchant, the customer, and the Smart Contract.

* **Smart Contract (Gateway Contract):** Developed in **Solidity**, it manages settlement and utilizes **Chainlink Price Feeds**.
* **Backend API:** Built with **Node.js/Express.js**, it uses **PostgreSQL** and **Prisma ORM** to handle payment requests and manage merchant API keys.
* **Frontend Applications:** Divided into a **Marketing Site** and a **Payment Application** (for the customer checkout process), built with **React** and **TailwindCSS**.

**For more detailed technical information, please refer to the individual README files in the `blockchain/` (Smart Contracts), `backend/`, and `frontend/` directories.**

---

## Project Status and Roadmap

| Network | Status | Contract Address (Sepolia) |
| :--- | :--- | :--- |
| **Sepolia Testnet** | **Live** (MVP 1.0.0) | `0x1378329ABE689594355a95bDAbEaBF015ef9CF39` |
| **Ethereum Mainnet**| **Expected** | **Launch: June 2026** |

### Concise Roadmap

| Period | Focus |
| :--- | :--- |
| **Q1-Q2 2026** | Adding support for **Stablecoins** (USDC, USDT). Preparation for multi-chain integration. **Extensive Beta Testing.** |
| **Q3-Q4 2026** | **Ethereum Mainnet Launch**. Deployment on Polygon and Binance Smart Chain (BSC). Marketing campaigns and community expansion. |

---

## Beta Testing Program: Seeking Testers

BRSCPP is currently in the beta testing phase on the **Sepolia Testnet**. We are looking for developers and merchants to integrate our API and test payment flows.

### Benefits for Active Beta Testers (Lifetime):

* **0% Transaction Fees on Mainnet:** Lifetime grant for each tester who provides adequate feedback.
* **SepoliaETH Faucet:** Registered testers are granted Faucet access (0.05 ETH/day). Please contact me via the form on **https://me.slavy.space** for access.

**How to Join:**
1.  Register as a merchant: **`https://pp.slavy.space/register`**

---

## Job Openings

### Marketing Specialist

We are seeking an experienced **Marketing Professional** to develop the go-to-market strategy and build a community around the BRSCPP protocol.

**Core Responsibilities:**

* Social media management and content development.
* Developer outreach programs.
* Partnership development and community engagement.
* *Payable or Co-Owner agreements are also possible.*

### React Developer

We are seeking an experienced **React Developer** to enhance our frontend applications.

**Core Responsibilities:**

* Design and develop a user-friendly and visually appealing UI/UX.
* *Payable or Co-Owner agreements are also possible.*

**For Contact and Application for Both Roles:** [me.slavy.space](https://me.slavy.space)

---

## Contact and Support

| Resource | Link |
| :--- | :--- |
| **Documentation** | [https://pp.slavy.space/docs](https://pp.slavy.space/docs) |
| **GitHub Repository** | [https://github.com/ivanovslavy/BRSCPP](https://github.com/ivanovslavy/BRSCPP) |
| **General/Business Contact**| [me.slavy.space](https://me.slavy.space) (use the contact form) |
| **Bug/Security Submissions**| [me.slavy.space](https://me.slavy.space) |
| **BRSCPP Full Flow Video**| [youtube.com](https://www.youtube.com/watch?v=3n2e2H9aXAw&t=5s) |

**License:** MIT License.
