import { gsap } from 'gsap';
import { parsePhoneNumberFromString } from 'libphonenumber-js/core';
import nlMetadata from '@/utilities/phone-metadata-nl';
import { customElement } from '../utilities/decorators';

interface WineSelection {
    variantId: string;
    title: string;
    price: string;
    image: string;
    quantity: number;
    minQty: number;
    maxQty: number;
    increment: number;
}

interface CustomerData {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    country?: string;
    city?: string;
    address?: string;
    postcode?: string;
    isNewAccount: boolean;
}

interface StoredState {
    wines: Record<string, WineSelection>;
    customer: CustomerData;
    currentStep: number;
    timestamp: number;
}

const STORAGE_KEY = 'wine-subscription-state';
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const WEBHOOK_URL =
    'https://shared-01.n8n.sition.cloud/webhook/1e7e8afe-822a-48b6-9cd9-ada170a2d478';

@customElement('wine-subscription-flow')
export class WineSubscriptionFlow extends HTMLElement {
    private currentStep = 0;
    private wines: Record<string, WineSelection> = {};
    private splideSection: HTMLElement | null = null;
    private splideInstance: any = null;
    private draftOrderTag = 'subscription';
    private loginUrl = '';
    private customerId: string | null = null;
    private initRetryTimer: ReturnType<typeof setTimeout> | null = null;
    private boundListeners: Array<{
        el: EventTarget;
        type: string;
        fn: EventListener;
    }> = [];

    connectedCallback() {
        this.draftOrderTag = (
            this.dataset.draftOrderTag || 'subscription'
        ).slice(0, 40);
        this.loginUrl = this.dataset.loginUrl || '';
        this.customerId = this.dataset.customerId || null;
        this.loadState();

        // Set start index on splide-section before it initializes
        if (this.currentStep > 0) {
            const splideSection = this.querySelector('splide-section');
            splideSection?.setAttribute(
                'data-splide-start',
                String(this.currentStep),
            );
        }

        this.initializeSplide();
    }

    disconnectedCallback() {
        if (this.initRetryTimer) {
            clearTimeout(this.initRetryTimer);
            this.initRetryTimer = null;
        }

        if (this.splideInstance) {
            this.splideInstance.off('move');
        }

        for (const { el, type, fn } of this.boundListeners) {
            el.removeEventListener(type, fn);
        }
        this.boundListeners = [];
    }

    private trackListener(el: EventTarget, type: string, fn: EventListener) {
        el.addEventListener(type, fn);
        this.boundListeners.push({ el, type, fn });
    }

    private initializeSplide() {
        this.splideSection = this.querySelector('splide-section');
        if (!this.splideSection) {
            return;
        }

        // Wait for Splide to initialize
        let retryCount = 0;
        const maxRetries = 50;

        const initSplide = () => {
            this.splideInstance = (this.splideSection as any)?.splide;
            if (this.splideInstance) {
                // Disable omitEnd for fade-based step navigation — it can prevent
                // the slider from reaching the last slide.
                this.splideInstance.options = { omitEnd: false };

                this.setupSplideEvents();
                this.setupNavigation();
                this.setupFilterTabs();
                this.setupQuantityButtons();
                this.setupConfirm();
                this.setupInputValidation();
                this.restoreUIState();
                // Only animate wine cards if starting on step 1
                if (this.currentStep === 0) {
                    this.animateWineCards();
                }
            } else {
                retryCount++;
                if (retryCount < maxRetries) {
                    this.initRetryTimer = setTimeout(initSplide, 50);
                }
            }
        };

        this.initRetryTimer = setTimeout(initSplide, 100);
    }

    private setupSplideEvents() {
        if (!this.splideInstance) return;

        this.splideInstance.on('move', (newIndex: number) => {
            this.currentStep = newIndex;
            this.updateStepIndicators(newIndex);
            this.saveState();

            // Update confirmation when reaching step 3 (index 2)
            if (newIndex === 2) {
                this.updateConfirmation();
            }
        });

        // Setup step circle click navigation
        this.querySelectorAll('[data-step-nav]').forEach((circle) => {
            this.trackListener(circle, 'click', () => {
                const targetStep = parseInt(
                    circle.getAttribute('data-step-nav') || '0',
                );
                if (this.canNavigateToStep(targetStep)) {
                    this.goToStep(targetStep);
                }
            });
        });
    }

    private updateStepIndicators(activeIndex: number) {
        this.querySelectorAll('.step-circle').forEach((circle, i) => {
            circle.classList.toggle('active', i <= activeIndex);
        });

        this.querySelectorAll('.step-line[data-line]').forEach((line, i) => {
            line.classList.toggle('active', i < activeIndex);
        });
    }

    private goToStep(step: number) {
        const slides = this.querySelectorAll<HTMLElement>('.splide__slide');
        if (step < 0 || step >= slides.length) return;

        // Try Splide's API first
        if (this.splideInstance) {
            this.splideInstance.go(step);
            // Check if Splide actually moved
            if (this.splideInstance.index === step) {
                return; // Splide handled it
            }
        }

        // Splide is stuck (busy/transition never completed) — switch slides manually
        slides.forEach((slide, i) => {
            if (i === step) {
                slide.classList.add('is-active', 'is-visible');
                slide.style.opacity = '1';
                slide.style.zIndex = '1';
            } else {
                slide.classList.remove('is-active', 'is-visible');
                slide.style.opacity = '0';
                slide.style.zIndex = '0';
            }
        });

        // Sync Splide's internal index so future go() calls use the right base
        if (this.splideInstance) {
            try {
                this.splideInstance.Components.Controller.setIndex(step);
            } catch (_) {
                /* noop */
            }
        }

        // Update our own state
        this.currentStep = step;
        this.updateStepIndicators(step);
        this.saveState();
        if (step === 2) {
            this.updateConfirmation();
        }
    }

    /** Read the authoritative slide index from Splide and keep currentStep in sync */
    private getSplideIndex(): number {
        const idx = this.splideInstance?.index;
        if (typeof idx === 'number') {
            this.currentStep = idx;
        }
        return this.currentStep;
    }

    private setupNavigation() {
        // Next buttons
        this.querySelectorAll('[data-next-step]').forEach((btn) => {
            this.trackListener(btn, 'click', () => {
                const step = this.getSplideIndex();
                if (this.validateStep(step)) {
                    this.goToStep(step + 1);
                }
            });
        });

        // Back buttons
        this.querySelectorAll('[data-prev-step]').forEach((btn) => {
            this.trackListener(btn, 'click', () => {
                this.goToStep(this.getSplideIndex() - 1);
            });
        });

        // Show registration form toggle
        const showRegisterLink = this.querySelector('[data-show-register]');
        const loginForm = this.querySelector('[data-login-form]');
        const registerForm = this.querySelector('[data-register-form]');
        const registerPrompt = this.querySelector('[data-register-prompt]');

        if (showRegisterLink)
            this.trackListener(showRegisterLink, 'click', (e) => {
                e.preventDefault();
                loginForm?.classList.add('hidden');
                registerForm?.classList.remove('hidden');
                registerPrompt?.classList.add('hidden');
                // Hide any login required error
                this.querySelector(
                    '[data-error-login-required]',
                )?.classList.add('hidden');
            });
    }

    private setupFilterTabs() {
        const tabs = this.querySelectorAll('.filter-tab');
        const wineCards = this.querySelectorAll('.wine-card');

        tabs.forEach((tab) => {
            this.trackListener(tab, 'click', () => {
                const filter = tab.getAttribute('data-filter');

                // Update active tab
                tabs.forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');

                // Filter wine cards
                wineCards.forEach((card) => {
                    const category = card.getAttribute('data-filter-category');
                    if (filter === 'all' || category === filter) {
                        card.removeAttribute('data-hidden');
                    } else {
                        card.setAttribute('data-hidden', 'true');
                    }
                });
            });
        });
    }

    private setupQuantityButtons() {
        // DOM is the source of truth for min/max/increment — restored quantities
        // from localStorage may be stale if the metaobject's minimum/increment changed.
        this.querySelectorAll('.wine-card').forEach((card) => {
            const variantId = card.getAttribute('data-variant-id') || '';
            const minQtyAttr = card.getAttribute('data-min-qty');
            const maxQtyAttr = card.getAttribute('data-max-qty');
            const incrementAttr = card.getAttribute('data-increment');
            const minQty = minQtyAttr !== null ? parseInt(minQtyAttr) || 0 : 0;
            const maxQty =
                maxQtyAttr !== null ? parseInt(maxQtyAttr) || 99 : 99;
            const increment =
                incrementAttr !== null ? parseInt(incrementAttr) || 1 : 1;

            const existing = this.wines[variantId];
            const restoredQty =
                typeof existing?.quantity === 'number'
                    ? existing.quantity
                    : minQty;
            // Snap restored qty onto the current min/increment/max grid
            let quantity = Math.max(minQty, Math.min(maxQty, restoredQty));
            if (increment > 1 && quantity > minQty) {
                const steps = Math.round((quantity - minQty) / increment);
                quantity = Math.max(
                    minQty,
                    Math.min(maxQty, minQty + steps * increment),
                );
            }

            this.wines[variantId] = {
                variantId,
                title: card.getAttribute('data-product-title') || '',
                price: card.getAttribute('data-product-price') || '',
                image: card.getAttribute('data-product-image') || '',
                quantity,
                minQty,
                maxQty,
                increment,
            };
        });

        // Plus buttons
        this.querySelectorAll('[data-qty-plus]').forEach((btn) => {
            const id = btn.getAttribute('data-qty-plus') || '';
            this.trackListener(btn, 'click', () => this.updateQuantity(id, 1));
        });

        // Minus buttons
        this.querySelectorAll('[data-qty-minus]').forEach((btn) => {
            const id = btn.getAttribute('data-qty-minus') || '';
            this.trackListener(btn, 'click', () => this.updateQuantity(id, -1));
        });
    }

    private updateQuantity(variantId: string, change: number) {
        const wine = this.wines[variantId];
        if (!wine) return;

        const step = wine.increment || 1;
        const newQty = Math.max(
            wine.minQty,
            Math.min(wine.maxQty, wine.quantity + change * step),
        );
        wine.quantity = newQty;

        // Update display
        const display = this.querySelector(`[data-qty-display="${variantId}"]`);
        if (display) display.textContent = String(newQty);

        // Update button states
        const minusBtn = this.querySelector(`[data-qty-minus="${variantId}"]`);
        const plusBtn = this.querySelector(`[data-qty-plus="${variantId}"]`);

        if (minusBtn) {
            minusBtn.toggleAttribute('disabled', newQty <= wine.minQty);
        }
        if (plusBtn) {
            plusBtn.toggleAttribute('disabled', newQty >= wine.maxQty);
        }

        // Clear error if any wine selected
        if (this.hasWineSelected()) {
            this.querySelector('[data-error-wines]')?.classList.add('hidden');
        }

        this.saveState();
    }

    private setupConfirm() {
        const btn = this.querySelector('[data-confirm]');
        if (btn)
            this.trackListener(btn, 'click', () => {
                this.submit();
            });
    }

    private setupInputValidation() {
        // Registration form fields
        const registerFields = [
            '[data-customer-firstname]',
            '[data-customer-lastname]',
            '[data-customer-email]',
            '[data-customer-phone]',
            '[data-customer-country]',
            '[data-customer-city]',
            '[data-customer-address]',
            '[data-customer-postcode]',
        ];

        registerFields.forEach((selector) => {
            const input = this.querySelector<HTMLInputElement>(selector);
            if (input)
                this.trackListener(input, 'input', () => {
                    // Clear field error on input
                    if (input.value.trim()) {
                        input
                            .closest('div')
                            ?.classList.remove('border-red-500');
                        input.closest('div')?.classList.add('border-[#DEDEDE]');
                    }
                    // Hide general error when typing
                    this.querySelector('[data-error-register]')?.classList.add(
                        'hidden',
                    );
                    this.querySelector(
                        '[data-error-login-required]',
                    )?.classList.add('hidden');
                    this.saveState();
                });
        });

        // Phone field: real-time validation feedback
        const phoneInput = this.querySelector<HTMLInputElement>(
            '[data-customer-phone]',
        );
        if (phoneInput)
            this.trackListener(phoneInput, 'blur', () => {
                const val = phoneInput.value.trim();
                if (val && !this.isValidPhone(val)) {
                    phoneInput.closest('div')?.classList.add('border-red-500');
                    phoneInput
                        .closest('div')
                        ?.classList.remove('border-[#DEDEDE]');
                } else {
                    phoneInput
                        .closest('div')
                        ?.classList.remove('border-red-500');
                    phoneInput
                        .closest('div')
                        ?.classList.add('border-[#DEDEDE]');
                }
            });
    }

    private animateWineCards() {
        const wineCards = this.querySelectorAll('.wine-card');
        if (wineCards.length === 0) return;

        // Set initial state
        gsap.set(wineCards, {
            opacity: 0,
            y: 30,
        });

        // Stagger animation
        gsap.to(wineCards, {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.1,
            ease: 'power2.out',
            delay: 0.2,
        });
    }

    private validateStep(step: number): boolean {
        if (step === 0) {
            return this.validateWineSelection();
        }
        if (step === 1) {
            return this.validateCustomerDetails();
        }
        return true;
    }

    private validateWineSelection(): boolean {
        const hasWines = this.hasWineSelected();
        const errorElement = this.querySelector('[data-error-wines]');

        if (!hasWines) {
            errorElement?.classList.remove('hidden');
            return false;
        }

        errorElement?.classList.add('hidden');
        return true;
    }

    private validateCustomerDetails(): boolean {
        const continueBtn = this.querySelectorAll('[data-next-step]')[1];
        const requiresAuth = continueBtn?.hasAttribute('data-requires-auth');

        if (requiresAuth) {
            // Guest user - check if registration form is visible
            const registerForm = this.querySelector('[data-register-form]');
            const isRegisterFormVisible =
                registerForm && !registerForm.classList.contains('hidden');

            if (isRegisterFormVisible) {
                return this.validateRegistrationForm();
            }

            // No registration form yet – require login or account creation first
            this.querySelector('[data-error-login-required]')?.classList.remove(
                'hidden',
            );
            return false;
        }

        // Logged-in user — validate customer details form
        return this.validateRegistrationForm();
    }

    private validateRegistrationForm(): boolean {
        const fields = {
            firstname: this.querySelector<HTMLInputElement>(
                '[data-customer-firstname]',
            ),
            lastname: this.querySelector<HTMLInputElement>(
                '[data-customer-lastname]',
            ),
            email: this.querySelector<HTMLInputElement>(
                '[data-customer-email]',
            ),
        };

        const errorElement = this.querySelector('[data-error-register]');
        let isValid = true;

        // Check required fields
        for (const [key, input] of Object.entries(fields)) {
            if (!input?.value.trim()) {
                isValid = false;
                input?.closest('div')?.classList.add('border-red-500');
                input?.closest('div')?.classList.remove('border-[#DEDEDE]');
            } else {
                input?.closest('div')?.classList.remove('border-red-500');
                input?.closest('div')?.classList.add('border-[#DEDEDE]');
            }
        }

        // Validate email format
        if (fields.email?.value && !this.isValidEmail(fields.email.value)) {
            isValid = false;
            fields.email?.closest('div')?.classList.add('border-red-500');
        }

        // Validate phone format (visual warning only, does not block submission)
        const phoneInput = this.querySelector<HTMLInputElement>(
            '[data-customer-phone]',
        );
        if (phoneInput?.value.trim() && !this.isValidPhone(phoneInput.value)) {
            phoneInput?.closest('div')?.classList.add('border-red-500');
            phoneInput?.closest('div')?.classList.remove('border-[#DEDEDE]');
        }

        if (!isValid) {
            errorElement?.classList.remove('hidden');
        } else {
            errorElement?.classList.add('hidden');
        }

        return isValid;
    }

    private hasWineSelected(): boolean {
        return Object.values(this.wines).some((wine) => wine.quantity > 0);
    }

    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    private isValidPhone(phone: string): boolean {
        try {
            const parsed = parsePhoneNumberFromString(
                phone,
                'NL',
                nlMetadata as any,
            );
            return parsed?.isValid() ?? false;
        } catch {
            // Metadata may be incompatible with library version; skip validation
            return true;
        }
    }

    private formatPhone(phone: string): string {
        try {
            const parsed = parsePhoneNumberFromString(
                phone,
                'NL',
                nlMetadata as any,
            );
            return parsed?.format('E.164') ?? phone;
        } catch {
            return phone;
        }
    }

    private showFieldError(
        input: HTMLInputElement | null,
        errorElement: Element | null,
    ) {
        if (input) {
            const wrapper = input.closest('div');
            wrapper?.classList.add('border-red-500');
            wrapper?.classList.remove('border-[#DEDEDE]');
        }
        errorElement?.classList.remove('hidden');
    }

    private clearFieldError(
        input: HTMLInputElement | null,
        errorElement: Element | null,
    ) {
        if (input) {
            const wrapper = input.closest('div');
            wrapper?.classList.remove('border-red-500');
            wrapper?.classList.add('border-[#DEDEDE]');
        }
        errorElement?.classList.add('hidden');
    }

    private canNavigateToStep(targetStep: number): boolean {
        if (targetStep <= this.currentStep || targetStep === 0) {
            return true;
        }

        for (let i = this.currentStep; i < targetStep; i++) {
            if (!this.validateStep(i)) {
                return false;
            }
        }

        return true;
    }

    private updateConfirmation() {
        // Update wines list
        const winesList = this.querySelector('[data-wines-list]');
        if (winesList) {
            let html = '';
            for (const wine of Object.values(this.wines)) {
                if (wine.quantity === 0) continue;

                html += `
                    <div class="flex items-center gap-4 w-full">
                        <div class="w-[60px] h-[50px] flex-shrink-0">
                            ${wine.image ? `<img src="${wine.image}" alt="${wine.title}" class="w-full h-full object-contain">` : ''}
                        </div>
                        <div class="flex-1">
                            <h4 class="font-cormorant text-[17px] leading-[1.3] text-primary">
                                ${wine.title} × ${wine.quantity}
                            </h4>
                            <p class="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#0C0027]">
                                ${wine.price}
                            </p>
                        </div>
                    </div>
                `;
            }
            winesList.innerHTML =
                html ||
                '<p class="text-[15px] text-gray-500">Geen wijnen geselecteerd</p>';
        }

        // Update customer details
        const details = this.querySelector('[data-customer-details]');
        if (details) {
            const firstname =
                this.querySelector<HTMLInputElement>(
                    '[data-customer-firstname]',
                )?.value || '';
            const lastname =
                this.querySelector<HTMLInputElement>('[data-customer-lastname]')
                    ?.value || '';
            const name = `${firstname} ${lastname}`.trim();
            const email =
                this.querySelector<HTMLInputElement>('[data-customer-email]')
                    ?.value || '';
            const phone =
                this.querySelector<HTMLInputElement>('[data-customer-phone]')
                    ?.value || '';
            const address =
                this.querySelector<HTMLInputElement>('[data-customer-address]')
                    ?.value || '';
            const postcode =
                this.querySelector<HTMLInputElement>('[data-customer-postcode]')
                    ?.value || '';
            const city =
                this.querySelector<HTMLInputElement>('[data-customer-city]')
                    ?.value || '';
            const country =
                this.querySelector<HTMLInputElement>('[data-customer-country]')
                    ?.value || '';

            details.innerHTML = `
                <p class="text-[15px] leading-[1.3] text-primary">Naam: ${name}</p>
                <p class="text-[15px] leading-[1.3] text-primary">E-mail: ${email}</p>
                ${phone ? `<p class="text-[15px] leading-[1.3] text-primary">Telefoon: ${phone}</p>` : ''}
                ${address ? `<p class="text-[15px] leading-[1.3] text-primary">Adres: ${address}</p>` : ''}
                ${postcode || city || country ? `<p class="text-[15px] leading-[1.3] text-primary">${[postcode, city, country].filter(Boolean).join(', ')}</p>` : ''}
            `;
        }
    }

    private async submit() {
        const btn = this.querySelector<HTMLButtonElement>('[data-confirm]');
        const confirmText = this.querySelector('[data-confirm-text]');
        const confirmLoading = this.querySelector('[data-confirm-loading]');
        const errorMessage = this.querySelector('[data-error-message]');

        if (!btn) return;

        // Show loading state
        btn.disabled = true;
        confirmText?.classList.add('hidden');
        confirmLoading?.classList.remove('hidden');
        errorMessage?.classList.add('hidden');

        // Build wines array
        const selectedWines = Object.values(this.wines)
            .filter((wine) => wine.quantity > 0)
            .map((wine) => ({
                variantId: wine.variantId,
                title: wine.title,
                price: wine.price,
                quantity: wine.quantity,
            }));

        // Get customer data from form inputs
        const isNewAccount = !this.querySelector('[data-customer-form]');
        const phoneValue = this.querySelector<HTMLInputElement>(
            '[data-customer-phone]',
        )?.value;
        const customerData: CustomerData = {
            firstName:
                this.querySelector<HTMLInputElement>(
                    '[data-customer-firstname]',
                )?.value || '',
            lastName:
                this.querySelector<HTMLInputElement>('[data-customer-lastname]')
                    ?.value || '',
            email:
                this.querySelector<HTMLInputElement>('[data-customer-email]')
                    ?.value || '',
            phone: phoneValue ? this.formatPhone(phoneValue) : undefined,
            country:
                this.querySelector<HTMLInputElement>('[data-customer-country]')
                    ?.value || undefined,
            city:
                this.querySelector<HTMLInputElement>('[data-customer-city]')
                    ?.value || undefined,
            address:
                this.querySelector<HTMLInputElement>('[data-customer-address]')
                    ?.value || undefined,
            postcode:
                this.querySelector<HTMLInputElement>('[data-customer-postcode]')
                    ?.value || undefined,
            isNewAccount,
        };

        const payload: {
            customer: CustomerData;
            wines: {
                variantId: string;
                title: string;
                price: string;
                quantity: number;
            }[];
            tag: string;
            timestamp: string;
            customerId?: string;
        } = {
            customer: customerData,
            wines: selectedWines,
            tag: this.draftOrderTag,
            timestamp: new Date().toISOString(),
        };

        if (this.customerId) {
            payload.customerId = this.customerId;
        }
        const body = JSON.stringify(payload);
        // eslint-disable-next-line no-console
        console.log('[wine-subscription] POST', WEBHOOK_URL, payload);

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
            });

            const responseText = await response.text().catch(() => '');
            // eslint-disable-next-line no-console
            console.log(
                '[wine-subscription] response',
                response.status,
                response.statusText,
                responseText,
            );

            if (!response.ok) {
                throw new Error(
                    `Webhook returned ${response.status} ${response.statusText}`,
                );
            }

            this.showSuccess();
            this.clearState();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[wine-subscription] submit failed', err);
            this.showSubmitError();
        }
    }

    private showSuccess() {
        this.querySelector('[data-wines-list]')?.parentElement?.classList.add(
            'hidden',
        );
        this.querySelector(
            '[data-customer-details]',
        )?.parentElement?.classList.add('hidden');
        this.querySelector('[data-confirmation-buttons]')?.classList.add(
            'hidden',
        );
        this.querySelector('[data-success-message]')?.classList.remove(
            'hidden',
        );
    }

    private showSubmitError() {
        const btn = this.querySelector<HTMLButtonElement>('[data-confirm]');
        const confirmText = this.querySelector('[data-confirm-text]');
        const confirmLoading = this.querySelector('[data-confirm-loading]');
        const errorMessage = this.querySelector('[data-error-message]');

        if (btn) btn.disabled = false;
        confirmText?.classList.remove('hidden');
        confirmLoading?.classList.add('hidden');
        errorMessage?.classList.remove('hidden');
    }

    // State persistence methods
    private saveState() {
        // Get customer data from registration form fields
        const state: StoredState = {
            wines: this.wines,
            customer: {
                firstName:
                    this.querySelector<HTMLInputElement>(
                        '[data-customer-firstname]',
                    )?.value || '',
                lastName:
                    this.querySelector<HTMLInputElement>(
                        '[data-customer-lastname]',
                    )?.value || '',
                email:
                    this.querySelector<HTMLInputElement>(
                        '[data-customer-email]',
                    )?.value || '',
                phone:
                    this.querySelector<HTMLInputElement>(
                        '[data-customer-phone]',
                    )?.value || '',
                country:
                    this.querySelector<HTMLInputElement>(
                        '[data-customer-country]',
                    )?.value || '',
                city:
                    this.querySelector<HTMLInputElement>('[data-customer-city]')
                        ?.value || '',
                address:
                    this.querySelector<HTMLInputElement>(
                        '[data-customer-address]',
                    )?.value || '',
                postcode:
                    this.querySelector<HTMLInputElement>(
                        '[data-customer-postcode]',
                    )?.value || '',
                isNewAccount: !this.querySelector('[data-customer-form]'),
            },
            currentStep: this.currentStep,
            timestamp: Date.now(),
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {
            // Ignore localStorage errors
        }
    }

    private loadState() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return;

            const state: StoredState = JSON.parse(stored);

            // Validate state structure
            if (!state || typeof state !== 'object' || !state.timestamp) {
                this.clearState();
                return;
            }

            // Check if state is expired
            if (Date.now() - state.timestamp > STATE_EXPIRY_MS) {
                this.clearState();
                return;
            }

            // Restore wines with validation
            if (state.wines && typeof state.wines === 'object') {
                for (const [key, wine] of Object.entries(state.wines)) {
                    if (wine && typeof wine === 'object') {
                        // Ensure quantity is a valid number
                        const qty =
                            typeof wine.quantity === 'number' &&
                            !isNaN(wine.quantity)
                                ? wine.quantity
                                : typeof wine.minQty === 'number'
                                  ? wine.minQty
                                  : 0;
                        this.wines[key] = {
                            ...wine,
                            quantity: Math.max(0, qty),
                            minQty:
                                typeof wine.minQty === 'number'
                                    ? wine.minQty
                                    : 0,
                            maxQty:
                                typeof wine.maxQty === 'number'
                                    ? wine.maxQty
                                    : 99,
                            increment:
                                typeof wine.increment === 'number' &&
                                wine.increment > 0
                                    ? wine.increment
                                    : 1,
                        };
                    }
                }
            }

            // Restore step (will be applied after Splide initializes)
            if (
                typeof state.currentStep === 'number' &&
                !isNaN(state.currentStep)
            ) {
                this.currentStep = state.currentStep;
            }
        } catch (e) {
            this.clearState();
        }
    }

    private restoreUIState() {
        // Restore wine quantities
        for (const [variantId, wine] of Object.entries(this.wines)) {
            const display = this.querySelector(
                `[data-qty-display="${variantId}"]`,
            );
            // Only update if we have a valid quantity number
            const qty =
                typeof wine?.quantity === 'number' && !isNaN(wine.quantity)
                    ? wine.quantity
                    : (wine?.minQty ?? 0);
            if (display) display.textContent = String(qty);

            // Update button states
            const minusBtn = this.querySelector(
                `[data-qty-minus="${variantId}"]`,
            );
            const plusBtn = this.querySelector(
                `[data-qty-plus="${variantId}"]`,
            );

            if (minusBtn) {
                minusBtn.toggleAttribute(
                    'disabled',
                    wine.quantity <= wine.minQty,
                );
            }
            if (plusBtn) {
                plusBtn.toggleAttribute(
                    'disabled',
                    wine.quantity >= wine.maxQty,
                );
            }
        }

        // Restore customer fields from stored state (only for registration form)
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const state: StoredState = JSON.parse(stored);
                if (state.customer) {
                    const fieldMap: Record<string, string> = {
                        '[data-customer-firstname]': 'firstName',
                        '[data-customer-lastname]': 'lastName',
                        '[data-customer-email]': 'email',
                        '[data-customer-phone]': 'phone',
                        '[data-customer-country]': 'country',
                        '[data-customer-city]': 'city',
                        '[data-customer-address]': 'address',
                        '[data-customer-postcode]': 'postcode',
                    };

                    for (const [selector, key] of Object.entries(fieldMap)) {
                        const input =
                            this.querySelector<HTMLInputElement>(selector);
                        const value = state.customer[
                            key as keyof CustomerData
                        ] as string;
                        if (input && !input.value && value) {
                            input.value = value;
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore
        }

        // Navigate to saved step instantly (no animation)
        if (this.currentStep > 0) {
            this.goToStep(this.currentStep);
        }

        // Update step indicators
        this.updateStepIndicators(this.currentStep);

        // Reveal splide content (hidden by inline script to prevent flash)
        if (this.splideSection) {
            (this.splideSection as HTMLElement).style.opacity = '1';
        }
    }

    private clearState() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            // Ignore
        }
    }
}
