const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

// Mapeo de tipos MIME
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Headers CORS y no-cache para desarrollo
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-Content-Type-Options': 'nosniff',
        // Headers para evitar caché en desarrollo
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };

    // Manejar preflight OPTIONS
    if (req.method === 'OPTIONS') {
        res.writeHead(200, headers);
        res.end();
        return;
    }

    // Parsear la URL (remover query strings)
    let filePath = '.' + req.url.split('?')[0];
    if (filePath === './') {
        filePath = './index.html';
    }

    // Obtener la extensión del archivo
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Leer el archivo
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Archivo no encontrado
                res.writeHead(404, { ...headers, 'Content-Type': 'text/html' });
                res.end('<h1>404 - Página no encontrada</h1>', 'utf-8');
            } else {
                // Error del servidor
                res.writeHead(500, headers);
                res.end(`Error del servidor: ${error.code}`, 'utf-8');
            }
        } else {
            // Archivo encontrado
            res.writeHead(200, { ...headers, 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📁 Sirviendo archivos desde: ${process.cwd()}`);
    console.log(`\nPresiona Ctrl+C para detener el servidor\n`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: El puerto ${PORT} ya está en uso.`);
        console.error(`\n💡 Solución:`);
        console.error(`   1. Busca el proceso que usa el puerto: netstat -ano | findstr :${PORT}`);
        console.error(`   2. Detén el proceso: taskkill /PID <PID> /F`);
        console.error(`   3. O cambia el puerto en server.js\n`);
        process.exit(1);
    } else {
        console.error(`\n❌ Error al iniciar el servidor:`, err);
        process.exit(1);
    }
});

