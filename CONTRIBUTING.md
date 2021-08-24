# Contributing to PATRIC WebApp

Thanks for your contribution. The following is a set of guidlines and code commit procedures. Feel free to propose changes to this document in a pull request.

## First Time Developer

If you're contributing for the first time, configure your local git

1. fork this repo
2. clone your fork in your local
3. confgure `upstream` remote for later sync.

```shell
git remote add upstream https://github.com/BV-BRC/website.git
```

4. whenever you need to sync your local

```shell
git checkout develop
git fetch upstream
git pull upstream develop
```

For more detail, [read here](https://help.github.com/articles/syncing-a-fork/).



## Guidelines

1. Please lint your code. Keeping code convention highlights meaningful code changes and makes it easy to track and review. You can use IDE of your choice or git [pre-commit hook](./docs/pre-commit-linting.md).
2. Add issue tag in the commit message if possible. for example, you can mention `resolves BV-BRC/issues#123` in your commit message, which makes a link between the issue tracker and commit.



## Branch configuration

```
-- master : production + bug fixes -> https://www.bv-brc.org
-- develop : release ready commits + bug fixes -> https://beta.bv-brc.org
-- preview : working in progress. merged feature branches -> https://alpha.bv-brc.org
-- features/feature-xx: always branch from develop. delete after merging to develop
```

- *master* branch is inteded for production release. keep it simple and easy to rollback
- *develop* branch is for release preparation. **Only** release ready commits.
- *preview* branch is inteded for previewing internally. alpha site will look this branch.



## Recommended Process

If you're developing a **new feature**

1. create a feature branch from `develop` branch
2. branch name is preferred with a prefix `featuers/` like, `features/workspace2.0` and send PR to the branch with same name
3. for internal review, ask git maintainer to merge into `preview` branch
4. when code is ready for release, the git maintainer will merge into `develop` branch
5. delete feature branch


If you're making a **bug fix**

1. pull request to `develop` branch
2. add issue tag in the commit message or pull request message

If you're making a **hot fix**, which has to be deployed immediately.

1. pull request to `develop` **and** `master` branch

## UI Development
https://github.com/BV-BRC/website/blob/master/docs/README.md


## Preparing Release

Increment the `version` in `./package.json`, following the semantic versioning specification, and commit the new build:

```
edit ./package.json   // increment "version"
git add --all
git commit -m 'release js'
git push
```

Note: `version` is where the build is deployed and what is displayed in the UI.