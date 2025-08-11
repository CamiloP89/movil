const mongoose = require('mongoose');

const subcategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre de la subcategoría es obligatorio'],
        trim: true,
        unique: true,
        minlength: [2, 'El nombre de la subcategoría debe tener al menos 2 caracteres'],
        maxlength: [100, 'El nombre de la subcategoría no puede exceder los 100 caracteres'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'La descripción de la subcategoría no puede exceder los 500 caracteres'],
    },
    slug: {
        type: String,
        lowercase: true,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    color: {
        type: String,
        trim: true,
        match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Ingrese un color hexadecimal válido'],
    },
    icon: {
        type: String,
        trim: true,
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
    sortOrder: {
        type: Number,
        default: 0,
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

subcategorySchema.pre('save', function(next) {
    if (this.isModified('name')) {
        this.slug = this.name.toLowerCase().replace(/[a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    next();
});

subcategorySchema.pre('save', function(next) {
    if (this.isModified('category')) {
        const Category = mongoose.model('Category');
        const category = Category.findById(this.category);

        if (!category) {
            return next(new Error('La categoría no existe'));
        }

        if (!category.isActive) {
            return next(new Error('La categoría no está activa'));
        }
    }
    next();
});

subcategorySchema.statics.findByCategory = function(categoryId) {
    return this.find({ category: categoryId }).populate('category','name slug').sort({ sortOrder: 1, name: 1 });
};

subcategorySchema.pre('findOneAndUpdate', function(next) {
    const update = this.getUpdate();

    if (update.name) {
        update.slug = update.name.toLowerCase().replace(/[a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    this.setUpdate(update);
    next();
});

subcategorySchema.virtual('productCount', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'category',
    count: true,
});

subcategorySchema.static.findActive = function() {
    return this.find({ isActive: true }).populate('category','name slug').sort({ sortOrder: 1, name: 1 });
};

subcategorySchema.methods.canBeDeleted = async function() {
    const Product = mongoose.model('Product');
    const productCount = await Product.countDocuments({ Subcategory: this._id });
    return productCount === 0;
};

subcategorySchema.methods.getFullPath = async function() {
    await this.populate('category', 'name')
    return `${this.category.name} > ${this.name}`;
};
subcategorySchema.index({ category: 1});
subcategorySchema.index({ isActive: 1 });
subcategorySchema.index({ sortOrder: 1 });
subcategorySchema.index({ slug: 1 });
subcategorySchema.index({ createdBy: 1 });

module.exports = mongoose.model('Subcategory', subcategorySchema);





