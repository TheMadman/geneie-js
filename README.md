# Geneie-js - provides a JavaScript interface to Geneie

This project provides both a JavaScript interface
for Geneie, and a convenience script for building Geneie
and its dependencies for WebAssembly using emsdk.

# Using

To begin, simply install `geneie-js` using npm:

```
npm i geneie-js
```

The module exports a Promise object, which guarantees that
the WebAssembly portion is available before running.

You can use:

```js
import Geneie from "geneie-js";

// Allow other asynchronous JavaScript to run while the
// WebAssembly is loading
Geneie().then(g => {
    // call functions on g
});

// Alternatively, halt the script until the WebAssembly has finished loading
let geneie = await Geneie();
// call functions on geneie as usual
```

## API

There are two classes provided by geneie-js:

- `Sequence` - Manages the memory of a Geneie sequence.
- `Reference` - References memory being managed by a `Sequence`.

The primary difference is:

- A `Reference` object's processing methods will process the data in-place, using less memory but destroying the original input.
  - After calling `spliceAll()` or `encode()`, the _original sequence_ will also be modified.
- A `Sequence` object's processing methods will keep the original sequence intact, creating and returning new `Sequence` objects in memory.
  - After calling `spliceAll()` or `encode()`, the original sequence will be unmodified, and a new sequence is returned.

A `Reference` can be constructed from a `Sequence` with the `fromSequence()` factory method, and will modify the original `Sequence`.
A `Sequence` can be constructed from a `Reference` with the `fromReference()` factory method, copying the data the `Reference` refers to.

### Common Methods

The following functions are provided for both objects:

- `static fromString()` - Constructs the object from a JavaScript string.
  - Example:
    ```js
    import Geneie from "geneie-js";

    let geneie = await Geneie();
    let sequence = geneie.Sequence.fromString("ACT-CTG");
    console.log(sequence.toString();
    ```
- `toString()` - Returns a JavaScript string representation.
  - See `fromString()` above for example usage
- `*[Symbol.iterator]()` - Provides `for...of` support for iterating the sequence, one character at a time, returning a new `Reference`.
  - Example:
    ```js
    import Geneie from "geneie-js";
    let geneie = await Geneie();
  
    let sequence = geneie.Sequence.fromString("ACT-CTG");
    for (let c of sequence) {
        console.log(c.trunc(1).toString())
    }
    ```
- `spliceAll(callable)` - Using the provided callable, splices the sequence.
  - The callable will be passed a `Reference` argument (never a sequence, even when called on `Sequence` objects), and must return a `Reference` or a falsy value
    - The `Reference` returned must be from the `Reference` passed, using the `Reference`-specific methods described below
  - The callable will be called with the original sequence first. If the callable returns a new Reference, it will be called again with the remaining sequence. If the callable returns a falsy value, the function will return the sequence with the returned `Reference`s removed.
  - Example:
    ```js
    import Geneie from "geneie-js";

    let geneie = await Geneie();
    let sequence = geneie.Sequence.fromString("ACT-CTG");

    let result = await sequence.spliceAll(ref => {
            for (let current = ref; current.valid(); current = current.index(3)) {
                    let codon = current.trunc(3);
                    if (codon.toString().match(/[G-]/))
                            return codon;
            }
    });
    console.log(sequence.toString(), result.toString()); // ACT-CTG ACT
    ```
- `encode()` - Encodes a sequence of DNA/mRNA into Amino Acid codes. Returns an array with two sequences: the result of encoding, and the start of the sequence that couldn't be encoded, which may be empty if the whole sequence was successfully encoded.
  - Example:
    ```js
    import Geneie from "geneie-js";

    let geneie = await Geneie();
    let sequence = geneie.Sequence.fromString("ACT-CTG");

    let result = await sequence.encode();
    console.log(result.toString());
    ```

### Reference methods

The `Reference` class is responsible for navigating and selecting the memory provided by a `Sequence` object. It mutates the `Sequence` object in-place when calling `spliceAll()` and `encode()` on the `Reference`.

Creating a `Reference` using `Reference.fromString()` will automatically create the `Sequence` object it refers to. Otherwise, you can also create a `Sequence` object manually, then create a `Reference` to it using `Reference.fromSequence()`.

The `Reference` class has the following properties:

- `length` - Returns the length of the buffer referenced to.
  - Read-only

The `Reference` class has the following methods:

- `static fromSequence()` - Takes a `Sequence` object and creates a new `Reference` to it.
  - Example:
    ```js
    import Geneie from "geneie-js";

    let geneie = await Geneie();
    let sequence = geneie.Sequence.fromString("ACT-CTG");
    let reference = geneie.Reference.fromSequence(sequence);

    let result = await reference.encode();
    console.log(
            result.toString(),
            reference.toString(),

            // Note that calling `reference.encode()` has modified the original sequence
            sequence.toString()
    );
    ```
- `valid()` - Returns true if the reference is valid, false otherwise.
  - The reference is considered valid if its length is greater than or equal to 0.
- `index()` - Takes an integer index and returns a new Reference, starting from that index.
  - Note that there is no boundary checking on this method - you must verify that the result is safe with `.valid()`, or otherwise have prior knowledge that the result can't be incorrect.
- `trunc()` - Takes an integer length and sets the Reference's length to it.
  - The length must be smaller than or equal to the Reference's current length. If a larger length is given, the length is not changed.
- Example using `valid()`, `index()` and `trunc()`:
  ```js
  import Geneie from "geneie-js";

  let geneie = await Geneie();
  let reference = geneie.Reference.fromString("ACTACCCTG");

  let result = await reference.spliceAll(ref => {
          for (let current = ref; current.valid(); current = current.index(3)) {
                  let codon = current.trunc(3);
                  if (codon.toString() === "ACC")
                          return codon;
          }
  }).then(spliced => spliced.encode());
  console.log(result, result[0].toString()); // [ array of 2 References ] TL
  ```
- `at()` - Takes an integer index and returns a JavaScript string, containing a single character at the given location.
  - Example:
    ```js
    import Geneie from "geneie-js";

    let geneie = await Geneie();
    let reference = geneie.Reference.fromString("ACTACCCTG");

    for (let i = 0; i < 3; i++) {
            console.log(reference.at(i));
    }
    /*
     * A
     * C
     * T
     */
    ```

### Sequence methods

The `Sequence` class is primarily responsible for managing the memory a Sequence is stored in. Most Sequence methods create copies into new Sequences, including `spliceAll()` and `encode()`.

The `Sequence` class has the following methods:

- `static fromReference()` - takes a `Reference` object, copies the data it contains into a new `Sequence`, and returns the new `Sequence` object.
  - Example:
    ```js
    import Geneie from "geneie-js";

    let geneie = await Geneie();
    let reference = geneie.Reference.fromString("ACT-CTG");
    let sequence = geneie.Sequence.fromReference(reference);

    let result = await reference.encode();
    console.log(
            reference.toString(), // Notice that the original reference was modified by encode()...
            sequence.toString() // ... while the copied sequence was not
    );
    ```
- `copy()` - Copies this `Sequence` to a new `Sequence` and returns the copy.
  - Example:
    ```js
    import Geneie from "geneie-js";

    let geneie = await Geneie();

    let first = geneie.Sequence.fromString("ACT-CTG");
    let firstReference = geneie.Reference.fromSequence(first);

    let second = first.copy()

    let result = await firstReference.encode();
    console.log(
            result.toString(),
            first.toString(), // Notice that the original sequence was modified by encode()...
            second.toString() // ... while the copied sequence was not
    );
    ```

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
