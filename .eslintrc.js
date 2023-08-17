module.exports = {
  env: {
    es6: true,
    node: true,
    browser: true,
    commonjs: true,
  },
  parser: '@babel/eslint-parser',
  extends: [
    'airbnb',
    // 'prettier/react',
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
  ],
  ignorePatterns: ['version.js', 'App-test.js', '**/common/toast.js'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
    'no-unused-vars': 'warn',
    'react/jsx-props-no-spreading': 'off',
    'no-use-before-define': 'off',
    'react/jsx-filename-extension': [
      'error',
      {
        extensions: ['.js', 'jsx'],
        // jsx 코드가 가능한 확장자명
      },
    ],
    'react/react-in-jsx-scope': 'off',
    // airbnb 형식에서 변경하여 덮어쓸 규칙 설정
    'import/no-named-as-default': 0,
    'import/no-named-as-default-member': 0,
    'no-console': 'off',
    'no-shadow': 'off',
    'import/order': 'off',
    'import/no-unresolved': [
      2,
      {
        ignore: ['@env'],
      },
    ],
    'consistent-return': 'off',
    'no-underscore-dangle': 'off',
    'class-methods-use-this': 'off',
    'no-await-in-loop': 'off',
    'react/prop-types': 'off',
    'no-restricted-syntax': 'off',
    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
    'no-param-reassign': 'off',
    'prefer-destructuring': ['error', { object: false, array: false }],
    'react/display-name': 'off',
  },
}
