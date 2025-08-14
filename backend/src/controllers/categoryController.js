const { Category, Subcategory, Product} = require('../models')
const { asyncHandler} = require('../middleware/asyncHandler');

// Obtener todas las categorias
const getCategories = asyncHandler(async(req, res) =>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page) || 10;
    const skip = (page - 1) * limit ;
    //filtros para la busqueda
    const filter = {};
    //activo/incativo
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    //Nombre o descripcion 
    if (req.query.search) {
        filter.$or = [
            {name: {$regex: req.query.search, $options: 'i'}},
            {description: {$regex: req.query.search, $options: 'i'}}
        ];
    }
    // consulta a la base de datos
    let query = Category.find(filter)
    .populate('createdBy', 'username', 'firstName', 'LastName')
    .populate('subcategoriesCount')
    .populate('productsCount')
    .sort({sortOrder: 1, name: 1});

    if (req.query.page) {
        query = query.skip(skip.limit(limit));
    }
});

const getActiveCategories = asyncHandler(async (req, res) =>{
    const categories = await Category.findActive();
    res.status(200).json({
        success: true,
        message: categories
    });
});

//Obtener una categoria por ID
const getCategoryById = asyncHandler(async(req, res) =>{
    const category = await Category.findById(req.params.id)
    .populate('createdBy', 'username firstName LastName')
    .populate('updateBy', 'username firstName LastName');
    if(!category) {
        return res.status(404).json({
            success: false,
            message: 'Categoria no encontrada'
        });
    }
    //Obtener subcategorias de la categoria padre
    const subcategories = await Subcategory.find({category: category._id, isActive: true})
    .sort({sortOrder: 1, name: 1});
    res.status(200).json({
        success: true,
        data: {
            ...category.toObject(),
            subcategories
        }
    });
});

//Crear una categoria
const createdCategory = asyncHandler(async(req, res) =>{
    const { name, description, icon, sortOrder, isActive, } = req.body;
    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'El nombre de la categoria es obligatorio'
        });
    }
    const existingCategory = await Category.findOne({
        name: {$regex: new RegExp(`^${name}$`, 'i') }
    });
    if (existingCategory) {
        return res.status(400).json({
            success: false,
            message: 'Ya existe una categoria con ese nombre'
        });
    }

    //crear la categoria
    const category = await Category.create({
        name,
        description,
        icon,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive: true,
        createdBy: req.user._id
    });
    res.status(201).json({
        success: true,
        data: category
    });
});

//Actualizar una categoria
const updateCategory = asyncHandler(async(req, res) =>{
    const category = await Category.findById(req.params.id);
    if(!category) {
        return res.status(404).json({
            success: false,
            message: 'Categoria no encontrada'
        });
    }

    const {name,description,icon,color,sortOrder,isActive} = req.body

    // verificar duplicados
    if(name && name !== category.name) {
        const existingCategory = await category.findOne({
            name: { $regex: new RegExp(`^${name}$`,'i')}
        });
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una categoria con ese nombre'
            });
        }
    }
    
    // Actualizar la categoria
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;
    category.updatedBy = req.user._id;
    await category.save();
    res.status(200).json({
        success: true,
        message: 'Categoria actualiza exitosamente',
        data: category
    })
});

// Eliminar categoria

const deleteCategory = asyncHandler (async(req, res) =>{
    const category = await Category.findById(req.params.id);
    if(!category) {
        return res.status(404).json({
            success: false,
            message: 'Categoria no encontrada'
        });
    }

 //Verificar si se puede eliminar

 const canDelete = await category.canDelete();
    if(!canDelete){
        return res.status(404).json({
            success: false,
            message: 'No se puede eliminar esta categoria por que tiene subcateogiras o productos asociados'
        })
 }
    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({
        success: true,
        message: 'Categoria elminada correctamente'
});

});

//Activar o desactivar categoria

const toggleCategoryStatus = asyncHandler(async(req,res) =>{
    const category = await Category.findById(req.params.id);
    if(!category) {
        return res.status(404).json({
            success: false,
            message: 'Categoria no encontrada'
        });
    }
    category.isActive = !category.isActive;
    category.updatedBy = req.user._id;
    await category.save();
    // Si la categoria se desactiva desactivar sibcategorias y productos asociados
    if (!category.isActive) {
        await Subcategory.updateMany(
            { category: category._id},
            {isActive: false, updatedBy: req.user._id}
        );
        await Subcategory.updateMany(
            { category: category._id},
            {isActive: false, updatedBy: req.user._id}
        );
        await Product.updateMany(
            { category: category._id},
            {isActive: false, updatedBy: req.user._id}
        );
    }
    res.status(200).json({
        success: true,
        message: `categoria ${category.isActive ? 'Activada' : 'Desactivada'} exitosamente`,
        data: category
    });
});

//Ordenar categorias
const reorderCategories = asyncHandler(async(req, res)=>{
    const {categoryIds} = req.body;
    if(!Array.isArray(categoryIds)) {
        return res.status(400).json({
            success: false,
            message: 'Se requiere un aray de ids de categorias'
        });
    }
    //actualizar el orden de las categorias 
    const updatePromises = categoryIds.map((category, index) =>
        category.findByIdAnUpdate(
            categoryId,
            {
                sortOrder: index + 1,
                updatedBy: req.user._id
            },
            {new: true}
        )
    );
    await Promise.all(updatePromises);
    res.status(200).json({
        success: true,
        message: 'Prdem de cagoorias actualizado correctamente'
    })
});

// Obtener estadisticas de categorias
const getCategoryStats = asyncHandler (async(req,res) =>{
    const stats = await Category.aggregate([
        {
            $group: {
                _id: null,
                totalCategories: { $sum: 1},
                activateCategories: {
                    $sum: {$cond: [{$eq: ['$isActive', true]}, 1, 0 ]}
                },
            }
        }
    ]);
    const categoriesWithSubcounts = await Category.aggregate([
        {
            $lookup: {
                from: '$subcategories',
                localField: '_id',
                foreignField: 'category',
                as: 'subcategories'
            }
        },
        {
            $project: {
                name: 1,
                subcategoriesCount: {$size: '$subcategories'}
            }
        },
        {$sort: { subcategoriesCount: -1 }},
        {$limit: 5}
    ]);
    res.status(200).json({
        success: true,
        data: {
            stast: stats[0] || {
                totalCategories: 0 ,
                activeCategories: 0
    
        },
            topCategories: categoriesWithSubcounts
        }
    });
});

module.exports ={
    getCategories,
    getActiveCategories,
    getCategoryById,
    createdCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryStatus,
    reorderCategories,
    getCategoryStats
};
