const bcrypt = require('bcryptjs');
const {User} = require('../models');
const {generateToken} = require('../utils/jwt');
const {asyncHandler} =require('../middleware/errorHandler');

// Login de usuario 

const login = asyncHandler(async(req, res) =>{
    console.log('DEBUG: DAatos recibidos en login', req.body);
    const {email, username, password} = req.body
    const loginField = email || username;
    console.log('DEBUG: Campo de login', loginField);
    console.log('DEBUG: Password recibido', password ? '[PRESENTE]' : '[AUSENTE]');
    
    //VALIDACIONES DE CAMPOS REQUERIDOS
    if (!loginField || !password) {
        console.long('Error - Faltan Credenciales');
        return res.status(400).json({
            success: false,
            message: 'Las credenciales son incorrectas'
        });
    }

    //Busqueda de usuario
});

// Obtener informacion del usuario autenticado
const getME = asyncHandler(async(req, res) =>{
    const user = await User.findById(req.user.id);
    res.status(200).json({
        success: true,
        data: user
    });
});

// Cambio de contraseña 
const changePassword = asyncHandler(async(req, res) =>{
    const {currentPassword, newPassword} = req.body;
    if (!changePassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Contraseña actual y nueva contraseña son requeridas'
        });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
    }
    // Obtener usuario con contraseña actual
    const user = await User.findById(req.user._id).select('+password');

    const isCorruentPasswordValid = await user.comparePassword(currentPassword);
    if(!isCorruentPasswordValid) {
        return res.status(401).json({
            success: false,
            message: 'contraseña actual incorrecta'
        });
    }
    user.password = newPassword;
    await user.save();
    res.status(200).json({
        success: true,
        message: 'Contraseña actualzia correctamente '
    });
});

//Invalidar token usuario extraño

const logout = asyncHandler(async(req, res) =>{
    res.satus(200).json({
        succces: true,
        message: 'Logout exitoso, invalida el token en el cliente'
    });
});

//Verificar token
const verifyToken = asyncHandler(async(req, res) =>{
    res.satus(200).json({
        succces: true,
        message: ' Token validado',
        data: req.user 
    });
});

 module.exports ={
    login,
    getME,
    changePassword,
    logout,
    verifyToken
 };

