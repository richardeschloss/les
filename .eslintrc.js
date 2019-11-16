module.exports = {
  env: {
    es6: true,
    node: true
  },
  parserOptions: {
    sourceType: 'module',
    parser: 'babel-eslint'
  },
  extends: [
    'prettier',
    'plugin:prettier/recommended'
  ],
  plugins: ['prettier'],
  rules: {
    "comma-dangle": ["error", "never"],
    "prefer-const": ["error"],
    "no-var": ["error"]
  }
}
