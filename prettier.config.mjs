/**
 * @see https://prettier.io/docs/en/configuration.html
 * @type {import("prettier").Config}
 */
const config = {
    plugins: ["./src/index.mjs"],
    overrides: [
        {
            files: "*.html",
            options: {
                parser: "knockout",
            },
        },
    ],
};

export default config;
