// Funciones para manejar cursos en Firebase Firestore
// Estructura compatible con Android/Kotlin

class CursoManager {
    constructor() {
        this.db = null;
        this.collection = 'cursos';
        this.init();
    }
    
    async init() {
        // Esperar a que Firebase esté disponible
        let attempts = 0;
        const maxAttempts = 100;
        
        while (attempts < maxAttempts) {
            if (window.firebaseServices && window.firebaseServices.db) {
                this.db = window.firebaseServices.db;
                console.log('✅ CursoManager inicializado correctamente');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.error('❌ CursoManager: Firebase no está disponible después de', attempts, 'intentos');
        return false;
    }
    
    // Verificar que Firestore esté disponible
    async ensureReady() {
        if (!this.db) {
            await this.init();
        }
        
        if (!this.db) {
            throw new Error('Firestore no está disponible. Verifica la configuración de Firebase.');
        }
    }

    // Estructura de curso compatible con Android
    // Este formato será fácil de parsear en Kotlin
    createCursoData(nombre, descripcion, docenteId, docenteNombre, imagenUrl, categoria, duracion, estado, temario) {
        // Procesar temario: convertir texto a array si es string
        let temarioArray = [];
        if (temario) {
            if (typeof temario === 'string') {
                // Dividir por líneas y filtrar vacías
                temarioArray = temario.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
            } else if (Array.isArray(temario)) {
                temarioArray = temario;
            }
        }
        
        return {
            nombre: nombre,
            descripcion: descripcion || '',
            docenteId: docenteId,
            docenteNombre: docenteNombre || '',
            imagenUrl: imagenUrl || '',
            categoria: categoria || 'General',
            duracion: duracion || 0, // en horas
            estado: estado || 'Activo', // Activo, Inactivo, Borrador
            temario: temarioArray, // Array de temas del curso
            estudiantesInscritos: 0,
            estudiantesIds: [], // Array de IDs de estudiantes
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
            // Campos adicionales para compatibilidad con Android
            activo: true,
            visibleEstudiantes: true,
            precio: 0, // Para futuras funcionalidades de monetización
            nivel: 'Principiante', // Principiante, Intermedio, Avanzado
            tags: [], // Array de tags para búsqueda
            rating: 0, // Rating promedio
            totalCalificaciones: 0
        };
    }

    // Crear nuevo curso
    async crearCurso(cursoData) {
        try {
            // Verificar que Firestore esté disponible
            await this.ensureReady();
            
            if (!this.db) {
                return { 
                    success: false, 
                    error: 'Firestore no está disponible. Verifica la configuración de Firebase.' 
                };
            }
            
            // Validar datos requeridos
            if (!cursoData.nombre || !cursoData.docenteId) {
                return { 
                    success: false, 
                    error: 'El nombre del curso y el ID del docente son requeridos.' 
                };
            }
            
            // Asegurar que todos los campos estén presentes
            const cursoCompleto = {
                ...cursoData,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp(),
                estudiantesInscritos: cursoData.estudiantesInscritos || 0,
                estudiantesIds: cursoData.estudiantesIds || [],
                activo: cursoData.activo !== undefined ? cursoData.activo : true,
                visibleEstudiantes: cursoData.visibleEstudiantes !== undefined ? cursoData.visibleEstudiantes : true,
                precio: cursoData.precio || 0,
                nivel: cursoData.nivel || 'Principiante',
                tags: cursoData.tags || [],
                rating: cursoData.rating || 0,
                totalCalificaciones: cursoData.totalCalificaciones || 0
            };
            
            console.log('📝 Guardando curso en Firestore:', {
                nombre: cursoCompleto.nombre,
                docenteId: cursoCompleto.docenteId,
                categoria: cursoCompleto.categoria,
                estado: cursoCompleto.estado
            });
            
            // Guardar en Firestore
            const docRef = await this.db.collection(this.collection).add(cursoCompleto);
            
            console.log('✅ Curso creado exitosamente en Firestore');
            console.log('📊 Curso guardado:', {
                id: docRef.id,
                nombre: cursoCompleto.nombre,
                docenteId: cursoCompleto.docenteId,
                coleccion: this.collection
            });
            
            // Verificar que se guardó correctamente
            const cursoGuardado = await docRef.get();
            if (cursoGuardado.exists) {
                console.log('✅ Verificado: Curso encontrado en Firestore');
                return { 
                    success: true, 
                    id: docRef.id,
                    curso: { id: docRef.id, ...cursoGuardado.data() }
                };
            } else {
                console.warn('⚠️ Curso creado pero no se pudo verificar');
                return { 
                    success: true, 
                    id: docRef.id,
                    warning: 'Curso creado pero no se pudo verificar en Firestore'
                };
            }
            
        } catch (error) {
            console.error('❌ Error al crear curso:', error);
            console.error('Detalles del error:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            // Mensaje de error más específico
            let errorMessage = error.message;
            
            if (error.code === 'permission-denied') {
                errorMessage = 'Permiso denegado. Verifica las reglas de seguridad de Firestore para la colección "cursos".';
            } else if (error.code === 'unavailable') {
                errorMessage = 'Firestore no está disponible. Verifica tu conexión a internet.';
            }
            
            return { 
                success: false, 
                error: errorMessage,
                errorCode: error.code
            };
        }
    }

    // Obtener todos los cursos
    async obtenerTodosLosCursos() {
        try {
            await this.ensureReady();
            if (!this.db) {
                return { success: false, error: 'Firestore no está disponible' };
            }
            
            const snapshot = await this.db.collection(this.collection)
                .orderBy('fechaCreacion', 'desc')
                .get();
            
            const cursos = [];
            snapshot.forEach(doc => {
                cursos.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            return { success: true, cursos: cursos };
        } catch (error) {
            console.error('Error al obtener cursos:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener curso por ID
    async obtenerCursoPorId(cursoId) {
        try {
            await this.ensureReady();
            if (!this.db) {
                return { success: false, error: 'Firestore no está disponible' };
            }
            
            const doc = await this.db.collection(this.collection).doc(cursoId).get();
            if (doc.exists) {
                return { success: true, curso: { id: doc.id, ...doc.data() } };
            } else {
                return { success: false, error: 'Curso no encontrado' };
            }
        } catch (error) {
            console.error('Error al obtener curso:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener cursos por docente
    async obtenerCursosPorDocente(docenteId) {
        try {
            await this.ensureReady();
            if (!this.db) {
                return { success: false, error: 'Firestore no está disponible' };
            }
            
            // Obtener cursos sin orderBy para evitar necesidad de índice compuesto
            const snapshot = await this.db.collection(this.collection)
                .where('docenteId', '==', docenteId)
                .get();
            
            const cursos = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                cursos.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Ordenar por fecha de creación en JavaScript (más reciente primero)
            cursos.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toMillis?.() || a.fechaCreacion?._seconds || 0;
                const fechaB = b.fechaCreacion?.toMillis?.() || b.fechaCreacion?._seconds || 0;
                return fechaB - fechaA; // Orden descendente (más reciente primero)
            });
            
            return { success: true, cursos: cursos };
        } catch (error) {
            console.error('Error al obtener cursos del docente:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener cursos activos (para estudiantes en la app móvil)
    async obtenerCursosActivos() {
        try {
            await this.ensureReady();
            if (!this.db) {
                return { success: false, error: 'Firestore no está disponible' };
            }
            
            // Obtener cursos sin orderBy para evitar necesidad de índice compuesto
            const snapshot = await this.db.collection(this.collection)
                .where('estado', '==', 'Activo')
                .where('visibleEstudiantes', '==', true)
                .get();
            
            const cursos = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                cursos.push({
                    id: doc.id,
                    ...data
                });
            });
            
            // Ordenar por fecha de creación en JavaScript (más reciente primero)
            cursos.sort((a, b) => {
                const fechaA = a.fechaCreacion?.toMillis?.() || a.fechaCreacion?._seconds || 0;
                const fechaB = b.fechaCreacion?.toMillis?.() || b.fechaCreacion?._seconds || 0;
                return fechaB - fechaA; // Orden descendente (más reciente primero)
            });
            
            return { success: true, cursos: cursos };
        } catch (error) {
            console.error('Error al obtener cursos activos:', error);
            return { success: false, error: error.message };
        }
    }

    // Actualizar curso
    async actualizarCurso(cursoId, datosActualizados) {
        try {
            // Verificar que Firestore esté disponible
            await this.ensureReady();
            
            if (!this.db) {
                return { 
                    success: false, 
                    error: 'Firestore no está disponible. Verifica la configuración de Firebase.' 
                };
            }
            
            if (!cursoId) {
                return { 
                    success: false, 
                    error: 'ID del curso es requerido.' 
                };
            }
            
            // Agregar fecha de actualización
            datosActualizados.fechaActualizacion = firebase.firestore.FieldValue.serverTimestamp();
            
            console.log('📝 Actualizando curso en Firestore:', {
                id: cursoId,
                nombre: datosActualizados.nombre
            });
            
            // Actualizar en Firestore
            await this.db.collection(this.collection).doc(cursoId).update(datosActualizados);
            
            console.log('✅ Curso actualizado exitosamente en Firestore');
            
            // Verificar que se actualizó correctamente
            const cursoActualizado = await this.db.collection(this.collection).doc(cursoId).get();
            if (cursoActualizado.exists) {
                console.log('✅ Verificado: Curso actualizado encontrado en Firestore');
                return { 
                    success: true,
                    curso: { id: cursoActualizado.id, ...cursoActualizado.data() }
                };
            } else {
                return { 
                    success: false, 
                    error: 'El curso no existe en Firestore.' 
                };
            }
            
        } catch (error) {
            console.error('❌ Error al actualizar curso:', error);
            console.error('Detalles del error:', {
                code: error.code,
                message: error.message
            });
            
            let errorMessage = error.message;
            
            if (error.code === 'permission-denied') {
                errorMessage = 'Permiso denegado. Verifica las reglas de seguridad de Firestore.';
            } else if (error.code === 'not-found') {
                errorMessage = 'El curso no existe en Firestore.';
            }
            
            return { 
                success: false, 
                error: errorMessage,
                errorCode: error.code
            };
        }
    }

    // Eliminar curso
    async eliminarCurso(cursoId) {
        try {
            await this.ensureReady();
            if (!this.db) {
                return { success: false, error: 'Firestore no está disponible' };
            }
            
            await this.db.collection(this.collection).doc(cursoId).delete();
            console.log('Curso eliminado:', cursoId);
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar curso:', error);
            return { success: false, error: error.message };
        }
    }

    // Inscribir estudiante a curso
    async inscribirEstudiante(cursoId, estudianteId) {
        try {
            const cursoRef = this.db.collection(this.collection).doc(cursoId);
            const curso = await cursoRef.get();
            
            if (!curso.exists) {
                return { success: false, error: 'Curso no encontrado' };
            }

            const datos = curso.data();
            const estudiantesIds = datos.estudiantesIds || [];
            
            if (estudiantesIds.includes(estudianteId)) {
                return { success: false, error: 'Estudiante ya está inscrito' };
            }

            estudiantesIds.push(estudianteId);
            await cursoRef.update({
                estudiantesIds: estudiantesIds,
                estudiantesInscritos: estudiantesIds.length,
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error) {
            console.error('Error al inscribir estudiante:', error);
            return { success: false, error: error.message };
        }
    }

    // Desinscribir estudiante de curso
    async desinscribirEstudiante(cursoId, estudianteId) {
        try {
            const cursoRef = this.db.collection(this.collection).doc(cursoId);
            const curso = await cursoRef.get();
            
            if (!curso.exists) {
                return { success: false, error: 'Curso no encontrado' };
            }

            const datos = curso.data();
            let estudiantesIds = datos.estudiantesIds || [];
            estudiantesIds = estudiantesIds.filter(id => id !== estudianteId);
            
            await cursoRef.update({
                estudiantesIds: estudiantesIds,
                estudiantesInscritos: estudiantesIds.length,
                fechaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true };
        } catch (error) {
            console.error('Error al desinscribir estudiante:', error);
            return { success: false, error: error.message };
        }
    }

    // Suscripción en tiempo real a cambios en cursos
    suscribirseACursos(callback) {
        return this.db.collection(this.collection)
            .orderBy('fechaCreacion', 'desc')
            .onSnapshot((snapshot) => {
                const cursos = [];
                snapshot.forEach(doc => {
                    cursos.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                callback(cursos);
            }, (error) => {
                console.error('Error en suscripción a cursos:', error);
                callback([]);
            });
    }
}

// Instancia global
window.cursoManager = new CursoManager();


