// Carrusel - Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    let currentSlide = 0;
    const carouselSlide = document.querySelector('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    const totalSlides = dots.length; // Usar la cantidad real de dots

    if (carouselSlide) {
        function updateCarousel() {
            carouselSlide.style.transform = `translateX(-${currentSlide * 100}%)`;
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateCarousel();
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            updateCarousel();
        }

        // Botones del carrusel
        document.querySelector('.carousel-next')?.addEventListener('click', nextSlide);
        document.querySelector('.carousel-prev')?.addEventListener('click', prevSlide);

        // Dots del carrusel
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentSlide = index;
                updateCarousel();
            });
        });

        // Inicializar posición
        updateCarousel();

        // Auto-play del carrusel (cambia cada 4 segundos)
        setInterval(nextSlide, 4000);
    }

    // Modales de Login y Registro
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const closeModal = document.getElementById('closeModal');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginButtons = document.querySelectorAll('.btn-login');
    const signupButtons = document.querySelectorAll('.btn-signup');

    // Verificar que los elementos existan antes de usarlos
    if (!loginModal || !registerModal) {
        console.warn('Modales no encontrados');
        return;
    }

    // Función para abrir modal
    function openModal(modal) {
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Función para cerrar modal
    function closeModalFunc(modal) {
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Abrir modal de login
    if (loginModal) {
        loginButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                openModal(loginModal);
            });
        });
    }

    // Abrir modal de registro
    if (registerModal) {
        signupButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                openModal(registerModal);
            });
        });
    }

    // Cerrar modales
    if (closeModal) {
        closeModal.addEventListener('click', () => closeModalFunc(loginModal));
    }
    
    if (closeRegisterModal) {
        closeRegisterModal.addEventListener('click', () => closeModalFunc(registerModal));
    }

    // Cerrar modales al hacer clic fuera
    if (loginModal) {
        loginModal.addEventListener('click', function(e) {
            if (e.target === loginModal) {
                closeModalFunc(loginModal);
            }
        });
    }

    if (registerModal) {
        registerModal.addEventListener('click', function(e) {
            if (e.target === registerModal) {
                closeModalFunc(registerModal);
            }
        });
    }

    // Cerrar modales con tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (loginModal && loginModal.classList.contains('active')) {
                closeModalFunc(loginModal);
            }
            if (registerModal && registerModal.classList.contains('active')) {
                closeModalFunc(registerModal);
            }
        }
    });

    // Cambiar de login a registro
    const goToRegister = document.getElementById('goToRegister');
    if (goToRegister) {
        goToRegister.addEventListener('click', function(e) {
            e.preventDefault();
            closeModalFunc(loginModal);
            setTimeout(() => openModal(registerModal), 300);
        });
    }

    // Cambiar de registro a login
    const goToLogin = document.getElementById('goToLogin');
    if (goToLogin) {
        goToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            closeModalFunc(registerModal);
            setTimeout(() => openModal(loginModal), 300);
        });
    }

    // Nota: El manejo del submit del formulario de login está en el HTML inline
    // para evitar conflictos con la redirección a Administrador.html o Docente.html

    // Manejar envío del formulario de registro
    if (!registerForm) {
        console.warn('Formulario de registro no encontrado');
        return;
    }
    
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const userType = document.querySelector('input[name="registerUserType"]:checked').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;

        // Validar que las contraseñas coincidan
        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden. Por favor, verifica.');
            return;
        }

        // Validar términos
        if (!acceptTerms) {
            alert('Debes aceptar los términos y condiciones para continuar.');
            return;
        }

        // Validar que AuthManager esté disponible
        if (!window.authManager) {
            alert('Error: Firebase no está inicializado. Por favor, recarga la página.');
            return;
        }

        // Esperar a que AuthManager esté listo
        try {
            await window.authManager.ensureReady();
        } catch (error) {
            alert('Error: Firebase Auth no está disponible.\n\n' +
                  'Por favor, verifica:\n' +
                  '1. Que Email/Password esté habilitado en Firebase Authentication\n' +
                  '2. Que Identity Toolkit API esté habilitada\n' +
                  '3. Que la API key no tenga restricciones\n\n' +
                  'Recarga la página después de verificar.');
            return;
        }

        // Deshabilitar botón durante el registro
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="ri-loader-line"></i> Creando cuenta...';

        try {
            // Registrar usuario con Firebase
            const result = await window.authManager.registrarUsuario(email, password, name, userType);
            
            if (result.success) {
                const userTypeText = userType === 'maestro' ? 'Maestro' : 
                                   userType === 'administrador' ? 'Administrador' : 'Estudiante';
                let mensaje = `¡Cuenta creada exitosamente!\n\nTipo: ${userTypeText}\nNombre: ${name}\nEmail: ${email}`;
                
                // Si hay una advertencia (por ejemplo, Firestore no disponible)
                if (result.warning) {
                    mensaje += `\n\n⚠️ Advertencia: ${result.warning}`;
                } else {
                    mensaje += `\n\n✅ Usuario guardado en la base de datos`;
                }
                
                alert(mensaje);
                
                // Cerrar modal y abrir login
                closeModalFunc(registerModal);
                setTimeout(() => {
                    openModal(loginModal);
                    // Pre-llenar el email en el formulario de login
                    document.getElementById('email').value = email;
                }, 300);
            } else {
                // Mostrar error más detallado
                let errorMsg = 'Error: ' + result.error;
                
                // Los errores de API key ya están manejados en firebase-auth.js
                // Solo mostrar el mensaje de error sin instrucciones adicionales
                alert(errorMsg);
            }
        } catch (error) {
            console.error('Error en registro:', error);
            
            // Si el error ya fue manejado por AuthManager, solo mostrar el mensaje
            let errorMsg = error.message || 'Error inesperado al crear la cuenta.';
            
            // Si es un error no manejado, mostrar detalles
            if (!error.code && !error.message.includes('API key')) {
                errorMsg += '\n\nDetalles: ' + (error.message || 'Error desconocido');
            }
            
            alert(errorMsg);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Modal de Pago
    const paymentModal = document.getElementById('paymentModal');
    const closePaymentModal = document.getElementById('closePaymentModal');
    let paymentForm = document.getElementById('paymentForm');
    const paymentSuccess = document.getElementById('paymentSuccess');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');

    // Función para formatear número de tarjeta
    function formatCardNumber(value) {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    }

    // Función para validar número de tarjeta (Algoritmo de Luhn)
    function validateCardNumber(cardNumber) {
        const cleaned = cardNumber.replace(/\s+/g, '');
        if (!/^\d{13,19}$/.test(cleaned)) {
            return false;
        }
        
        let sum = 0;
        let isEven = false;
        
        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i));
            
            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            isEven = !isEven;
        }
        
        return sum % 10 === 0;
    }

    // Función para detectar tipo de tarjeta
    function getCardType(cardNumber) {
        const cleaned = cardNumber.replace(/\s+/g, '');
        if (/^4/.test(cleaned)) return 'Visa';
        if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
        if (/^3[47]/.test(cleaned)) return 'American Express';
        if (/^6/.test(cleaned)) return 'Discover';
        return 'Unknown';
    }

    // Función para formatear fecha de vencimiento
    function formatExpiry(value) {
        // Remover todo excepto números y la barra
        let v = value.replace(/[^0-9\/]/g, '');
        
        if (v.length === 0) return '';
        
        // Si ya tiene barra, trabajar con las partes
        if (v.includes('/')) {
            const parts = v.split('/');
            let month = parts[0].substring(0, 2);
            let year = parts[1] ? parts[1].substring(0, 2) : '';
            
            // Validar mes solo si tiene 2 dígitos completos
            if (month.length === 2) {
                const monthNum = parseInt(month);
                if (monthNum > 12) {
                    month = '12';
                } else if (monthNum === 0) {
                    month = '01';
                }
            }
            
            // Limitar año a 2 dígitos
            if (year.length >= 2) {
                return month + '/' + year.substring(0, 2);
            } else if (month.length === 2) {
                return month + '/' + year;
            } else {
                return month + (year ? '/' + year : '');
            }
        } else {
            // No tiene barra aún, solo números
            // Si tiene 1 o 2 dígitos, permitir continuar escribiendo
            if (v.length <= 2) {
                return v;
            }
            
            // Si tiene más de 2 dígitos, agregar la barra automáticamente
            const month = v.substring(0, 2);
            const year = v.substring(2, 4);
            
            // Validar mes
            const monthNum = parseInt(month);
            let validMonth = month;
            if (monthNum > 12) {
                validMonth = '12';
            } else if (monthNum === 0) {
                validMonth = '01';
            }
            
            if (year.length >= 2) {
                return validMonth + '/' + year.substring(0, 2);
            } else if (year.length > 0) {
                return validMonth + '/' + year;
            } else {
                return validMonth + '/';
            }
        }
    }

    // Función para validar fecha de vencimiento (más flexible para pruebas)
    function validateExpiry(expiry) {
        if (!expiry || expiry.length !== 5) return false;
        
        const parts = expiry.split('/');
        if (parts.length !== 2) return false;
        
        const month = parseInt(parts[0]);
        const yearStr = parts[1];
        
        // Validar formato básico
        if (month < 1 || month > 12) return false;
        if (yearStr.length !== 2) return false;
        
        const year = parseInt('20' + yearStr);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        
        // Permitir fechas desde el mes actual en adelante (incluyendo fechas futuras razonables)
        // También permitir fechas hasta 20 años en el futuro para pruebas
        const maxYear = currentYear + 20;
        
        if (year < currentYear) return false;
        if (year > maxYear) return false;
        if (year === currentYear && month < currentMonth) return false;
        
        return true;
    }

    // Función para validar CVV
    function validateCVV(cvv, cardNumber) {
        const cleaned = cardNumber.replace(/\s+/g, '');
        const cardType = getCardType(cardNumber);
        
        if (cardType === 'American Express') {
            return /^\d{4}$/.test(cvv);
        }
        return /^\d{3}$/.test(cvv);
    }

    // Formatear número de tarjeta mientras se escribe
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        // Permitir entrada de texto sin restricciones estrictas
        cardNumberInput.addEventListener('input', function(e) {
            const originalValue = e.target.value;
            const formatted = formatCardNumber(originalValue);
            e.target.value = formatted;
            
            // Validar solo cuando el usuario termine de escribir (no durante la escritura)
            const cardNumber = formatted;
            const cleaned = cardNumber.replace(/\s/g, '');
            
            // Solo validar si tiene al menos 13 dígitos (longitud mínima de tarjeta)
            if (cleaned.length >= 13) {
                const isValid = validateCardNumber(cardNumber);
                if (isValid) {
                    e.target.style.borderColor = '#10b981';
                    e.target.setCustomValidity('');
                } else if (cleaned.length === 16 || cleaned.length === 15 || cleaned.length === 13) {
                    // Solo mostrar error si tiene la longitud completa de una tarjeta
                    e.target.style.borderColor = '#ef4444';
                    e.target.setCustomValidity('Número de tarjeta inválido');
                } else {
                    // Mientras escribe, no mostrar error
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.setCustomValidity('');
                }
            } else {
                // Mientras escribe, no validar estrictamente
                e.target.style.borderColor = '#e2e8f0';
                e.target.setCustomValidity('');
            }
        });
        
        // Validar solo al salir del campo (blur)
        cardNumberInput.addEventListener('blur', function(e) {
            const cardNumber = e.target.value;
            const cleaned = cardNumber.replace(/\s/g, '');
            if (cleaned.length >= 13) {
                if (!validateCardNumber(cardNumber)) {
                    e.target.style.borderColor = '#ef4444';
                    e.target.setCustomValidity('Por favor, ingresa un número de tarjeta válido');
                } else {
                    e.target.style.borderColor = '#10b981';
                    e.target.setCustomValidity('');
                }
            }
        });
    }

    // Formatear fecha de vencimiento mientras se escribe
    const cardExpiryInput = document.getElementById('cardExpiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function(e) {
            const originalValue = e.target.value;
            const cursorPosition = e.target.selectionStart;
            
            // Formatear el valor
            const formatted = formatExpiry(originalValue);
            
            // Solo actualizar si el valor cambió
            if (e.target.value !== formatted) {
                e.target.value = formatted;
                
                // Ajustar posición del cursor
                let newCursorPos = cursorPosition;
                const originalLength = originalValue.length;
                const formattedLength = formatted.length;
                
                // Si se agregó una barra automáticamente, mover el cursor después de ella
                if (!originalValue.includes('/') && formatted.includes('/')) {
                    newCursorPos = formatted.indexOf('/') + 1;
                } else if (formattedLength > originalLength) {
                    // Si el texto creció, mantener la posición relativa
                    newCursorPos = cursorPosition + (formattedLength - originalLength);
                } else if (formattedLength < originalLength) {
                    // Si el texto se redujo, ajustar la posición
                    newCursorPos = Math.max(0, Math.min(cursorPosition, formattedLength));
                }
                
                // Asegurar que el cursor no esté fuera de los límites
                newCursorPos = Math.max(0, Math.min(newCursorPos, formatted.length));
                e.target.setSelectionRange(newCursorPos, newCursorPos);
            }
            
            // No validar estrictamente mientras escribe, solo dar feedback visual suave
            const expiry = formatted;
            
            if (expiry.length === 5) {
                // Solo validar cuando tenga el formato completo
                if (validateExpiry(expiry)) {
                    e.target.style.borderColor = '#10b981';
                    e.target.setCustomValidity('');
                } else {
                    // Mostrar error solo si el formato está completo pero es inválido
                    e.target.style.borderColor = '#ef4444';
                    e.target.setCustomValidity('Por favor, ingresa una fecha de vencimiento válida (MM/AA). Ejemplo: 12/25');
                }
            } else if (expiry.length > 0) {
                // Mientras escribe, mostrar color amarillo indicando que está escribiendo
                e.target.style.borderColor = '#fbbf24';
                e.target.setCustomValidity('');
            } else {
                // Campo vacío
                e.target.style.borderColor = '#e2e8f0';
                e.target.setCustomValidity('');
            }
        });
        
        // Validar solo al salir del campo
        cardExpiryInput.addEventListener('blur', function(e) {
            const expiry = e.target.value;
            if (expiry.length === 5) {
                if (!validateExpiry(expiry)) {
                    e.target.style.borderColor = '#ef4444';
                    e.target.setCustomValidity('La fecha debe ser válida y no estar expirada. Ejemplo: 12/25 para diciembre de 2025');
                } else {
                    e.target.style.borderColor = '#10b981';
                    e.target.setCustomValidity('');
                }
            } else if (expiry.length > 0) {
                e.target.style.borderColor = '#ef4444';
                e.target.setCustomValidity('Por favor, ingresa una fecha completa (MM/AA)');
            }
        });
    }

    // Solo números para CVV
    const cardCVVInput = document.getElementById('cardCVV');
    if (cardCVVInput) {
        cardCVVInput.addEventListener('input', function(e) {
            // Solo permitir números
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
            
            // No validar estrictamente mientras escribe
            const cvv = e.target.value;
            if (cvv.length === 0) {
                e.target.style.borderColor = '#e2e8f0';
                e.target.setCustomValidity('');
            } else if (cvv.length >= 3) {
                // Validar solo cuando tenga al menos 3 dígitos
                const cardNumber = document.getElementById('cardNumber')?.value || '';
                if (validateCVV(cvv, cardNumber)) {
                    e.target.style.borderColor = '#10b981';
                    e.target.setCustomValidity('');
                } else {
                    // Solo mostrar error si tiene la longitud completa esperada
                    const cardType = getCardType(cardNumber);
                    const expectedLength = cardType === 'American Express' ? 4 : 3;
                    if (cvv.length === expectedLength) {
                        e.target.style.borderColor = '#ef4444';
                        if (cardType === 'American Express') {
                            e.target.setCustomValidity('CVV debe tener 4 dígitos');
                        } else {
                            e.target.setCustomValidity('CVV debe tener 3 dígitos');
                        }
                    } else {
                        e.target.style.borderColor = '#e2e8f0';
                        e.target.setCustomValidity('');
                    }
                }
            } else {
                e.target.style.borderColor = '#e2e8f0';
                e.target.setCustomValidity('');
            }
        });
        
        // Validar solo al salir del campo
        cardCVVInput.addEventListener('blur', function(e) {
            const cvv = e.target.value;
            const cardNumber = document.getElementById('cardNumber')?.value || '';
            if (cvv.length > 0 && !validateCVV(cvv, cardNumber)) {
                e.target.style.borderColor = '#ef4444';
                const cardType = getCardType(cardNumber);
                if (cardType === 'American Express') {
                    e.target.setCustomValidity('CVV debe tener 4 dígitos para American Express');
                } else {
                    e.target.setCustomValidity('CVV debe tener 3 dígitos');
                }
            } else if (cvv.length > 0) {
                e.target.style.borderColor = '#10b981';
                e.target.setCustomValidity('');
            }
        });
    }

    // Funcionalidad para botones de planes de precios - Abrir modal de pago
    // Botones del Hero
    document.querySelectorAll('.btn-hero-primary').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            // Abrir modal de registro o scroll a pricing
            const signupButtons = document.querySelectorAll('.btn-signup');
            if (signupButtons.length > 0) {
                signupButtons[0].click();
            } else {
                // Scroll suave a la sección de precios
                document.querySelector('.pricing')?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    document.querySelectorAll('.btn-hero-secondary').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            // Scroll suave a la sección de características
            document.querySelector('.features')?.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // Botones de planes de precios
    document.querySelectorAll('.btn-plan').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const card = this.closest('.pricing-card');
            const planName = card.querySelector('h3').textContent;
            const planPrice = card.querySelector('.price-amount').textContent;
            const planPeriod = card.querySelector('.price-period').textContent;
            const fullPrice = planPrice + planPeriod;
            
            // Calcular precio para el resumen
            let price = 0;
            if (planName.includes('Gratuito')) {
                price = 0;
            } else if (planName.includes('Mensual')) {
                price = 59;
            } else if (planName.includes('Anual')) {
                price = 399;
            }
            
            // Actualizar información del plan en el modal
            document.getElementById('selectedPlanName').textContent = planName;
            document.getElementById('selectedPlanPrice').textContent = fullPrice;
            document.getElementById('paymentSubtotal').textContent = '$' + price.toFixed(2);
            document.getElementById('paymentTaxes').textContent = '$0.00';
            document.getElementById('paymentTotal').textContent = '$' + price.toFixed(2);
            
            // Resetear formulario
            if (paymentForm) {
                paymentForm.reset();
                paymentForm.style.display = 'block';
            }
            if (paymentSuccess) {
                paymentSuccess.style.display = 'none';
            }
            
            // Abrir modal de pago
            if (paymentModal) {
                openModal(paymentModal);
            }
        });
    });

    // Cerrar modal de pago
    if (closePaymentModal) {
        closePaymentModal.addEventListener('click', () => closeModalFunc(paymentModal));
    }

    if (paymentModal) {
        paymentModal.addEventListener('click', function(e) {
            if (e.target === paymentModal) {
                closeModalFunc(paymentModal);
            }
        });
    }

    // Botón de cancelar pago
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeModalFunc(paymentModal);
            // Resetear formulario
            if (paymentForm) {
                paymentForm.reset();
                paymentForm.style.display = 'block';
            }
            if (paymentSuccess) {
                paymentSuccess.style.display = 'none';
            }
            // Resetear estilos de los campos
            const inputs = paymentForm.querySelectorAll('input');
            inputs.forEach(input => {
                input.style.borderColor = '#e2e8f0';
                input.setCustomValidity('');
            });
        });
    }

    // Prevenir detección de campos de pago por el navegador (formulario ficticio)
    if (paymentForm) {
        // Deshabilitar completamente el autocompletado y detección de pago
        const paymentInputs = paymentForm.querySelectorAll('input');
        paymentInputs.forEach(input => {
            // Deshabilitar todos los tipos de autocompletado
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');
            input.setAttribute('data-lpignore', 'true');
            input.setAttribute('data-form-type', 'other');
            input.setAttribute('data-1p-ignore', 'true');
            input.setAttribute('data-bwignore', 'true');
            input.setAttribute('data-pwignore', 'true');
            
            // Cambiar el tipo a text para evitar detección
            if (input.type === 'email') {
                input.type = 'text';
                input.setAttribute('inputmode', 'email');
            }
            
            // Remover cualquier atributo que pueda identificar como campo de pago
            input.removeAttribute('data-payment');
        });
        
        // Marcar el formulario como no relacionado con pagos
        paymentForm.setAttribute('autocomplete', 'off');
        paymentForm.setAttribute('data-payment-form', 'demo');
        paymentForm.setAttribute('data-form-type', 'other');
    }
    
    // Procesar pago - Listener único para evitar conflictos
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            // Obtener valores del formulario
            const cardNumber = document.getElementById('cardNumber')?.value || '';
            const cardName = document.getElementById('cardName')?.value.trim() || '';
            const cardExpiry = document.getElementById('cardExpiry')?.value || '';
            const cardCVV = document.getElementById('cardCVV')?.value || '';
            const billingEmail = document.getElementById('billingEmail')?.value.trim() || '';
            const acceptTerms = document.getElementById('acceptPaymentTerms')?.checked || false;
            
            // Obtener referencias
            const paymentFormRef = document.getElementById('paymentForm');
            const paymentSuccess = document.getElementById('paymentSuccess');
            const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
            
            // Validaciones básicas y flexibles (formulario ficticio)
            let errors = [];
            
            // Validar que los campos no estén vacíos (validación básica)
            if (!cardNumber || cardNumber.trim().length < 4) {
                errors.push('Por favor, ingresa un número de tarjeta');
                const cardInput = document.getElementById('cardNumber');
                if (cardInput) cardInput.style.borderColor = '#ef4444';
            } else {
                const cardInput = document.getElementById('cardNumber');
                if (cardInput) cardInput.style.borderColor = '#10b981';
            }
            
            if (!cardName || cardName.length < 2) {
                errors.push('Por favor, ingresa un nombre');
                const nameInput = document.getElementById('cardName');
                if (nameInput) nameInput.style.borderColor = '#ef4444';
            } else {
                const nameInput = document.getElementById('cardName');
                if (nameInput) nameInput.style.borderColor = '#10b981';
            }
            
            // Validar formato básico de fecha (solo que tenga el formato MM/AA)
            if (!cardExpiry || cardExpiry.length < 4) {
                errors.push('Por favor, ingresa una fecha de vencimiento (MM/AA)');
                const expiryInput = document.getElementById('cardExpiry');
                if (expiryInput) expiryInput.style.borderColor = '#ef4444';
            } else {
                const expiryInput = document.getElementById('cardExpiry');
                if (expiryInput) expiryInput.style.borderColor = '#10b981';
            }
            
            if (!cardCVV || cardCVV.length < 3) {
                errors.push('Por favor, ingresa el CVV (mínimo 3 dígitos)');
                const cvvInput = document.getElementById('cardCVV');
                if (cvvInput) cvvInput.style.borderColor = '#ef4444';
            } else {
                const cvvInput = document.getElementById('cardCVV');
                if (cvvInput) cvvInput.style.borderColor = '#10b981';
            }
            
            // Validar email básico
            if (!billingEmail || !billingEmail.includes('@')) {
                errors.push('Por favor, ingresa un correo electrónico válido');
                const emailInput = document.getElementById('billingEmail');
                if (emailInput) emailInput.style.borderColor = '#ef4444';
            } else {
                const emailInput = document.getElementById('billingEmail');
                if (emailInput) emailInput.style.borderColor = '#10b981';
            }
            
            if (!acceptTerms) {
                errors.push('Debes aceptar los términos y condiciones para continuar');
            }
            
            // Si hay errores, mostrarlos y detener el proceso
            if (errors.length > 0) {
                alert('Por favor, completa los siguientes campos:\n\n' + errors.join('\n'));
                return;
            }
            
            const btn = document.getElementById('processPaymentBtn');
            if (!btn) return;
            const originalText = btn.innerHTML;
            
            // Deshabilitar botones durante el procesamiento
            btn.disabled = true;
            btn.innerHTML = '<i class="ri-loader-line"></i> Procesando...';
            if (cancelPaymentBtn) {
                cancelPaymentBtn.disabled = true;
            }
            
            // Simular delay de procesamiento (2 segundos)
            setTimeout(() => {
                // Ocultar formulario y mostrar éxito
                if (paymentFormRef) paymentFormRef.style.display = 'none';
                if (paymentSuccess) paymentSuccess.style.display = 'block';
                
                const planName = document.getElementById('selectedPlanName')?.textContent || 'Plan';
                const planPrice = document.getElementById('selectedPlanPrice')?.textContent || '$0';
                const cleanedCard = cardNumber.replace(/\s/g, '');
                const last4 = cleanedCard.length >= 4 ? cleanedCard.slice(-4) : '****';
                const cardType = cleanedCard.length > 0 ? getCardType(cardNumber) : 'Tarjeta';
                
                const successDetails = document.getElementById('successDetails');
                if (successDetails) {
                    successDetails.innerHTML = `
                        <div class="detail-row">
                            <strong>Plan:</strong> ${planName}
                        </div>
                        <div class="detail-row">
                            <strong>Precio:</strong> ${planPrice}
                        </div>
                        <div class="detail-row">
                            <strong>Tarjeta:</strong> ${cardType} **** **** **** ${last4}
                        </div>
                        <div class="detail-row">
                            <strong>Email:</strong> ${billingEmail}
                        </div>
                        <div class="detail-row">
                            <strong>Estado:</strong> <span style="color: #10b981;">Pago Procesado</span>
                        </div>
                        <div class="detail-row">
                            <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                    `;
                }
                
                btn.disabled = false;
                btn.innerHTML = originalText;
                if (cancelPaymentBtn) {
                    cancelPaymentBtn.disabled = false;
                }
            }, 2000);
        }, true); // Usar capture phase para interceptar antes que otros listeners
    }

    // Cerrar mensaje de éxito
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener('click', function() {
            closeModalFunc(paymentModal);
            // Resetear formulario
            const paymentFormRef = document.getElementById('paymentForm');
            if (paymentFormRef) {
                paymentFormRef.style.display = 'block';
                paymentFormRef.reset();
                // Re-aplicar atributos después del reset
                setTimeout(() => {
                    const inputs = paymentFormRef.querySelectorAll('input');
                    inputs.forEach(input => {
                        input.style.borderColor = '#e2e8f0';
                        input.setCustomValidity('');
                        input.setAttribute('autocomplete', 'off');
                        input.setAttribute('data-lpignore', 'true');
                        input.setAttribute('data-1p-ignore', 'true');
                        if (input.id === 'billingEmail' && input.type === 'email') {
                            input.type = 'text';
                            input.setAttribute('inputmode', 'email');
                        }
                    });
                }, 50);
            }
            if (paymentSuccess) {
                paymentSuccess.style.display = 'none';
            }
        });
    }

    // Funcionalidad básica para otros botones
    document.querySelectorAll('button').forEach(button => {
        // Excluir botones del carrusel, login, registro, modales y planes
        if (!button.classList.contains('carousel-next') && 
            !button.classList.contains('carousel-prev') && 
            !button.classList.contains('btn-login') &&
            !button.classList.contains('btn-signup') &&
            !button.classList.contains('modal-close') &&
            !button.classList.contains('btn-submit') &&
            !button.classList.contains('btn-plan')) {
            button.addEventListener('click', function() {
                const buttonText = this.textContent;
                if (buttonText.includes('Inicia')) {
                    alert('¡Gracias por tu interés! Esta es una demostración.');
                }
            });
        }
    });

    // Smooth scroll para enlaces
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});
