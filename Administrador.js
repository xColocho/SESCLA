// Gestión de docentes con Firebase Firestore
(function() {
    // Esperar a que Firebase esté cargado
    function initDocentes() {
        if (!window.firebaseServices || !window.firebaseServices.db) {
            console.log('Esperando a que Firebase se cargue...');
            setTimeout(initDocentes, 500);
            return;
        }

        const db = window.firebaseServices.db;
        const collection = 'docentes';

        var btnCrear = document.getElementById('btnCrearDocente');
        var searchInput = document.getElementById('searchDocente');
        var tbody = document.getElementById('tablaDocentes');
        var modal = document.getElementById('docenteModal');
        var closeModalBtn = document.getElementById('closeDocenteModal');
        var cancelBtn = document.getElementById('cancelDocente');
        var form = document.getElementById('docenteForm');
        var fieldId = document.getElementById('docenteId');
        var fieldNombre = document.getElementById('docenteNombre');
        var fieldCorreo = document.getElementById('docenteCorreo');
        var fieldEstado = document.getElementById('docenteEstado');
        var fieldRoles = document.getElementById('docenteRoles');

        // Cargar docentes desde Firestore
        async function loadDocentes() {
            try {
                const snapshot = await db.collection(collection)
                    .orderBy('fechaCreacion', 'desc')
                    .get();
                
                const docentes = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    docentes.push({
                        id: doc.id,
                        nombre: data.nombre || '',
                        correo: data.email || data.correo || '',
                        estado: data.estado || 'Activo',
                        roles: data.roles || []
                    });
                });
                return docentes;
            } catch (error) {
                console.error('Error al cargar docentes:', error);
                return [];
            }
        }

        // Guardar docente en Firestore
        async function saveDocente(docente) {
            try {
                const docenteData = {
                    nombre: docente.nombre,
                    email: docente.correo,
                    correo: docente.correo, // Mantener ambos para compatibilidad
                    estado: docente.estado,
                    roles: docente.roles,
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (docente.id) {
                    // Actualizar docente existente
                    await db.collection(collection).doc(docente.id).update(docenteData);
                } else {
                    // Crear nuevo docente
                    docenteData.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
                    const docRef = await db.collection(collection).add(docenteData);
                    docente.id = docRef.id;
                }
                return { success: true };
            } catch (error) {
                console.error('Error al guardar docente:', error);
                return { success: false, error: error.message };
            }
        }

        // Eliminar docente
        async function deleteDocente(id) {
            try {
                await db.collection(collection).doc(id).delete();
                return { success: true };
            } catch (error) {
                console.error('Error al eliminar docente:', error);
                return { success: false, error: error.message };
            }
        }

        function openModal(docente) {
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = 'flex';
            if (docente) {
                fieldId.value = docente.id;
                fieldNombre.value = docente.nombre;
                fieldCorreo.value = docente.correo;
                fieldEstado.value = docente.estado;
                setMultipleSelect(fieldRoles, docente.roles || []);
            } else {
                fieldId.value = '';
                form.reset();
                setMultipleSelect(fieldRoles, []);
            }
            setTimeout(function(){ fieldNombre.focus(); }, 0);
        }

        function closeModal() {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
            form.reset();
            fieldId.value = '';
            setMultipleSelect(fieldRoles, []);
        }

        function setMultipleSelect(selectEl, values) {
            Array.from(selectEl.options).forEach(function(opt) {
                opt.selected = values.indexOf(opt.value) !== -1;
            });
        }

        function getSelectedValues(selectEl) {
            return Array.from(selectEl.selectedOptions).map(function(o){ return o.value; });
        }

        async function render(list) {
            tbody.innerHTML = '';
            
            if (list.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px; color: #666;">No hay docentes registrados. Crea el primero.</td></tr>';
                return;
            }

            list.forEach(function(d) {
                var tr = document.createElement('tr');
                tr.innerHTML = [
                    '<td>' + escapeHtml(d.nombre) + '</td>',
                    '<td>' + escapeHtml(d.correo) + '</td>',
                    '<td><span class="badge" style="background: ' + (d.estado === 'Activo' ? '#10b981' : '#ef4444') + '; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">' + escapeHtml(d.estado) + '</span></td>',
                    '<td>' +
                        '<button class="btn btn-small" data-action="edit" data-id="' + d.id + '"><i class="ri-pencil-line"></i> Editar</button> ' +
                        (d.estado === 'Activo'
                            ? '<button class="btn btn-small btn-outline" data-action="toggle" data-id="' + d.id + '"><i class="ri-close-line"></i> Desactivar</button>'
                            : '<button class="btn btn-small btn-primary" data-action="toggle" data-id="' + d.id + '"><i class="ri-check-line"></i> Activar</button>') +
                        ' <button class="btn btn-small btn-outline" data-action="delete" data-id="' + d.id + '" style="color: #ef4444;"><i class="ri-delete-bin-line"></i> Eliminar</button>' +
                    '</td>'
                ].join('');
                tbody.appendChild(tr);
            });
        }

        function escapeHtml(s) {
            return String(s).replace(/[&<>"]/g, function(c){
                return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]);
            });
        }

        async function upsertDocente(payload) {
            const result = await saveDocente(payload);
            if (result.success) {
                await applyFilter();
                mostrarMensaje('Docente guardado correctamente', 'success');
            } else {
                mostrarMensaje('Error al guardar: ' + result.error, 'error');
            }
        }

        async function toggleEstado(id) {
            try {
                const docRef = db.collection(collection).doc(id);
                const doc = await docRef.get();
                if (!doc.exists) {
                    mostrarMensaje('Docente no encontrado', 'error');
                    return;
                }

                const currentEstado = doc.data().estado;
                const newEstado = currentEstado === 'Activo' ? 'Inactivo' : 'Activo';
                
                await docRef.update({
                    estado: newEstado,
                    fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });

                await applyFilter();
                mostrarMensaje('Estado actualizado correctamente', 'success');
            } catch (error) {
                console.error('Error al cambiar estado:', error);
                mostrarMensaje('Error al actualizar estado: ' + error.message, 'error');
            }
        }

        async function eliminarDocente(id) {
            if (!confirm('¿Estás seguro de eliminar este docente? Esta acción no se puede deshacer.')) {
                return;
            }

            const result = await deleteDocente(id);
            if (result.success) {
                await applyFilter();
                mostrarMensaje('Docente eliminado correctamente', 'success');
            } else {
                mostrarMensaje('Error al eliminar: ' + result.error, 'error');
            }
        }

        var docentes = [];
        var filteredDocentes = [];

        async function applyFilter() {
            docentes = await loadDocentes();
            var q = (searchInput.value || '').toLowerCase().trim();
            if (!q) { 
                filteredDocentes = docentes;
                render(filteredDocentes);
                return;
            }
            filteredDocentes = docentes.filter(function(d){
                return d.nombre.toLowerCase().indexOf(q) !== -1 || d.correo.toLowerCase().indexOf(q) !== -1;
            });
            render(filteredDocentes);
        }

        function mostrarMensaje(texto, tipo) {
            // Crear o actualizar mensaje
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

        // Inicializar
        applyFilter();

        // Suscripción en tiempo real (opcional)
        db.collection(collection)
            .orderBy('fechaCreacion', 'desc')
            .onSnapshot((snapshot) => {
                applyFilter();
            }, (error) => {
                console.error('Error en suscripción:', error);
            });

        // Events
        if (btnCrear) btnCrear.addEventListener('click', function(){ openModal(null); });
        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (modal) modal.addEventListener('click', function(e){ if (e.target === modal) closeModal(); });

        if (searchInput) searchInput.addEventListener('input', applyFilter);

        if (tbody) tbody.addEventListener('click', function(e){
            var t = e.target.closest('button');
            if (!t) return;
            var action = t.getAttribute('data-action');
            var id = t.getAttribute('data-id');
            if (!action || !id) return;

            if (action === 'edit') {
                var doc = filteredDocentes.find(function(x){ return x.id === id; });
                if (doc) openModal(doc);
            }
            if (action === 'toggle') {
                toggleEstado(id);
            }
            if (action === 'delete') {
                eliminarDocente(id);
            }
        });

        if (form) form.addEventListener('submit', async function(e){
            e.preventDefault();
            var payload = {
                id: fieldId.value || null,
                nombre: fieldNombre.value.trim(),
                correo: fieldCorreo.value.trim().toLowerCase(),
                estado: fieldEstado.value,
                roles: getSelectedValues(fieldRoles)
            };
            if (!payload.nombre || !payload.correo) {
                mostrarMensaje('Por favor completa todos los campos requeridos', 'error');
                return;
            }
            await upsertDocente(payload);
            closeModal();
            form.reset();
        });

        // Cerrar sesión
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
    }

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDocentes);
    } else {
        initDocentes();
    }
})();
