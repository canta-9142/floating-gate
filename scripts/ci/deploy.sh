#!/bin/sh

set -eu

SITE_ROOT=/srv/www/floating-gate
RELEASES_DIR=${SITE_ROOT}/releases
STAGING_ROOT=${SITE_ROOT}/.staging
CURRENT_LINK=${SITE_ROOT}/current

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH='' cd -- "${SCRIPT_DIR}/../.." && pwd)

staging_directory=""
link_directory=""

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
		find "$temporary_directory" -depth -delete
	fi
}

cleanup() {
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
