# Pre-commit Hook for Automatic Linting & Code Styling

Keeing code convention helps to focus on code changes but tidious job if we do manually. ESLint is well-developed linting and code-style checking tool and we're going to use `git hook` to run this script automatically.

> Git hooks are scripts that run automatically every time a particular event occurs in a Git repository.
>
> They let you customize Git’s internal behavior and trigger customizable actions at key points in the development life cycle.

— [Atlassian Git tutorial](https://www.atlassian.com/git/tutorials/git-hooks)

## ESLint

The eslint module is already installed and configured (`.eslintrc.json`). You can run it in command line interface to make sure that your changes are compatible to esline rules.

```shell
$ ./node_modules/.bin/eslint public/js/p3
```

You can run it on a specific directory or file.

```
$ ./node_modules/.bin/eslint public/js/p3/widget/ProteinFamiliesContainer.js

/Users/hsyoo/dev/deploy/p3_web/public/js/p3/widget/ProteinFamiliesContainer.js
  17:1  error  Expected indentation of 2 spaces but found 12  indent

✖ 1 problem (1 error, 0 warnings)
  1 error, 0 warnings potentially fixable with the `--fix` option.
```

And the eslint can fix automatically. add `--fix` option.

```shell
$ ./node_modules/.bin/eslint public/js/p3/widget/ProteinFamiliesContainer.js --fix
```

## Pre-commit hook

1.  create a hook file in `.git/hooks/pre-commit`

```shell
#!/bin/bash

for file in $(git diff --cached --name-only | grep -E '\.(js|jsx|html)$')
do
  git show ":$file" | node_modules/.bin/eslint --stdin --stdin-filename "$file" # we only want to lint the staged changes, not any un-staged changes
  if [ $? -ne 0 ]; then
    echo "ESLint failed on staged file '$file'. Please check your code and try again. You can run ESLint manually via npm run eslint."
    exit 1 # exit with failure status
  fi
done
```

2.  make the hook file excutable

```shell
$ chmod +x pre-commit
```

3.  Done. Try it

```shell
$ git commit public/js/p3/widget/ProteinFamiliesContainer.js -m 'test'

/Users/hsyoo/dev/deploy/p3_web/public/js/p3/widget/ProteinFamiliesContainer.js
  17:1  error  Expected indentation of 2 spaces but found 12  indent

✖ 1 problem (1 error, 0 warnings)
  1 error, 0 warnings potentially fixable with the `--fix` option.

ESLint failed on staged file 'public/js/p3/widget/ProteinFamiliesContainer.js'. Please check your code and try again. You can run ESLint manually via npm run eslint.
```
