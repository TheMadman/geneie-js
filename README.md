# Geneie-js - provides a JavaScript interface to Geneie

This project provides both a JavaScript interface
for Geneie, and a convenience script for building Geneie
and its dependencies for WebAssembly using emsdk.

# Building

Before running `build.sh`, you should have _installed_
and _activated_ emsdk: https://emscripten.org/docs/getting_started/downloads.html#installation-instructions-using-the-emsdk-recommended

You must also initialize the git submodules, if you have
not done so:

```
git submodule update --init
```

`build.sh` will build them in a new directory called `prefix/`,
then build the result with `emcc` into the files `libgeneie.wasm`
and `libgeneie.js` in the `bin` directory. Installing
both files into your site will then provide the JavaScript API via
a Promise object called, `Geneie`.

```html
<script src="libgeneie.js"></script>
<script>
	Geneie().then(Geneie => {
		var sequence = Geneie.Sequence.fromString("ACT-CTG");
		sequence.encode().then(result => {
			// Should print Array [ "T", "-CTG" ]
			console.log([result[0].toString(), result[1].toString()]);
		});
	});
</script>
```

Better documentation is en route.
