// Configuración de Firebase - Versión Limpia
const firebaseConfig = {
    apiKey: "AIzaSyARKnhYlqNShSZqsOd0wd-S4LSuhZo0bQ8",
    authDomain: "class-hub-live.firebaseapp.com",
    projectId: "class-hub-live",
    storageBucket: "class-hub-live.firebasestorage.app",
    messagingSenderId: "884667667093",
    appId: "1:884667667093:web:146c55af2e58d64936419c"
};

// Inicializar Firebase
(function() {
    'use strict';
    
    // Esperar a que Firebase SDK esté completamente cargado
    let initAttempts = 0;
    const maxInitAttempts = 100; // 10 segundos máximo
    
    function initFirebase() {
        initAttempts++;
        
        // Verificar que Firebase SDK esté cargado
        if (typeof firebase === 'undefined') {
            if (initAttempts < maxInitAttempts) {
                console.log('⏳ Esperando Firebase SDK... (' + initAttempts + '/' + maxInitAttempts + ')');
                setTimeout(initFirebase, 100);
                return;
            } else {
                console.error('❌ Firebase SDK no se pudo cargar después de', maxInitAttempts, 'intentos');
                // Establecer estado de error
                window.firebaseServices = {
                    error: true,
                    errorCode: 'sdk-not-loaded',
                    errorMessage: 'Firebase SDK no se pudo cargar. Verifica tu conexión a internet.',
                    auth: null,
                    db: null,
                    storage: null,
                    app: null,
                    firebase: null
                };
                
                // Mostrar error al usuario
                setTimeout(() => {
                    if (typeof window !== 'undefined' && window.alert) {
                        alert('Error: No se pudo cargar Firebase SDK.\n\n' +
                              'Por favor, verifica tu conexión a internet y recarga la página.');
                    }
                }, 500);
                
                // Disparar evento de error
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('firebaseError', { 
                        detail: { code: 'sdk-not-loaded', message: 'Firebase SDK no se pudo cargar' } 
                    }));
                }
                return;
            }
        }
        
        // Verificar que Firebase esté completamente inicializado
        if (typeof firebase.initializeApp !== 'function') {
            if (initAttempts < maxInitAttempts) {
                console.log('⏳ Esperando inicialización completa de Firebase... (' + initAttempts + '/' + maxInitAttempts + ')');
                setTimeout(initFirebase, 100);
                return;
            } else {
                console.error('❌ Firebase SDK no está completamente inicializado');
                window.firebaseServices = {
                    error: true,
                    errorCode: 'sdk-incomplete',
                    errorMessage: 'Firebase SDK no está completamente inicializado',
                    auth: null,
                    db: null,
                    storage: null,
                    app: null,
                    firebase: null
                };
                return;
            }
        }
        
        try {
            let app;
            
            // Verificar si ya existe una app inicializada
            try {
                app = firebase.app('default');
                console.log('✅ Firebase App ya existe, reutilizando...');
            } catch (e) {
                // No existe, crear una nueva
                console.log('🔄 Inicializando nueva Firebase App...');
                
                // Eliminar cualquier inicialización previa si existe
                if (firebase.apps.length > 0) {
                    firebase.apps.forEach(existingApp => {
                        try {
                            existingApp.delete();
                        } catch(deleteError) {
                            // Ignorar errores al eliminar
                        }
                    });
                }
                
                // Inicializar Firebase con la nueva configuración
                app = firebase.initializeApp(firebaseConfig, 'default');
            }
            
            // Verificar que la app esté realmente inicializada
            if (!app) {
                throw new Error('No se pudo inicializar Firebase App');
            }
            
            console.log('✅ Firebase App inicializada correctamente');
            console.log('API Key:', firebaseConfig.apiKey.substring(0, 20) + '...');
            console.log('App ID:', firebaseConfig.appId);
            console.log('App Name:', app.name);
            
            // Esperar un momento para asegurar que la app esté completamente lista
            // Inicializar servicios con verificación
            let auth, db, storage;
            
            try {
                // Usar la app específica para obtener Auth
                auth = app.auth();
                
                if (!auth) {
                    throw new Error('No se pudo obtener Firebase Auth de la app');
                }
                
                // Verificar que Auth esté realmente funcional
                if (typeof auth.onAuthStateChanged !== 'function') {
                    throw new Error('Firebase Auth no está completamente inicializado');
                }
                
                console.log('✅ Firebase Auth inicializado correctamente');
            } catch (authError) {
                console.error('❌ Error al inicializar Firebase Auth:', authError);
                
                // Detectar errores específicos de API key
                if (authError.code === 'auth/api-key-not-valid' || 
                    authError.message.includes('api-key-not-valid') ||
                    authError.message.includes('API key') ||
                    authError.code === 'app-compat/no-app') {
                    throw new Error('API key no válida o app no inicializada. Verifica la configuración en Google Cloud Console.');
                }
                
                // Si es el error de "no app", intentar reinicializar
                if (authError.message.includes('No Firebase App') || authError.code === 'app-compat/no-app') {
                    console.log('🔄 Intentando reinicializar Firebase App...');
                    try {
                        // Eliminar y recrear
                        if (firebase.apps.length > 0) {
                            firebase.apps.forEach(a => {
                                try { a.delete(); } catch(e) {}
                            });
                        }
                        app = firebase.initializeApp(firebaseConfig);
                        auth = app.auth();
                        console.log('✅ Firebase Auth reinicializado correctamente');
                    } catch (retryError) {
                        throw new Error('Error al reinicializar Firebase Auth: ' + retryError.message);
                    }
                } else {
                    throw new Error('Error al inicializar Firebase Auth: ' + authError.message);
                }
            }
            
            try {
                db = app.firestore();
                console.log('✅ Firestore inicializado correctamente');
            } catch (dbError) {
                console.error('⚠️ Error al inicializar Firestore:', dbError);
                db = null; // Continuar sin Firestore si falla
            }
            
            try {
                storage = app.storage();
                console.log('✅ Storage inicializado correctamente');
            } catch (storageError) {
                console.error('⚠️ Error al inicializar Storage:', storageError);
                storage = null; // Continuar sin Storage si falla
            }
            
            // Exportar para uso global
            window.firebaseServices = {
                auth: auth,
                db: db,
                storage: storage,
                app: app,
                firebase: firebase
            };
            
            console.log('✅ Servicios de Firebase listos');
            
            // Disparar evento personalizado
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('firebaseReady'));
            }
            
        } catch (error) {
            console.error('❌ Error al inicializar Firebase:', error);
            console.error('Código de error:', error.code);
            console.error('Mensaje:', error.message);
            
            // Establecer estado de error para que otros scripts puedan detectarlo
            window.firebaseServices = {
                error: true,
                errorCode: error.code,
                errorMessage: error.message,
                auth: null,
                db: null,
                storage: null,
                app: null,
                firebase: null
            };
            
            // Mostrar error más detallado
            if (error.code === 'auth/api-key-not-valid' || error.message.includes('api-key-not-valid')) {
                console.error('🔑 PROBLEMA DE API KEY:');
                console.error('1. Verifica que la API key sea correcta en Firebase Console');
                console.error('2. Ve a Google Cloud Console y quita las restricciones');
                console.error('3. Espera 5 minutos después de quitar restricciones');
                console.error('4. Limpia completamente el caché del navegador');
                
                // Mostrar alerta al usuario
                setTimeout(() => {
                    if (typeof window !== 'undefined' && window.alert) {
                        alert('Error: Firebase Auth no está disponible.\n\n' +
                              'Por favor, espera unos segundos y recarga la página.\n\n' +
                              'Si el problema persiste, verifica la configuración de la API key en Google Cloud Console.');
                    }
                }, 1000);
            }
            
            // Disparar evento de error
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('firebaseError', { 
                    detail: { code: error.code, message: error.message } 
                }));
            }
        }
    }
    
    // Iniciar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFirebase);
    } else {
        initFirebase();
    }
})();
