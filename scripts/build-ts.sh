#!/bin/bash

set -e
PATH=$(yarn bin):$PATH

rm -rf lib src/data/icons/react*
bash ./scripts/sync-families-dispatch.sh
node scripts/buildReactIcons.js

export NODE_ENV=production
tsc && tsc -m ES6 --outDir lib-es

# (
#     cd ../../flow-support
#     yarn copy
# )
