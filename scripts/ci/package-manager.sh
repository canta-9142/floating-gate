#!/bin/sh

# This file is sourced by the CI entry points.

detect_package_manager() {
	lockfile_count=0
	lockfile_list=""

	for lockfile in package-lock.json pnpm-lock.yaml yarn.lock; do
		if [ -f "$lockfile" ]; then
			lockfile_count=$((lockfile_count + 1))
			lockfile_list="${lockfile_list}${lockfile_list:+, }${lockfile}"
		fi
	done

	if [ "$lockfile_count" -eq 0 ]; then
		echo "No supported lockfile found (package-lock.json, pnpm-lock.yaml, or yarn.lock)." >&2
		exit 1
	fi

	if [ "$lockfile_count" -ne 1 ]; then
		echo "Multiple lockfiles found; refusing to choose: ${lockfile_list}" >&2
		exit 1
	fi

	PACKAGE_MANAGER_SPEC=$(node -e '
		const value = require("./package.json").packageManager;
		if (value !== undefined && typeof value !== "string") process.exit(2);
		process.stdout.write(value || "");
	') || {
		echo "package.json contains an invalid packageManager field." >&2
		exit 1
	}

	case "$lockfile_list" in
		package-lock.json)
			PACKAGE_MANAGER=npm
			;;
		pnpm-lock.yaml)
			PACKAGE_MANAGER=pnpm
			;;
		yarn.lock)
			PACKAGE_MANAGER=yarn
			;;
		*)
			echo "Internal error while selecting a package manager." >&2
			exit 1
			;;
	esac

	if [ -n "$PACKAGE_MANAGER_SPEC" ]; then
		case "$PACKAGE_MANAGER_SPEC" in
			"${PACKAGE_MANAGER}"@?*) ;;
			*)
				echo "Lockfile selects ${PACKAGE_MANAGER}, but package.json declares ${PACKAGE_MANAGER_SPEC}." >&2
				exit 1
				;;
		esac
	elif [ "$PACKAGE_MANAGER" != npm ]; then
		echo "package.json must pin packageManager for reproducible ${PACKAGE_MANAGER} execution." >&2
		exit 1
	fi

	export PACKAGE_MANAGER PACKAGE_MANAGER_SPEC
}
