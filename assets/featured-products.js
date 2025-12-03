(function () {
    function initFeaturedProductsSection(section) {
        if (!section) return;
        if (section.dataset.featuredProductsInitialized === 'true') return;
        section.dataset.featuredProductsInitialized = 'true';

        section.addEventListener('submit', async (event) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement)) return;
            if (!form.classList.contains('featured-products__form')) return;

            event.preventDefault();

            const submitButton = form.querySelector('.featured-products__button');
            if (!submitButton || submitButton.disabled) {
                return;
            }

            const labelEl = submitButton.querySelector('.featured-products__button-label');
            if (!labelEl) return;

            const defaultText = labelEl.dataset.labelDefault || labelEl.textContent;
            const addingText = labelEl.dataset.labelAdding || 'Adding…';
            const addedText = labelEl.dataset.labelAdded || 'Added';

            labelEl.textContent = addingText;
            submitButton.disabled = true;
            submitButton.classList.add('featured-products__button--loading');

            try {
                const formData = new FormData(form);
                const addResponse = await fetch('/cart/add.js', {
                    method: 'POST',
                    headers: {Accept: 'application/json'},
                    body: formData,
                });

                if (!addResponse.ok) {
                    const errorText = await addResponse.text();
                    console.error('[FeaturedProducts] Add to cart response error:', errorText);
                    throw new Error('Network response was not ok');
                }

                let cartState = null;
                try {
                    const cartStateResp = await fetch('/cart.js', {
                        method: 'GET',
                        headers: {Accept: 'application/json'},
                    });
                    if (cartStateResp.ok) {
                        cartState = await cartStateResp.json();
                    } else {
                        console.warn('[FeaturedProducts] Failed to fetch cart state', await cartStateResp.text());
                    }
                } catch (e) {
                    console.warn('[FeaturedProducts] Error fetching cart state', e);
                }

                try {
                    const sectionsToUpdate = ['cart-drawer', 'cart-icon-bubble'];

                    const baseUrl =
                        (window.Shopify &&
                            window.Shopify.routes &&
                            window.Shopify.routes.root) ||
                        '/';

                    const sectionsUrl = `${baseUrl}?sections=${sectionsToUpdate.join(',')}`;

                    const sectionsResp = await fetch(sectionsUrl, {
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });

                    if (sectionsResp.ok) {
                        const sectionsJSON = await sectionsResp.json();
                        const cartDrawer = document.querySelector('cart-drawer');
                        if (cartDrawer && typeof cartDrawer.renderContents === 'function') {
                            cartDrawer.classList.remove('is-empty');

                            cartDrawer.renderContents({
                                id: cartState && cartState.id,
                                sections: sectionsJSON,
                            });
                        } else {
                            console.warn('[FeaturedProducts] cart-drawer not found or renderContents not available');
                        }
                    } else {
                        console.warn('[FeaturedProducts] Failed to load sections', await sectionsResp.text());
                    }
                } catch (e) {
                    console.warn('[FeaturedProducts] Error updating cart sections', e);
                }

                labelEl.textContent = addedText;
                submitButton.classList.remove('featured-products__button--loading');
                submitButton.classList.add('featured-products__button--added');
            } catch (error) {
                console.error('[FeaturedProducts] Add to cart failed', error);
                labelEl.textContent = defaultText;
                submitButton.classList.remove('featured-products__button--loading');
                alert('Sorry, something went wrong while adding to cart.');
            } finally {
                submitButton.disabled = false;
            }
        });
    }

    function initAllFeaturedProductsSections() {
        const sections = document.querySelectorAll('[data-section-type="featured-products"]');
        if (!sections.length) {
            console.debug('[FeaturedProducts] No sections found on page');
            return;
        }
        sections.forEach(initFeaturedProductsSection);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAllFeaturedProductsSections);
    } else {
        initAllFeaturedProductsSections();
    }
})();