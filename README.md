# Kebab Converter

Automatically convert convert file names and require calls to use kebab casing for an entire project.

This is essentially a one time migration tool to bulk update repos who's module names container uppercase characters.

This tool will only run on clean git repos, and respects .gitignore.

## Installation

Install `kebab-converter` using [npm](https://www.npmjs.com/):

```bash
npm install kebab-converter -g
```

## Usage

CD a clean git repo

```bash
kebab-converter
```
