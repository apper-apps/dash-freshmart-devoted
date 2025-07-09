import productsData from "@/services/mockData/products.json";

// ProductService class definition
class ProductService {
  constructor() {
    this.products = [...productsData];
    this.nextId = Math.max(...this.products.map(p => p.id || 0)) + 1;
  }

  // Utility method for delays (simulating API calls)
  delay(ms = 150) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get next available ID
  getNextId() {
    return this.nextId++;
  }

  // Round numbers to specified decimals
  roundToDecimals(value, decimals = 2) {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  // Calculate margin percentage
  calculateMarginPercentage(basePrice, costPrice) {
    if (!costPrice || costPrice <= 0) return 0;
    return this.roundToDecimals(((basePrice - costPrice) / costPrice) * 100);
  }

  // Get all products with role-based filtering
  async getAll(userRole = "customer") {
    await this.delay();
    
    try {
      if (userRole === "customer") {
        return this.products.filter(product => product.isVisible !== false);
      }
      return [...this.products];
    } catch (error) {
      console.error('Error getting products:', error);
      throw new Error('Failed to fetch products');
    }
  }

  // Get product by ID
  async getById(id, userRole = "customer") {
    await this.delay();
    
    try {
      const product = this.products.find(p => p.id === parseInt(id));
      if (!product) {
        throw new Error('Product not found');
      }
      
      if (userRole === "customer" && product.isVisible === false) {
        throw new Error('Product not available');
      }
      
      return { ...product };
    } catch (error) {
      console.error('Error getting product by ID:', error);
      throw error;
    }
  }

  // Create new product
  async create(productData) {
    await this.delay();
    
    try {
      // Validate required fields
      if (!productData.name?.trim()) {
        throw new Error('Product name is required');
      }
      
      if (!productData.price || parseFloat(productData.price) <= 0) {
        throw new Error('Valid price is required');
      }
      
      if (!productData.category) {
        throw new Error('Category is required');
      }

      // Calculate profit metrics
      const profitMetrics = this.calculateProfitMetrics(productData);
      
      const newProduct = {
        id: this.getNextId(),
        ...productData,
        ...profitMetrics,
        barcode: productData.barcode || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: productData.imageUrl || "/api/placeholder/300/200",
        isVisible: productData.isVisible !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.products.push(newProduct);
      return { ...newProduct };
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  // Update existing product
  async update(id, productData) {
    await this.delay();
    
    try {
      const index = this.products.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        throw new Error('Product not found');
      }

      // Calculate profit metrics if pricing fields changed
      let profitMetrics = {};
      if (productData.price || productData.purchasePrice || productData.discountValue) {
        const updatedData = { ...this.products[index], ...productData };
        profitMetrics = this.calculateProfitMetrics(updatedData);
      }

      this.products[index] = {
        ...this.products[index],
        ...productData,
        ...profitMetrics,
        updatedAt: new Date().toISOString()
      };

      return { ...this.products[index] };
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  // Delete product
  async delete(id) {
    await this.delay();
    
    try {
      const index = this.products.findIndex(p => p.id === parseInt(id));
      if (index === -1) {
        throw new Error('Product not found');
      }

      this.products.splice(index, 1);
      return { success: true, message: 'Product deleted successfully' };
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  // Get product by barcode
  async getByBarcode(barcode) {
    await this.delay();
    
    try {
      const product = this.products.find(p => p.barcode === barcode);
      if (!product) {
        throw new Error('Product not found');
      }
      
      return { ...product };
    } catch (error) {
      console.error('Error getting product by barcode:', error);
      throw error;
    }
  }

  // Calculate profit metrics
  calculateProfitMetrics(productData) {
    const price = parseFloat(productData.price) || 0;
    const purchasePrice = parseFloat(productData.purchasePrice) || 0;
    const discountValue = parseFloat(productData.discountValue) || 0;
    
    let finalPrice = price;
    
    // Apply discount
    if (discountValue > 0) {
      if (productData.discountType === 'Percentage') {
        finalPrice = price - (price * discountValue / 100);
      } else {
        finalPrice = price - discountValue;
      }
    }
    
    finalPrice = Math.max(0, finalPrice);
    
    const minSellingPrice = purchasePrice > 0 ? purchasePrice * 1.1 : 0;
    const profitMargin = this.calculateMarginPercentage(finalPrice, purchasePrice);
    
    return {
      minSellingPrice: this.roundToDecimals(minSellingPrice),
      profitMargin: this.roundToDecimals(profitMargin)
    };
  }

  // Bulk update prices
  async bulkUpdatePrices(updateData) {
    await this.delay(300);
    
    try {
      let updatedCount = 0;
      const conflicts = [];
      
      for (const product of this.products) {
        if (this.shouldUpdateProduct(product, updateData)) {
          try {
            const newPrice = this.calculateNewPrice(product, updateData);
            const updatedProduct = {
              ...product,
              price: newPrice,
              updatedAt: new Date().toISOString()
            };
            
            // Recalculate profit metrics
            const profitMetrics = this.calculateProfitMetrics(updatedProduct);
            Object.assign(updatedProduct, profitMetrics);
            
            const index = this.products.findIndex(p => p.id === product.id);
            this.products[index] = updatedProduct;
            updatedCount++;
            
          } catch (error) {
            conflicts.push({
              productId: product.id,
              productName: product.name,
              error: error.message
            });
          }
        }
      }
      
      return {
        updatedCount,
        conflicts,
        priceGuardsApplied: updateData.priceGuards?.enabled || false
      };
    } catch (error) {
      console.error('Error in bulk price update:', error);
      throw error;
    }
  }

  // Helper method to determine if product should be updated
  shouldUpdateProduct(product, updateData) {
    // Category filter
    if (updateData.category !== 'all' && product.category !== updateData.category) {
      return false;
    }
    
    // Low stock filter
    if (updateData.applyToLowStock) {
      const threshold = parseInt(updateData.stockThreshold) || 10;
      if (product.stock > threshold) {
        return false;
      }
    }
    
    // Selected rows filter
    if (updateData.applyTo === 'selected_rows' && !updateData.selectedRows.has(product.id)) {
      return false;
    }
    
    return true;
  }

  // Calculate new price based on strategy
  calculateNewPrice(product, updateData) {
    let newPrice = product.price;
    
    switch (updateData.strategy) {
      case 'percentage':
        const percentage = parseFloat(updateData.value) || 0;
        newPrice = product.price * (1 + percentage / 100);
        break;
      case 'fixed':
        const fixedAmount = parseFloat(updateData.value) || 0;
        newPrice = product.price + fixedAmount;
        break;
      case 'range':
        const minPrice = parseFloat(updateData.minPrice) || 0;
        const maxPrice = parseFloat(updateData.maxPrice) || product.price;
        newPrice = Math.min(Math.max(product.price, minPrice), maxPrice);
        break;
    }
    
    // Apply price guards
    if (updateData.priceGuards?.enabled) {
      newPrice = Math.max(updateData.priceGuards.minPrice, newPrice);
      newPrice = Math.min(updateData.priceGuards.maxPrice, newPrice);
    }
    
    return this.roundToDecimals(Math.max(1, newPrice));
  }

  // Search and filter products
  async searchAndFilter(searchTerm = "", filters = {}) {
    await this.delay();
    
    try {
      let results = [...this.products];
      
      // Apply search term
      if (searchTerm) {
        results = results.filter(product => 
          product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.barcode?.includes(searchTerm) ||
          product.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Apply category filter
      if (filters.category && filters.category !== 'all') {
        results = results.filter(product => product.category === filters.category);
      }
      
      // Apply price range filter
      if (filters.minPrice) {
        results = results.filter(product => product.price >= parseFloat(filters.minPrice));
      }
      
      if (filters.maxPrice) {
        results = results.filter(product => product.price <= parseFloat(filters.maxPrice));
      }
      
      return results;
    } catch (error) {
      console.error('Error in search and filter:', error);
      throw error;
    }
  }

  // Get filter options
  async getFilterOptions() {
    await this.delay();
    
    try {
      const categories = [...new Set(this.products.map(p => p.category).filter(Boolean))];
      const priceRange = {
        min: Math.min(...this.products.map(p => p.price || 0)),
        max: Math.max(...this.products.map(p => p.price || 0))
      };
      
      return {
        categories,
        priceRange
      };
    } catch (error) {
      console.error('Error getting filter options:', error);
      throw error;
    }
  }

  // Validate pricing hierarchy
  async validatePricingHierarchy(productData, allProducts = [], excludeId = null) {
    await this.delay(100);
    
    try {
      const conflicts = [];
      const warnings = [];
      
      // Check for price conflicts with similar products
      const similarProducts = allProducts.filter(p => 
        p.category === productData.category && 
        p.id !== excludeId
      );
      
      for (const similar of similarProducts) {
        if (Math.abs(similar.price - productData.price) < 0.01) {
          conflicts.push({
            type: 'duplicate_price',
            details: `Same price as ${similar.name}`
          });
        }
      }
      
      return {
        isValid: conflicts.length === 0,
        conflicts,
        warnings
      };
    } catch (error) {
      console.error('Error validating pricing hierarchy:', error);
      throw error;
    }
  }

  // Calculate hierarchy price
  calculateHierarchyPrice(productData) {
    const basePrice = parseFloat(productData.price) || 0;
    const costPrice = parseFloat(productData.purchasePrice) || 0;
    
    return {
      basePrice,
      costPrice,
      margin: this.calculateMarginPercentage(basePrice, costPrice)
    };
  }

  // Add variation pricing
  async addVariationPricing(productId, variations) {
    await this.delay();
    
    try {
      const product = await this.getById(productId, 'admin');
      product.variations = variations;
      product.enableVariations = true;
      
      return await this.update(productId, { variations, enableVariations: true });
    } catch (error) {
      console.error('Error adding variation pricing:', error);
      throw error;
    }
  }

  // Add seasonal discount
  async addSeasonalDiscount(productId, discountData) {
    await this.delay();
    
    try {
      return await this.update(productId, {
        discountValue: discountData.value,
        discountType: discountData.type,
        discountStartDate: discountData.startDate,
        discountEndDate: discountData.endDate
      });
    } catch (error) {
      console.error('Error adding seasonal discount:', error);
      throw error;
    }
  }

  // Bulk update pricing hierarchy
  async bulkUpdatePricingHierarchy(updateData) {
    return await this.bulkUpdatePrices(updateData);
  }

  // Image validation
  async validateImage(file) {
    await this.delay(100);
    
    try {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      
      if (file.size > maxSize) {
        return { isValid: false, error: 'Image file size must be less than 10MB' };
      }
      
      if (!allowedTypes.includes(file.type)) {
        return { isValid: false, error: 'Invalid image format. Please use JPEG, PNG, WebP, or GIF' };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error validating image:', error);
      return { isValid: false, error: 'Image validation failed' };
    }
  }

  // Process image
  async processImage(file, options = {}) {
    await this.delay(1000);
    
    try {
      // Simulate image processing
      const processedUrl = URL.createObjectURL(file);
      
      return {
        url: processedUrl,
        size: file.size,
        dimensions: options.targetSize || { width: 600, height: 600 }
      };
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Image processing failed');
    }
  }

  // Search images
  async searchImages(query, options = {}) {
    await this.delay(500);
    
    try {
      // Simulate image search results
      const mockResults = Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        url: `https://picsum.photos/600/600?random=${Date.now() + index}`,
        thumbnail: `https://picsum.photos/200/200?random=${Date.now() + index}`,
        description: `${query} image ${index + 1}`,
        attribution: {
          photographer: `Photographer ${index + 1}`,
          source: 'Unsplash'
        }
      }));
      
      return mockResults;
    } catch (error) {
      console.error('Error searching images:', error);
      throw error;
    }
  }

  // Generate AI image
  async generateAIImage(prompt, options = {}) {
    await this.delay(2000);
    
    try {
      // Simulate AI image generation
      const generatedUrl = `https://picsum.photos/600/600?random=${Date.now()}`;
      
      return {
        url: generatedUrl,
        prompt,
        style: options.style || 'realistic'
      };
    } catch (error) {
      console.error('Error generating AI image:', error);
      throw error;
    }
  }

  // Smart crop image
  async smartCropImage(imageData, targetDimensions) {
    await this.delay(300);
    
    try {
      // Simulate smart cropping
      return {
        url: imageData,
        dimensions: targetDimensions
      };
    } catch (error) {
      console.error('Error cropping image:', error);
      throw error;
    }
  }

  // Get dynamic image dimensions
  getDynamicImageDimensions(viewportWidth = 1200, enforceSquare = true) {
    if (enforceSquare) {
      return { width: 600, height: 600 };
    }
    
    const ratio = viewportWidth / 1200;
    return {
      width: Math.round(600 * ratio),
      height: Math.round(400 * ratio)
    };
  }

  // Get bulk price data
  async getBulkPriceData(page = 1, limit = 100, filters = {}) {
    await this.delay();
    
    try {
      let filteredProducts = await this.searchAndFilter(filters.search, filters);
      
      const startIndex = (page - 1) * limit;
      const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limit);
      
      return {
        products: paginatedProducts,
        pagination: {
          page,
          limit,
          total: filteredProducts.length,
          totalPages: Math.ceil(filteredProducts.length / limit)
        }
      };
    } catch (error) {
      console.error('Error getting bulk price data:', error);
      throw error;
    }
  }

  // Update product prices
  async updateProductPrices(productId, priceData) {
    await this.delay();
    
    try {
      const validation = this.validatePriceUpdate(priceData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      return await this.update(productId, priceData);
    } catch (error) {
      console.error('Error updating product prices:', error);
      throw error;
    }
  }

  // Validate price update
  validatePriceUpdate(priceData) {
    if (priceData.price && priceData.price <= 0) {
      return { isValid: false, error: 'Price must be greater than 0' };
    }
    
    if (priceData.purchasePrice && priceData.purchasePrice < 0) {
      return { isValid: false, error: 'Purchase price cannot be negative' };
    }
    
    if (priceData.price && priceData.purchasePrice && priceData.price <= priceData.purchasePrice) {
      return { isValid: false, error: 'Selling price must be greater than purchase price' };
    }
    
    return { isValid: true };
  }

  // Validate bulk price update
  validateBulkPriceUpdate(updateData) {
    if (!updateData.strategy) {
      return { isValid: false, error: 'Update strategy is required' };
    }
    
    if (updateData.strategy !== 'range' && !updateData.value) {
      return { isValid: false, error: 'Update value is required' };
    }
    
    if (updateData.strategy === 'range' && (!updateData.minPrice || !updateData.maxPrice)) {
      return { isValid: false, error: 'Min and max prices are required for range strategy' };
    }
    
    return { isValid: true };
  }

  // Bulk validate price updates
  async bulkValidatePriceUpdates(updates) {
    await this.delay(200);
    
    try {
      const results = [];
      
      for (const update of updates) {
        const validation = this.validatePriceUpdate(update);
        results.push({
          productId: update.productId,
          isValid: validation.isValid,
          error: validation.error
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error validating bulk price updates:', error);
      throw error;
    }
  }

  // Validate offer conflicts
  async validateOfferConflicts(productData, allProducts = [], excludeId = null) {
    await this.delay(100);
    
    try {
      const conflicts = [];
      const warnings = [];
      
      // Check for existing discounts
      if (productData.discountValue > 0) {
        const conflictingProducts = allProducts.filter(p => 
          p.id !== excludeId &&
          p.category === productData.category &&
          p.discountValue > 0
        );
        
        if (conflictingProducts.length > 0) {
          warnings.push('Multiple products in this category have active discounts');
        }
      }
      
      return {
        isValid: conflicts.length === 0,
        conflicts,
        warnings
      };
    } catch (error) {
      console.error('Error validating offer conflicts:', error);
      throw error;
    }
  }

  // Get display metrics
  getDisplayMetrics(product) {
    const profitMetrics = this.calculateProfitMetrics(product);
    
    return {
      ...profitMetrics,
      stockStatus: product.stock <= (product.minStock || 5) ? 'low' : 'normal',
      priceStatus: product.price > 0 ? 'valid' : 'invalid'
    };
  }

  // Validate profit rules
  validateProfitRules(productData) {
    const price = parseFloat(productData.price) || 0;
    const purchasePrice = parseFloat(productData.purchasePrice) || 0;
    
    if (purchasePrice > 0 && price <= purchasePrice) {
      return { isValid: false, error: 'Selling price must be greater than purchase price' };
    }
    
    return { isValid: true };
  }

  // Get financial health
  getFinancialHealth(product) {
    const metrics = this.calculateProfitMetrics(product);
    const margin = parseFloat(metrics.profitMargin) || 0;
    
    let health = 'poor';
    if (margin > 30) health = 'excellent';
    else if (margin > 20) health = 'good';
    else if (margin > 10) health = 'fair';
    
return {
      health,
      margin,
      recommendation: margin < 10 ? 'Consider increasing price or reducing cost' : 'Healthy profit margin'
    };
  }
}

// Create and export service instance
const productServiceInstance = new ProductService();

// Export all methods bound to the instance
export default {
  getAll: productServiceInstance.getAll.bind(productServiceInstance),
  getById: productServiceInstance.getById.bind(productServiceInstance),
  create: productServiceInstance.create.bind(productServiceInstance),
  update: productServiceInstance.update.bind(productServiceInstance),
  delete: productServiceInstance.delete.bind(productServiceInstance),
  getByBarcode: productServiceInstance.getByBarcode.bind(productServiceInstance),
  bulkUpdatePrices: productServiceInstance.bulkUpdatePrices.bind(productServiceInstance),
  searchAndFilter: productServiceInstance.searchAndFilter.bind(productServiceInstance),
  getFilterOptions: productServiceInstance.getFilterOptions.bind(productServiceInstance),
  processImage: productServiceInstance.processImage.bind(productServiceInstance),
  searchImages: productServiceInstance.searchImages.bind(productServiceInstance),
  generateAIImage: productServiceInstance.generateAIImage.bind(productServiceInstance),
  validatePricingHierarchy: productServiceInstance.validatePricingHierarchy.bind(productServiceInstance),
  addVariationPricing: productServiceInstance.addVariationPricing.bind(productServiceInstance),
  addSeasonalDiscount: productServiceInstance.addSeasonalDiscount.bind(productServiceInstance),
  getBulkPriceData: productServiceInstance.getBulkPriceData.bind(productServiceInstance),
  updateProductPrices: productServiceInstance.updateProductPrices.bind(productServiceInstance),
  bulkValidatePriceUpdates: productServiceInstance.bulkValidatePriceUpdates.bind(productServiceInstance),
  validateOfferConflicts: productServiceInstance.validateOfferConflicts.bind(productServiceInstance),
  bulkUpdatePricingHierarchy: productServiceInstance.bulkUpdatePricingHierarchy.bind(productServiceInstance),
  validateImage: productServiceInstance.validateImage.bind(productServiceInstance),
  calculateProfitMetrics: productServiceInstance.calculateProfitMetrics.bind(productServiceInstance),
  getDisplayMetrics: productServiceInstance.getDisplayMetrics.bind(productServiceInstance),
  validateProfitRules: productServiceInstance.validateProfitRules.bind(productServiceInstance),
  getFinancialHealth: productServiceInstance.getFinancialHealth.bind(productServiceInstance),
  smartCropImage: productServiceInstance.smartCropImage.bind(productServiceInstance),
  calculateHierarchyPrice: productServiceInstance.calculateHierarchyPrice.bind(productServiceInstance),
  getDynamicImageDimensions: productServiceInstance.getDynamicImageDimensions.bind(productServiceInstance),
  validateBulkPriceUpdate: productServiceInstance.validateBulkPriceUpdate.bind(productServiceInstance),
  validatePriceUpdate: productServiceInstance.validatePriceUpdate.bind(productServiceInstance),
  roundToDecimals: productServiceInstance.roundToDecimals.bind(productServiceInstance),
  calculateMarginPercentage: productServiceInstance.calculateMarginPercentage.bind(productServiceInstance)
};