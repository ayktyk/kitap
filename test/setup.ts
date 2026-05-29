// Vitest global setup.
// fake-indexeddb/auto installs an in-memory IndexedDB onto the global scope so
// the libraryService data layer can be tested without a real browser.
import 'fake-indexeddb/auto';

// jsdom does not implement object URLs (URL.createObjectURL throws
// "Not implemented"). Provide deterministic stubs so cover-blob handling is
// testable and so we can assert on revoke behaviour.
let __objectUrlSeq = 0;
URL.createObjectURL = (() => `blob:mock/${++__objectUrlSeq}`) as typeof URL.createObjectURL;
URL.revokeObjectURL = (() => {}) as typeof URL.revokeObjectURL;
