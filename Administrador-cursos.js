// Gestión de cursos para Administrador
(function() {
    async function initCursosAdmin() {
        if (!window.cursoManager || !window.firebaseServices) {
            console.log('Esperando a que Firebase se cargue...');
            setTimeout(initCursosAdmin, 500);
            return;
        }

        const cursoManager = window.cursoManager;
        const cursosGrid = document.getElementById('cursosGrid');
        const searchCurso = document.getElementById('searchCurso');

        if (!cursosGrid) return;

        // Función para escapar HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Cargar todos los cursos
        async function cargarCursos() {
            try {
                const result = await cursoManager.obtenerTodosLosCursos();
                
                if (!result.success) {
                    cursosGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444;">Error al cargar cursos: ${escapeHtml(result.error)}</p>`;
                    return;
                }

                const cursos = result.cursos || [];
                renderCursos(cursos);
            } catch (error) {
                console.error('Error al cargar cursos:', error);
                cursosGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #ef4444;">Error al cargar cursos: ${escapeHtml(error.message)}</p>`;
            }
        }

        // Renderizar cursos
        function renderCursos(cursos) {
            if (cursos.length === 0) {
                cursosGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">No hay cursos registrados.</p>';
                return;
            }

            cursosGrid.innerHTML = cursos.map(curso => {
                const temario = curso.temario && Array.isArray(curso.temario) 
                    ? curso.temario.join(', ') 
                    : curso.temario || 'Sin temario';
                
                return `
                    <div class="curso-card" data-id="${curso.id}" style="background: white; border: 1px solid #e0e0e0; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s;">
                        ${curso.imagenUrl ? `<img src="${escapeHtml(curso.imagenUrl)}" alt="${escapeHtml(curso.nombre)}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 15px;">` : ''}
                        <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 10px; color: #1f1f1f;">${escapeHtml(curso.nombre)}</h3>
                        <p style="color: #666; font-size: 14px; margin: 8px 0; line-height: 1.5;">${escapeHtml(curso.descripcion || 'Sin descripción')}</p>
                        <div style="margin: 15px 0; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                            <p style="font-size: 12px; color: #666; margin: 4px 0;"><strong>Docente:</strong> ${escapeHtml(curso.docenteNombre || 'No especificado')}</p>
                            <p style="font-size: 12px; color: #666; margin: 4px 0;"><strong>Categoría:</strong> ${escapeHtml(curso.categoria || 'General')}</p>
                            <p style="font-size: 12px; color: #666; margin: 4px 0;"><strong>Nivel:</strong> ${escapeHtml(curso.nivel || 'Principiante')}</p>
                            <p style="font-size: 12px; color: #666; margin: 4px 0;"><strong>Duración:</strong> ${curso.duracion || 0} horas</p>
                            <p style="font-size: 12px; color: #666; margin: 4px 0;"><strong>Estudiantes:</strong> ${curso.estudiantesInscritos || 0}</p>
                        </div>
                        <div style="margin: 10px 0;">
                            <span class="badge" style="background: ${curso.estado === 'Activo' ? '#10b981' : curso.estado === 'Inactivo' ? '#ef4444' : '#f59e0b'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; display: inline-block; margin-right: 5px;">
                                ${escapeHtml(curso.estado || 'Borrador')}
                            </span>
                        </div>
                        <div style="margin-top: 15px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <button class="btn btn-small" data-action="view" data-id="${curso.id}" style="flex: 1; min-width: 100px;">
                                <i class="ri-eye-line"></i> Ver Detalles
                            </button>
                            <button class="btn btn-small btn-outline" data-action="delete" data-id="${curso.id}" style="color: #ef4444; flex: 1; min-width: 100px;">
                                <i class="ri-delete-bin-line"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            // Agregar event listeners
            cursosGrid.addEventListener('click', handleCursoAction);
        }

        // Manejar acciones de cursos
        async function handleCursoAction(e) {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.getAttribute('data-action');
            const cursoId = btn.getAttribute('data-id');
            if (!action || !cursoId) return;

            if (action === 'view') {
                // Ver detalles del curso
                const result = await cursoManager.obtenerCursoPorId(cursoId);
                if (result.success) {
                    const curso = result.curso;
                    const temario = curso.temario && Array.isArray(curso.temario) 
                        ? curso.temario.map((t, i) => `${i + 1}. ${t}`).join('\n')
                        : curso.temario || 'Sin temario';
                    
                    const detalles = `
Nombre: ${curso.nombre}
Descripción: ${curso.descripcion || 'Sin descripción'}
Docente: ${curso.docenteNombre || 'No especificado'}
Categoría: ${curso.categoria || 'General'}
Nivel: ${curso.nivel || 'Principiante'}
Duración: ${curso.duracion || 0} horas
Estado: ${curso.estado || 'Borrador'}
Estudiantes inscritos: ${curso.estudiantesInscritos || 0}

Temario:
${temario}
                    `;
                    alert(detalles);
                } else {
                    mostrarMensaje('Error al cargar detalles del curso: ' + result.error, 'error');
                }
            } else if (action === 'delete') {
                // Eliminar curso
                if (!confirm('¿Estás seguro de eliminar este curso? Esta acción eliminará el curso y todos sus datos asociados. Esta acción no se puede deshacer.')) {
                    return;
                }

                const result = await cursoManager.eliminarCurso(cursoId);
                if (result.success) {
                    mostrarMensaje('Curso eliminado correctamente', 'success');
                    await cargarCursos();
                } else {
                    mostrarMensaje('Error al eliminar curso: ' + result.error, 'error');
                }
            }
        }

        // Función para mostrar mensajes
        function mostrarMensaje(texto, tipo) {
            let mensajeEl = document.getElementById('adminMensaje');
            if (!mensajeEl) {
                mensajeEl = document.createElement('div');
                mensajeEl.id = 'adminMensaje';
                mensajeEl.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 8px; z-index: 10000; font-weight: 500; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
                document.body.appendChild(mensajeEl);
            }
            
            mensajeEl.textContent = texto;
            mensajeEl.style.background = tipo === 'success' ? '#10b981' : '#ef4444';
            mensajeEl.style.color = 'white';
            
            setTimeout(() => {
                if (mensajeEl) {
                    mensajeEl.style.opacity = '0';
                    mensajeEl.style.transition = 'opacity 0.3s';
                    setTimeout(() => {
                        if (mensajeEl && mensajeEl.parentNode) {
                            mensajeEl.parentNode.removeChild(mensajeEl);
                        }
                    }, 300);
                }
            }, 3000);
        }

        // Filtrar cursos
        function filtrarCursos() {
            const query = (searchCurso?.value || '').toLowerCase().trim();
            if (!query) {
                cargarCursos();
                return;
            }

            cursoManager.obtenerTodosLosCursos().then(result => {
                if (result.success) {
                    const cursos = result.cursos || [];
                    const filtrados = cursos.filter(curso => {
                        const nombre = (curso.nombre || '').toLowerCase();
                        const docente = (curso.docenteNombre || '').toLowerCase();
                        const categoria = (curso.categoria || '').toLowerCase();
                        return nombre.includes(query) || docente.includes(query) || categoria.includes(query);
                    });
                    renderCursos(filtrados);
                }
            });
        }

        // Event listeners
        if (searchCurso) {
            searchCurso.addEventListener('input', filtrarCursos);
        }

        // Cargar cursos inicialmente
        await cursoManager.ensureReady();
        await cargarCursos();
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCursosAdmin);
    } else {
        initCursosAdmin();
    }
})();

