#!/usr/bin/env node

var execFileSync = require('child_process').execFileSync,
  path = require('path'),
  fs = require('fs');

function isHidden( pathname ) {
  return (/(^|\/)\.[^\/\.]/g).test(pathname);
}

function execGit() {
  try {
    execFileSync.apply(this, ['git'].concat(Array.prototype.slice.call(arguments)));
  } catch ( err ) {
    if (err.status === 0) {
      return false;
    }

    if (err.status === 1) {
      return true;
    }

    throw err;
  }
}

function isWorkingTreeClean() {
  execGit(['update-index', '-q', '--ignore-submodules', '--refresh']);
  if (execGit(['diff-files', '--quiet', '--ignore-submodules', '--'])) {
    throw new Error('You have unstaged changes. Aborting conversion.');
  }
  if (execGit(['diff-index', '--cached', '--quiet', 'HEAD', '--ignore-submodules', '--'])) {
    throw new Error('Your index contains uncommitted changes. Aborting conversion.');
  }

  return true;
}

function insideWorkingTree( pathname ) {
  var dirname = fs.lstatSync(pathname).isFile() ? path.dirname(pathname) : pathname;

  return !!execFileSync('git', ['rev-parse',  '--is-inside-work-tree'], {
    cwd: dirname
  });
}

function isIgnored( pathname ) {
  try {
    return !!execFileSync('git', ['check-ignore', pathname]);
  } catch ( err ) {
    if (err.status === 1) {
      return false;
    }

    if (err.status === 0) {
      return true;
    }

    throw err;
  }
}

function convertToDashes ( name ) {
  return name.replace(/[a-z]([A-Z])+/g, function( m ) {
    return m[0] + '-' + m.substring(1);
  }).replace('_', '-').toLowerCase();
}

var matchModules = /(QUnit\.module|require)\(['"]([^'"]+)['"](?:, ['"]([^'"]+)['"])?\);?/g;

function convertRequire ( contents ) {
  return contents.replace(matchModules, function( match, fnName, moduleName ) {
    return match.replace(moduleName, convertToDashes(moduleName));
  });
}

function convertPath ( source ) {
  var basename = convertToDashes(path.basename(source)),
    dirname = path.dirname(source);

  var destination = path.join(dirname, basename);

  if (source !== destination) {

    execFileSync('mv', [source, destination]);

    return destination;
  }

  return source;
}

function walkRecursive ( pathname, fn ) {
  if (!isHidden(pathname) && !isIgnored(pathname) && insideWorkingTree(pathname)) {
    pathname = convertPath(pathname);

    var stat = fs.lstatSync(pathname);

    if (stat.isFile()) {
      return fn(pathname);
    }

    if (stat.isDirectory()) {
      var sources = fs.readdirSync(pathname);

      sources.forEach(function( basename ) {
        walkRecursive(path.join(pathname, basename), fn);
      });
    }
  }
}

if (insideWorkingTree(process.cwd()) && isWorkingTreeClean()) {
  walkRecursive(process.cwd(), function( pathname ) {
    var contents = fs.readFileSync(pathname, {
      encoding: 'utf-8'
    });

    fs.writeFileSync(pathname, convertRequire(contents));
  });
}