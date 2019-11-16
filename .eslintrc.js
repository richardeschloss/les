module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    parser: 'babel-eslint',
  },
  extends: ['eslint:recommended', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    'comma-dangle': ['error', 'never'],
    'prefer-const': ['error'],
    'no-var': ['error'],
  },
}
