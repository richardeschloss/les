/* eslint-disable no-undef */
module.exports = {
  env: {
    node: true,
    browser: true,
    es2020: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module'
  },
  rules: {
    'arrow-parens': ['error', 'always'],
    'semi': ['error', 'never'],
    'quotes': ['error', 'single'],
    'comma-dangle': ['error', 'never'],
    'prefer-const': ['error'],
    'no-var': ['error']
  }
  // ,
  // globals: {
  //   process: true
  // }
}
