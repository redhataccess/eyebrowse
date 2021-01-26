async function fetchData() {
  return fetch("/files").then(function (result) {
    return result.json();
  });
}

(async () => {
  const data = await fetchData();
  console.log(data);
  document.querySelector("pre").innerText = JSON.stringify(data.data, null, 4);
})();
