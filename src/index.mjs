import * as prettier from "prettier";
import { builders } from "prettier/doc";
import { parsers as htmlParsers } from "prettier/plugins/html";

const { concat, literalline } = builders;

const knockoutSyntax = /<!--\s*\/?ko\b|\bdata-bind\s*=/i;
const dataBindAttribute = /(\bdata-bind\s*=\s*)(["'])([\s\S]*?)\2/gi;

function normalizeBinding(binding) {
    let result = "";
    let quote;
    let braceDepth = 0;

    for (let index = 0; index < binding.length; index += 1) {
        const character = binding[index];

        if (quote) {
            result += character;
            if (character === quote && binding[index - 1] !== "\\") {
                quote = undefined;
            }
            continue;
        }

        if (character === '"' || character === "'") {
            quote = character;
            result += character;
            continue;
        }

        if (character === "{") {
            braceDepth += 1;
            result = result.trimEnd() + "{";
            while (
                index + 1 < binding.length &&
                /\s/.test(binding[index + 1])
            ) {
                index += 1;
            }
            if (binding[index + 1] !== "}") {
                result += " ";
            }
            continue;
        }

        if (character === "}") {
            result = result.trimEnd();
            if (braceDepth > 0 && !result.endsWith("{")) {
                result += " ";
            }
            braceDepth = Math.max(0, braceDepth - 1);
            result += character;
            continue;
        }

        if (
            character === ":" &&
            (braceDepth > 0 || binding[index + 1] === "{")
        ) {
            result += character;
            while (
                index + 1 < binding.length &&
                /\s/.test(binding[index + 1])
            ) {
                index += 1;
            }
            if (
                binding[index + 1] !== "}" &&
                binding[index + 1] !== undefined
            ) {
                result += " ";
            }
            continue;
        }

        result += character;
    }

    return result;
}

function preprocess(text) {
    if (!knockoutSyntax.test(text)) {
        return text;
    }

    const normalized = text.replace(
        dataBindAttribute,
        (_, prefix, quote, binding) => {
            return `${prefix}${quote}${normalizeBinding(binding)}${quote}`;
        },
    );

    return normalized;
}

function indentKnockoutContainers(text) {
    let depth = 0;

    return text
        .split("\n")
        .map((line) => {
            const trimmedLine = line.trim();
            const isOpening = /^<!--\s*ko\b/.test(trimmedLine);
            const isClosing = /^<!--\s*\/ko\s*-->$/.test(trimmedLine);

            if (isClosing) {
                depth = Math.max(0, depth - 1);
            }

            const formattedLine = trimmedLine
                ? isOpening || isClosing
                    ? `${"    ".repeat(depth)}${trimmedLine}`
                    : `${"    ".repeat(depth)}${line}`
                : "";

            if (isOpening) {
                depth += 1;
            }

            return formattedLine;
        })
        .join("\n");
}

async function parse(text, options) {
    const normalized = preprocess(text);
    const html = await prettier.format(normalized, {
        ...options,
        parser: "html",
        plugins: [],
    });

    options.printWidth = Number.MAX_SAFE_INTEGER;

    return {
        formatted: knockoutSyntax.test(text)
            ? indentKnockoutContainers(html)
            : html,
    };
}

export const parsers = {
    knockout: {
        ...htmlParsers.html,
        parse,
        astFormat: "knockout",
        locStart: () => 0,
        locEnd: (node) => node.formatted.length,
    },
};

export const printers = {
    knockout: {
        print(path) {
            return concat(
                path.node.formatted
                    .split("\n")
                    .flatMap((line, index) =>
                        index === 0 ? [line] : [literalline, line],
                    ),
            );
        },
    },
};
