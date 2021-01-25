const { setWith, get, reduce, filter } = require("lodash");

function buildTree(files) {
  const tree = reduce(
    files,
    (acc, file) => {
      setWith(acc, file.name.split("/"), file, (nsValue, key, nsObject) => {
        return { ...nsValue };
      });
      return acc;
    },
    {}
  );

  // set up targetOf reverse links
  filter(files, "target").forEach((link) => {
    const linkTarget = get(tree, link.target.split("/"));
    linkTarget.targetOf = link.name;
    console.log({ link, linkTarget });
  });

  return tree;
}

module.exports = {
  buildTree,
};

if (require.main === module) {
  const tree = buildTree([
    {
      id: "600f06291614158fafb8b87b",
      name: "latest",
      target: "v2.0.3",
      size: undefined,
      url: "https://eyebrowse-test-1.s3.amazonaws.com/v2.0.3",
      lastModified: "2021-01-14T16:57:00.000Z",
      lastCached: "2021-01-25T17:55:53.000Z",
    },
    {
      id: "600f06291614159fafb8b87b",
      name: "latest_sum",
      target: "v2.0.3/sha256sum.txt",
      size: 1044,
      url: "https://eyebrowse-test-1.s3.amazonaws.com/v2.0.3/sha256sum.txt",
      lastModified: "2021-01-14T16:58:00.000Z",
      lastCached: "2021-01-25T17:56:53.000Z",
    },
    {
      id: "600f06291614158fafb8b87c",
      name: "v2.0.2/sha256sum.txt",
      target: null,
      size: 1044,
      url: "https://eyebrowse-test-1.s3.amazonaws.com/v2.0.2/sha256sum.txt",
      lastModified: "2021-01-14T16:57:01.000Z",
      lastCached: "2021-01-25T17:55:53.000Z",
    },
    {
      id: "600f06291614158fafb8b87d",
      name: "v2.0.3/sha256sum.txt",
      target: null,
      size: 1044,
      url: "https://eyebrowse-test-1.s3.amazonaws.com/v2.0.3/sha256sum.txt",
      lastModified: "2021-01-14T16:57:00.000Z",
      lastCached: "2021-01-25T17:55:53.000Z",
    },
  ]);
  console.log(JSON.stringify(tree, null, 2));
}
