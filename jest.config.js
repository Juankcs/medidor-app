/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  collectCoverageFrom: ['src/domain/**/*.ts', 'src/services/**/*.ts'],
  coverageReporters: ['text', 'html', 'json-summary'],
  // La lógica de negocio: dominio y servicios. Bajar el umbral rompe `npm run check`.
  coverageThreshold: {
    global: { lines: 80, functions: 80, branches: 80, statements: 80 },
  },
};
