const errorHandler = (err, req, res, next) => {
    console.error('Error Stack:', err.stack);

    //Error de validacion de mongoose
    if (err.name === 'ValidationError') {
        const errors= Object.values(err.errors).map(e => message);
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors
        });
    }

    // error de duplicado
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return res.status(400).json({
            success: false,
            message: `${field} Ya existe en el sistema`
        });
    }

    // Erorr de cast objectId
    if (err.name == 'CastError') {
        return res.status(400).json({
            success: false,
            message: `El ID proporcionado no es válido: ${err.value}`
        });
    }

    // Error de JWT 
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token de acceso inválido'
        });
    }

    if (err.name === 'TokenExpiredError'){
        return res.status(401).json({
            success: false,
            message: 'Token de acceso expirado'
        }); 
    }

    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor'
    });
};
