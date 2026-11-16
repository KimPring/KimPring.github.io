import { features } from '../features/index.js';
import { symbols } from './symbols.js';

/** All migrated modules share one explicit context. No eval or dynamic script injection. */
export function createRuntime(target = window) {
  const context = Object.create(null);
  for (const name of symbols) {
    const descriptor = Object.getOwnPropertyDescriptor(target, name);
    if (descriptor && !descriptor.configurable) throw new Error(`Compatibility export conflicts with browser property: ${name}`);
    if (descriptor) context[name] = target[name];
    Object.defineProperty(target, name, {
      configurable: true,
      get: () => context[name],
      set: value => { context[name] = value; }
    });
  }
  // Function declarations in the original script were all hoisted, including later overrides.
  // Register every function first, then execute initializers in the original order.
  for (const feature of features) feature.register(context);
  for (const feature of features) feature.initialize(context);
  return context;
}
