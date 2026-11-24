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

function getKnockoutLineDepth(line, depth) {
    const markers = [...line.matchAll(/<!--\s*(\/?)ko\b[\s\S]*?-->/g)];
    const hasLeadingClosingMarker =
        markers[0]?.[1] && markers[0].index === 0;
    const lineDepth = hasLeadingClosingMarker
        ? Math.max(depth - 1, 0)
        : depth;

    if (hasLeadingClosingMarker) {
        depth = lineDepth;
    }

    for (
        let index = hasLeadingClosingMarker ? 1 : 0;
        index < markers.length;
        index += 1
    ) {
        depth = markers[index][1] ? Math.max(depth - 1, 0) : depth + 1;
    }

    return { lineDepth, nextDepth: depth };
}

function indentKnockoutContainers(text, tabWidth) {
    let depth = 0;

    return text
        .split("\n")
        .map((line) => {
            const trimmedLine = line.trim();
            const { lineDepth, nextDepth } = getKnockoutLineDepth(
                trimmedLine,
                depth,
            );

            const formattedLine = trimmedLine
                ? `${" ".repeat(tabWidth * lineDepth)}${line}`
                : "";
            depth = nextDepth;

            return formattedLine;
        })
        .join("\n");
}

function removeKnockoutContainerIndentation(text, tabWidth) {
    let depth = 0;

    return text
        .split("\n")
        .map((line) => {
            const trimmedLine = line.trim();
            const { lineDepth, nextDepth } = getKnockoutLineDepth(
                trimmedLine,
                depth,
            );

            const indentation = Math.min(
                line.length - line.trimStart().length,
                tabWidth * lineDepth,
            );
            const formattedLine = line.slice(indentation);
            depth = nextDepth;

            return formattedLine;
        })
        .join("\n");
}

async function parse(text, options) {
    const tabWidth = options.tabWidth ?? 2;
    const normalized = preprocess(
        knockoutSyntax.test(text)
            ? removeKnockoutContainerIndentation(text, tabWidth)
            : text,
    );
    const html = await prettier.format(normalized, {
        ...options,
        parser: "html",
        plugins: [],
    });

    options.printWidth = Number.MAX_SAFE_INTEGER;

    return {
        formatted: knockoutSyntax.test(text)
            ? indentKnockoutContainers(html, tabWidth)
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
