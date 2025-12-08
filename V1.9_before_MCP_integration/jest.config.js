const nextJest = require('next/jest');

const createJestConfig = nextJest({
    dir: './',
});

const customJestConfig = {
    coverageProvider: 'v8',
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
    testMatch: [
        '**/__tests__/**/*.test.[jt]s?(x)',
        '**/?(*.)+(spec|test).[jt]s?(x)',
    ],
};

module.exports = createJestConfig(customJestConfig);
