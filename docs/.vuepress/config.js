module.exports = {
  title: "Platform Docs", // 🎉
  description: "Docs",
  themeConfig: {
    nav: [{ text: "ujomusic.com", link: "https://ujomusic.com" }],
    sidebar: [
      {
        title: "Introduction",
        collapsable: false,
        children: ["/"]
      },
      {
        title: "Ujo Core",
        collapsable: false,
        children: [
          "/getting-started/",
          "/collectibles/",
          "/licensing/",
          "/ip/",
          "/registry/",
          "/oracle/"
        ]
      },
      {
        title: "Web3",
        collapsable: false,
        children: ["/truffle/", "/infura/", "/metamask/", "/uport/", "/ipfs/"]
      },
      {
        title: "Reference",
        collapsable: false,
        children: ["/links/"]
      }
      // add new top level sections here...
    ],
    algolia: {
      apiKey: "<todo>",
      indexName: "Ujo"
    },
    logo: "/gradient.png",
    repo: "ujoteam/docs",
    docsDir: "docs",
    editLinks: true,
    // custom text for edit link. Defaults to "Edit this page"
    editLinkText: "Help us improve this page"
  }
};
