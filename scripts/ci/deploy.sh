#!/bin/sh

set -eu

SITE_ROOT=/srv/www/floating-gate
RELEASES_DIR=${SITE_ROOT}/releases
STAGING_ROOT=${SITE_ROOT}/.staging
CURRENT_LINK=${SITE_ROOT}/current
RELEASES_TO_KEEP=${DEPLOY_RELEASES_TO_KEEP:-5}

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH='' cd -- "${SCRIPT_DIR}/../.." && pwd)

staging_directory=""
link_directory=""
release_list_file=""
removal_directory=""

remove_temporary_directory() {
	temporary_directory=$1

	case "$temporary_directory" in
		"${STAGING_ROOT}/"*) ;;
		*)
			echo "Refusing to clean an unexpected path: ${temporary_directory:-<empty>}" >&2
			return 1
			;;
	esac

	if [ -d "$temporary_directory" ] && [ ! -L "$temporary_directory" ]; then
		find "$temporary_directory" -xdev -depth -delete
	fi
}

remove_temporary_file() {
	temporary_file=$1

	case "$temporary_file" in
		"${STAGING_ROOT}/"*) ;;
		*)
			echo "Refusing to clean an unexpected path: ${temporary_file:-<empty>}" >&2
			return 1
			;;
	esac

	if [ -f "$temporary_file" ] || [ -L "$temporary_file" ]; then
		rm -f -- "$temporary_file"
	fi
}

prune_old_releases() {
	release_list_file=$(mktemp "${STAGING_ROOT}/releases.XXXXXXXX")

	for candidate_release_directory in "${RELEASES_DIR}"/*; do
		if [ ! -e "$candidate_release_directory" ] && [ ! -L "$candidate_release_directory" ]; then
			continue
		fi

		candidate_release_name=${candidate_release_directory##*/}
		case "$candidate_release_name" in
			*[!0-9a-f]* | "") continue ;;
		esac
		case ${#candidate_release_name} in
			40 | 64) ;;
			*) continue ;;
		esac

		if [ ! -d "$candidate_release_directory" ] || [ -L "$candidate_release_directory" ]; then
			echo "Skipping release candidate that is not a real directory: $candidate_release_directory" >&2
			continue
		fi

		candidate_release_mtime=$(stat -c %Y -- "$candidate_release_directory")
		printf '%s %s\n' "$candidate_release_mtime" "$candidate_release_name" >>"$release_list_file"
	done

	sort -rn -o "$release_list_file" "$release_list_file"
	retained_release_count=1

	while read -r _ candidate_release_name; do
		if [ -z "$candidate_release_name" ] || [ "$candidate_release_name" = "$commit_sha" ]; then
			continue
		fi

		if [ "$retained_release_count" -lt "$RELEASES_TO_KEEP" ]; then
			retained_release_count=$((retained_release_count + 1))
			continue
		fi

		candidate_release_directory=${RELEASES_DIR}/${candidate_release_name}
		case "$candidate_release_directory" in
			"${RELEASES_DIR}/"*) ;;
			*)
				echo "Refusing to remove an unsafe release path: $candidate_release_directory" >&2
				exit 1
				;;
		esac

		if [ ! -d "$candidate_release_directory" ] || [ -L "$candidate_release_directory" ]; then
			echo "Release changed during cleanup; refusing to remove it: $candidate_release_directory" >&2
			exit 1
		fi

		removal_directory=$(mktemp -d "${STAGING_ROOT}/remove.${candidate_release_name}.XXXXXXXX")
		mv -T "$candidate_release_directory" "${removal_directory}/release"
		find "$removal_directory" -xdev -depth -delete
		removal_directory=""
		echo "Removed old release $candidate_release_directory"
	done <"$release_list_file"

	remove_temporary_file "$release_list_file"
	release_list_file=""
}

cleanup() {
	if [ -n "$removal_directory" ]; then
		remove_temporary_directory "$removal_directory"
	fi
	if [ -n "$release_list_file" ]; then
		remove_temporary_file "$release_list_file"
	fi
	if [ -n "$link_directory" ]; then
		remove_temporary_directory "$link_directory"
	fi
	if [ -n "$staging_directory" ]; then
		remove_temporary_directory "$staging_directory"
	fi
}

trap cleanup EXIT
trap 'exit 1' HUP INT TERM

cd "$REPOSITORY_ROOT"

case "$RELEASES_TO_KEEP" in
	[1-9] | [1-9][0-9] | [1-9][0-9][0-9]) ;;
	*)
		echo "DEPLOY_RELEASES_TO_KEEP must be an integer from 1 to 999." >&2
		exit 1
		;;
esac

if [ ! -f dist/index.html ]; then
	echo "Refusing to deploy: dist/index.html does not exist." >&2
	exit 1
fi

commit_sha=$(git rev-parse --verify 'HEAD^{commit}')
case "$commit_sha" in
	*[!0-9a-f]* | "")
		echo "Git returned an invalid commit SHA: ${commit_sha:-<empty>}" >&2
		exit 1
		;;
esac

case ${#commit_sha} in
	40 | 64) ;;
	*)
		echo "Git returned a non-full commit SHA: $commit_sha" >&2
		exit 1
		;;
esac

if [ -n "${DEPLOY_COMMIT_SHA:-}" ] && [ "$DEPLOY_COMMIT_SHA" != "$commit_sha" ]; then
	echo "Checked-out commit does not match the workflow commit." >&2
	exit 1
fi

if [ "$SITE_ROOT" != /srv/www/floating-gate ] || [ "$SITE_ROOT" = / ]; then
	echo "Unsafe site root." >&2
	exit 1
fi

if [ ! -d "$SITE_ROOT" ] || [ -L "$SITE_ROOT" ]; then
	echo "Site root must be an existing real directory: $SITE_ROOT" >&2
	exit 1
fi

if [ ! -d "$RELEASES_DIR" ] || [ -L "$RELEASES_DIR" ]; then
	echo "Releases directory must be an existing real directory: $RELEASES_DIR" >&2
	exit 1
fi

umask 002

mkdir -p "$STAGING_ROOT"
if [ -L "$STAGING_ROOT" ]; then
	echo "Staging root must not be a symlink: $STAGING_ROOT" >&2
	exit 1
fi
chmod 2770 "$STAGING_ROOT"

if ! command -v flock >/dev/null 2>&1; then
	echo "The runner image must provide flock." >&2
	exit 1
fi

exec 9>"${SITE_ROOT}/.deploy.lock"
if ! flock -x 9; then
	echo "Could not acquire the deployment lock." >&2
	exit 1
fi

release_directory=${RELEASES_DIR}/${commit_sha}
case "$release_directory" in
	"${RELEASES_DIR}/"*) ;;
	*)
		echo "Unsafe release path." >&2
		exit 1
		;;
esac

if [ -e "$release_directory" ] || [ -L "$release_directory" ]; then
	if [ ! -d "$release_directory" ] || [ -L "$release_directory" ] || [ ! -f "$release_directory/index.html" ]; then
		echo "Existing release is invalid; refusing to overwrite it: $release_directory" >&2
		exit 1
	fi
	echo "Release already exists; reusing $release_directory"
else
	staging_directory=$(mktemp -d "${STAGING_ROOT}/${commit_sha}.XXXXXXXX")
	cp -a dist/. "${staging_directory}/"
	chmod -R u=rwX,g=rX,o=rX "$staging_directory"

	if [ ! -f "$staging_directory/index.html" ]; then
		echo "Staged release is missing index.html." >&2
		exit 1
	fi

	mv -T "$staging_directory" "$release_directory"
	staging_directory=""
	chmod 2755 "$release_directory"
	echo "Created release $release_directory"
fi

link_directory=$(mktemp -d "${STAGING_ROOT}/link.${commit_sha}.XXXXXXXX")
ln -s "releases/${commit_sha}" "${link_directory}/current"
mv -Tf "${link_directory}/current" "$CURRENT_LINK"
rmdir "$link_directory"
link_directory=""

if [ "$(readlink "$CURRENT_LINK")" != "releases/${commit_sha}" ]; then
	echo "Current symlink verification failed." >&2
	exit 1
fi

echo "Published commit $commit_sha"
prune_old_releases
