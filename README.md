# BV-BRC Web Application

## Requirements

Node.js is required. We use the latest LTS version which is currently v14.18.0

The current stable build should also work just fine.

[Node.js LTS v14.18.0](https://nodejs.org/)

## Installation

```
git clone --recursive https://github.com/BV-BRC/bvbrc_website.git
cd bvbrc_website
npm install
cp p3-web.conf.sample p3-web.conf  (and edit as necessary)
```

If you cloned without the --recursive flag,
```
cd bvbrc_website
npm install
git submodule update --init
cp p3-web.conf.sample p3-web.conf  (and edit as necessary)
```
Note: `git submodule update --init` fetches a module in the node_modules directory. So you must run `npm install` first!

## Running

```
npm start
```

Your local dev environment will run on ```http://localhost:3000/```

Note: if any configuration changes are made (i.e., changes to `./p3-web.conf`), then `./bin/p3-web` must be restarted.

## Contributing

If you'd like to contribute please refer to [CONTRIBUTING.md](CONTRIBUTING.md) for instructions.
