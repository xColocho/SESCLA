// Sistema de autenticación con Firebase - Versión Mejorada
class AuthManager {
    constructor() {
        this.auth = null;
        this.db = null;
        this.initialized = false;
        this.initPromise = null;
        this.init();
    }

    async init() {
        // Evitar múltiples inicializaciones simultáneas
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._doInit();
        return this.initPromise;
    }

    async _doInit() {
        console.log('🔄 Inicializando AuthManager...');
        
        // Esperar hasta que Firebase esté disponible
        let attempts = 0;
        const maxAttempts = 150; // 15 segundos máximo
        
        while (attempts < maxAttempts) {
            // Verificar si Firebase está disponible
            if (window.firebaseServices) {
                // Si hay un error, detener
                if (window.firebaseServices.error) {
                    console.error('❌ Firebase tiene un error:', window.firebaseServices.errorMessage);
                    this.initialized = false;
                    return false;
                }
                
                // Si Auth está disponible, usarlo
                if (window.firebaseServices.auth) {
                    this.auth = window.firebaseServices.auth;
                    this.db = window.firebaseServices.db;
                    this.initialized = true;
                    this.setupAuthStateListener();
                    console.log('✅ AuthManager inicializado correctamente');
                    return true;
                }
            }
            
            // Esperar un poco más
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        // Si llegamos aquí, Firebase no se inicializó
        console.error('❌ Firebase Auth no está disponible después de', attempts, 'intentos');
        this.initialized = false;
        return false;
    }

    // Verificar que Auth esté listo antes de usar
    async ensureReady() {
        if (!this.initialized || !this.auth) {
            console.log('⏳ AuthManager no está listo, reinicializando...');
            await this.init();
        }
        
        if (!this.auth) {
            throw new Error('Firebase Auth no está disponible. Verifica la configuración.');
        }
    }

    // Escuchar cambios en el estado de autenticación
    setupAuthStateListener() {
        if (!this.auth) return;
        
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('✅ Usuario autenticado:', user.email);
                localStorage.setItem('currentUser', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName
                }));
            } else {
                console.log('👤 Usuario no autenticado');
                localStorage.removeItem('currentUser');
            }
        }, (error) => {
            console.error('❌ Error en auth state listener:', error);
        });
    }

    // Registrar nuevo usuario - Versión mejorada
    async registrarUsuario(email, password, nombre, tipoUsuario) {
        try {
            // Asegurar que Auth esté listo
            await this.ensureReady();

            // Validaciones básicas
            if (!email || !email.includes('@')) {
                return { success: false, error: 'El correo electrónico no es válido' };
            }
            
            if (!password || password.length < 6) {
                return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
            }

            console.log('📝 Intentando registrar usuario:', email);

            // Crear usuario en Firebase Auth
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('✅ Usuario creado en Firebase Auth:', user.uid);

            // Actualizar perfil con nombre
            if (nombre) {
                try {
                    await user.updateProfile({
                        displayName: nombre
                    });
                    console.log('✅ Perfil actualizado con nombre');
                } catch (profileError) {
                    console.warn('⚠️ No se pudo actualizar el perfil:', profileError);
                    // Continuar aunque falle la actualización del perfil
                }
            }

            // Guardar información adicional en Firestore
            if (!this.db) {
                console.warn('⚠️ Firestore no está disponible. El usuario se creó en Auth pero no se guardó en la base de datos.');
                // Aunque Firestore no esté disponible, el usuario ya está creado en Auth
                return { success: true, user: user, warning: 'Usuario creado pero no se guardó en Firestore' };
            }

            try {
                // Preparar datos del usuario para Firestore
                // Usar firebase.firestore.FieldValue directamente (versión compat)
                const FieldValue = firebase.firestore.FieldValue;
                
                const userData = {
                    nombre: nombre || email,
                    email: email,
                    tipoUsuario: tipoUsuario || 'estudiante',
                    fechaCreacion: FieldValue.serverTimestamp(),
                    fechaRegistro: FieldValue.serverTimestamp(),
                    estado: 'Activo',
                    roles: tipoUsuario === 'maestro' ? ['Docente básico'] : [],
                    uid: user.uid, // Incluir UID para referencia
                    emailVerificado: user.emailVerified || false,
                    ultimaActualizacion: FieldValue.serverTimestamp()
                };

                // Guardar en colección según el tipo de usuario
                const promises = [];
                
                if (tipoUsuario === 'maestro') {
                    promises.push(
                        this.db.collection('docentes').doc(user.uid).set(userData, { merge: false })
                    );
                    console.log('📝 Guardando en colección "docentes"');
                } else if (tipoUsuario === 'administrador') {
                    promises.push(
                        this.db.collection('administradores').doc(user.uid).set(userData, { merge: false })
                    );
                    console.log('📝 Guardando en colección "administradores"');
                }

                // Siempre guardar en colección general de usuarios
                promises.push(
                    this.db.collection('usuarios').doc(user.uid).set(userData, { merge: false })
                );
                console.log('📝 Guardando en colección "usuarios"');

                // Ejecutar todas las operaciones de guardado
                await Promise.all(promises);
                
                console.log('✅ Datos guardados exitosamente en Firestore');
                console.log('📊 Usuario guardado en:', {
                    uid: user.uid,
                    email: email,
                    tipoUsuario: tipoUsuario,
                    colecciones: tipoUsuario === 'maestro' ? ['docentes', 'usuarios'] : 
                                tipoUsuario === 'administrador' ? ['administradores', 'usuarios'] : 
                                ['usuarios']
                });
                
            } catch (firestoreError) {
                console.error('❌ Error al guardar en Firestore:', firestoreError);
                console.error('Detalles del error:', {
                    code: firestoreError.code,
                    message: firestoreError.message,
                    stack: firestoreError.stack
                });
                
                // Mensaje de error más específico
                let errorMessage = 'Usuario creado en Auth pero hubo un error al guardar en Firestore.';
                
                if (firestoreError.code === 'permission-denied') {
                    errorMessage += '\n\n🔒 ERROR: Permiso denegado. Las reglas de seguridad de Firestore están bloqueando la escritura.\n\n' +
                                   'Solución:\n' +
                                   '1. Ve a Firebase Console > Firestore Database > Reglas\n' +
                                   '2. Asegúrate de que las reglas permitan escritura para usuarios autenticados:\n\n' +
                                   'rules_version = \'2\';\n' +
                                   'service cloud.firestore {\n' +
                                   '  match /databases/{database}/documents {\n' +
                                   '    match /usuarios/{userId} {\n' +
                                   '      allow read, write: if request.auth != null && request.auth.uid == userId;\n' +
                                   '    }\n' +
                                   '    match /docentes/{userId} {\n' +
                                   '      allow read, write: if request.auth != null && request.auth.uid == userId;\n' +
                                   '    }\n' +
                                   '    match /administradores/{userId} {\n' +
                                   '      allow read, write: if request.auth != null && request.auth.uid == userId;\n' +
                                   '    }\n' +
                                   '  }\n' +
                                   '}\n\n' +
                                   '3. Haz clic en "Publicar"';
                } else if (firestoreError.code === 'unavailable') {
                    errorMessage += '\n\n🌐 ERROR: Firestore no está disponible. Verifica tu conexión a internet.';
                } else {
                    errorMessage += '\n\nCódigo de error: ' + firestoreError.code + '\n' +
                                   'Mensaje: ' + firestoreError.message;
                }
                
                // Aunque falle Firestore, el usuario ya está creado en Auth
                // Pero informamos al usuario sobre el problema
                return { 
                    success: true, 
                    user: user, 
                    warning: errorMessage,
                    firestoreError: {
                        code: firestoreError.code,
                        message: firestoreError.message
                    }
                };
            }

            return { success: true, user: user };
            
        } catch (error) {
            console.error('❌ Error al registrar usuario:', error);
            return this.handleAuthError(error, 'registro');
        }
    }

    // Iniciar sesión - Versión mejorada
    async iniciarSesion(email, password) {
        try {
            // Asegurar que Auth esté listo
            await this.ensureReady();

            // Validaciones básicas
            if (!email || !email.includes('@')) {
                return { success: false, error: 'El correo electrónico no es válido' };
            }
            
            if (!password) {
                return { success: false, error: 'La contraseña es requerida' };
            }

            console.log('🔐 Intentando iniciar sesión:', email);

            // Iniciar sesión
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;

            console.log('✅ Usuario autenticado:', user.email);

            // Obtener información adicional del usuario desde Firestore
            let userData = null;
            if (this.db) {
                try {
                    // Buscar primero en colecciones específicas (docentes y administradores)
                    // porque tienen prioridad sobre la colección general
                    const [docentesDoc, adminDoc, userDoc] = await Promise.all([
                        this.db.collection('docentes').doc(user.uid).get(),
                        this.db.collection('administradores').doc(user.uid).get(),
                        this.db.collection('usuarios').doc(user.uid).get()
                    ]);
                    
                    console.log('🔍 Buscando usuario en Firestore:', {
                        uid: user.uid,
                        enDocentes: docentesDoc.exists,
                        enAdministradores: adminDoc.exists,
                        enUsuarios: userDoc.exists
                    });
                    
                    if (docentesDoc.exists) {
                        userData = docentesDoc.data();
                        console.log('✅ Usuario encontrado en colección "docentes":', userData);
                        // Asegurar que tipoUsuario esté definido
                        if (!userData.tipoUsuario) {
                            userData.tipoUsuario = 'maestro';
                        }
                    } else if (adminDoc.exists) {
                        userData = adminDoc.data();
                        console.log('✅ Usuario encontrado en colección "administradores":', userData);
                        // Asegurar que tipoUsuario esté definido
                        if (!userData.tipoUsuario) {
                            userData.tipoUsuario = 'administrador';
                        }
                    } else if (userDoc.exists) {
                        userData = userDoc.data();
                        console.log('📄 Datos del usuario desde colección "usuarios":', userData);
                    } else {
                        // No se encontró en ninguna colección
                        console.warn('⚠️ Usuario no encontrado en Firestore, creando registro básico...');
                        userData = {
                            email: user.email,
                            nombre: user.displayName || user.email,
                            tipoUsuario: 'estudiante',
                            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
                        };
                        
                        try {
                            await this.db.collection('usuarios').doc(user.uid).set(userData);
                            console.log('✅ Registro básico creado en Firestore');
                        } catch (createError) {
                            console.warn('⚠️ No se pudo crear registro en Firestore:', createError);
                        }
                    }
                } catch (firestoreError) {
                    console.error('⚠️ Error al obtener datos de Firestore:', firestoreError);
                    // Usar datos básicos si Firestore falla
                    userData = {
                        email: user.email,
                        nombre: user.displayName || user.email,
                        tipoUsuario: 'estudiante'
                    };
                }
            } else {
                // Si Firestore no está disponible, usar datos básicos
                console.warn('⚠️ Firestore no está disponible');
                userData = {
                    email: user.email,
                    nombre: user.displayName || user.email,
                    tipoUsuario: 'estudiante'
                };
            }
            
            // Log final del tipo de usuario
            console.log('📊 Tipo de usuario determinado:', userData.tipoUsuario);

            return { 
                success: true, 
                user: user,
                userData: userData
            };
            
        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);
            return this.handleAuthError(error, 'inicio de sesión');
        }
    }

    // Manejar errores de autenticación de forma centralizada
    handleAuthError(error, operation) {
        let errorMessage = `Error al ${operation}`;
        
        if (!error.code) {
            return { success: false, error: error.message || errorMessage };
        }

        switch (error.code) {
            // Errores de registro
            case 'auth/email-already-in-use':
                errorMessage = 'Este correo electrónico ya está registrado';
                break;
            case 'auth/weak-password':
                errorMessage = 'La contraseña es muy débil (mínimo 6 caracteres)';
                break;
            case 'auth/invalid-email':
                errorMessage = 'El correo electrónico no es válido';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/Password no está habilitado. Ve a Firebase Console y habilítalo.';
                this.showDetailedError('Email/Password no habilitado', 
                    'https://console.firebase.google.com/project/class-hub-live/authentication/providers');
                break;
            
            // Errores de inicio de sesión
            case 'auth/user-not-found':
                errorMessage = 'Usuario no encontrado. Verifica tu correo electrónico.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Contraseña incorrecta. Por favor, intenta de nuevo.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Esta cuenta ha sido deshabilitada. Contacta al administrador.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos fallidos. Por favor, intenta más tarde.';
                break;
            
            // Errores de red
            case 'auth/network-request-failed':
                errorMessage = 'Error de conexión. Verifica tu internet.';
                break;
            
            // Errores de API key
            case 'auth/api-key-not-valid':
            case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
                errorMessage = 'La API key de Firebase no es válida o tiene restricciones.';
                this.showApiKeyError();
                break;
            
            // Error genérico
            default:
                errorMessage = `Error: ${error.message || error.code || 'Error desconocido'}`;
                console.error('Código de error:', error.code);
                console.error('Mensaje completo:', error.message);
        }
        
        return { success: false, error: errorMessage };
    }

    // Mostrar error detallado de API key
    showApiKeyError() {
        const message = 'Error: API key no válida\n\n' +
            '🔑 SOLUCIÓN:\n\n' +
            '1. Verifica Email/Password está habilitado:\n' +
            '   https://console.firebase.google.com/project/class-hub-live/authentication/providers\n\n' +
            '2. Verifica Identity Toolkit API está habilitada:\n' +
            '   https://console.cloud.google.com/apis/library/identitytoolkit.googleapis.com?project=class-hub-live\n\n' +
            '3. Verifica la API key no tiene restricciones:\n' +
            '   https://console.cloud.google.com/apis/credentials?project=class-hub-live\n\n' +
            '4. Espera 2-3 minutos y recarga (Ctrl+F5)';
        
        console.error('🔑 ERROR DE API KEY');
        console.error('Verifica la consola para más detalles');
        
        // Mostrar alerta solo si no hay una ventana modal abierta
        setTimeout(() => {
            if (!document.querySelector('.modal-overlay.active')) {
                alert(message);
            }
        }, 500);
    }

    // Mostrar error detallado
    showDetailedError(title, url) {
        console.error(`❌ ${title}`);
        console.error(`Ve a: ${url}`);
    }

    // Cerrar sesión
    async cerrarSesion() {
        try {
            await this.ensureReady();
            await this.auth.signOut();
            localStorage.removeItem('currentUser');
            return { success: true };
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            return { success: false, error: error.message };
        }
    }

    // Obtener usuario actual
    getUsuarioActual() {
        return this.auth ? this.auth.currentUser : null;
    }

    // Verificar si el usuario está autenticado
    estaAutenticado() {
        return this.auth ? this.auth.currentUser !== null : false;
    }

    // Obtener información del usuario desde Firestore
    async obtenerInformacionUsuario(uid) {
        try {
            await this.ensureReady();
            if (!this.db) return null;
            
            const userDoc = await this.db.collection('usuarios').doc(uid).get();
            if (userDoc.exists) {
                return { id: userDoc.id, ...userDoc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error al obtener información del usuario:', error);
            return null;
        }
    }
}

// Crear instancia global cuando el DOM esté listo
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.authManager = new AuthManager();
        });
    } else {
        window.authManager = new AuthManager();
    }
})();
