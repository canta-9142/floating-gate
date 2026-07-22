#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH='' cd -- "${SCRIPT_DIR}/../.." && pwd)

cd "$REPOSITORY_ROOT"

# shellcheck source=package-manager.sh
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/package-manager.sh"
detect_package_manager

case "$PACKAGE_MANAGER" in
	npm)
		npm run build
		;;
	pnpm)
		corepack pnpm run build
		;;
	yarn)
		corepack yarn run build
		;;
esac

if [ ! -f dist/index.html ]; then
	echo "Build completed without the required dist/index.html artifact." >&2
	exit 1
fi
