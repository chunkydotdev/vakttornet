// Root export is node-safe on purpose: ids only, no `.svg?url` imports.
// The Vite app imports the manifest via "@vakttornet/assets/manifest".
export * from "./ids";
