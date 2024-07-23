'use strict';

addToLibrary({
	sequenceRegistry__deps: [
		'free',
		'geneie_sequence_free',
	],
	sequenceRegistry__postset: '_sequenceRegistry = new FinalizationRegistry(ptr => {_geneie_sequence_free(ptr);_free(ptr);});',
	sequenceRegistry: {},

	referenceRegistry__deps: [
		'free',
	],
	referenceRegistry__postset: '_referenceRegistry = new FinalizationRegistry(ptr => {_free(ptr);});',
	referenceRegistry: {},

	$Reference__deps: [
		'malloc',
		'referenceRegistry',
		'geneie_sequence_tools_ref_from_sequence',
		'geneie_sequence_tools_encode',
		'geneie_sequence_ref_index',
		'geneie_sequence_ref_trunc',
		'geneie_sequence_ref_valid',
	],
	$Reference: class {

		/*
		 * I want this to be private, but the pattern:
		 *
		 * var that = new Reference();
		 * that.#sequence = this.#sequence;
		 *
		 * doesn't actually work in JavaScript, even though
		 * I'm accessing the private member from inside the
		 * class. Annoying.
		 */
		//#sequence;

		/**
		 * Constructs a new Reference from an optional WebAssembly pointer.
		 *
		 * This function is for advanced use: consider using Reference.fromSequence
		 * instead.
		 *
		 * @param {number} ptr The pointer to wrap. The pointer will have its lifetime
		 * 	tied to the garbage collection of the Reference object.
		 */
		constructor(ptr) {
			this.ptr = ptr != undefined ? ptr : _malloc(8);
			_referenceRegistry.register(this, this.ptr, this);

			Object.defineProperty(this, 'length', {
				get() {
					return {{{ makeGetValue('this.ptr', 0, 'u32') }}};
				}
			});
		}

		/**
		 * Factory method for constructing a new Reference from a Sequence.
		 *
		 * This is the primary way to construct a new Reference.
		 *
		 * @param {Sequence} sequence The sequence object to refer to.
		 *
		 * @return {Reference} A new Reference object.
		 */
		static fromSequence(sequence) {
			var that = new this();
			_geneie_sequence_tools_ref_from_sequence(that.ptr, sequence.ptr);
			that.sequence = sequence;
			return that;
		}

		/**
		 * Returns a JavaScript String from the given reference.
		 *
		 * The reference can refer to _huge_ data in-memory, and
		 * this function creates a new String by copying that memory.
		 *
		 * If this is a concern, consider using Reference.at()
		 * to get only a single character at the given index.
		 *
		 * @return {String} A String object with the contents of the reference.
		 */
		toString() {
			if (!this.valid())
				return "";

			return UTF8ToString(
				{{{ makeGetValue('this.ptr', 4, 'u32') }}},
				{{{ makeGetValue('this.ptr', 0, 'u32') }}}
			);
		}

		*[Symbol.iterator]() {
			for (let i = 0; i < this.length; i++) {
				yield this.at(i);
			}
		}

		/**
		 * Returns a new Reference, beginning from the given
		 * index.
		 *
		 * @param {number} index The index to start the new Sequence from.
		 *
		 * @return {Reference} The new Reference.
		 */
		index(index) {
			var that = new Reference();
			_geneie_sequence_ref_index(that.ptr, this.ptr, index);
			that.sequence = this.sequence;
			return that;
		}

		/**
		 * Returns a new Reference, with the length set to
		 * the given length.
		 *
		 * @param {number} length The length of the new Sequence.
		 *
		 * @return {Reference} the new Reference.
		 */
		trunc(length) {
			var that = new Reference();
			_geneie_sequence_ref_trunc(that.ptr, this.ptr, length);
			that.sequence = this.sequence;
			return that;
		}

		/**
		 * Returns whether the current Reference is valid.
		 *
		 * It may be invalid because it iterated past the end
		 * of the Sequence, or because it refers to Null.
		 *
		 * @return {Boolean} true if the current Reference is valid, false otherwise.
		 */
		valid() {
			return Boolean(_geneie_sequence_ref_valid(this.ptr));
		}

		/**
		 * Returns a single character at the given index.
		 *
		 * @param {number} index The index of the character to get.
		 *
		 * @return {String} A string containing a single character, or
		 * 	undefined if the index is out of range.
		 */
		at(index) {
			var that = this.index(index);

			if (!that.valid())
				return undefined;

			return that.trunc(1).toString();
		}

		/**
		 * Encodes the referenced sequence in-place.
		 *
		 * As sequences can be huge, this function encodes the
		 * sequence in-place, mutating it irreversibly.
		 *
		 * This function returns a Promise, as processing can
		 * be time-consuming on large data.
		 *
		 * After running encode(), the current sequence
		 * refers to the remaining, unencoded sequence.
		 *
		 * @return {Promise} A Promise object which, when fulfilled,
		 * 	will return an array containing the two Reference
		 * 	objects [ encodedSequence, unencodedSequence ].
		 * 	The encoded sequence will contain single-character
		 * 	Amino Acid codes.
		 */
		encode() {
			return new Promise(resolve => {
				var refPair = _malloc(16);

				_geneie_sequence_tools_encode(refPair, this.ptr);

				{{{ makeSetValue('this.ptr', 0, makeGetValue('refPair', 8, 'u32'), 'u32') }}};
				{{{ makeSetValue('this.ptr', 4, makeGetValue('refPair', 12, 'u32'), 'u32') }}};

				var result = new Reference();

				{{{ makeSetValue('result.ptr', 0, makeGetValue('refPair', 0, 'u32'), 'u32') }}};
				{{{ makeSetValue('result.ptr', 4, makeGetValue('refPair', 4, 'u32'), 'u32') }}};

				_free(refPair);

				resolve([ result, this ]);
			});
		}

		/**
		 * Splices the sequence, using the given spliceFunction
		 * to determine sections to remove.
		 *
		 * The spliceFunction receives a Reference to the sequence
		 * to splice. Use Reference.at() or `for...of` on the Reference
		 * object to iterate the characters, one by one, to search
		 * for sections to splice; then use Reference.index() and
		 * Reference.trunc() to create a new Reference object representing
		 * the section to splice. Finally, return the new reference.
		 *
		 * This function mutates the sequence in-place.
		 *
		 * @param {function} spliceFunction A function taking a Reference and
		 * 	returning a new Reference, representing the section to
		 * 	splice.
		 *
		 * @return {Promise} A new Promise object which, when fulfilled,
		 * 	will return the new Sequence.
		 */
		spliceAll(spliceFunction) {
			return new Promise(resolve => {
				let realSpliceArg = (outParam, inParam) => {
					let result = spliceFunction(new self(inParam)); // ?!?
					{{{ makeSetValue('outParam', 4, 'getValue(result.ptr + 4, "u32")', 'u32') }}}
					{{{ makeSetValue('outParam', 0, 'getValue(result.ptr, "u32")', 'u32') }}}
				};
				var functionPointer = addFunction(realSpliceArg);

				_geneie_sequence_tools_splice(
					this.ref.ptr,
					this.ref.ptr,
					functionPointer
				);

				removeFunction(functionPointer);

				resolve(this);
			});
		}
	},

	$Sequence__deps: [
		'sequenceRegistry',
		'malloc',
		'free',
		'geneie_sequence_from_string',
		'geneie_sequence_copy',
	],
	$Sequence: class {
		/**
		 * Constructs a raw Sequence object.
		 *
		 * This is for advanced use only: consider using
		 * Sequence.fromString() instead.
		 */
		constructor() {
			var sequence = _malloc(8);

			this.ptr = sequence;

			_sequenceRegistry.register(this, this.ptr);
		}

		/**
		 * Constructs a new Sequence representing the given
		 * JavaScript string.
		 *
		 * This makes Geneie functions available, as well as
		 * populating the Sequence.ref property with a Reference
		 * object representing this Sequence.
		 *
		 * Many Sequence methods are wrappers around the
		 * corresponding Reference methods, except that they
		 * copy the Sequence so that the original is not mutated.
		 *
		 * @param {String} string The string to build the Sequence from.
		 *
		 * @return {Sequence} A new Sequence object.
		 */
		static fromString(string) {
			var that = new Sequence();

			var strlen = lengthBytesUTF8(string) + 1;
			var string_tmp = _malloc(strlen);
			stringToUTF8(string, string_tmp, strlen);

			_geneie_sequence_from_string(that.ptr, string_tmp);
			_free(string_tmp);

			that.ref = Reference.fromSequence(that);

			return that;
		}

		*[Symbol.iterator]() {
			// Feels like this shouldn't be necessary
			// can't figure out how to just "return"
			// the new ref in a way that works though
			for (const c of Reference.fromSequence(this))
				yield c;
		}

		/**
		 * Creates an identical copy of this Sequence.
		 *
		 * The copy can be modified without affecting this Sequence.
		 *
		 * @return {Sequence} a new Sequence object.
		 */
		copy() {
			var that = new Sequence();
			_geneie_sequence_copy(that.ptr, this.ptr);
			that.ref = Reference.fromSequence(that);
			return that;
		}

		/**
		 * Returns a JavaScript String of this Sequence.
		 *
		 * The sequence can refer to _huge_ data in-memory, and
		 * this function creates a new String by copying that memory.
		 *
		 * If this is a concern, consider using Reference.at()
		 * to get only a single character at the given index, or
		 * a `for...of` loop over the Sequence to iterate the characters
		 * one-by-one.
		 */
		toString() {
			return Reference.fromSequence(this).toString();
		}

		/**
		 * Encodes the current Sequence and returns the result.
		 *
		 * This function works on a copy of the Sequence: the current
		 * Sequence is not mutated.
		 *
		 * @return {Promise} See Reference.encode().
		 */
		encode() {
			return Reference.fromSequence(this.copy()).encode();
		}

		/**
		 * Splices the current Sequence and returns the result.
		 *
		 * This function works on a copy of the Sequence: the current
		 * Sequence is not mutated.
		 *
		 * @param {function} spliceFunction see Reference.spliceAll().
		 * @return {Array} see Reference.spliceAll().
		 */
		spliceAll(spliceFunction) {
			return Reference.fromSequence(this.copy()).spliceAll(spliceFunction);
		}
	},
});
