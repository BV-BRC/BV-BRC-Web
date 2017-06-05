# Contributing to PATRIC WebApp

Thanks for your contribution. The following is a set of guidlines and code commit procedures. Feel free to propose changes to this document in a pull request.

## First Time Developer

If you're contributing for the first time, configure your local git

1. fork this repo
2. clone your fork in your local
3. confgure `upstream` remote for later sync.

```shell
git remote add upstream https://github.com/PATRIC3/p3_web
```

4. whenever you need to sync your local

```shell
git checkout develop
git fetch upstream
git pull upstream develop
```

For more detail, [read here](https://help.github.com/articles/syncing-a-fork/).



## Guidelines

1. Do not use ECMAScript 6 (ECMAScript 2015) features, otherwise dojo builder will fail.
2. Please build before you submit pull request, but do not include `public/js/release/` directory. Building code will reveal build error in advance, but we need to merge all the codes and make a final build before the release. The release files in PR makes confusion. We will remove this directory in near future,  once CI system is ready.
3. Please lint your code. Keeping code convention highlights meaningful code changes and makes it easy to track and review. You can use IDE of your choice or git [pre-commit hook](./docs/pre-commit-linting.md).
4. Add issue tag in the commit message if possible. for example, you can mention `resolves PATRIC3/patric3_website#1234` in your commit message, which makes a link between the issue tracker and commit.



## Branch configuration

```
-- master : production + bug fixes -> https://www.patricbrc.org
-- develop : release ready commits + bug fixes -> https://beta.patricbrc.org
-- preview : working in progress. merged feature branches -> https://alpha.patricbrc.org
-- features/feature-xx: always branch from develop. delete after merging to develop
```

- *master* branch is inteded for production release. keep it simple and easy to rollback
- *develop* branch is for release preparation. **Only** release ready commits.
- *preview* branch is inteded for previewing internally. alpha site will look this branch.



## Recommended Process

If you're developing a **new feature**

1. create a feature branch from `develop` branch
2. branch name is preferred with a prefix `featuers/` like, `features/workspace2.0`
3. once you want show it to internal review, pull request to `preview` branch
4. when code is ready for release, pull request to `develop` branch
5. delete feature branch


If you're making a **bug fix**

1. pull request to `develop` branch
2. add issue tag in the commit message or pull request message

If you're making a **hot fix**, which has to be deployed immediately.

1. pull request to `develop` **and** `master` branch




## Build

Although a build a is not explicitly required to make a PR, it's a good idea to ensure your code will build.

Before creating a build, sync your fork with the master of `PATRIC3/p3_web` as above.

The following will create a build in `./public/js/release`:

```
./buildCLient.sh
```

**Note**: jBrowse is currently causing some havoc in builds.  You can 'fix' this by commenting out `xstyle/load-css` in `./public/js/JBrowse/main.js`.



## Preparing Release

Increment the `version` in `./package.json`, following the semantic versioning specification, and commit the new build:

```
edit ./package.json   // increment "version"
git add --all
git commit -m 'release js'
git push
```

Note: `version` is where the build is deployed and what is displayed in the UI.