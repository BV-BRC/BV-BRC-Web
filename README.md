# PATRIC 3 WebApp


## Requirements

node   (6.x LTS) https://nodejs.org or 

```
// macOS
brew install node@6

// centos
curl --silent --location https://rpm.nodesource.com/setup_6.x | bash -
yum -y install nodejs
```

redis  (3.2+) http://redis.io/ or
```
brew install redis
```


## Installation

```
git clone --recursive  https://github.com/PATRIC3/p3_web.git
cd p3_web
npm install
cp p3-web.conf.sample p3-web.conf  (and edit as necessary)
```

If you cloned without --recursive flag,
```
cd p3_web
npm install
git submodule update --init
// Note: git submodule fetches a module in node_modules directory. So npm install first!
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
redis-server &
npm start 
```

Note: if any configuration changes are made (i.e., changes to `./p3-web.conf`), then `./bin/p3-web` must be restarted.  


## Contributing

Please refer [this doc](CONTRIBUTING.md) for contribution.
