const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'El nombre de usuario es obligatorio'],
        unique: true,
        trim: true,
        minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
        maxlength: [50, 'El nombre de usuario no puede exceder los 50 caracteres'],
    },
    email: {
        type: String,
        required: [true, 'El correo electrónico es obligatorio'],
        unique: true,
        trim: true,
        lowercase: true,
        match:[/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un correo electrónico válido'],
    },
    password: {
        type: String,
        required: [true, 'La contraseña es obligatoria'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    },
    firstName:{
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
        maxlength: [50, 'El nombre no puede exceder los 50 caracteres'],
    },
    lastName: {
        type: String,
        required: [true, 'El apellido es obligatorio'],
        trim: true,
        maxlength: [50, 'El apellido no puede exceder los 50 caracteres'],
    },
    role: {
        type: String,
        enum: {
            values: ['admin','coordinador'],
            message: 'El rol debe ser admin o coordinador',
        },
        default: 'coordinador',
        required: [true, 'El rol es obligatorio'],
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    phone: {
        type: String,
        required: [true, 'El número de teléfono es obligatorio'],
        match: [/^[\+]?[1-9][\d\s\-\(\)]{0,20}$/, 'EIngrese un número de teléfono válido'],
    },
    lastLogin: {
        type: Date,
        default: Date.now,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
},{
    timestamps: true,
});

// Hashear la contraseña antes de guardarla
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(2);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

//si van a actualizar la contraseña
userSchema.pre('findOneAndUpdate', async function (next) {
    const update = this.getUpdate();

    if (update.password) {
        const salt = await bcrypt.genSalt(2);
        update.password = await bcrypt.hash(update.password, salt);
    }

    this.setUpdate(update);
    next();
});

// comprobar si la contraseña ingresada coincide con la almacenada
userSchema.methods.matchPassword = async function (enteredPassword) {
    try {
        return await bcrypt.compare(enteredPassword, this.password);
    } catch (error) {
        throw Error;
    }
};

// Método para ocultar información sensible al convertir a JSON
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password; // Eliminar la contraseña del objeto JSON
    return userObject;
};

userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Campo virtual para nombre no se almacena en la base de datos
userSchema.index({role:1});
userSchema.index({isActive:1});

module.exports = mongoose.model('User', userSchema);