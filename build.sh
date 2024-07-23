#!/bin/bash

set -e -o pipefail

export PROJECT_DIR="$(dirname "$(realpath "$0")")"
export PREFIX="$PROJECT_DIR/prefix"
export CFLAGS=
export CXXFLAGS=
export LDFLAGS=

export EMCCFLAGS="--js-library=""$PROJECT_DIR""/library.js -sMODULARIZE=1 -s"'EXPORT_NAME="Geneie"'" -sEXPORTED_FUNCTIONS=@exports.txt -sEXPORTED_RUNTIME_METHODS=@runtime.txt -sALLOW_TABLE_GROWTH=1 -O3"

mkdir -p "$PREFIX"

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
emcc $EMCCFLAGS "$PREFIX"/lib/lib{adt,geneie}static.a -o libgeneie.mjs
