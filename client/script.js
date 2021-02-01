import Vue from "vue/dist/vue.esm";
import "@patternfly/pfe-icon";
import "@patternfly/pfe-number";
import "@patternfly/pfe-datetime";

async function fetchConfig() {
  if (!window.eyebrowse_config) {
    const res = await fetch("config.json");
    window.eyebrowse_config = await res.json();
  }
  return window.eyebrowse_config;
}

async function fetchData() {
  const config = await fetchConfig();
  const res = await fetch(config.api_url + "/files/");
  return await res.json();
}

const app = new Vue({
  el: "#app",
  data: {
    allFiles: {},
    appName: "Eyebrowse",
    currentPath: "",
  },
  created: async function() {
    const { data } = await fetchData();
    console.table(data.allFiles);
    this.allFiles = data.allFiles;
  },
});

window.app = app;
