import { PatternPrecognition } from './core/PatternPrecognition.js';

console.log('Debugging PatternPrecognition...');

const scanner = new PatternPrecognition();
console.log('All methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(scanner)));
console.log('detect method type:', typeof scanner.detect);
console.log('analyze method type:', typeof scanner.analyze);