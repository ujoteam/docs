# Decentralized IP

[COALA IP](https://www.coalaip.org) is a blockchain-ready, community-driven protocol for
intellectual property licensing. The acronym itself stands for The Coalition Of Automated Legal Applications — Intellectual Property (COALA IP).

As stated on the COALA IP site: “COALA IP’s goal is to establish open, free, and easy-to-use ways to record attribution information and other metadata about works, assign or license rights, mediate disputes, and authenticate claims by others.” The initial implementation of the spec was built by [BigchainDB](https://github.com/COALAIP/pycoalaip). Following their lead and in close collaboration with their team, we built the JavaScript implementation of of the protocol. The need for a metadata standard that fits the requirements of decentralized licensing is not specific to only Ujo, and there has been a lot of continued interest in this project so we plan to continue iterating on this project in collaboration with the community.

## JavaScript Implementation

This implementations the [COALA IP](https://github.com/COALAIP/specs) specification.

### Install

This project is available through [npm](https://www.npmjs.com/). To install run

```bash
> npm install coalaip --save
```

### Linked Metadata

This project provides tools for structuring metadata, using schema definitions with the ability to set arbitrary properties on type instances. Metadata is translatable to linked-data formats (e.g. [IPLD](https://ipld.io/)) for persistence to different databases/storage layers.

### Module Overview

#### Core

This module contains the types outlined in the specification. Additional types have been included because types in the specification inherit from them or certain properties expect other types.

#### Music

This module extends the `core` module with the following types: `MusicAlbum`, `MusicComposition`, `MusicGroup`, `MusicPlaylist`, `MusicRecording`, and `MusicRelease`.

### Getting Started

Some code to get started structuring metadata. In order to persist to a storage layer, consider using [Constellate](https://github.com/zbo14/constellate).

#### Create a `Person`

```js
const Person = require("coalaip/lib/core").Person;

const man = new Person();
man.setGivenName("John");
man.setFamilyName("Smith");
man.setEmail("jsmith@email.com");
man.set("arbitrary", "value");

// or if the object is already structured
const woman = {
  givenName: "Jane",
  familyName: "Smith",
  email: "janesmith@email.com",
  arbitrary: "value"
};

const person = new Person();
person.withData(woman);
```

#### Access the `Person`'s data

```js
console.log(man.data());

// {
//   "@context": "http://schema.org",
//   "@type": "Person",
//   "givenName": "John",
//   "familyName": "Smith",
//   "email": "jsmith@email.com",
//   "arbitrary": "value"
// }

// or if you want the data canonically ordered...

console.log(man.dataOrdered());

// {
//   "@context": "http://schema.org",
//   "@type": "Person",
//   "arbitrary": "value",
//   "email": "jsmith@email.com",
//   "familyName": "Smith",
//   "givenName": "John"
// }
```

#### Add/Set sub-instances

`addProperty` for property that expects an array

`setProperty` for property that expects a single value

```js
const {
  MusicComposition,
  MusicGroup,
  MusicRecording
} = require("coalaip/lib/music");

// 'member' expects an array of Parties
const group = new MusicGroup();
group.setDescription("descriptive");
group.setName("Beatles");
group.addMember(man);
group.path = "<placeholder group path>";

const composition = new MusicComposition();
// 'composer' expects an array of Parties
composition.addComposer(man);
composition.path = "<placeholder composition path>";

const recording = new MusicRecording();
// 'byArtist' expects an array of MusicGroups
recording.addByArtist(group);
// 'recordingOf' expects a MusicComposition
recording.setRecordingOf(comp);

console.log(recording.data());

// {
//   "@context": "http://coalaip.org",
//   "@type": "MusicRecording",
//   "byArtist": [
//     {
//       "@context": "http://schema.org",
//       "@type": "MusicGroup",
//       "name": "Beatles",
//       "description": "descriptive",
//       "member": [
//         {
//           "@context": "http://schema.org",
//           "@type": "Person",
//           "givenName": "John",
//           "familyName": "Smith",
//           "email": "jsmith@email.com"
//         }
//       ]
//     }
//   ],
//   "recordingOf": {
//     "@context": "http://coalaip.org",
//     "@type": "MusicComposition",
//     "composer": [
//       {
//         "@context": "http://schema.org",
//         "@type": "Person",
//         "givenName": "John",
//         "familyName": "Smith",
//         "email": "jsmith@email.com"
//       }
//     ]
//   }
// }

// and the ipld...

console.log(recording.ipld());

// {
//   "@context": "http://coalaip.org",
//   "@type": "MusicRecording",
//   "byArtist": [
//     {
//       "/": "<placeholder group path>"
//     }
//   ],
//   "recordingOf": {
//     "/": "<placeholder composition path>"
//   }
// }
```

#### Access sub-instances

`instance.subInstances()` returns a flattened array with `instance` and the unique instances nested within `instance`. To ease handling of metadata in other programs, the instances are ordered based on the other instances they contain.

```js
const metadata = recording.subInstances();
console.log(metadata);

// [man, group, composition, recording]

// (1) man contains no other instances
// (2,3) group and composition contain man
// (4) recording contains composition and group
```
