const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name:{
        type: String,
        required: [true, 'El nombre del producto es obligatorio'],
        trim: true,
        minlength: [2, 'El nombre del producto debe tener al menos 2 caracteres'],
        maxlength: [100, 'El nombre del producto no puede exceder los 100 caracteres'],
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: [250, 'La descripción corta del producto no puede exceder los 250 caracteres'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [1000, 'La descripción del producto no puede exceder los 1000 caracteres'],
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'La categoría es obligatoria'],
        validate: {
            validator: async function(categoryId) {
                const Category = mongoose.model('Category');
                const category = await Category.findById(categoryId);
                return category && category.isActive;
            },
            message: 'La categoría debe existir y estar activa',
        }
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subcategory',
        required: [true, 'La subcategoría es obligatoria'],
        validate: {
            validator: async function(subcategoryId) {
                const Subcategory = mongoose.model('Subcategory');
                const subcategory = await Subcategory.findById(subcategoryId);
                return subcategory && subcategory.isActive;
            },
            message: 'La subcategoría debe existir y estar activa',
        }
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true,
    },
    sku:{
        type: String,
        required: [true, 'El SKU del producto es obligatorio'],
        unique: true,
        uppercase: true,
        minlength: [3, 'El SKU del producto debe tener al menos 3 caracteres'],
        maxlength: [50, 'El SKU del producto no puede exceder los 50 caracteres'],
    },
    price: {
        type: Number,
        required: [true, 'El precio del producto es obligatorio'],  
        min: [0, 'El precio del producto no puede ser negativo'],
        validate: {
            validator: function(value) {
                return Number.isFinite(value) && value > 0;
            },
            message: 'El precio del producto debe ser un número mayor a cero',
        }
    },
    comparePrice: {
        type: Number,
        min: [0, 'El precio de comparación no puede ser negativo'],
        validate: {
            validator: function(value) {
                if (value === null || value === undefined) {
                    return true;
                }
                return Number.isFinite(value) && value >= 0;
            },
            message: 'El precio de comparación debe ser un número mayor o igual al precio del producto',
        }
    },
    cost: {
        type: Number,
        min: [0, 'El costo del producto no puede ser negativo'],
            validate: {
                validator: function(value){
                    if (value === null || value === undefined) {
                        return true;
                        return Number.isFinite(value) && value >= 0;
                }
            },
            message: 'El costo del producto debe ser un número mayor o igual a cero',
        },
    },
    stock: {
        quantity: {
            type: Number,
            required: [true, 'La cantidad en stock es obligatoria'],
            min: [0, 'La cantidad en stock no puede ser negativa'],
            default: 0,
        },
        minStock: {
            type: Number,
            min: [0, 'El stock mínimo no puede ser negativo'],
        },
    },
    dimensions: {
        weight: {
            type: Number,
            min: [0, 'El peso no puede ser negativo'],
        },
        length: {
            type: Number,
            min: [0, 'La longitud no puede ser negativa'],
        },
        height: {
            type: Number,
            min: [0, 'La altura no puede ser negativa'],
        },
        images: [{
            url:{
                type: String,
                required: true,
                trim: true
            },
            alt:{
                type: String,
                trim: true,
                maxlength: [200, 'El texto alternativo no puede exceder 200 caracteres']
            },
            isPrimary: {
                type: Boolean,
                default: false
            }
        }],
        tags: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: [50, 'Cada tag no puede exceder los 50 caracteres'],

        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isFeactured: {
        type: Boolean,
        default: true
    },
    isDigital: {
        type: Boolean,
        default: false
    },
    sortOrder: {
        type: Number,
        default: true,
        maxlength: [70, 'el titulo no puede exceder los 70 caracteres']
    },
    seoDescription: {
        type: String,
        trim: true,
        maxlength: [160,'La descripcion no puede superar los 160 caracteres']
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }
}, {
    timestamps: true,
});

productSchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase()
        .replace(/[a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }
    next();
});

productSchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();

    if (update.name) {
        update.slug = update.name.toLowerCase().replace(/[a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    this.setUpdate(update);
    next();
});


module.exports = mongoose.model('Product', productSchema);