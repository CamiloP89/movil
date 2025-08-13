const mongoose = require('mongoose');


const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre de la categoría es obligatorio'],
        trim: true,
        unique: true,
        minlength: [2, 'El nombre de la categoría debe tener al menos 3 caracteres'],
        maxlength: [100, 'El nombre de la categoría no puede exceder los 50 caracteres'],
    },
    description: {
        type: String,
        required: [true, 'La descripción de la categoría es obligatoria'],
        trim: true,
        maxlength: [500, 'La descripción no puede exceder los 500 caracteres'],
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    icon: {
        type: String,
        trim: true,
    },
    color : {
        type: String,
        trim: true,
        match: [/^#([A-Fa-f0-9]{6})|[A-Fa-f0-9]{3})$/, 'Ingrese un color hexadecimal válido'],
    },
    sortOrder: {
        type: Number,
        default: 0,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
},{
    timestamps: true,
});

categorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }
    next();
});

categorySchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();

    if (update.name) {
        this.slug = this.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    }
    next();
});

categoryShema.virtual('productCount', {
    ref: 'Product',
    localField: '_id',
    foreingField: 'category'
});

categoryShema.static.findActive = function(){
    return this.findActive({isActive: true}).sort({sortOrder:1, name: 1})
};

categorySchema.methods.canBeDeleted = async function() {
    const Subcategory = mongoose.model('SubCategory');
    const Product = mongoose.model('Product');

    const SubcategoriesCount = await Subcategory.countDocuments({ category: this._id})
    const productCount = await Product.countDocuments({ Product: this._id})

    return SubcategoriesCount === 0 && productCount === 0;
};

categoryShema.index({isActive: 1});
categoryShema.index({sortOrder: 1});
categoryShema.index({createdBy: 1});

module.exports = mongoose.model('category', categorySchema);