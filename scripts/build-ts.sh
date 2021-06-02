#!/bin/bash

set -e
PATH=$(yarn bin):$PATH

export NODE_ENV=production
tsc && tsc -m ES6 --outDir lib-es

# (
#     cd ../../flow-support
#     yarn copy
# )
