const { Product, Category, Subcategory} = require('../models')
const { asyncHandler} = require('../middleware/errorHandler');
const product = require('../models/product');

// Obtener todos los productos
const getproducts = asyncHandler(async(req, res) =>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page) || 10;
    const skip = (page - 1) * limit ;
    
    //filtros para la busqueda
    const filter = {};
    
    //Filtros por categoria y subcategoria
    if (req.query.category) filter.category = req.query.category;
    if (req.query.subcategory) filter.subcategory = req.query.subcategory;
    
    //Filtros booleanos (estado destacado digital)
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.isFeatured !== undefined) filter.isFeatured = req.query.isFeatured === 'true';
    if (req.query.isDigital !== undefined) filter.isDigital = req.query.isDigital === 'true';

    //filtro por rango de precio
    if (req.query.minPrice || req.query.maxPrice) {
        filter.price = {};
        if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice)
        if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    //filtro por stock bajo
    if (req.query.lowStock === 'true') {
        filter.$expr ={
            $and: [
                {$eq: ['$stock.trackStock', true]},
                {$lte: ['$stock.quantity', '$stock.minStock'] }
            ]
        };
    }

    //activo/inactivo
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    
    
    //Nombre o descripcion 
    if (req.query.search) {
        filter.$or = [
            {name: {$regex: req.query.search, $options: 'i'}},
            {description: {$regex: req.query.search, $options: 'i'}},
            { sku: {$regex: req.query.search, $options: 'i'}},
            { tags: {$regex: req.query.search, $options: 'i'} }
        ];
    }

    // consulta a la base de datos
    let query = Product.find(filter)
    .populate('category', 'name slug isActive')
    .populate('subcategory', 'name slug isActive')
    .populate('createdBy', 'username firstName lastName')
    .sort({sortOrder: 1, name: 1});

    if (req.query.page) {
        query = query.skip(skip.limit(limit));
    }

    //Ejercutar las constultas

    const products = await query;
    const total = await Product.countDocuments(filter);
    res.status(200).json({
        success:true,
        data: products,
        pagination: req.query.page ? {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }: undefined
    });
});

const getActiveproducts = asyncHandler(async (req, res) =>{
    const products = await Product.findActive();
    res.status(200).json({
        success: true,
        message: products 
    });
});

const getProductsBycategory = asyncHandler(async(req, res) =>{
    const {categoryId} = req.params;
    // Verificar si la categoria existe
    const products = await Product.findByCategory(categoryId);
        return res.status(200).json({
            success: false,
            message: products
        });
    });

const getProductsBySubcategory = asyncHandler(async(req, res) =>{
    const {subcategoryId} = req.params;
    const products = await Product.findByCategory(subcategoryId);
    if(!products) {
        return res.status(404).json({
            success: false,
            message: 'Subcategoria no encontrada'
        });
    }
});

const getproductByid = asyncHandler(async(req, res) =>{
    const product = await Product.findById(req.params.id)
    .populate('category', 'name slug description')
    .populate('subcategory', 'name slug description')
    .populate('createdBy', 'username firstName lastName')
    .populate('updatedBy', 'username firstName lastName')
    if(!product) {
        return res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
        });
    }
    res.status(200).json({
        success: true,
        data: product
    });
});


const getproductBySku = asyncHandler(async(req, res) =>{
    const product = await Product.findOne({sku: req.params.sku.toUpperCase()})
    .populate('category', 'name slug')
    .populate('subcategory', 'name slug')
    if(!product) {
        return res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
        });
    }
    res.status(200).json({
        success: true,
        data: product
    });
});

const getFeaturedProducts = asyncHandler(async(req, res) =>{
    const products = await Product.findFeatured();
    res.status(200).json({
        success: true,
        data: products
    });
});

//Crear un producto
const createdProduct = asyncHandler(async(req, res) =>{
    const { 
        name, 
        description, 
        shortDescription, 
        sku, category, 
        subcategory, 
        price, 
        comparePrice, 
        cost, 
        stock, 
        dimensions, 
        images,
        isActive, 
        isFeatured, 
        isDigital, 
        sortOrder,
        seoTitle,
        seoDescription,
        } = req.body;
    
    const parentCategory = await Category.findById(category);
    if (!parentCategory) {
        return res.status(400).json({
            success: false,
            message: 'La categoria especifica no existe'
        });
    }

    const parentSubcategory = await Subcategory.findById(subcategory);
    if (!parentSubcategory || parentSubcategory.isActive) {
        return res.status(400).json({
            success: false,
            message: 'La subcategoria especifica No esta activa'
        });
    }

    if (!parentSubcategory.category.toString() !== category) {
        return res.status(400).json({
            success: false,
            message: 'La subcategoria no perteneces a la categoria '
        });
    }
    
    
    //Crear el producto
    const product = await Product.create({
        name, 
        description, 
        shortDescription, 
        sku: sku.toUpperCase(),
        category, 
        subcategory, 
        price, 
        comparePrice, 
        cost, 
        stock: stock || {quantity: 0, minStock: 0, trackStock: true},
        dimensions, 
        images,
        tags: tags || [], 
        isActive: isActive !== undefined ? isActive : true,
        isFeatured: isFeatured || false,
        isDigital: isDigital || false,
        sortOrder: sortOrder || 0,
        seoTitle,
        seoDescription,
        createdBy: req.user._id,
    });
    await product.populate([
        {path: 'category', select: 'name slug'},
        {path: 'subcategory', select: 'name slug'},
    ]);

    res.status(201).json({
        success: true,
        message: ' Producto creado exitosamente',
        data: product
    });
});


//Actualizar un producto
const updateProduct= asyncHandler(async(req, res) =>{
    const product = await Product.findById(req.params.id);
    if(!product) {
        return res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
        });
    }

    const {
        name, 
        description, 
        shortDescription, 
        sku, category, 
        subcategory, 
        price, 
        comparePrice, 
        cost, 
        stock, 
        dimensions, 
        images,
        isActive, 
        isFeatured, 
        isDigital, 
        sortOrder,
        seoTitle,
        seoDescription,
    } = req.body

    // verificar si ya existe un producto con el mismo SKU
    if(sku && sku.toUpperCase() !== product.sku) {
        const existingSku = await Product.findOne({sku: sku.toUpperCase()});
        if (existingSku) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe un producto con ese SKU'
            });
        }
    }
    if (category && !subcategory) {
    const targetCategory = category || product.category;
    const targetSubcategory = subcategory || product.subcategory;
    
    // Si cambia la categoria, verificar si existe y esta activa
        const parentCategory = await Category.findById(targetCategory);
        if (!parentCategory || !parentCategory.isActive) {
            return res.status(400).json({
                success: false,
                message: 'La categoria especifica no existe o no esta activa'
            });
        }
        const parentSubcategory = await Subcategory.findById(targetSubcategory);
        if (!parentSubcategory || !parentSubcategory.isActive) {
            return res.status(400).json({
                success: false,
                message: 'La subcategoria especifica no existe o no esta activa'
            });
        }
    }
    
     if (parentSubcategory.category.toString() !== targetCategory.toString()) {
            return res.status(400).json({
                success: false,
                message: 'La subcategoria no pertenece a la categoria especificada'
            });
    }

    // Actualizar la categoria
    if (name) product.name = name;
    if (description !== undefined) product.description = description;
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (sku) product.sku = sku.toUpperCase();
    if (category) product.category = category;
    if (subcategory) product.subcategory = subcategory;
    if (price !== undefined) product.price = price;
    if (comparePrice !== undefined) product.comparePrice = comparePrice;
    if (cost !== undefined) product.cost = cost;
    if (stock !== undefined) product.stock = stock;
    if (dimensions !== undefined) product.dimensions = dimensions;
    if (images !== undefined) product.images = images;
    if (tags !== undefined) product.tags = tags;
    if (isActive !== undefined) product.isActive = isActive;
    if (isFeatured !== undefined) product.isFeatured = isFeatured;
    if (isDigital !== undefined) product.isDigital = isDigital;
    if (sortOrder !== undefined) product.sortOrder = sortOrder;
    if (seoDescription !== undefined) product.seoDescription = seoDescription;

    
    subcategory.updatedBy = req.user._id;
    await subcategory.save();
    
    await product.save([
        {path: 'category', select: 'name slug'},
        {path: 'subcategory', select: 'name slug'},
    ]);


    res.status(200).json({
        success: true,
        message: 'Producto actualizado exitosamente',
        data: product
    })
});


// Eliminar producto
const deleteProduct = asyncHandler (async(req, res) =>{
    const product = await Product.findById(req.params.id);
    if(!product) {
        return res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
        });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({
        success: true,
        message: 'Producto elminado Exitosamente',
});

});

//Activar o desactivar producto

const toggleProductStatus = asyncHandler(async(req,res) =>{
    const product = await Product.findById(req.params.id);
    if(!product) {
        return res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
        });
    }
    product.isActive = !product.isActive;
    product.updatedBy = req.user._id;
    await product.save();
    res.status(200).json({
        success: true,
        message: `producto ${product.isActive ? 'Activado' : 'Desactivado'} exitosamente`,
        data: product
    });
});

//Ordenar stock del producto
const updateProductStock = asyncHandler(async(req, res)=>{
    const { quantity, operation = 'set ' } = req.body;
    if( quantity === undefined ) {
        return res.status(400).json({
            success: false,
            message: 'La cantidad es requerida'
        });
    }

    const product = await Product.findById(req.params.id);
    if(!product) {
        return res.status(404).json({
            success: false,
            message: 'Producto no encontrado'
        });
    }

    if(!product.stock.trackStock) {
        return res.status(400).json({
            success: false,
            message: 'El producto no maneja un control de stock'
        });
    }

    // Operaciones set add o subtract
    switch (operation) {
        case 'set':
            product.stock.quantity = quantity;
            break;
        case 'add':
            product.stock.quantity += quantity;
            break;
        case 'subtract':
            product.stock.quantity = Math.max(0, product.stock.quantity - quantity);
            break;
        default:
            return res.status(400).json({
                success: false,
                message: 'Operacion no valida, debe ser set, add o subtract'
            });
    }

    product.updatedBy = req.user._id;
    await product.save();
    res.status(200).json({
        success: true,
        message: 'Stock actualizado exitosamente',
        data: {
            sku: product.sku,
            name: product.name,
            previousStock: product.stock.quantity,
            newStock: product.stock.quantity,
            isLowStock: product.isLowStock,
            isOutOfStock: product.isOutOfStock
        }
    });
});

// Obtener estadisticas de subcategorias
const getProductStats = asyncHandler (async(req,res) =>{
    const stats = await Product.aggregate([
        {
            $group: {
                _id: null,
                totalProducts: { $sum: 1},
                activateProducts: {
                    $sum: {$cond: [{$eq: ['$isActive', true]}, 1, 0 ]}
                },
                 featuredProducts: {
                    $sum: {$cond: [{$eq: ['$isActive', true]}, 1, 0 ]}
                },
                digitalProducts: {
                    $sum: {$cond: [{$eq: ['$isDigital', true]}, 1, 0 ]}
                },
                totalValue : { $sum: '$price' },
                averagePrice: { $sum: '$stock.quantity' }
            }
        }
    ]);
    // Productos con stock bajo
    const lowStockProducts = await Product.find({
        'stock.trackStock': true,
        $expr: { $lte: ['stock.quantity', 'stock.minStock'] }    
    })
    .select('name sku stock.quantity stock.minStock')
    .limit(10)

    const expensiveProducts = await Product.find({ isActive: true })
    .sort({ price: -1 })
    .limit(5)
    .select('name sku price');

    res.status(200).json({
        success: true,
        data: {
            stast: stats[0] || {
                totalProducts: 0 ,
                activateProducts: 0,
                featuredProducts: 0,
                digitalProducts: 0,
                totalValue: 0,
                averagePrice: 0,
    
        },
            lowStockProducts,
            expensiveProducts
        }
    });
});

module.exports = {
    getproducts,
    getActiveproducts,
    getProductsBycategory,
    getProductsBySubcategory,
    getproductByid,
    getproductBySku,
    getFeaturedProducts,
    createdProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    updateProductStock,
    getProductStats
};
