module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-native-url-polyfill/auto$': '<rootDir>/jest.setup.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
