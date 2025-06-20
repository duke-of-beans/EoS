/**
 * Purpose: Registers and retrieves modular components/plugins for Eye of Sauron
 * Dependencies: Node.js standard library
 * Public API:
 *   - registerComponent(name: string, instance: object) → void
 *   - getComponent(name: string) → object|null
 *   - listComponents() → string[]
 *   - unregisterComponent(name: string) → boolean
 */

export class ComponentMarketplace {
  constructor() {
    this.#registry = new Map();
  }

  // Private registry to store components
  #registry;

  /**
   * Registers a component with the marketplace
   * @param {string} name - Unique name for the component
   * @param {object} instance - Component instance to register
   * @throws {Error} If component with same name already exists
   */
  registerComponent(name, instance) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error('Component name must be a non-empty string');
    }

    if (!instance || typeof instance !== 'object') {
      throw new Error('Component instance must be an object');
    }

    if (this.#registry.has(name)) {
      throw new Error(`Component "${name}" is already registered`);
    }

    this.#registry.set(name, instance);
  }

  /**
   * Retrieves a component by name
   * @param {string} name - Name of the component to retrieve
   * @returns {object|null} Component instance or null if not found
   */
  getComponent(name) {
    if (typeof name !== 'string') {
      return null;
    }

    return this.#registry.get(name) || null;
  }

  /**
   * Lists all registered component names
   * @returns {string[]} Array of registered component names
   */
  listComponents() {
    return Array.from(this.#registry.keys());
  }

  /**
   * Unregisters a component from the marketplace
   * @param {string} name - Name of the component to unregister
   * @returns {boolean} True if component was unregistered, false if not found
   */
  unregisterComponent(name) {
    if (typeof name !== 'string') {
      return false;
    }

    return this.#registry.delete(name);
  }
}

// Example usage (commented out for production):
/*
const marketplace = new ComponentMarketplace();

// Register components
marketplace.registerComponent('CharacterForensics', new CharacterForensics());
marketplace.registerComponent('PatternPrecognition', new PatternPrecognition());

// Retrieve component
const forensics = marketplace.getComponent('CharacterForensics');

// List all components
console.log(marketplace.listComponents()); // ['CharacterForensics', 'PatternPrecognition']

// Unregister a component
marketplace.unregisterComponent('CharacterForensics'); // returns true
marketplace.unregisterComponent('NonExistent'); // returns false
*/