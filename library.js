'use strict';

addToLibrary({
	$Geneie: function() {
		this.sequence = string => {
			var sequence = _malloc(8);
			var strlen = lengthBytesUTF8(string) + 1;
			var string_tmp = _malloc(strlen);
			stringToUTF8(string, string_tmp, strlen);
			_geneie_sequence_from_string(sequence, string_tmp);
			_free(string_tmp);
			return sequence;
		};

		this.freeSequence = sequence => {
			_geneie_sequence_free(sequence);
			_free(sequence);
		};

		this.encode = string => {
			var sequence = this.sequence(string);
			var ref = _malloc(8);
			var ref_pair = _malloc(16);

			_geneie_sequence_tools_ref_from_sequence(ref, sequence);
			_geneie_sequence_tools_encode(ref_pair, ref);

			var result = UTF8ToString(
				{{{ makeGetValue('ref_pair', 4, 'u32') }}},
				{{{ makeGetValue('ref_pair', 0, 'u32') }}}
			);
			var remainder = UTF8ToString(
				{{{ makeGetValue('ref_pair', 12, 'u32') }}},
				{{{ makeGetValue('ref_pair', 8, 'u32') }}}
			);

			_free(ref_pair);
			_free(ref);
			this.freeSequence(sequence);
			return [result, remainder];
		};
	}
});
