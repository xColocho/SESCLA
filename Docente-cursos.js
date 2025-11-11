// Gestión de cursos con Firebase para Docente
(function() {
    // Esperar a que Firebase esté cargado
    async function initCursos() {
        if (!window.cursoManager || !window.firebaseServices) {
            console.log('Esperando a que Firebase se cargue...');
            setTimeout(initCursos, 500);
            return;
        }

        const cursoManager = window.cursoManager;
        const authManager = window.authManager;
        const cursosGrid = document.getElementById('cursosGrid');
        const btnCrearCurso = document.getElementById('btnCrearCurso');
        const cursoModal = document.getElementById('cursoModal');
        const closeCursoModal = document.getElementById('closeCursoModal');
        const cancelCurso = document.getElementById('cancelCurso');
        const cursoForm = document.getElementById('cursoForm');
        const searchCurso = document.getElementById('searchCurso');

        // Obtener información del docente actual desde Firebase Auth
        let docenteId = null;
        let docenteNombre = null;
        
        async function obtenerDocenteActual() {
            // Esperar a que AuthManager esté listo (con más intentos)
            if (!authManager) {
                console.warn('AuthManager no disponible, esperando...');
                // Esperar hasta 5 segundos
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (authManager) break;
                }
                if (!authManager) {
                    console.error('AuthManager no disponible después de esperar');
                    // NO redirigir automáticamente, solo mostrar error
                    return;
                }
            }
            
            // Asegurar que AuthManager esté inicializado
            try {
                await authManager.ensureReady();
            } catch (error) {
                console.error('Error al asegurar que AuthManager esté listo:', error);
                // NO redirigir automáticamente, solo mostrar error
                return;
            }
            
            // Esperar un momento más para que la autenticación se complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verificar autenticación
            if (!authManager.estaAutenticado()) {
                console.warn('Usuario no autenticado');
                // NO redirigir automáticamente, solo mostrar mensaje
                const cursosGrid = document.getElementById('cursosGrid');
                if (cursosGrid) {
                    cursosGrid.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 40px;">No estás autenticado. Por favor, <a href="index.html">inicia sesión</a>.</p>';
                }
                return;
            }

            const user = authManager.getUsuarioActual();
            if (!user) {
                console.warn('No se pudo obtener usuario actual');
                // NO redirigir automáticamente
                return;
            }

            docenteId = user.uid;
            docenteNombre = user.displayName || user.email;

            // Intentar obtener información adicional desde Firestore
            try {
                const userData = await authManager.obtenerInformacionUsuario(user.uid);
                if (userData && userData.nombre) {
                    docenteNombre = userData.nombre;
                }
            } catch (error) {
                console.warn('No se pudo obtener información adicional del usuario:', error);
            }

            console.log('Docente autenticado:', { docenteId, docenteNombre });
        }

        // Función para renderizar cursos
        function renderCursos(cursos) {
            if (!cursosGrid) return;
            
            if (cursos.length === 0) {
                cursosGrid.innerHTML = '<p style="text-align: center; color: #666; padding: 40px;">No hay cursos disponibles. Crea tu primer curso.</p>';
                return;
            }

            cursosGrid.innerHTML = cursos.map(curso => {
                const fechaCreacion = curso.fechaCreacion ? 
                    new Date(curso.fechaCreacion.seconds * 1000).toLocaleDateString() : 
                    'Fecha no disponible';
                
                // Formatear temario para mostrar
                const temarioTexto = curso.temario && Array.isArray(curso.temario) 
                    ? curso.temario.slice(0, 3).map(t => `• ${t}`).join('<br>') + (curso.temario.length > 3 ? `<br><span style="color: #999; font-size: 12px;">+${curso.temario.length - 3} temas más</span>` : '')
                    : 'Sin temario definido';
                
                // Truncar descripción si es muy larga
                const descripcion = curso.descripcion || 'Sin descripción';
                const descripcionCorta = descripcion.length > 120 ? descripcion.substring(0, 120) + '...' : descripcion;
                
                return `
                    <div class="curso-card" data-id="${curso.id}" style="background: white; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s ease; display: flex; flex-direction: column; height: 100%;">
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                                <h3 style="font-size: 20px; font-weight: 700; color: #1f1f1f; margin: 0; line-height: 1.3; flex: 1;">${escapeHtml(curso.nombre)}</h3>
                                <span class="badge" style="background: ${curso.estado === 'Activo' ? '#10b981' : curso.estado === 'Inactivo' ? '#ef4444' : '#f59e0b'}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; white-space: nowrap; margin-left: 12px;">
                                    ${curso.estado || 'Borrador'}
                                </span>
                            </div>
                            
                            <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; min-height: 44px;">${escapeHtml(descripcionCorta)}</p>
                            
                            <div style="background: #f9fafb; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="ri-bookmark-line" style="color: #0056d2; font-size: 18px;"></i>
                                        <div>
                                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Categoría</div>
                                            <div style="font-size: 14px; color: #1f1f1f; font-weight: 500;">${escapeHtml(curso.categoria || 'General')}</div>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="ri-time-line" style="color: #0056d2; font-size: 18px;"></i>
                                        <div>
                                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Duración</div>
                                            <div style="font-size: 14px; color: #1f1f1f; font-weight: 500;">${curso.duracion || 0} horas</div>
                                        </div>
                                    </div>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="ri-user-line" style="color: #0056d2; font-size: 18px;"></i>
                                        <div>
                                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Estudiantes</div>
                                            <div style="font-size: 14px; color: #1f1f1f; font-weight: 500;">${curso.estudiantesInscritos || 0}</div>
                                        </div>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i class="ri-graduation-cap-line" style="color: #0056d2; font-size: 18px;"></i>
                                        <div>
                                            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Nivel</div>
                                            <div style="font-size: 14px; color: #1f1f1f; font-weight: 500;">${escapeHtml(curso.nivel || 'Principiante')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: auto;">
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 12px; color: #6b7280; font-weight: 600; margin-bottom: 8px; text-transform: uppercase;">Temario</div>
                                    <div style="font-size: 13px; color: #4b5563; line-height: 1.8;">${temarioTexto}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="curso-actions" style="display: flex; gap: 8px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <button class="btn btn-small" data-action="edit" data-id="${curso.id}" style="flex: 1; padding: 10px; font-weight: 600;">
                                <i class="ri-pencil-line"></i> Editar
                            </button>
                            <button class="btn btn-small btn-outline" data-action="view" data-id="${curso.id}" style="flex: 1; padding: 10px;">
                                <i class="ri-team-line"></i> Estudiantes
                            </button>
                            <button class="btn btn-small btn-outline" data-action="delete" data-id="${curso.id}" style="color: #ef4444; padding: 10px; min-width: auto;">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Agregar event listeners a los botones
            cursosGrid.addEventListener('click', handleCursoAction);
        }

        // Manejar acciones de cursos
        function handleCursoAction(e) {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.getAttribute('data-action');
            const cursoId = btn.getAttribute('data-id');
            if (!action || !cursoId) return;

            if (action === 'edit') {
                editarCurso(cursoId);
            } else if (action === 'view') {
                verEstudiantes(cursoId);
            } else if (action === 'delete') {
                eliminarCurso(cursoId);
            }
        }

        // Abrir modal para crear/editar curso
        function abrirModalCurso(curso = null) {
            if (!cursoModal) return;

            const titulo = document.getElementById('cursoModalTitle');
            const form = cursoForm;
            const idInput = document.getElementById('cursoId');

            if (titulo) {
                titulo.textContent = curso ? 'Editar Curso' : 'Crear Curso';
            }

            if (curso) {
                // Llenar formulario con datos del curso
                if (idInput) idInput.value = curso.id;
                document.getElementById('cursoNombre').value = curso.nombre || '';
                document.getElementById('cursoDescripcion').value = curso.descripcion || '';
                document.getElementById('cursoCategoria').value = curso.categoria || 'General';
                document.getElementById('cursoDuracion').value = curso.duracion || 10;
                document.getElementById('cursoNivel').value = curso.nivel || 'Principiante';
                document.getElementById('cursoEstado').value = curso.estado || 'Activo';
                document.getElementById('cursoVisibleEstudiantes').checked = curso.visibleEstudiantes !== false;
                
                // Cargar temario (convertir array a texto si existe)
                const temarioInput = document.getElementById('cursoTemario');
                if (temarioInput) {
                    if (curso.temario && Array.isArray(curso.temario)) {
                        temarioInput.value = curso.temario.join('\n');
                    } else if (curso.temario && typeof curso.temario === 'string') {
                        temarioInput.value = curso.temario;
                    } else {
                        temarioInput.value = '';
                    }
                }

            } else {
                // Resetear formulario
                if (form) form.reset();
                if (idInput) idInput.value = '';
                document.getElementById('cursoDuracion').value = 10;
                document.getElementById('cursoEstado').value = 'Activo';
                document.getElementById('cursoVisibleEstudiantes').checked = true;
                // Establecer valores por defecto del temario
                const temarioInput = document.getElementById('cursoTemario');
                if (temarioInput) {
                    temarioInput.value = 'Tema 1: Introducción\nTema 2: Conceptos básicos\nTema 3: Ejemplos prácticos\nTema 4: Evaluación';
                }
            }

            cursoModal.setAttribute('aria-hidden', 'false');
            cursoModal.style.display = 'flex';
        }

        // Cerrar modal
        function cerrarModalCurso() {
            if (!cursoModal) return;
            cursoModal.setAttribute('aria-hidden', 'true');
            cursoModal.style.display = 'none';
            if (cursoForm) cursoForm.reset();
        }

        // Crear o actualizar curso
        async function guardarCurso(e) {
            e.preventDefault();

            const idInput = document.getElementById('cursoId');
            const cursoId = idInput ? idInput.value : null;
            const esEdicion = !!cursoId;

            const cursoData = cursoManager.createCursoData(
                document.getElementById('cursoNombre').value.trim(),
                document.getElementById('cursoDescripcion').value.trim(),
                docenteId,
                docenteNombre,
                '', // Sin imagen
                document.getElementById('cursoCategoria').value,
                parseInt(document.getElementById('cursoDuracion').value),
                document.getElementById('cursoEstado').value,
                document.getElementById('cursoTemario').value.trim()
            );

            // Agregar campos adicionales
            cursoData.nivel = document.getElementById('cursoNivel').value;
            cursoData.visibleEstudiantes = document.getElementById('cursoVisibleEstudiantes').checked;

            let result;
            if (esEdicion) {
                // Actualizar curso existente
                result = await cursoManager.actualizarCurso(cursoId, cursoData);
            } else {
                // Crear nuevo curso
                result = await cursoManager.crearCurso(cursoData);
            }

            if (result.success) {
                mostrarMensaje('mensajeCurso', esEdicion ? 'Curso actualizado correctamente' : 'Curso creado correctamente', 'success');
                cerrarModalCurso();
                cargarCursos();
            } else {
                mostrarMensaje('mensajeCurso', 'Error: ' + result.error, 'error');
            }
        }

        // Editar curso
        async function editarCurso(cursoId) {
            const result = await cursoManager.obtenerCursoPorId(cursoId);
            if (result.success) {
                abrirModalCurso(result.curso);
            } else {
                mostrarMensaje('mensajeCurso', 'Error al cargar el curso: ' + result.error, 'error');
            }
        }

        // Eliminar curso
        async function eliminarCurso(cursoId) {
            if (!confirm('¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.')) {
                return;
            }

            const result = await cursoManager.eliminarCurso(cursoId);
            if (result.success) {
                mostrarMensaje('mensajeCurso', 'Curso eliminado correctamente', 'success');
                cargarCursos();
            } else {
                mostrarMensaje('mensajeCurso', 'Error: ' + result.error, 'error');
            }
        }

        // Ver estudiantes
        function verEstudiantes(cursoId) {
            alert('Función de ver estudiantes próximamente. Curso ID: ' + cursoId);
            // Aquí puedes implementar la lógica para mostrar estudiantes inscritos
        }

        // Cargar cursos
        async function cargarCursos() {
            const result = await cursoManager.obtenerCursosPorDocente(docenteId);
            if (result.success) {
                let cursos = result.cursos;

                // Filtrar por búsqueda si hay texto
                if (searchCurso && searchCurso.value.trim()) {
                    const searchTerm = searchCurso.value.toLowerCase().trim();
                    cursos = cursos.filter(curso => 
                        curso.nombre.toLowerCase().includes(searchTerm) ||
                        (curso.descripcion && curso.descripcion.toLowerCase().includes(searchTerm))
                    );
                }

                renderCursos(cursos);
            } else {
                console.error('Error al cargar cursos:', result.error);
                mostrarMensaje('mensajeCurso', 'Error al cargar cursos: ' + result.error, 'error');
            }
        }

        // Utilidades
        function mostrarMensaje(id, texto, tipo) {
            // Crear elemento de mensaje si no existe
            let mensajeEl = document.getElementById(id);
            if (!mensajeEl) {
                mensajeEl = document.createElement('div');
                mensajeEl.id = id;
                mensajeEl.className = 'mensaje';
                const gestionCursos = document.getElementById('gestion-cursos');
                if (gestionCursos) {
                    gestionCursos.insertBefore(mensajeEl, gestionCursos.firstChild);
                }
            }
            mensajeEl.textContent = texto;
            mensajeEl.className = 'mensaje ' + tipo;
            setTimeout(() => {
                mensajeEl.className = 'mensaje';
                mensajeEl.textContent = '';
            }, 5000);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Event listeners
        if (btnCrearCurso) {
            btnCrearCurso.addEventListener('click', () => abrirModalCurso());
        }

        if (closeCursoModal) {
            closeCursoModal.addEventListener('click', cerrarModalCurso);
        }

        if (cancelCurso) {
            cancelCurso.addEventListener('click', cerrarModalCurso);
        }

        if (cursoModal) {
            cursoModal.addEventListener('click', function(e) {
                if (e.target === cursoModal) cerrarModalCurso();
            });
        }

        if (cursoForm) {
            cursoForm.addEventListener('submit', guardarCurso);
        }

        if (searchCurso) {
            searchCurso.addEventListener('input', cargarCursos);
        }


        // Función para agregar un nuevo tema al temario
        function agregarTema() {
            const temarioInput = document.getElementById('cursoTemario');
            if (!temarioInput) return;
            
            // Obtener el contenido actual del temario
            const lineas = temarioInput.value.split('\n').filter(line => line.trim() !== '');
            
            // Encontrar el último número de tema
            let ultimoNumero = 0;
            lineas.forEach(linea => {
                const match = linea.match(/^Tema\s+(\d+):/i);
                if (match) {
                    const numero = parseInt(match[1]);
                    if (numero > ultimoNumero) {
                        ultimoNumero = numero;
                    }
                }
            });
            
            // Si no hay temas numerados, contar las líneas
            if (ultimoNumero === 0) {
                ultimoNumero = lineas.length;
            }
            
            // Agregar el nuevo tema
            const nuevoTema = `Tema ${ultimoNumero + 1}: `;
            
            // Agregar al final del textarea
            if (temarioInput.value.trim() === '') {
                temarioInput.value = nuevoTema;
            } else {
                temarioInput.value += '\n' + nuevoTema;
            }
            
            // Enfocar el textarea y posicionar el cursor al final del nuevo tema
            temarioInput.focus();
            const posicion = temarioInput.value.length;
            temarioInput.setSelectionRange(posicion, posicion);
            
            // Scroll al final
            temarioInput.scrollTop = temarioInput.scrollHeight;
        }

        // Agregar event listener al botón de agregar tema
        const btnAgregarTema = document.getElementById('btnAgregarTema');
        if (btnAgregarTema) {
            btnAgregarTema.addEventListener('click', agregarTema);
        }

        // Inicializar docente y cargar cursos
        try {
            await obtenerDocenteActual();
            if (docenteId) {
                console.log('✅ Docente inicializado correctamente, cargando cursos...');
                cargarCursos();
            } else {
                console.error('❌ No se pudo obtener información del docente');
                // No redirigir automáticamente, solo mostrar error
                const cursosGrid = document.getElementById('cursosGrid');
                if (cursosGrid) {
                    cursosGrid.innerHTML = '<p style="text-align: center; color: #ef4444; padding: 40px;">Error al cargar información del docente. Por favor, recarga la página.</p>';
                }
            }
        } catch (error) {
            console.error('❌ Error al inicializar docente:', error);
            // No redirigir automáticamente en caso de error
        }

        // Suscripción en tiempo real (opcional)
        // cursoManager.suscribirseACursos((cursos) => {
        //     const cursosDocente = cursos.filter(c => c.docenteId === docenteId);
        //     renderCursos(cursosDocente);
        // });
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCursos);
    } else {
        initCursos();
    }

    // Agregar funcionalidad de cerrar sesión
    document.addEventListener('DOMContentLoaded', function() {
        const logoutLinks = document.querySelectorAll('.link-logout');
        logoutLinks.forEach(link => {
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                if (window.authManager) {
                    await window.authManager.cerrarSesion();
                }
                window.location.href = 'index.html';
            });
        });
    });
})();

