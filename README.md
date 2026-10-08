# prettier-plugin-knockout

A [Prettier](https://prettier.io/) plugin for formatting HTML templates that use [Knockout.js](https://knockoutjs.com/) bindings and virtual elements.

## Features

- Formats `data-bind` attributes with Prettier's HTML parser.
- Normalizes object-style binding expressions.
- Preserves quoted JavaScript values inside bindings.
- Indents Knockout virtual-element containers such as `<!-- ko if: ... -->` and `<!-- /ko -->`.
- Supports nested Knockout containers.

## Requirements

- Node.js
- Prettier 3 or later

## Installation

```sh
npm install --save-dev prettier prettier-plugin-knockout
```

## Usage

### Prettier configuration

Add the plugin to your Prettier configuration:

```json
{
    "plugins": ["prettier-plugin-knockout"],
    "parser": "knockout"
}
```

The `knockout` parser can be selected per file, directory, or command:

```sh
npx prettier --plugin=prettier-plugin-knockout --parser=knockout --write "templates/**/*.html"
```

### Example

Input:

```html
<!-- ko if: visible --><div data-bind="attr:{title:title}, text:message"></div><!-- /ko -->
```

Output:

```html
<!-- ko if: visible -->
    <div data-bind="attr:{ title: title }, text:message"></div>
<!-- /ko -->
```

Knockout bindings remain JavaScript expressions; the plugin only applies lightweight whitespace normalization and delegates HTML formatting to Prettier.

## Supported syntax

Virtual-element comments are recognized when they use the `ko` marker:

```html
<!-- ko if: isVisible -->
<div data-bind="text: name"></div>
<!-- /ko -->
```

Nested containers are supported:

```html
<!-- ko foreach: items -->
<!-- ko if: isVisible -->
<span data-bind="text: name"></span>
<!-- /ko -->
<!-- /ko -->
```

`data-bind` attributes may contain object expressions:

```html
<div data-bind="attr: { title: title, class: cssClass }"></div>
```

## Development

Install dependencies:

```sh
npm install
```

Run the test suite:

```sh
npm test
```

Tests are located in [`test/index.test.mjs`](test/index.test.mjs).


To test a specific file, run:

```sh
prettier --plugin ./src/index.mjs --parser knockout <path>
```

## License

[MIT](LICENSE)
