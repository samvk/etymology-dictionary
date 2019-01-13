module.exports = {
    'env': {
        'browser': true,
        'node': true,
        'es6': true
    },
    'extends': [
        'airbnb-base',
    ],
    'parser': 'babel-eslint',
    'parserOptions': {
        // 'ecmaFeatures': { 'legacyDecorators': true },
        'sourceType': 'module'
    },
    'plugins': [
        'fp',
    ],
    'rules': {
        'indent': [2, 4],
        'object-shorthand': [2, 'methods'],
        'object-curly-newline': [1, { 'consistent': true }],
        'object-curly-spacing': [1],
        'max-len': [0],
        'arrow-parens': [2, 'always'],
        'no-unused-vars': [1, { 'args': 'all', 'argsIgnorePattern': '^_$' }],
        'no-param-reassign': [0],
        'no-plusplus': [0],
        'no-prototype-builtins': [0],
        'semi': [1, 'always'],
        'prefer-const': [1, { destructuring: 'all' }],
        'prefer-object-spread': [1],
        'fp/no-delete': [1],
        'fp/no-loops': [1],
        'quotes': [0],
    },
}
