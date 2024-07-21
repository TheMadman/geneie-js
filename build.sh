#!/bin/bash

set -e -o pipefail

export PROJECT_DIR="$(dirname "$(realpath "$0")")"
export PREFIX="$PROJECT_DIR/prefix"
export CFLAGS=
export CXXFLAGS=
export LDFLAGS=

export EMCCFLAGS="--js-library=""$PROJECT_DIR""/library.js -sEXPORTED_FUNCTIONS=_geneie_code_nucleic_string_valid,_geneie_code_nucleic_char_valid,_geneie_code_amino_string_valid,_geneie_code_amino_char_valid,_geneie_sequence_ref_from_string,_geneie_sequence_ref_valid,_geneie_sequence_tools_ref_from_sequence,_geneie_sequence_tools_sequence_from_ref,_geneie_sequence_tools_clean_whitespace,_geneie_sequence_tools_dna_to_premrna,_geneie_sequence_valid,_geneie_sequence_alloc,_geneie_sequence_from_string,_geneie_sequence_copy,_geneie_sequence_free,_geneie_sequence_tools_ref_from_sequence,_geneie_sequence_alloc,_geneie_sequence_valid -sEXPORTED_RUNTIME_METHODS=Geneie -O3"

mkdir -p "$PREFIX"

git submodule update --init --recursive --remote

for i in libadt geneie
do
	{
		mkdir -p "$i/build-emsdk" && pushd "$i/build-emsdk" || exit 1
		emcmake cmake -DCMAKE_INSTALL_PREFIX="$PREFIX" -DCMAKE_FIND_ROOT_PATH="$PREFIX" ..
		emmake cmake --build .
		emmake cmake --install .
		popd
	} &
done

wait

emcc $EMCCFLAGS "$PREFIX"/lib/lib{adt,geneie}static.a -o libgeneie.js
