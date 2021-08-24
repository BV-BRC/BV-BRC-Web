# BV-BRC WebApp

## Requirements

Nodejs (12.x LTS).


## Installation

```
git clone --recursive  https://github.com/BV-BRC/website.git
cd website
npm install
cp p3-web.conf.sample p3-web.conf  (and edit as necessary)
```

If you cloned without --recursive flag,
```
cd website
npm install
git submodule update --init
// Note: git submodule fetches a module in node_modules directory. So npm install first!
```

## Running

```
npm start
```

Note: if any configuration changes are made (i.e., changes to `./p3-web.conf`), then `./bin/p3-web` must be restarted.


## Contributing

Please refer [this doc](CONTRIBUTING.md) for contribution.
