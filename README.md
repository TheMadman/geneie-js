# Geneie-js - provides a JavaScript interface to Geneie

This project provides both a JavaScript interface
for Geneie, and a convenience script for building Geneie
and its dependencies for WebAssembly using emsdk.

# Building

Before running `build.sh`, you should have _installed_
and _activated_ emsdk: https://emscripten.org/docs/getting\_started/downloads.html#installation-instructions-using-the-emsdk-recommended

`build.sh` will download Geneie and its dependencies,
build them in a new directory called `prefix/`, then
build the result with `emcc` into the files `libgeneie.wasm`
and `libgeneie.js` in the current directory. Installing both
files into your site will then provide the JavaScript
API via `Module.Geneie`.
