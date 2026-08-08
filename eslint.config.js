import js from "@eslint/js";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },

  js.configs.recommended,

  {
    rules: {
      // Les globals Foundry (game, canvas, CONST, Hooks, ...) et vitest ne sont
      // pas déclarés : on désactive no-undef plutôt que de les énumérer.
      "no-undef": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_*",
          varsIgnorePattern: "^_*",
          caughtErrorsIgnorePattern: "^_*",
        },
      ],
      "no-prototype-builtins": "off",
      indent: ["error", 2, { ignoredNodes: ["TemplateLiteral *"] }],
      quotes: ["error", "double", { allowTemplateLiterals: true }],
      semi: ["error", "always"],
    },
  },
];
