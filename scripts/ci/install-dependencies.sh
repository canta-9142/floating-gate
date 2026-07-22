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
		npm ci
		;;
	pnpm)
		corepack pnpm install --frozen-lockfile
		;;
	yarn)
		yarn_version=${PACKAGE_MANAGER_SPEC#yarn@}
		case "$yarn_version" in
			1.*)
				corepack yarn install --frozen-lockfile
				;;
			*)
				corepack yarn install --immutable
				;;
		esac
		;;
esac
