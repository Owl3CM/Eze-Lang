// vite-plugin-parrot.js
import { Watcher } from "./workflow.js";

export default function parrotPlugin() {
  return {
    name: "vite-plugin-parrot",
    async buildStart() {
      //   if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") await Watcher();
    },
    configureServer(server) {
      if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") Watcher();
    },
    async closeBundle() {},
  };
}
