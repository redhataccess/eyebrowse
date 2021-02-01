const { set, get, reduce, filter, last } = require("lodash");

/**
 * Turn a flat array of eyebrowse File objects into a nested tree structure
 * based on the .path property.
 *
 * For example, a file with a path of "foo/bar/baz.md" would be placed into a
 * tree like this:
 *
 * {
 *   foo: {
 *     children: {
 *       bar: {
 *         children: {
 *           "baz.md": {
 *             name: "baz.md",
 *             path: "foo/bar/baz.md",
 *             size: 1234,
 *             // ... other properties, etc
 *           }
 *         }
 *       }
 *     }
 *   }
 * }
 */
function buildTree(files) {
  const tree = reduce(
    files,
    (acc, file) => {
      return set(
        { ...acc }, // clone the accumulator to avoid mutating it
        nestPath(file.path), // nest the path (add .children at each dir step)
        file
      );
    },
    {}
  );

  // set up targetOf reverse links.
  // DISABLED for now due to depth pagination, it isn't able to look up the
  // targetOf successfully. Re-enable when I find a way to query graphql for
  // this.
  // filter(files, "target").forEach((link) => {
  //   const linkTarget = get(tree, nestPath(link.target));
  //   linkTarget.targetOf = link.name;
  // });

  return tree;
}

/**
 * Turn a path string, /-delimited, into a path array with "children"
 * properties inseretd between each directory boundary.
 */
function nestPath(path) {
  return path.replace(/\//g, "/children/").split("/");
}

module.exports = {
  buildTree,
};

if (require.main === module) {
  const tree = buildTree([
    {
      name: "latest",
      path: "latest",
      target: "v2.0.3",
      size: undefined,
      lastModified: "Thu, 14 Jan 2021 16:57:00 GMT",
      lastCached: "Tue, 26 Jan 2021 16:41:37 GMT",
    },
    {
      name: "latest_sum",
      path: "latest_sum",
      target: "v2.0.3/sha256sum.txt",
      size: 1044,
      lastModified: "Thu, 14 Jan 2021 16:57:00 GMT",
      lastCached: "Tue, 26 Jan 2021 16:41:37 GMT",
    },
    {
      name: "sha256sum.txt",
      path: "v2.0.2/sha256sum.txt",
      target: undefined,
      size: 1044,
      lastModified: "Thu, 14 Jan 2021 16:57:01 GMT",
      lastCached: "Tue, 26 Jan 2021 16:41:37 GMT",
    },
    {
      name: "sha256sum.txt",
      path: "v2.0.3/sha256sum.txt",
      target: undefined,
      size: 1044,
      lastModified: "Thu, 14 Jan 2021 16:57:00 GMT",
      lastCached: "Tue, 26 Jan 2021 16:41:37 GMT",
    },
    {
      id: "600f06291614158fafb8b87d",
      name: "readme.md",
      path: "v2.0.3/docs/readme.md",
      target: null,
      size: 362623,
      url: "https://eyebrowse-test-1.s3.amazonaws.com/v2.0.3/docs/readme.md",
      lastModified: "2021-01-14T16:57:00.000Z",
      lastCached: "2021-01-25T17:55:53.000Z",
    },
  ]);
  console.log(JSON.stringify(tree, null, 2));
}
