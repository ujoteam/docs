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

There are two main contract types that you can use to interact with Ujo's licensing framework.

### License NFT contract

The first is an NFT (non-fungible token) contract that conforms to the [ERC-721 standard](https://github.com/ethereum/EIPs/issues/721).  The tokens issued by this contract represent ownership of licenses that can have diverse meanings, from ownership of a product to permission to remix a song to possession of a subscription to a service.  The meanings are application-dependent, and the NFT contract is agnostic to them.

Each token can be associated with an arbitrary product ID.  Your application should use the product ID to track the semantic meaning of tokens within the application domain.

#### Usage

**Instantiating the licensing NFT**

The Ujo Licensing SDK contains helpers for deploying and interacting with the Licensing NFT.  To deploy a contract, initialize the SDK and deploy the contract with the following code:

```js
import { LicenseRegistry } from 'ujo-sdk'

// The .deploy function has the following signature:
// .deploy(tokenName, tokenSymbol, tokenMetadataBaseURI, totalSupply, ethProvider, metadataProvider) {
const registry = await LicenseRegistry.deploy('Phat Beats', 'PHAT', 'https://phat-beats.com/licenses', 5000, 'https://infura.io/v3/deadbeef', 'https://ujo.dev/licensing/metadata')
```

If you already have a contract deployed and need to initialize the registry helper for that contract, use the `.at` method:

```js
import { LicenseRegistry } from 'ujo-sdk'

// The .at function has the following signature:
// .at(address, ethProvider, metadataProvider) {
const registry = await LicenseRegistry.at('0xdeadbeefdeadbeef', 'https://infura.io/v3/deadbeef', 'https://ujo.dev/licensing/metadata')
```

- The `ethProvider` argument should point to the provider of a standard Ethereum RPC interface, such as Infura.  If you're running your own node, you can simply use the URL for that node.
- The `metadataProvider` argument should point to a server that provides a REST interface described below, in the <a href="#metadata-providers">Metadata providers section</a>.

**Setting the controller**

There's one more step you need to take if you're not planning on using the included Store contract to manage your Licensing NFT.  Set the controller of the NFT, which is the only account allowed to create new licenses and, optionally, set their expiration times:

```js
await registry.setController('0xdeadbeefdeadbeef')
```

**Creating and issuing licenses**

Each product can have many licenses issued for it.  Therefore, you'll want to track both licenseIDs and productIDs in your application logic.  Creating a new license is simple.  The following method creates a license representing the given `productId`, grants it to the `assigneeAddress`, and optionally allows you to set its expiration time (specified as a UTC Unix timestamp):

```js
const licenseId = await registry.createLicense(productId, assigneeAddress, expirationTime)
```

It's also easy to query the registry to see which licenses and products are owned by a given user:

```js
const userProductIds = await registry.productIdsOf(userAddress)
const userLicenseIds = await registry.tokensOf(userAddress)
const userLicenses = await registry.licensesOf(userAddress)

for (let licenseInfo of userLicenses) {
    const { licenseId, productId, issuedTime, expirationTime } = licenseInfo
    // ...
}
```

The `registry.licensesOf(...)` method returns not only the `licenseId`, but also the `productId`, issuance time, and expiration time.  You'll normally never need to call the `registry.tokensOf(...)` method.

Other than the above-mentioned methods, the `registry` supports all of the standard ERC-271 methods.

**Token Metadata URL**

The `.deploy` and `.at` methods both accept a `tokenMetadataBaseURI` parameter.  This parameter defines the base URI where metadata about tokens can be fetched.  The Licensing SDK is completely agnostic to the data returned by this URI.  It's completely application-dependent.

If you choose to specify a URI, any call to the Licensing NFT contract's `.tokenURI(licenseId)` method will return the following URI:

```
<tokenMetadataBaseURI>/<licenseId>
```

Applications can use this to fetch information about a given license.  You'll want to deploy a backend capable of responding to requests at these URIs, most likely with JSON containing extra application-specific information relating to the licenses you've issued to your users.  However, it is not required.


### Store contract

In addition to the `LicenseRegistry` NFT, Ujo.js includes a Store contract that makes it straightforward to set up a product inventory and issue licenses to various products.  This is the recommended way of utilizing the Ujo Licensing framework.


### Metadata providers

If you want to attach metadata to products, you have two options:
1. Ujo hosts its own metadata provider, compatible with the Ujo.js Licensing Metadata API, which can be accessed at the url <https://ujo.dev/licensing/metadata>.  We're more than happy to host your metadata for free while the Licensing SDK is in beta.
2. 

Alternatively, if you don't need to attach metadata, you can simply ignore the `metadataProvider` argument in the NFT and Store contract initialization methods.  Passing null, or nothing at all, will cause the SDK to simply bypass any metadata-related functionality.




