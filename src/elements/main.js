/**
 * Custom elements let you add JavaScript to specific HTML elements.
 *
 * Create your custom element in `src/elements` and use the `@element` snippet to get started.
 *
 * @example <new-element></new-element> → `src/elements/new-element.js`
 * @url https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define#valid_custom_element_names
 */

import.meta.glob(['@/**/elements/*.{js,ts}'], { eager: true });
