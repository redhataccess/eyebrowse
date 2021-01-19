function graphql(query, variables = {}) {
  return fetch("/admin/api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      variables,
      query,
    }),
  }).then(function (result) {
    return result.json();
  });
}

async function fetchData() {
  const data = await graphql(`
    query {
      allFiles {
        id
        name
        size
        url
        lastModified
        lastCached
      }
    }
  `);

  return data;
}

(async () => {
  const data = await fetchData();
  console.log(data);
  document.querySelector("pre").innerText = JSON.stringify(
    data.data.allFiles,
    null,
    4
  );
})();
