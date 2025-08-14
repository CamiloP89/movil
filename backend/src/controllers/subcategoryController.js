const {  Subcategory, Category, Product} = require('../models')
const { asyncHandler} = require('../middleware/asyncHandler');

// Obtener todas las subcategorias
const getSubcategories = asyncHandler(async(req, res) =>{
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.page) || 10;
    const skip = (page - 1) * limit ;
    //filtros para la busqueda
    const filter = {};
    //activo/inactivo
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    //Nombre o descripcion 
    if (req.query.search) {
        filter.$or = [
            {name: {$regex: req.query.search, $options: 'i'}},
            {description: {$regex: req.query.search, $options: 'i'}}
        ];
    }

    // consulta a la base de datos
    let query = Subcategory.find(filter)
    .populate('category', 'name slug isActive')
    .populate('createdBy', 'username firstName lastName')
    .populate('productsCount')
    .sort({sortOrder: 1, name: 1});

    if (req.query.page) {
        query = query.skip(skip.limit(limit));
    }

    //Ejercutar las constultas

    const subcategories = await query;
    const total = await Subcategory.countDocuments(filter);
    res.status(200).json({
        success:true,
        data: subcategories,
        pagination: req.query.page ? {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }: undefined
    });
});

// Obtener subcategorias por categoria

const getSubcategoriesByCategory = asyncHandler(async (req, res) =>{
    const {categoryId} = req.params;
    //vetificar si la categoria existe y esta activa
    const category = await Category.findById(categoryId);
    if(!category) {
        return res.status(404).json({
            success: false,
            message: 'Categoria no encontrada'
        });
    }
    const subcategories = await Subcategory.findByIdCategory(categoryId);
    res.status(200).json({
        success: true,
        data: subcategories
    })
});

//Obtener una subcategoria por ID
const getSubcategoryById = asyncHandler(async(req, res) =>{
    const subcategory = await Subcategory.findById(req.params.id)
    .populate('category', 'name slug description')
    .populate('createdBy', 'username firstName LastName')
    .populate('updateby', 'username firstName LastName');
    if(!subcategory) {
        return res.status(404).json({
            success: false,
            message: 'Subcategoria no encontrada'
        });
    }
    //Obtener productos asociados a una subcategoria
    const products = await Product.find({subcategory: subcategory._id, isActive: true})
    .select('name price stock.quantity isActive')
    .sort({sortOrder: 1, name: 1});
    res.status(200).json({
        success: true,
        data: { 
            ...subcategory.toObject(),
            products
        }
    });
});

//Crear una subcategoria
const createdSubcategory = asyncHandler(async(req, res) =>{
    const { name, description, category, categoryId, icon, color, sortOrder, isActive, } = req.body;
    
    const targetcategoryId = categoryId || category;
    if (!name || targetcategoryId) {
        return res.status(400).json({
            success: false,
            message: 'El nombre de la subcategoria es obligatorio'
        });
    }
    const parentCategory = await Category.findById(targetcategoryId);
    if (!parentCategory) {
        return res.status(400).json({
            success: false,
            message: 'La categoria especifica no existe'
        });
    }
    if (!parentCategory.isActive) {
        return res.status(400).json({
            success: false,
            message: 'La categoria especifica no esta activa'
        });
    }

    //Verificar si la subcategoria ya existe en esa categoria
    const existingSubcategory = await Subcategory.findOne({
        name: {$regex: new RegExp(`^${name}$`, 'i') },
        category: targetcategoryId
    });
    if (existingSubcategory) {
        return res.status(400).json({
            success: false,
            message: 'Ya existe una Subcategoria con ese nombre en esta categoria'
        });
    }
    
    //crear una subcategoria
    const subcategory = await Subcategory.create({
        name,
        description,
        category: targetcategoryId,
        color,
        icon,
        sortOrder: sortOrder || 0,
        isActive: isActive !== undefined ? isActive: true,
        createdBy: req.user._id
    });
    await subcategory.populate('category', 'name slug description');
    res.status(201).json({
        success: true,
        message: 'Subcategoria creada correctamente',
        data: subcategory
    });
});

//Actualizar una subcategoria
const updateSubcategory = asyncHandler(async(req, res) =>{
    const subcategory = await Subcategory.findById(req.params.id);
    if(!subcategory) {
        return res.status(404).json({
            success: false,
            message: 'subcategoria no encontrada'
        });
    }

    const {name,description,category,categoryId,icon,color,sortOrder,isActive} = req.body

    const targetcategoryId = categoryId || category;
    
    // Si cambia la categoria, verificar si existe y esta activa
    if (targetcategoryId && targetcategoryId !== subcategory.category.toString()) {
        const parentCategory = await Category.findById(targetcategoryId);
        if (!parentCategory) {
            return res.status(400).json({
                success: false,
                message: 'La categoria especifica no existe'
            });
        }
        if (!parentCategory.isActive) {
            return res.status(400).json({
                success: false,
                message: 'La categoria especifica no esta activa'
            });
        }
    }
    
    // verificar duplicados
    if ((name && name !== subcategory.name) || (targetcategoryId && targetcategoryId !== subcategory.category.toString())) {
        const existingSubcategory = await Subcategory.findOne({
            name: { $regex: new RegExp(`^${name || subcategory.name}$`,'i')},
        });
        if (existingSubcategory) {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una subcategoria con ese nombre'
            });
        }
    }
    // Actualizar la categoria
    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (targetcategoryId) subcategory.category = targetcategoryId;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;
    subcategory.updatedBy = req.user._id;
    await subcategory.save();
    await subcategory.populate('category', 'name slug description');


    res.status(200).json({
        success: true,
        message: 'subcategoria actualiza exitosamente',
        data: subcategory
    })
});
