/**
 * Global functions loaded on every page, for use in custom elements.
 *
 * Please avoid changes unless absolutely necessary! This file is part of the starter. Add your own functions to `utils/` instead.
 */

/**
 * Get target elements of a custom element.
 *
 * @param {HTMLElement} element
 * @returns {Record<string, HTMLElement[]>}
 * @example <div data-target="example-element.item"></div>
 * @example
 * const {
 *    item: items, // Array of items
 *    item: [item] = [] // Single item or undefined
 * } = getTargets(this);
 */
export function getTargets(element) {
    const tagName = element.tagName.toLowerCase();

    return [...element.querySelectorAll(`[data-target^="${tagName}"]`)].reduce(
        (acc, target) => {
            const key = target.dataset.target.replace(`${tagName}.`, '');

            return {
                ...acc,
                [key]: [...(acc[key] || []), target],
            };
        },
        {},
    );
}

const subscribers = {};

/**
 * Publish an event to communicate between custom elements.
 *
 * @param {string} eventName
 * @param {any} data
 * @returns {void}
 * @example
 * publish('variantUpdate', sections);
 * @example
 * const unsubscribe = subscribe('variantUpdate', (sections) => {
 *    // Update the DOM
 * });
 **/
export function publish(eventName, data) {
    if (subscribers[eventName])
        subscribers[eventName].forEach((callback) => {
            callback(data);
        });
}

/**
 * Subscribe to an event to communicate between custom elements.
 *
 * @param {string} eventName
 * @param {(data: any) => void} callback
 * @returns {() => void} unsubscribe()
 * @example
 * const unsubscribe = subscribe('variantUpdate', (sections) => {
 *    // Update the DOM
 * });
 * @example
 * publish('variantUpdate', sections);
 **/
export function subscribe(eventName, callback) {
    if (subscribers[eventName] === undefined) subscribers[eventName] = [];

    subscribers[eventName] = [...subscribers[eventName], callback];

    return function unsubscribe() {
        subscribers[eventName] = subscribers[eventName].filter(
            (cb) => cb !== callback,
        );
    };
}

/**
 * Delay execution until `wait` milliseconds have passed since the last call.
 *
 * @param {() => void} fn
 * @param {number} wait (ms)
 * @returns {() => void} debounced
 * @url Explanation https://www.codemzy.com/blog/throttle-vs-debounce
 */
export function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * Limit execution to once per `delay` milliseconds.
 *
 * @param {() => void} fn
 * @param {number} delay (ms)
 * @returns {() => void} throttled
 * @url Explanation https://www.codemzy.com/blog/throttle-vs-debounce
 **/
export function throttle(fn, delay) {
    let lastCall = 0;
    return function (...args) {
        const now = new Date().getTime();
        if (now - lastCall < delay) {
            return;
        }
        lastCall = now;
        return fn(...args);
    };
}

/**
 * Promise that resolves when an element is visible in the viewport.
 *
 * @param {HTMLElement} element
 * @param {IntersectionObserverInit} options
 * @returns {Promise<void>}
 * @example
 * visible(this).then(() => {
 *    // Lazy load slider or track event
 * });
 * @example
 * // Trigger 300px before the element enters the viewport
 * visible(this, { rootMargin: '300px' }).then(() => {
 *    // Lazy load slider or track event
 * }
 * @url Source https://github.com/11ty/is-land/blob/43bd04d204b56a377f65d068c93ef35dbd3ddf52/is-land.js#L225
 */
export function visible(element, options = {}) {
    if (!('IntersectionObserver' in window)) return;

    return new Promise((resolve) => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    observer.unobserve(entry.target);
                    resolve();
                }
            },
            {
                threshold: 0.1,
                ...options,
            },
        );

        observer.observe(element);
    });
}

/**
 * Promise that resolves when the page is loaded and idle.
 *
 * @example
 * idle(this).then(() => {
 *    // Prefetch product variants
 * });
 * @url Source https://github.com/11ty/is-land/blob/43bd04d204b56a377f65d068c93ef35dbd3ddf52/is-land.js#L245
 */
export async function idle() {
    const onload = new Promise((resolve) => {
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => resolve(), { once: true });
        } else {
            resolve();
        }
    });

    if (!('requestIdleCallback' in window)) {
        return onload;
    }

    return Promise.all([
        new Promise((resolve) => requestIdleCallback(() => resolve())),
        onload,
    ]);
}

export const trapFocusHandlers = {};

/**
 * Trap focus within a container for screen readers and keyboard users. Only one focus trap can be active at a time.
 *
 * @param {HTMLElement} container
 * @param {HTMLElement|undefined} elementToFocus after trapping focus
 * @deprecated removed in v2.0.0, use `<modal-dialog>` instead
 */
export function trapFocus(container, elementToFocus = container) {
    const focusableElements = [
        ...container.querySelectorAll(
            "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe",
        ),
    ];

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    removeTrapFocus();

    trapFocusHandlers.focusin = (event) => {
        if (
            event.target !== container &&
            event.target !== last &&
            event.target !== first
        )
            return;
        document.addEventListener('keydown', trapFocusHandlers.keydown);
    };

    trapFocusHandlers.focusout = () =>
        document.removeEventListener('keydown', trapFocusHandlers.keydown);

    trapFocusHandlers.keydown = (event) => {
        if (event.code.toUpperCase() !== 'TAB') return;

        // On the last focusable element and tab forward, focus the first element
        if (event.target === last && !event.shiftKey) {
            event.preventDefault();
            first.focus();
        }

        // On the first focusable element and tab backward, focus the last element
        if (
            (event.target === container || event.target === first) &&
            event.shiftKey
        ) {
            event.preventDefault();
            last.focus();
        }
    };

    document.addEventListener('focusout', trapFocusHandlers.focusout);
    document.addEventListener('focusin', trapFocusHandlers.focusin);

    elementToFocus.focus();

    if (
        elementToFocus.tagName === 'INPUT' &&
        ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
        elementToFocus.value
    ) {
        elementToFocus.setSelectionRange(0, elementToFocus.value.length);
    }
}

/**
 * Remove focus trap.
 *
 * @param {HTMLElement|undefined} elementToFocus after removing the trap
 * @deprecated removed in v2.0.0, use `<modal-dialog>` instead
 */
export function removeTrapFocus(elementToFocus) {
    document.removeEventListener('focusin', trapFocusHandlers.focusin);
    document.removeEventListener('focusout', trapFocusHandlers.focusout);
    document.removeEventListener('keydown', trapFocusHandlers.keydown);

    if (elementToFocus) elementToFocus.focus();
}

/**
 *
 * @param {Number} amount
 * @returns String with formated price
 */
export function formatMoney(amount) {
    if (typeof amount !== 'number') {
        return '';
    }

    const price = new Intl.NumberFormat(Shopify.country.toUpperCase(), {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);

    return `${Shopify.moneyWithCurrencyFormat.replace(/{{amount_with_comma_separator}}/g, price)}`;
}

/*
 * @param {*} key
 * @param {*} defaultValue
 * @returns
 */
export function useLocalStorage(key = null, defaultValue = null) {
    let storedValue;

    try {
        storedValue = JSON.parse(
            localStorage.getItem(`STRIX_OWL_NEST::${key}`),
        );
    } catch (e) {
        storedValue = defaultValue;
    }

    let value = storedValue !== null ? storedValue : defaultValue;

    function setItem(newValue) {
        if (!key) {
            return defaultValue;
        }

        value = newValue;
        localStorage.setItem(
            `STRIX_OWL_NEST::${key}`,
            JSON.stringify(newValue),
        );
    }

    function getItem() {
        let storedValue = defaultValue;

        try {
            storedValue =
                JSON.parse(localStorage.getItem(`STRIX_OWL_NEST::${key}`)) ||
                defaultValue;
        } catch (e) {
            storedValue = defaultValue;
        }

        value = storedValue;

        return value;
    }

    return { setItem, getItem, value };
}

export async function getCart() {
    return await fetch(routes.cart_url, {
        method: 'GET',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
        },
    })
        .then((response) => response.json())
        .then((response) => {
            publish('cartUpdate', response);
            publish('modalToggle', {
                id: 'cart-drawer',
                open: true,
            });

            return response;
        });
}

export async function updateCart(updates, sections) {
    return fetch(window.Shopify.routes.root + 'cart/update.js', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            updates: updates,
            sections: sections,
            sections_url: window.location.pathname,
        }),
    })
        .then((response) => {
            return response.json();
        })
        .then((response) => {
            publish('cartUpdate', response);
            return response;
        });
}
