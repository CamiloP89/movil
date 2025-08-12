const { User } = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

//obtener los usuarios
const getUsers = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    //filtros dinamicos
    const filter = {};
    //ROL
    if (req.query.role) filter.role = req.query.role;
    //activo
    if (req.query.isActive !== undefined) filter.active = req.query.isActive === true;
    //multiples filtros
    if(req.query.search){
        filter.$or =[
            { username: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
            { firstName: { $regex: req.query.search, $options: 'i' } },
            { lastName: { $regex: req.query.search, $options: 'i' } },
        ];
    }

    // Consulta de la paginacion
    const users = await User.find(filter).populate('createdBy', 'username firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(limit);
    
    //contar total para los usuarios
    const total = await User.countDocuments(filter);
    //repuesta exitosa
    res.status(200).json({
        success: true,
        data: users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

//obtener usuario por ID
const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).populate('createdBy', 'username firstName lastName');

    if (!user) {
        res.status(404).json({
            success: false,
            message: 'usuario no encontrado'
        })
    }
    res.status(200).json({
        success: true,
        data: user
    });
});

//crear un usuario
const createUser = asyncHandler(async (req, res) => {
    const {
        username,
        email,
        password,
        firstName,
        lastName,
        role,
        phone,
        isActive
    } = req.body;

    //validaciones
    if (!username || !email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({
            success:false,
            message: 'Todos los campos son obligatorios'
        });
    }

    //verificar si el usuario ya existe
    const existingUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'El usuario o email ya existe'
        });
    }

    //crear el usuario
    const User = await User.create({
        username,
        email,
        password,
        firstName,
        lastName,
        role,
        phone,
        isActive: isActive !== undefined ? isActive : true,
        createdBy: req.user._id
    });
    res.status(201).json({
        success: true,
        data: User
    });
});

//actualizar un usuario
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado'
        });
    }

    const { 
        username, 
        email, 
        firstName, 
        lastName, 
        role, 
        phone, 
        isActive 
    } = req.body;
    //SI NO ES ADMIN SOLO PUEDE ACTUALIZAR CIERTOS CAMPOS Y SOLO SU PERFIL 
    if (req.user.role !== 'admin') {
        if (req.user._id.toString() !== req.params.id) {
            return res.status(403).json({
                success: false,
                message: 'Solo puedes actualizar tu propio perfil'
            })
        }
    }

    //Solo admin puede cambiar rol y isActive 
    if (role !== undefined || isActive !== undefined) {
        return res.status(403).json({
            success: false,
            message: 'No tienes permisos para cambiar el rol o el estado del usuario'
        });
    };

    // vetificar duplicados si se cambia username o email
    if (username && username !== user.username) {
        const existingUsername = await User.findOne({ username});
        if (existingUsername){
            return rest.status(400).json({
                success: flase,
                message: 'El nombre ya esta en uso por otro usuario'
            });
        };
    }

    if (email && email !== user.email) {
        const existingEmail = await User.findOne({email});
        if (existingEmail){
            return rest.status(400).json({
                success: flase,
                message: 'El email ya esta en uso por otro usuario'
            });
        };
    }

    //Actualizar campos
    if (username) user.username = username;
    if (email) user.email = email;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone
    
    //Solo admin puede cambiar estos campos
    if (req.user.role === 'admin') {
        if (role) user.role = role;
        if (isActive !== undefined) user.isActive = isActive;
    }

    user.updatedBy = req.user._id;
    await user.save ();

    res.status(200).json({
        success: true,
        data: user
    });
});

//Eliminar usuario

const deletedUser = asyncHandler(async(req, res ) => {
    const user = await User.findById(req.params.id)
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado'
        })
    }

    // No permitir que el admin se elimine asi mismo
    if (user._id.toString() === req.user._id.toString()){
        return res.status(400).json({
            success: false,
            message: 'No puedes eliminar tu propio usuario'
        });
    }
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({
        success: true,
        message: 'Usuario eliminado exitosamente'
    });
});

// Activar o desactivar usuario

const toggleUserStatus = asyncHandler(async(req, res) => {
    const user = await User.findById(req.params.id);
    if(!user) {
        return res.status(404).json({
            success: false,
            message: 'Usuario no encontrado'
        })
    }
    //No permitir que el admin se desactive a si mismo
    if (user._id.toString() === req.user._id.toString()) {
        return res.status(400).json({
            success: false,
            message: 'No puedes cambiar tu propio estado'
        });
    }
});