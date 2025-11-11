// Gestión de estudiantes para Administrador
(function() {
    async function initEstudiantesAdmin() {
        if (!window.firebaseServices || !window.firebaseServices.db) {
            console.log('Esperando a que Firebase se cargue...');
            setTimeout(initEstudiantesAdmin, 500);
            return;
        }

        const db = window.firebaseServices.db;
        const tablaEstudiantes = document.getElementById('tablaEstudiantes');
        const searchEstudiante = document.getElementById('searchEstudiante');

        if (!tablaEstudiantes) return;

        // Función para escapar HTML
        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Cargar todos los estudiantes
        async function cargarEstudiantes() {
            try {
                const snapshot = await db.collection('usuarios').get();
                
                const estudiantes = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Solo incluir estudiantes (no docentes ni administradores)
                    if (data.tipoUsuario === 'estudiante' || (!data.tipoUsuario && !data.docenteId)) {
                        estudiantes.push({
                            id: doc.id,
                            nombre: data.nombre || data.displayName || 'Sin nombre',
                            email: data.email || '',
                            fechaCreacion: data.fechaCreacion,
                            cursosInscritos: data.cursosInscritos || []
                        });
                    }
                });

                renderEstudiantes(estudiantes);
            } catch (error) {
                console.error('Error al cargar estudiantes:', error);
                tablaEstudiantes.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: #ef4444;">Error al cargar estudiantes: ${escapeHtml(error.message)}</td></tr>`;
            }
        }

        // Renderizar estudiantes
        function renderEstudiantes(estudiantes) {
            if (estudiantes.length === 0) {
                tablaEstudiantes.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: #666;">No hay estudiantes registrados.</td></tr>';
                return;
            }

            tablaEstudiantes.innerHTML = estudiantes.map(estudiante => {
                const fechaCreacion = estudiante.fechaCreacion 
                    ? (estudiante.fechaCreacion.toDate ? estudiante.fechaCreacion.toDate().toLocaleDateString() : 'N/A')
                    : 'N/A';
                
                const cursosCount = Array.isArray(estudiante.cursosInscritos) 
                    ? estudiante.cursosInscritos.length 
                    : 0;

                return `
                    <tr>
                        <td>${escapeHtml(estudiante.nombre)}</td>
                        <td>${escapeHtml(estudiante.email)}</td>
                        <td>${cursosCount} curso(s)</td>
                        <td>${fechaCreacion}</td>
                        <td>
                            <button class="btn btn-small btn-outline" data-action="delete" data-id="${estudiante.id}" style="color: #ef4444;">
                                <i class="ri-delete-bin-line"></i> Eliminar
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Agregar event listeners
            tablaEstudiantes.addEventListener('click', handleEstudianteAction);
        }

        // Manejar acciones de estudiantes
        async function handleEstudianteAction(e) {
            const btn = e.target.closest('button');
            if (!btn) return;

            const action = btn.getAttribute('data-action');
            const estudianteId = btn.getAttribute('data-id');
            if (!action || !estudianteId) return;

            if (action === 'delete') {
                // Eliminar estudiante
                if (!confirm('¿Estás seguro de eliminar este estudiante? Esta acción eliminará el estudiante y todos sus datos asociados. Esta acción no se puede deshacer.')) {
                    return;
                }

                try {
                    // Eliminar de la colección de usuarios
                    await db.collection('usuarios').doc(estudianteId).delete();
                    
                    // También eliminar de Firebase Auth si es posible
                    // Nota: Esto requiere permisos especiales, por ahora solo eliminamos de Firestore
                    
                    mostrarMensaje('Estudiante eliminado correctamente', 'success');
                    await cargarEstudiantes();
                } catch (error) {
                    console.error('Error al eliminar estudiante:', error);
                    mostrarMensaje('Error al eliminar estudiante: ' + error.message, 'error');
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

        // Filtrar estudiantes
        function filtrarEstudiantes() {
            const query = (searchEstudiante?.value || '').toLowerCase().trim();
            if (!query) {
                cargarEstudiantes();
                return;
            }

            db.collection('usuarios').get().then(snapshot => {
                const estudiantes = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.tipoUsuario === 'estudiante' || (!data.tipoUsuario && !data.docenteId)) {
                        const nombre = (data.nombre || data.displayName || '').toLowerCase();
                        const email = (data.email || '').toLowerCase();
                        if (nombre.includes(query) || email.includes(query)) {
                            estudiantes.push({
                                id: doc.id,
                                nombre: data.nombre || data.displayName || 'Sin nombre',
                                email: data.email || '',
                                fechaCreacion: data.fechaCreacion,
                                cursosInscritos: data.cursosInscritos || []
                            });
                        }
                    }
                });
                renderEstudiantes(estudiantes);
            });
        }

        // Event listeners
        if (searchEstudiante) {
            searchEstudiante.addEventListener('input', filtrarEstudiantes);
        }

        // Cargar estudiantes inicialmente
        await cargarEstudiantes();
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEstudiantesAdmin);
    } else {
        initEstudiantesAdmin();
    }
})();

