# The BV-BRC Web Application


## System Requirements

Node.js is required to run the application. The latest LTS or Current stable build will both work. Make sure `NPM` is also installed alongside `Node.js` (Should be by default).

[Node.js Downloads](https://nodejs.org/en/download/) for Windows, MacOS, and Linux

If using **MacOS** it may be easier to install via [Homebrew](https://brew.sh/)
```
brew install node
```

## First Steps
Clone or Fork & Clone the [BV-BRC-Web](https://github.com/BV-BRC/BV-BRC-Web) repository to your local machine.

### Git
```
git clone https://github.com/BV-BRC/BV-BRC-Web.git
cd BV-BRC-Web
npm install
```

**Or**

### GitHub CLI:
```
gh repo clone BV-BRC/BV-BRC-Web
cd BV-BRC-Web
npm install
```

**Note:** After you run `npm install` you must run `git submodule update --init` as this fetches modules in the node_modules directory.

Make sure you must `npm install` in the BV-BRC-Web directory first though!

## Running the web application
Run from inside the directory:
```
npm start
```

Your local dev environment will run on ```http://localhost:3000/``` and you can access it here.

There is a file called `p3-web.conf` that is used for initial setup and config. The `p3-web.conf.sample` file that is included comes blank.

Please: `cp p3-web.conf.sample p3-web.conf` and edit as necessary. You may need to get the correct info from a team member so feel reach to reach out.

Note: if any configuration changes are made (i.e., changes to `./p3-web.conf`), then `./bin/p3-web` must be restarted for the effects to take place within the local dev application.

## Contributing
If you'd like to contribute please follow our [CONTRIBUTING.md]() guide for more information (coming soon).
