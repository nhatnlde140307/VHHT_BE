module.exports = {
  roots: ['<rootDir>/__tests__'],  
  testEnvironment: 'node',  
  moduleFileExtensions: ['js', 'json', 'node'],  
  moduleNameMapper: {
    '^../socket\\.js$': '<rootDir>/__mocks__/socket.js',
  },
};