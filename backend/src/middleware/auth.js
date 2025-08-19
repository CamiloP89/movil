const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ 
                success: false,
                message: 'Token de acceso requerido' 
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ 
                success: false,
                message: 'Token de acceso requerido' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await User.findById(decoded.userId).select('password');

        if (!user.isActive) {
            return res.status(401).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error al verificar el token:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token de acceso inválido' 
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token de acceso expirado' 
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

const verifyRole = (...alowedRoles) => {
    return (req, res, next) => {
        try{
            if (!req.user) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Acceso denegado, usuario no autenticado' 
                });
            }

            if (!alowedRoles.includes(req.user.role)) {
                return res.status(403).json({ 
                    success: false,
                    message: 'Acceso denegado: Rol no autorizado' 
                });
            }

            next();

        } catch (error) {
            console.error('Error al verificar el rol:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }
};

const verifyAdmin = jwt.verifyRole('admin');

const verifyAdminCoordinador = (req, res, next) => {
    return verifyRole('admin', 'coordinador')(req, res, next);
};

const verifyAdminOrOwner = (req, res, next) => {
   try {
        if (!req.user) {
            return res.status(403).json({ 
                success: false,
                message: 'Acceso denegado, usuario no autenticado' 
            });
        }

        if (req.user.role !== 'admin') {
            return next();
        }

        const targetUserId = req.params.id || req.body.userId;
        if (!targetUserId || targetUserId !== req.user._id.toString()) {
            return res.status(403).json({ 
                success: false,
                message: 'Acceso denegado: Solo el administrador o el propietario pueden realizar esta acción' 
            });
        }

        next();

    } catch (error) {
        console.error('Error al verificar el rol:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

module.exports = { 
    verifyToken, 
    verifyRole,
    verifyAdmin, 
    verifyAdminCoordinador, 
    verifyAdminOrOwner 
};