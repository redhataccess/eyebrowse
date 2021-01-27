import Vue from "vue";

async function fetchConfig() {
  if (!window.eyebrowse_config) {
    const res = await fetch("config.json");
    window.eyebrowse_config = await res.json();
  }
  return window.eyebrowse_config;
}

async function fetchData() {
  const config = await fetchConfig();
  const res = await fetch(config.api_url + "/files");
  return await res.json();
}

(async () => {
  const data = await fetchData();
  document.querySelector("pre").innerText = JSON.stringify(data.data, null, 4);
})();
