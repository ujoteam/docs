# Registration

### Deprecated 2018/10/18

We recently moved to a new architecture that foregoes signing transactions to store events in the blockchain in favor of signing messages that can be stored off-chain. The advantage of this model is that users can register content without paying gas costs. Currently we are caching this data in our own backend, but we are aiming to open this up into a decentralized database such as OrbitDB. Here's a great [article](https://medium.com/3box/3box-research-comparing-distributed-databases-gun-orbitdb-and-scuttlebutt-2e3b5da34ef3) explaining the characteristics of OrbitDB and other distributed dbs our friends at 3Box put together.

If you'd like to help us migrate our registry to an OrbitDB implementation, please get in touch!

### Pub/Sub Registry

The Registry is a publish/subscribe (pub/sub) event logger that allows individuals or applications to broadcast messages linking their ethereum address identity to metadata blobs stored off-chain via decentralized storage systems such as IPFS and Swarm using a Content-ID (Self-describing content-addressed identifiers for distributed systems). This allows event subscribers such as other service and application developers to retrieve the metadata and files associated with ethereum identities. Furthermore, we’ve designed this so that events broadcasted contain a schema.org and COALA IP compliant Content-Type so that all metadata is easily categorizable by listeners. An example event looks like this:

```solidity
// issuer address, subject (receiver) address,
// action, content type, content id, previous block number
LogPublish(
    msg.sender, “0x9e22aa58bf2f5e60801b90fdd3b51b65d38ea20b”,
    “create”, “MusicGroup”, cid, prevBlock
);
```
