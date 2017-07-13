# Pre-commit Hook for Automatic Linting & Code Styling

Keeing code convention helps to focus on code changes but tidious job if we do manually. JSCS is well-developed linting and code-style checking tool and we're going to use `git hook` to run this script automatically.

> Git hooks are scripts that run automatically every time a particular event occurs in a Git repository.
>
> They let you customize Git’s internal behavior and trigger customizable actions at key points in the development life cycle.

— [Atlassian Git tutorial](https://www.atlassian.com/git/tutorials/git-hooks)

## JSCS

First of all, install [jscs module](https://www.npmjs.com/package/jscs) globally. You can use the packaged jscs module for testing, but you may need it run in the pre-commit hook.

```shell
npm install -g jscs
```

The code convention is configured in .jscsc file in this repo.

You can test like below. `public/js/p3/widget/ProteinFamiliesContainer.js` will pass.

```shell
$ jscs public/js/p3/widget/ProteinFamiliesContainer.js

# or if you don't want to install global space
./node_modules/.bin/jscs public/js/p3/widget/ProteinFamiliesContainer.js
```

If the file has a problem, you will see the issue like below,

```shell
$ jscs public/js/p3/widget/CopyTooltipDialog.js
disallowSpacesInFunctionExpression: Illegal space before opening round brace at public/js/p3/widget/CopyTooltipDialog.js :
    49 |    if (obj){
    50 |     var keys = new Set(Object.keys(obj));
    51 |     keys.forEach(function (key){
----------------------------------^
    52 |      key_set.add(key);
    53 |     });

validateIndentation: Expected indentation of 5 characters at public/js/p3/widget/CopyTooltipDialog.js :
    71 |   // for each selected item, push its data to the result array
    72 |   clean_selection.forEach(function(obj){
    73 |    var io = [];
--------^
    74 |
    75 |    key_set.forEach(function(key){
...
```

jscs can fix automatically. add `--fix` option. It may not fix identation issue correctly, so you may need to do manually (space to tab), but fixes most of them.

```shell
$ jscs --fix public/js/p3/widget/CopyTooltipDialog.js

$ git diff public/js/p3/widget/CopyTooltipDialog.js
diff --git a/public/js/p3/widget/CopyTooltipDialog.js b/public/js/p3/widget/CopyTooltipDialog.js
index c36347ac..e2a60052 100644
--- a/public/js/p3/widget/CopyTooltipDialog.js
+++ b/public/js/p3/widget/CopyTooltipDialog.js
@@ -48,7 +48,7 @@ define([
                        selection.forEach(function(obj){
                                if (obj){
                                        var keys = new Set(Object.keys(obj));
-                                       keys.forEach(function (key){
+                                       keys.forEach(function(key){
                                                key_set.add(key);
                                        });
                                        clean_selection.push(obj);
@@ -70,21 +70,21 @@ define([

                        // for each selected item, push its data to the result array
                        clean_selection.forEach(function(obj){
-                               var io = [];
-
-                               key_set.forEach(function(key){
-                                       // decide if we should include this column
-                                       if (!selectedOnly || (selectedOnly && shownCols.includes(key))){
-                                               // push it to the array
-                                               if (obj[key] instanceof Array){
-                                                       io.push(obj[key].join(";"));
-                                               } else {
-                                                       io.push(obj[key]);
+                                       var io = [];
+
+                                       key_set.forEach(function(key){
+                                               // decide if we should include this column
+                                               if (!selectedOnly || (selectedOnly && shownCols.includes(key))){
+                                                       // push it to the array
+                                                       if (obj[key] instanceof Array){
+                                                               io.push(obj[key].join(";"));
+                                                       } else {
+                                                               io.push(obj[key]);
+                                                       }
                                                }
-                                       }
-                               });
+                                       });

-                               out.push(io.join("\t"));
+                                       out.push(io.join("\t"));
                });
                        return out.join("\n");
```



## Pre-commit hook

1. create a hook file in `.git/hooks/pre-commit`

```shell
#!/bin/sh

files=$(git diff --cached --name-only --diff-filter=ACM | grep -v "public/js/release/" | grep "\.js$")
if [ "$files" = "" ]; then
    exit 0
fi

pass=true

if ! type "jscs" >/dev/null 2>&1; then
    echo "\nUnable to check for Javascript code style errors\n"
    echo "JSCS is not installed, install jscs globally using `npm install jscs -g`"
    echo "You can bypass this hook with the --no-verify (-n) option"
    exit 1
fi

echo "Checking for JS code style errors:\n"

for file in ${files}; do
    result=$(jscs ${file} | grep 'code style error.* found')
    if [ "$result" == "" ]; then
        echo "\t Passed: ${file}"
    else
        echo "\t Failed: ${file}"
        pass=false
    fi
done


if ! $pass; then
    echo "\n JSCS Failed Your commit contains files that should pass JSCS. Please fix the errors and try again.\n"
    exit 1
else
    echo "\n JSCS Passed\n"
fi
```

2. make the hook file excutable

```shell
$ chmod +x pre-commit
```

3. Done. Try it

```shell
$ git commit public/js/p3/widget/GridContainer.js
Checking for JS code style errors:

	 Failed: public/js/p3/widget/GridContainer.js

 JSCS Failed Your commit contains files that should pass JSCS. Please fix the errors and try again.
```

4. If you have to bypass this check for specific reason, you still have an option to. add `--no-verify` option.

```shell
$ git commit --no-verify
```

