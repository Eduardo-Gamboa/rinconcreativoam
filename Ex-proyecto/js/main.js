document.addEventListener('DOMContentLoaded', () => {
    // === Mobile Menu ===
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('nav');
    const navLinks = document.querySelectorAll('.nav__link');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('hamburger--active');
        nav.classList.toggle('nav--open');
        document.body.style.overflow = nav.classList.contains('nav--open') ? 'hidden' : '';
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('hamburger--active');
            nav.classList.remove('nav--open');
            document.body.style.overflow = '';
        });
    });

    document.addEventListener('click', (e) => {
        if (nav.classList.contains('nav--open') &&
            !nav.contains(e.target) &&
            !hamburger.contains(e.target)) {
            hamburger.classList.remove('hamburger--active');
            nav.classList.remove('nav--open');
            document.body.style.overflow = '';
        }
    });

    // === Sticky Header ===
    const header = document.getElementById('header');

    window.addEventListener('scroll', () => {
        header.classList.toggle('header--scrolled', window.scrollY > 50);
    });

    // === Active Nav Link on Scroll ===
    const sections = document.querySelectorAll('section[id]');

    const highlightNav = () => {
        const scrollY = window.scrollY + 100;
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            const link = document.querySelector(`.nav__link[href="#${id}"]`);
            if (link) {
                link.classList.toggle('nav__link--active',
                    scrollY >= top && scrollY < top + height);
            }
        });
    };

    window.addEventListener('scroll', highlightNav);
    highlightNav();

    // === Modal por Categoría ===
    const categoriaCards = document.querySelectorAll('.categoria-card');
    const modalCatalogo = document.getElementById('modal-catalogo');
    const modalTitulo = document.getElementById('modal-titulo');
    const modalGrid = document.getElementById('modal-grid');
    const modalClose = document.getElementById('modal-close');
    const modalOverlay = document.getElementById('modal-overlay');

    const categoriaNombres = {
        vasos: 'Vasos y Termos',
        fofuchas: 'Fofuchas',
        libretas: 'Libretas y Lapiceras',
        letras: 'Letras LED',
        extras: 'Cake Toppers y Más'
    };

    categoriaCards.forEach(card => {
        card.querySelector('.btn--ver-categoria').addEventListener('click', () => {
            const category = card.dataset.category;
            modalTitulo.textContent = categoriaNombres[category] || category;
            modalGrid.innerHTML = '';
            document.querySelectorAll(`#productos-data .producto-card[data-category="${category}"]`).forEach(pc => {
                const clone = pc.cloneNode(true);
                clone.querySelectorAll('img[loading="lazy"]').forEach(img => img.removeAttribute('loading'));
                modalGrid.appendChild(clone);
            });
            modalCatalogo.classList.add('modal-catalogo--active');
            document.body.style.overflow = 'hidden';
        });
    });

    const closeModal = () => {
        modalCatalogo.classList.remove('modal-catalogo--active');
        document.body.style.overflow = '';
    };

    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    // === Scroll Reveal ===
    const revealElements = document.querySelectorAll(
        '.categoria-card, .contacto__card, .contacto__form-wrapper'
    );

    revealElements.forEach(el => el.classList.add('reveal'));

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal--visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));

    // === Lightbox ===
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = lightbox.querySelector('.lightbox__img');
    const lightboxCaption = lightbox.querySelector('.lightbox__caption');
    const lightboxClose = lightbox.querySelector('.lightbox__close');

    document.addEventListener('click', (e) => {
        const wrapper = e.target.closest('.producto-card__img-wrapper');
        if (!wrapper) return;
        const img = wrapper.querySelector('img');
        if (!img) return;

        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        const card = wrapper.closest('.producto-card');
        const title = card ? card.querySelector('.producto-card__title') : null;
        lightboxCaption.textContent = title ? title.textContent : '';
        lightbox.classList.add('lightbox--active');
        document.body.style.overflow = 'hidden';
    });

    const closeLightbox = () => {
        lightbox.classList.remove('lightbox--active');
        if (!modalCatalogo.classList.contains('modal-catalogo--active')) {
            document.body.style.overflow = '';
        }
    };

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (lightbox.classList.contains('lightbox--active')) closeLightbox();
            else if (modalCatalogo.classList.contains('modal-catalogo--active')) closeModal();
        }
    });

    // === EmailJS Contact Form ===
    // IMPORTANT: Replace these IDs after setting up your EmailJS account
    // See setup instructions below
    const EMAILJS_PUBLIC_KEY = 'UVNol3V5m5jFVnugK';
    const EMAILJS_SERVICE_ID = 'service_ggnoh33';
    const EMAILJS_TEMPLATE_ID = 'template_rb7f6oj';

    // Initialize EmailJS
    if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }

    const contactForm = document.getElementById('contact-form');
    const submitBtn = document.getElementById('submit-btn');
    const btnText = submitBtn.querySelector('.btn__text');
    const btnLoading = submitBtn.querySelector('.btn__loading');
    const formStatus = document.getElementById('form-status');

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validate
        const name = contactForm.from_name.value.trim();
        const email = contactForm.reply_to.value.trim();
        const subject = contactForm.subject.value.trim();
        const message = contactForm.message.value.trim();

        if (!name || !email || !subject || !message) {
            showFormStatus('Por favor completa todos los campos.', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showFormStatus('Por favor ingresa un correo electrónico válido.', 'error');
            return;
        }

        // Check if EmailJS is configured
        if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
            // Fallback: open mailto link
            const mailtoLink = `mailto:rinconcreativoam@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Nombre: ${name}\nCorreo: ${email}\n\n${message}`)}`;
            window.open(mailtoLink);
            showFormStatus('Se abrió tu cliente de correo. ¡Gracias por contactarnos!', 'success');
            contactForm.reset();
            return;
        }

        // Send via EmailJS
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline';
        submitBtn.disabled = true;

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            from_name: name,
            reply_to: email,
            subject: subject,
            message: message,
            to_email: 'rinconcreativoam@gmail.com'
        }).then(() => {
            showFormStatus('¡Mensaje enviado con éxito! Te responderemos pronto.', 'success');
            contactForm.reset();
        }).catch(() => {
            showFormStatus('Hubo un error al enviar. Intenta por WhatsApp o vuelve a intentar.', 'error');
        }).finally(() => {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
            submitBtn.disabled = false;
        });
    });

    function showFormStatus(message, type) {
        formStatus.textContent = message;
        formStatus.className = `form-status form-status--${type}`;
        setTimeout(() => {
            formStatus.className = 'form-status';
        }, 6000);
    }
});
