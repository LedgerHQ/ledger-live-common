#!/bin/bash

set -e

GIT_REMOTE=git@github.com:LedgerHQ/ledger-live-common.git

cd `mktemp -d`
git clone $GIT_REMOTE
cd ledger-live-common
yarn
cd cli
yarn
yarn link
yarn build

mkdir -p cli/tests/tmp/
ledger-live version 2>&1 >> cli/tests/tmp/error.log
ledger-live deviceVersion $* 2>&1 >> cli/tests/tmp/error.log
ledger-live appsUpdateTestAll $* 2> cli/tests/tmp/error.log

LOG_FILE=cli/tests/tmp/error.log

if [ ! -f $LOG_FILE ]; then
    echo "Log file couldn't be find"
elif grep -i "NoDevice" $LOG_FILE; then
    echo "A Nano device needs to be connected"
elif grep -i -E "FAILED|ERROR" $LOG_FILE; then
    echo "An error has occured. Creating an issue..."
    node tests/create-issue.js $LOG_FILE
else
    echo "Success. All the apps have been installed / updated / removed properly"
fi
