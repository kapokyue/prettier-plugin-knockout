import { describe, expect, it } from "vitest";
import * as prettier from "prettier";
import * as knockoutPlugin from "../src/index.mjs";

async function format(source, options = {}) {
    return prettier.format(source, {
        parser: "knockout",
        plugins: [knockoutPlugin],
        printWidth: 120,
        ...options,
    });
}

describe("Knockout Prettier plugin", () => {
    it("exports the knockout parser metadata", () => {
        expect(knockoutPlugin.parsers.knockout).toBeDefined();
        expect(knockoutPlugin.parsers.knockout.astFormat).toBe("knockout");
        expect(knockoutPlugin.parsers.knockout.parse).toBeTypeOf("function");
        expect(knockoutPlugin.parsers.knockout.locStart).toBeTypeOf("function");
        expect(knockoutPlugin.parsers.knockout.locEnd).toBeTypeOf("function");
    });

    it("formats ordinary HTML through the HTML parser", async () => {
        const result = await format("<div><span>Hello</span></div>");

        expect(result).toBe("<div><span>Hello</span></div>\n");
    });

    it("recognizes data-bind attributes case-insensitively", async () => {
        const result = await format(
            '<button DATA-BIND="text: label">Click</button>',
        );

        expect(result).toContain('DATA-BIND="text: label"');
        expect(result).toContain("<button");
        expect(result).toContain("</button>");
    });

    it("normalizes whitespace inside object bindings", async () => {
        const result = await format(
            '<div data-bind="attr: {title:title, class:cssClass}"></div>',
        );

        expect(result).toContain(
            'data-bind="attr:{ title: title, class: cssClass }"',
        );
    });

    it("normalizes nested object bindings", async () => {
        const result = await format(
            '<div data-bind="config:{user:{name:name, role:role}}"></div>',
        );

        expect(result).toContain(
            'data-bind="config:{ user:{ name: name, role: role } }"',
        );
    });

    it("preserves empty objects without adding inner spaces", async () => {
        const result = await format(
            '<div data-bind="options: {}, attr: {title:title}"></div>',
        );

        expect(result).toContain(
            'data-bind="options:{}, attr:{ title: title }"',
        );
    });

    it("preserves colons and braces inside quoted values", async () => {
        const result = await format(
            '<div data-bind="text: \'value: {unchanged}\', click: handler"></div>',
        );

        expect(result).toContain(
            `data-bind="text: 'value: {unchanged}', click: handler"`,
        );
    });

    it("formats multiple data-bind attributes independently", async () => {
        const result = await format(`
            <div
                data-bind="attr: {title:title}"
                data-bind-extra="value"
                data-bind="visible:{isVisible:true}"
            ></div>
        `);

        expect(result).toContain('attr:{ title: title }');
        expect(result).toContain('visible:{ isVisible: true }');
        expect(result).toContain('data-bind-extra="value"');
    });

    it("indents content inside a Knockout container", async () => {
        const result = await format(`
            <!-- ko if: visible -->
            <div>Content</div>
            <!-- /ko -->
        `);

        const lines = result.trimEnd().split("\n");

        expect(lines).toEqual([
            "<!-- ko if: visible -->",
            "    <div>Content</div>",
            "<!-- /ko -->",
        ]);
    });

    it("indents nested Knockout containers according to their depth", async () => {
        const result = await format(`
            <!-- ko if: outer -->
            <section>
                <!-- ko foreach: items -->
                <span data-bind="text: name"></span>
                <!-- /ko -->
            </section>
            <!-- /ko -->
        `);

        const lines = result.trimEnd().split("\n");

        expect(lines).toEqual([
            "<!-- ko if: outer -->",
            "    <section>",
            "    <!-- ko foreach: items -->",
            '          <span data-bind="text: name"></span>',
            "    <!-- /ko -->",
            "    </section>",
            "<!-- /ko -->",
        ]);
    });

    it("does not indent ordinary HTML comments as containers", async () => {
        const result = await format(`
            <!-- regular comment -->
            <div>Content</div>
        `);

        expect(result).toContain("<!-- regular comment -->");
        expect(result).toContain("<div>Content</div>");
        expect(result).not.toContain("    <div>Content</div>");
    });

    it("does not treat knockout-like words as container comments", async () => {
        const result = await format(`
            <!-- knockout comment -->
            <div>Content</div>
        `);

        expect(result).toContain("<!-- knockout comment -->");
        expect(result).toContain("<div>Content</div>");
        expect(result).not.toContain("    <div>Content</div>");
    });

    it("does not reduce indentation below zero for unmatched closing comments", async () => {
        const result = await format(`
            <!-- /ko -->
            <div>Content</div>
        `);

        expect(result.trimEnd().split("\n")).toEqual([
            "<!-- /ko -->",
            "<div>Content</div>",
        ]);
    });

    it("preserves the final newline produced by Prettier", async () => {
        const result = await format('<div data-bind="text: value"></div>');

        expect(result.endsWith("\n")).toBe(true);
    });
});
