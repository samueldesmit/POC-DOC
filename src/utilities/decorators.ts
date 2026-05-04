export function customElement(name: string) {
    return function (target: CustomElementConstructor) {
        if (!customElements.get(name)) {
            customElements.define(name, target);
        }
    };
}
