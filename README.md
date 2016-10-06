# PATRIC 3 WebApp <sup>(Beta)</sup>


## Requirements

node   (5.0+)

redis  (3.2+) http://redis.io/


## Installation

```
git clone --recursive  https://github.com/PATRIC3/p3_web.git
cd p3_web
npm install
cp p3-web.conf.sample p3-web.conf  (and edit as necessary) 
```

## Authentication config for development

In `./p3-web.conf`, place a token and user id/name as follows:
  
``` json
{
    "devAuthorizationToken": "token",
    "devUser": {
        "id":"user@patricbrc.org", 
        "name": "user name"
    }
}
```

Note: authentication is stored as a session cookie.  You can clear it via your browser devtools if needed.

## Running

```
redis-server
./bin/p3-web
```

Note: if any configuration changes are made (i.e., changes to `./p3-web.conf`), then `./bin/p3-web` must be restarted.  
 

## Contributing

Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -m 'Add some feature`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

## Builds

Although a build a is not explicitly required to make a PR, it's a good idea to ensure your code will build.

Before creating a build, make sure you fork is up to date with master of `PATRIC3/p3_web`:

```
// if needed, create an 'upstream' remote with 'git remote add upstream https://github.com/PATRIC3/p3_web/'
git fetch upstream
git submodule update --init
git merge upstream/master 
```

The following will create a build in `./public/js/release`.  

```
./buildCLient.sh
```

**Note**: jBrowse is currently causing some havoc in builds.  You can 'fix' this by commiting out `xstyle/load-css` in `./public/js/JBrowse/main.js`.

#### Committing builds

Increment the `version` in `./package.json`, following the semantic versioning specification, and commit the new build:

```
edit ./package.json   // increment "version"
git add --all
git commit -m 'release js'
git push
```

Note: `version` is where the build is deployed and what is displayed in the UI.

