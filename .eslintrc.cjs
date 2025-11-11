module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    // 放宽规则以适应快速原型开发
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'no-console': 'off',
    'no-debugger': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    // 运行期需要 eval（JS 脚本执行器），仅警告
    'no-eval': 'warn'
  }
}
