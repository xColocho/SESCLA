(function() {
    // Sistema de pestañas
    var tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tabId = btn.getAttribute('data-tab');
            
            // Remover active de todos los botones y contenidos
            document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
            document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
            
            // Activar el seleccionado
            btn.classList.add('active');
            var content = document.getElementById('tab-' + tabId);
            if (content) content.classList.add('active');
        });
    });

    // Formulario de inscripción
    var formInscripcion = document.getElementById('formInscripcion');
    if (formInscripcion) {
        formInscripcion.addEventListener('submit', function(e) {
            e.preventDefault();
            var curso = document.getElementById('selectCurso').value;
            var estudiante = document.getElementById('selectEstudiante').value;
            
            if (curso && estudiante) {
                mostrarMensaje('mensajeInscripcion', 'Estudiante inscrito correctamente al curso.', 'success');
                formInscripcion.reset();
            }
        });
    }

    // Formulario de importación
    var formImportacion = document.getElementById('formImportacion');
    var fileInput = document.getElementById('fileImportacion');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                var fileName = file.name;
                var uploadLabel = document.querySelector('.upload-label span:not(.upload-icon)');
                if (uploadLabel) {
                    uploadLabel.textContent = 'Archivo seleccionado: ' + fileName;
                }
            }
        });
    }

    if (formImportacion) {
        formImportacion.addEventListener('submit', function(e) {
            e.preventDefault();
            if (fileInput && fileInput.files.length > 0) {
                mostrarMensaje('mensajeImportacion', 'Estudiantes importados correctamente desde el archivo CSV.', 'success');
                formImportacion.reset();
                var uploadLabel = document.querySelector('.upload-label span:not(.upload-icon)');
                if (uploadLabel) {
                    uploadLabel.textContent = 'Haz clic para seleccionar archivo CSV';
                }
            } else {
                mostrarMensaje('mensajeImportacion', 'Por favor selecciona un archivo CSV.', 'error');
            }
        });
    }

    // Formulario de sesión virtual
    var formSesion = document.getElementById('formSesion');
    if (formSesion) {
        formSesion.addEventListener('submit', function(e) {
            e.preventDefault();
            var titulo = document.getElementById('sesionTitulo').value;
            mostrarMensaje('mensajeSesion', 'Sesión virtual programada correctamente: ' + titulo, 'success');
            formSesion.reset();
        });
    }

    // Modal de sesión virtual
    var sesionModal = document.getElementById('sesionModal');
    var closeSesionModal = document.getElementById('closeSesionModal');
    var btnFinalizar = document.getElementById('btnFinalizarSesion');
    var sesionesActivas = document.getElementById('sesionesActivas');

    function abrirSesion(titulo) {
        if (!sesionModal) return;
        
        var tituloModal = document.getElementById('sesionTituloModal');
        if (tituloModal) tituloModal.textContent = titulo || 'Sesión Virtual';
        
        sesionModal.setAttribute('aria-hidden', 'false');
        sesionModal.style.display = 'flex';
        
        iniciarTimer();
        simularEstudiantes();
    }

    function cerrarSesion() {
        if (!sesionModal) return;
        sesionModal.setAttribute('aria-hidden', 'true');
        sesionModal.style.display = 'none';
        if (timerInterval) clearInterval(timerInterval);
    }

    if (closeSesionModal) {
        closeSesionModal.addEventListener('click', cerrarSesion);
    }

    if (sesionModal) {
        sesionModal.addEventListener('click', function(e) {
            if (e.target === sesionModal) cerrarSesion();
        });
    }

    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', function() {
            if (confirm('¿Estás seguro de finalizar la sesión?')) {
                cerrarSesion();
                mostrarMensaje('mensajeSesion', 'Sesión finalizada correctamente.', 'success');
            }
        });
    }

    // Botones para iniciar sesión desde la lista
    if (sesionesActivas) {
        sesionesActivas.addEventListener('click', function(e) {
            var btn = e.target;
            if (btn.getAttribute('data-action') === 'iniciar-sesion') {
                var sesionCard = btn.closest('.sesion-card');
                var titulo = sesionCard ? sesionCard.querySelector('h4').textContent : 'Sesión Virtual';
                abrirSesion(titulo);
            }
        });
    }

    // Chat en tiempo real
    var formChat = document.getElementById('formChat');
    var chatInput = document.getElementById('chatInput');
    var chatMessages = document.getElementById('chatMessages');

    if (formChat) {
        formChat.addEventListener('submit', function(e) {
            e.preventDefault();
            var mensaje = chatInput.value.trim();
            if (mensaje && chatMessages) {
                agregarMensaje('Docente', mensaje);
                chatInput.value = '';
                
                // Simular respuesta de estudiante después de 1-2 segundos
                setTimeout(function() {
                    var estudiantes = ['Juan García', 'María López', 'Pedro Martínez'];
                    var estudiante = estudiantes[Math.floor(Math.random() * estudiantes.length)];
                    var respuestas = ['Entendido', 'Gracias', '¿Puedes repetir?', 'Perfecto', 'Claro'];
                    agregarMensaje(estudiante, respuestas[Math.floor(Math.random() * respuestas.length)]);
                }, 1000 + Math.random() * 1000);
            }
        });
    }

    function agregarMensaje(usuario, texto) {
        if (!chatMessages) return;
        var div = document.createElement('div');
        div.className = 'chat-message';
        div.innerHTML = '<span class="chat-user">' + escapeHtml(usuario) + ':</span> <span class="chat-text">' + escapeHtml(texto) + '</span>';
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Timer de sesión
    var timerInterval = null;
    var tiempoInicio = null;

    function iniciarTimer() {
        tiempoInicio = Date.now();
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(function() {
            var duracion = document.getElementById('sesionDuracion');
            if (duracion) {
                var segundos = Math.floor((Date.now() - tiempoInicio) / 1000);
                var minutos = Math.floor(segundos / 60);
                var segs = segundos % 60;
                duracion.textContent = (minutos < 10 ? '0' : '') + minutos + ':' + (segs < 10 ? '0' : '') + segs;
            }
        }, 1000);
    }

    // Simular estudiantes conectados
    function simularEstudiantes() {
        var estudiantesEl = document.getElementById('estudiantesConectados');
        if (!estudiantesEl) return;
        
        var count = 12;
        estudiantesEl.textContent = count + ' estudiantes conectados';
        
        setInterval(function() {
            if (sesionModal.style.display === 'flex') {
                count += Math.random() > 0.7 ? 1 : 0;
                if (count > 15) count = 15;
                estudiantesEl.textContent = count + ' estudiantes conectados';
            }
        }, 3000);
    }

    // Utilidades
    function mostrarMensaje(id, texto, tipo) {
        var el = document.getElementById(id);
        if (!el) return;
        el.textContent = texto;
        el.className = 'mensaje ' + tipo;
        setTimeout(function() {
            el.className = 'mensaje';
            el.textContent = '';
        }, 5000);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function(c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
        });
    }
})();

