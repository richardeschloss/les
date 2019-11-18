module.exports = {
  env: {
    es6: true,
    node: true
  },
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  extends: ['eslint:recommended', 'prettier', 'plugin:prettier/recommended'],
  plugins: ['prettier'],
  rules: {
    'comma-dangle': ['error', 'never'],
    'prefer-const': ['error'],
    'no-var': ['error']
  }
}
