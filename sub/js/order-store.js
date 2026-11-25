(function () {
    'use strict';

    const STORAGE_KEY = 'ipdeok-cart-v1';
    const PRODUCT = {
        id: 'original-tteokbokki',
        name: '입덕 오리지널 떡볶이',
        basePrice: 6900
    };

    const SPICY_LABELS = {
        mild: '순한맛',
        normal: '보통맛',
        hot: '매운맛'
    };

    function formatWon(value) {
        return `${Number(value).toLocaleString('ko-KR')}원`;
    }

    function readCart() {
        try {
            const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function writeCart(cart) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }

    function addItem(item) {
        const cart = readCart();
        cart.push(item);
        writeCart(cart);
        return cart;
    }

    function getSummary(cart = readCart()) {
        return cart.reduce((summary, item) => {
            const quantity = Number(item.quantity) || 0;
            const basePrice = Number(item.basePrice) || 0;
            const toppingPrice = Array.isArray(item.toppings)
                ? item.toppings.reduce((sum, topping) => sum + (Number(topping.price) || 0), 0)
                : 0;

            summary.quantity += quantity;
            summary.baseTotal += basePrice * quantity;
            summary.toppingTotal += toppingPrice * quantity;
            summary.productTotal += (basePrice + toppingPrice) * quantity;
            return summary;
        }, { quantity: 0, baseTotal: 0, toppingTotal: 0, productTotal: 0 });
    }

    function createLineId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function initListsPage() {
        const cartLink = document.querySelector('#cart-link');
        const cartCount = document.querySelector('#cart-count');
        const cartAmount = document.querySelector('#cart-amount');
        const cartStatus = document.querySelector('#cart-status');
        const menuStatus = document.querySelector('#menu-status');

        function announceUnavailable(productName) {
            menuStatus.hidden = false;
            menuStatus.textContent = `${productName} 상세페이지는 준비 중입니다. 현재는 입덕 오리지널 떡볶이를 확인해 주세요.`;
            menuStatus.focus();
        }

        document.querySelectorAll('[data-unavailable-product]').forEach(button => {
            button.addEventListener('click', () => announceUnavailable(button.dataset.unavailableProduct));
        });

        function updateCartBar() {
            const summary = getSummary();
            cartCount.textContent = String(summary.quantity);
            cartAmount.textContent = formatWon(summary.productTotal);

            if (summary.quantity > 0) {
                cartLink.href = '../payment/payment.html';
                cartLink.removeAttribute('aria-disabled');
                cartLink.classList.remove('is-disabled');
                cartStatus.textContent = `장바구니에 총 ${summary.quantity}개, ${formatWon(summary.productTotal)}이 담겨 있습니다.`;
            } else {
                cartLink.removeAttribute('href');
                cartLink.setAttribute('aria-disabled', 'true');
                cartLink.classList.add('is-disabled');
                cartStatus.textContent = '장바구니가 비어 있습니다. 상품을 선택해 주세요.';
            }
        }

        cartLink.addEventListener('click', event => {
            if (cartLink.getAttribute('aria-disabled') === 'true') {
                event.preventDefault();
                cartStatus.textContent = '장바구니가 비어 있어 결제할 수 없습니다. 입덕 오리지널 떡볶이를 선택해 주세요.';
                cartStatus.focus();
            }
        });

        window.addEventListener('pageshow', updateCartBar);
        updateCartBar();
    }

    function initDetailPage() {
        const toppingInputs = [...document.querySelectorAll('[data-topping-id]')];
        const spicyInputs = [...document.querySelectorAll('input[name="spicy"]')];
        const quantityValue = document.querySelector('#quantity-value');
        const decreaseButton = document.querySelector('[data-quantity-action="decrease"]');
        const increaseButton = document.querySelector('[data-quantity-action="increase"]');
        const totalValue = document.querySelector('#product-total');
        const addButton = document.querySelector('#add-to-cart');
        const cartFeedback = document.querySelector('#cart-feedback');
        const feedbackText = document.querySelector('#cart-feedback-text');
        let quantity = 1;

        function selectedToppings() {
            return toppingInputs
                .filter(input => input.checked)
                .map(input => ({
                    id: input.dataset.toppingId,
                    name: input.dataset.toppingName,
                    price: Number(input.dataset.toppingPrice)
                }));
        }

        function calculateSubtotal() {
            const toppingTotal = selectedToppings().reduce((sum, topping) => sum + topping.price, 0);
            return (PRODUCT.basePrice + toppingTotal) * quantity;
        }

        function updateTotal() {
            quantityValue.textContent = String(quantity);
            totalValue.textContent = formatWon(calculateSubtotal());
            decreaseButton.disabled = quantity <= 1;
            increaseButton.disabled = quantity >= 20;
        }

        decreaseButton.addEventListener('click', () => {
            quantity = Math.max(1, quantity - 1);
            updateTotal();
        });

        increaseButton.addEventListener('click', () => {
            quantity = Math.min(20, quantity + 1);
            updateTotal();
        });

        toppingInputs.forEach(input => input.addEventListener('change', updateTotal));

        addButton.addEventListener('click', () => {
            const spicyId = spicyInputs.find(input => input.checked)?.value || 'normal';
            const toppings = selectedToppings();
            const subtotal = calculateSubtotal();
            const cart = addItem({
                lineId: createLineId(),
                productId: PRODUCT.id,
                productName: PRODUCT.name,
                basePrice: PRODUCT.basePrice,
                spicy: { id: spicyId, label: SPICY_LABELS[spicyId] },
                toppings,
                quantity,
                subtotal
            });
            const summary = getSummary(cart);

            feedbackText.textContent = `${PRODUCT.name} ${quantity}개를 담았습니다. 장바구니 합계는 ${formatWon(summary.productTotal)}입니다.`;
            cartFeedback.hidden = false;
            cartFeedback.focus();
        });

        updateTotal();
    }

    function appendText(parent, tagName, text, className) {
        const element = document.createElement(tagName);
        element.textContent = text;
        if (className) element.className = className;
        parent.appendChild(element);
        return element;
    }

    function renderOrderItem(item) {
        const article = document.createElement('article');
        article.className = 'order-product';

        const image = document.createElement('img');
        image.src = 'img/classic.webp';
        image.alt = item.productName;
        article.appendChild(image);

        const info = document.createElement('div');
        info.className = 'order-product-info';
        const top = document.createElement('div');
        top.className = 'product-top';
        appendText(top, 'h3', item.productName);
        appendText(top, 'strong', formatWon(item.subtotal));
        info.appendChild(top);

        appendText(info, 'p', `맵기 : ${item.spicy?.label || '보통맛'}`);
        const toppingText = item.toppings?.length
            ? item.toppings.map(topping => `${topping.name} (+${formatWon(topping.price)})`).join(', ')
            : '선택 안 함';
        appendText(info, 'p', `토핑 : ${toppingText}`);
        appendText(info, 'p', `수량 : ${item.quantity}개`);

        const detailLink = document.createElement('a');
        detailLink.href = '../detail/detail.html';
        detailLink.className = 'product-detail-link';
        appendText(detailLink, 'span', '메뉴 상세보기');
        const icon = document.createElement('iconify-icon');
        icon.setAttribute('icon', 'mdi:chevron-right');
        detailLink.appendChild(icon);
        info.appendChild(detailLink);
        article.appendChild(info);
        return article;
    }

    function initPaymentPage() {
        const cart = readCart();
        const emptyCart = document.querySelector('#empty-cart');
        const paymentContent = document.querySelector('#payment-content');

        if (cart.length === 0) {
            emptyCart.hidden = false;
            paymentContent.hidden = true;
            return;
        }

        const summary = getSummary(cart);
        const orderList = document.querySelector('#order-product-list');
        cart.forEach(item => orderList.appendChild(renderOrderItem(item)));

        const baseAmount = document.querySelector('#base-amount');
        const toppingAmount = document.querySelector('#topping-amount');
        const deliveryAmount = document.querySelector('#delivery-amount');
        const finalAmount = document.querySelector('#final-amount');
        const checkoutAmount = document.querySelector('#checkout-amount');
        const addressInput = document.querySelector('#delivery-address');
        const addressField = document.querySelector('.address-field');

        function updatePaymentTotal() {
            const deliveryType = document.querySelector('input[name="delivery-type"]:checked').value;
            const deliveryFee = deliveryType === 'delivery' ? 3000 : 0;
            const finalTotal = summary.productTotal + deliveryFee;

            baseAmount.textContent = formatWon(summary.baseTotal);
            toppingAmount.textContent = summary.toppingTotal ? `+${formatWon(summary.toppingTotal)}` : '0원';
            deliveryAmount.textContent = deliveryFee ? `+${formatWon(deliveryFee)}` : '0원';
            finalAmount.textContent = formatWon(finalTotal);
            checkoutAmount.textContent = `${formatWon(finalTotal)} 결제하기`;

            const pickup = deliveryType === 'pickup';
            addressInput.disabled = pickup;
            addressField.classList.toggle('is-disabled', pickup);
        }

        document.querySelectorAll('input[name="delivery-type"]').forEach(input => {
            input.addEventListener('change', updatePaymentTotal);
        });
        updatePaymentTotal();
    }

    window.IpdeokOrderStore = { readCart, writeCart, addItem, getSummary, formatWon };

    document.addEventListener('DOMContentLoaded', () => {
        const page = document.body.dataset.page;
        if (page === 'lists') initListsPage();
        if (page === 'detail') initDetailPage();
        if (page === 'payment') initPaymentPage();
    });
}());
