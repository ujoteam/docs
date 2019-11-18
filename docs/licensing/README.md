# Licensing

The Licensing Handlers are smart-contracts responsible for handling licensing payments. Payments are input and the funds are disbursed to the appropriate beneficiaries towards a specific license referenced by it’s Content-ID. Similar to the Artist Registry these events are stored in the blockchain via event logs. During a payment, the handlers fetch the USD/ETH price from an Oracle (described in the next section), and notifies a variable amount of addresses of the action. An example of a notified beneficiary is issuing a collectible badge upon payment. The handlers enable proof-of-payments, granting the rights specified in the license to the licensor. An example event looks like this:

```solidity
LogPayment(
    _cid, _oracle, ethUSD, msg.value, msg.sender, _buyer, _beneficiaries, _amounts
);
```

| Network         | Address                                                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Mainnet (id: 1) | [0x0be87716eda791a5c1f9b73e08b47cee2b43e59f](https://etherscan.io/address/0x0be87716eda791a5c1f9b73e08b47cee2b43e59f)         |
| Rinkeby (id: 4) | [0x4cd36d101197b299fdd79254372541941e950066](https://rinkeby.etherscan.io/address/0x4cd36d101197b299fdd79254372541941e950066) |



## Usage

There are two main types of contract you can use to interact with Ujo's licensing framework.

### NFT contract

The first is an NFT (non-fungible token) contract that conforms to the [ERC-721 standard](https://github.com/ethereum/EIPs/issues/721).  The tokens issued by this contract represent ownership of licenses that can have diverse meanings, from ownership of a product to permission to remix a song to possession of a subscription to a service.  The meanings are application-dependent, and the NFT contract is agnostic to them.

Each token can be associated with an arbitrary product ID.  Your application should use the product ID to track the semantic meaning of tokens within the application domain.

**Usage:**

The Ujo Licensing SDK contains helpers for deploying and interacting with the Licensing NFT.  To deploy a contract, initialize the SDK and deploy the contract with the following code:

```js
import { LicenseRegistry } from 'ujo-sdk'

// The .deploy function has the following signature:
// .deploy(tokenName, tokenSymbol, tokenMetadataBaseURI, totalSupply, ethProvider, metadataProvider) {
const registry = await LicenseRegistry.deploy('', '', 'https://phat-beats.com/licenses', 5000, 'https://infura.io/v3/deadbeef', 'https://ujo.dev/licensing/metadata')
```

If you already have a contract deployed and need to initialize the registry helper for that contract, use the `.at` method:

```js
import { LicenseRegistry } from 'ujo-sdk'

// The .at function has the following signature:
// .at(address, ethProvider, metadataProvider) {
const registry = await LicenseRegistry.at('0xdeadbeefdeadbeef', 'https://infura.io/v3/deadbeef', 'https://ujo.dev/licensing/metadata')
```

- The `ethProvider` argument should point to the provider of a standard Ethereum RPC interface, such as Infura.  If you're running your own node, you can simply use the URL for that node.
- The `metadataProvider` argument should point to a server that provides a REST interface described below, in the "Metadata providers" section.

Regardless of which method you use to instantiate the helper, the returned `registry` has several methods for interacting with the NFT contract.








