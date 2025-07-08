import React from "react";
import Error from "@/components/ui/Error";
import productsData from "@/services/mockData/products.json";
class ProductService {
  constructor() {
    this.products = [...productsData];
  }

async getAll(userRole = 'customer') {
    await this.delay();
    const products = [...this.products];
    
    // Filter financial data for non-admin users
    if (userRole !== 'admin') {
      return products.map(product => {
        const { purchasePrice, minSellingPrice, profitMargin, ...filteredProduct } = product;
        return filteredProduct;
      });
    }
    
    return products;
  }

async getById(id, userRole = 'customer') {
    await this.delay();
    const product = this.products.find(p => p.id === id);
    if (!product) {
      throw new Error('Product not found');
    }
    
    // Filter financial data for non-admin users
    if (userRole !== 'admin') {
      const { purchasePrice, minSellingPrice, profitMargin, ...filteredProduct } = product;
      return filteredProduct;
    }
    
    return { ...product };
  }

  async create(productData) {
    await this.delay();
    // Validate required fields
    if (!productData.name || !productData.price || productData.stock === undefined) {
      throw new Error('Name, price, and stock are required fields');
    }
    // Validate data types and constraints
    if (productData.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (productData.stock < 0) {
      throw new Error('Stock cannot be negative');
    }

    const newProduct = {
      id: this.getNextId(),
      ...productData,
      price: parseFloat(productData.price),
      purchasePrice: parseFloat(productData.purchasePrice) || 0,
      discountValue: parseFloat(productData.discountValue) || 0,
      minSellingPrice: parseFloat(productData.minSellingPrice) || 0,
      profitMargin: parseFloat(productData.profitMargin) || 0,
      stock: parseInt(productData.stock),
      minStock: productData.minStock ? parseInt(productData.minStock) : 10,
      isActive: productData.isActive !== undefined ? productData.isActive : true
    };
    
    this.products.push(newProduct);
    return { ...newProduct };
  }

  async update(id, productData) {
    await this.delay();
    
    const index = this.products.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      throw new Error('Product not found');
    }

    // Validate if provided
    if (productData.price !== undefined && productData.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (productData.stock !== undefined && productData.stock < 0) {
      throw new Error('Stock cannot be negative');
    }

    // Preserve existing ID
    const updatedProduct = { 
      ...this.products[index], 
      ...productData, 
      id: this.products[index].id 
    };
    
    this.products[index] = updatedProduct;
    return { ...updatedProduct };
  }

  async delete(id) {
    await this.delay();
    
    const index = this.products.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      throw new Error('Product not found');
    }
    
    this.products.splice(index, 1);
    return true;
  }

  async getByBarcode(barcode) {
    await this.delay();
    const product = this.products.find(p => p.barcode === barcode && p.isActive);
    if (!product) {
      throw new Error('Product not found');
    }
    return { ...product };
  }

  getNextId() {
    const maxId = this.products.reduce((max, product) => 
      product.id > max ? product.id : max, 0);
    return maxId + 1;
  }
async bulkUpdatePrices(updateData) {
    await this.delay(500); // Longer delay for bulk operations
    const validation = this.validateBulkPriceUpdate(updateData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    let filteredProducts = [...this.products];
    
    // Apply filtering based on updateData
    if (updateData.applyTo === 'selected_rows' && updateData.selectedRows) {
      const selectedIds = Array.from(updateData.selectedRows);
      filteredProducts = filteredProducts.filter(p => selectedIds.includes(p.id));
    } else if (updateData.applyTo === 'filtered_products') {
      // Filter by category
      if (updateData.category !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === updateData.category);
      }
      
      // Filter by stock if enabled
      if (updateData.applyToLowStock) {
        filteredProducts = filteredProducts.filter(p => p.stock <= updateData.stockThreshold);
      }
    } else {
      // Default filtering for backward compatibility
      if (updateData.category !== 'all') {
        filteredProducts = filteredProducts.filter(p => p.category === updateData.category);
      }
      
      if (updateData.applyToLowStock) {
        filteredProducts = filteredProducts.filter(p => p.stock <= updateData.stockThreshold);
      }
    }

    let updatedCount = 0;
    const updateResults = [];
    const conflicts = [];
    
    // Apply price updates
    filteredProducts.forEach(product => {
      const originalPrice = updateData.applyTo === 'cost_price' ? product.purchasePrice : product.price;
      let newPrice = originalPrice;
      
      switch (updateData.strategy) {
        case 'percentage':
          const percentage = parseFloat(updateData.value) || 0;
          newPrice = originalPrice * (1 + percentage / 100);
          break;
        case 'fixed':
          const fixedAmount = parseFloat(updateData.value) || 0;
          newPrice = originalPrice + fixedAmount;
          break;
        case 'range':
          const minPrice = parseFloat(updateData.minPrice) || 0;
          const maxPrice = parseFloat(updateData.maxPrice) || originalPrice;
          newPrice = Math.min(Math.max(originalPrice, minPrice), maxPrice);
          break;
      }

      // Apply price guards if enabled
      if (updateData.priceGuards && updateData.priceGuards.enabled) {
        if (newPrice < updateData.priceGuards.minPrice) {
          newPrice = updateData.priceGuards.minPrice;
        }
        if (newPrice > updateData.priceGuards.maxPrice) {
          newPrice = updateData.priceGuards.maxPrice;
        }
        
        // Check margin enforcement
        if (updateData.priceGuards.enforceMargin && updateData.applyTo === 'base_price') {
          const costPrice = product.purchasePrice || 0;
          if (costPrice > 0) {
            const minPriceForMargin = costPrice * (1 + updateData.priceGuards.minMargin / 100);
            if (newPrice < minPriceForMargin) {
              conflicts.push({
                productId: product.id,
                productName: product.name,
                reason: `Price would violate minimum margin requirement (${updateData.priceGuards.minMargin}%)`
              });
              return; // Skip this product
            }
          }
        }
      }

      // Round to 2 decimal places
      newPrice = Math.round(newPrice * 100) / 100;
      
      // Only update if price actually changed
      if (Math.abs(newPrice - originalPrice) > 0.01) {
        const productIndex = this.products.findIndex(p => p.id === product.id);
        if (productIndex !== -1) {
          const updateField = updateData.applyTo === 'cost_price' ? 'purchasePrice' : 'price';
          
          this.products[productIndex] = {
            ...this.products[productIndex],
            [updateField]: newPrice
          };
          
          // Update previous price for base price changes
          if (updateData.applyTo === 'base_price' || updateData.applyTo === 'filtered_products') {
            this.products[productIndex].previousPrice = originalPrice;
          }
          
          // Recalculate profit margin if both prices are available
          if (this.products[productIndex].price && this.products[productIndex].purchasePrice) {
            const price = this.products[productIndex].price;
            const cost = this.products[productIndex].purchasePrice;
            this.products[productIndex].profitMargin = ((price - cost) / cost * 100).toFixed(2);
          }
          
          updateResults.push({
            productId: product.id,
            productName: product.name,
            oldPrice: originalPrice,
            newPrice: newPrice,
            change: newPrice - originalPrice,
            field: updateField
          });
          
          updatedCount++;
        }
      }
    });

    return {
      updatedCount,
      totalFiltered: filteredProducts.length,
      strategy: updateData.strategy,
      applyTo: updateData.applyTo,
      conflicts,
      updateResults: updateResults.slice(0, 10), // Return first 10 for reference
      priceGuardsApplied: updateData.priceGuards?.enabled || false
    };
  }

validateBulkPriceUpdate(updateData) {
    if (!updateData.strategy) {
      return { isValid: false, error: 'Update strategy is required' };
    }

    if (updateData.strategy === 'range') {
      if (!updateData.minPrice || !updateData.maxPrice) {
        return { isValid: false, error: 'Both minimum and maximum prices are required for range strategy' };
      }
      if (parseFloat(updateData.minPrice) >= parseFloat(updateData.maxPrice)) {
        return { isValid: false, error: 'Minimum price must be less than maximum price' };
      }
    } else {
      if (!updateData.value) {
        return { isValid: false, error: 'Update value is required' };
      }
      if (isNaN(parseFloat(updateData.value))) {
        return { isValid: false, error: 'Update value must be a valid number' };
      }
    }

    // Validate Apply To selection
    if (!updateData.applyTo) {
      return { isValid: false, error: 'Apply To selection is required' };
    }

    // Validate selected rows if applying to selected rows
    if (updateData.applyTo === 'selected_rows') {
      if (!updateData.selectedRows || updateData.selectedRows.size === 0) {
        return { isValid: false, error: 'No rows selected for update' };
      }
    }

// Validate price guards if enabled
    if (updateData.priceGuards && updateData.priceGuards.enabled) {
      if (updateData.priceGuards.minPrice >= updateData.priceGuards.maxPrice) {
        return { isValid: false, error: 'Price guard minimum must be less than maximum' };
      }
      if (updateData.priceGuards.minMargin < 0) {
        return { isValid: false, error: 'Minimum margin cannot be negative' };
      }
    }

    return { isValid: true };
  }
  // Enhanced product filtering with comprehensive search and filter support
  async searchAndFilter(searchTerm = '', filters = {}) {
    await this.delay(200);
    
    try {
      let results = [...this.products];
      
      // Apply search term filter
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        results = results.filter(product => 
          product.name.toLowerCase().includes(search) ||
          product.category.toLowerCase().includes(search) ||
          (product.barcode && product.barcode.includes(search)) ||
          (product.description && product.description.toLowerCase().includes(search))
        );
      }
      
      // Apply category filter
      if (filters.category && filters.category !== 'All') {
        results = results.filter(product => product.category === filters.category);
      }
      
      // Apply price range filter
      if (filters.priceRange) {
        const { min, max } = filters.priceRange;
        if (min !== '' && !isNaN(parseFloat(min))) {
          results = results.filter(product => product.price >= parseFloat(min));
        }
        if (max !== '' && !isNaN(parseFloat(max))) {
          results = results.filter(product => product.price <= parseFloat(max));
        }
      }
      
      // Apply stock filter
      if (filters.inStock) {
        results = results.filter(product => product.stock > 0);
      }
      
      // Apply sorting
      if (filters.sortBy) {
        results.sort((a, b) => {
          switch (filters.sortBy) {
            case 'name':
              return a.name.localeCompare(b.name);
            case 'name-desc':
              return b.name.localeCompare(a.name);
            case 'price-low':
              return a.price - b.price;
            case 'price-high':
              return b.price - a.price;
            case 'stock':
              return b.stock - a.stock;
            default:
              return a.name.localeCompare(b.name);
          }
        });
      }
      
      return {
        products: results,
        totalCount: results.length,
        appliedFilters: {
          searchTerm,
          ...filters
        }
      };
      
    } catch (error) {
      console.error('Error in searchAndFilter:', error);
      throw new Error('Failed to search and filter products');
    }
  }

  // Get available filter options based on current products
  async getFilterOptions() {
    await this.delay(100);
    
    try {
      const categories = [...new Set(this.products.map(p => p.category))].sort();
      const priceRange = this.products.reduce((range, product) => {
        const price = product.price || 0;
        return {
          min: Math.min(range.min, price),
          max: Math.max(range.max, price)
        };
      }, { min: Infinity, max: -Infinity });
      
      return {
        categories: ['All', ...categories],
        priceRange: {
          min: Math.floor(priceRange.min),
          max: Math.ceil(priceRange.max)
        },
        sortOptions: [
          { value: 'name', label: 'Name (A-Z)' },
          { value: 'name-desc', label: 'Name (Z-A)' },
          { value: 'price-low', label: 'Price: Low to High' },
          { value: 'price-high', label: 'Price: High to Low' },
          { value: 'stock', label: 'Stock Level' }
        ]
      };
      
    } catch (error) {
      console.error('Error getting filter options:', error);
      return {
        categories: ['All'],
        priceRange: { min: 0, max: 1000 },
        sortOptions: []
      };
    }
  }

delay(ms = 150) { // Reduced delay for faster perceived performance
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Calculate profit metrics for a product
  calculateProfitMetrics(productData) {
    const price = parseFloat(productData.price) || 0;
    const purchasePrice = parseFloat(productData.purchasePrice) || 0;
    const discountValue = parseFloat(productData.discountValue) || 0;
    
    let finalPrice = price;
    
    // Apply discount based on type
    if (discountValue > 0) {
      if (productData.discountType === 'Percentage') {
        finalPrice = price - (price * discountValue / 100);
      } else {
        finalPrice = price - discountValue;
      }
    }
    
    // Ensure final price is not negative
    finalPrice = Math.max(0, finalPrice);
    
    // Calculate minimum selling price (purchase price + 10% margin)
    const minSellingPrice = purchasePrice > 0 ? purchasePrice * 1.1 : 0;
// Calculate profit margin percentage
    let profitMargin = 0;
    if (purchasePrice > 0 && finalPrice > 0) {
      profitMargin = ((finalPrice - purchasePrice) / purchasePrice) * 100;
    }
    return {
      minSellingPrice: Math.round(minSellingPrice * 100) / 100,
      profitMargin: Math.round(profitMargin * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100
    };
  }
  // Enhanced profit metrics calculation with error handling
  getDisplayMetrics(product) {
    try {
      if (!product || typeof product !== 'object') {
        return null;
      }

      const metrics = this.calculateProfitMetrics(product);
      
      return {
        ...metrics,
        hasMetrics: !!(product.profitMargin || product.minSellingPrice || product.purchasePrice),
        isHealthyMargin: parseFloat(product.profitMargin || 0) > 15,
        isProfitable: parseFloat(product.profitMargin || 0) > 0
      };
    } catch (error) {
      console.error('Error calculating display metrics:', error);
      return null;
    }
  }

// Enhanced validation with price guards and business rules
  validateProfitRules(productData) {
    try {
      const purchasePrice = parseFloat(productData.purchasePrice) || 0;
      const price = parseFloat(productData.price) || 0;
      const discountValue = parseFloat(productData.discountValue) || 0;
      const discountType = productData.discountType || 'Fixed Amount';
      
      // Price guard validation
      if (price < 1) {
        return {
          isValid: false,
          error: 'Price cannot be less than Rs. 1'
        };
      }

      if (price > 100000) {
        return {
          isValid: false,
          error: 'Price cannot exceed Rs. 100,000'
        };
      }

      if (purchasePrice > 0 && price <= purchasePrice) {
        return {
          isValid: false,
          error: 'Selling price must be greater than purchase price'
        };
      }

      // Discount validation with guards
      if (discountValue > 0) {
        if (discountType === 'Percentage' && discountValue > 90) {
          return {
            isValid: false,
            error: 'Percentage discount cannot exceed 90%'
          };
        }
        
        if (discountType === 'Fixed Amount' && discountValue >= price) {
          return {
            isValid: false,
            error: 'Fixed discount cannot be equal to or greater than the product price'
          };
        }

        // Calculate final price after discount
        let finalPrice = price;
        if (discountType === 'Percentage') {
          finalPrice = price - (price * discountValue / 100);
        } else {
          finalPrice = price - discountValue;
        }

        // Ensure final price doesn't go below purchase price
        if (purchasePrice > 0 && finalPrice <= purchasePrice) {
          return {
            isValid: false,
            error: 'Discounted price cannot be equal to or less than purchase price'
          };
        }

        // Check for minimum profit margin after discount
        if (purchasePrice > 0) {
          const margin = ((finalPrice - purchasePrice) / purchasePrice) * 100;
          if (margin < 5) {
            return {
              isValid: false,
              error: 'Profit margin after discount should be at least 5% for sustainable business'
            };
          }
        }
      } else {
        // Standard profit margin check without discount
        if (purchasePrice > 0) {
          const margin = ((price - purchasePrice) / purchasePrice) * 100;
          if (margin < 5) {
            return {
              isValid: false,
              error: 'Profit margin should be at least 5% for sustainable business'
            };
          }
        }
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error validating profit rules:', error);
      return {
        isValid: false,
        error: 'Unable to validate pricing rules'
      };
    }
  }

  // Get financial health indicator
  getFinancialHealth(product) {
    try {
      if (!product) return 'unknown';
      
      const margin = parseFloat(product.profitMargin || 0);
      
      if (margin >= 25) return 'excellent';
      if (margin >= 15) return 'good';
      if (margin >= 5) return 'fair';
      if (margin > 0) return 'poor';
return 'loss';
    } catch (error) {
      console.error('Error calculating financial health:', error);
      return 'unknown';
    }
  }
  // Image validation and processing methods
  // Enhanced image validation with watermark/text detection and quality assessment
  async validateImage(file) {
    try {
      // Basic file validation
      if (!file || !file.type.startsWith('image/')) {
        return { isValid: false, error: 'Please select a valid image file' };
      }
      
      // Size validation
      if (file.size > 10 * 1024 * 1024) {
        return { isValid: false, error: 'Image file size must be less than 10MB' };
      }
      
      // Create image element for comprehensive quality analysis
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      return new Promise((resolve) => {
        img.onload = async () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          // Resolution validation
          if (img.width < 200 || img.height < 200) {
            resolve({ isValid: false, error: 'Image resolution too low. Minimum 200x200px required' });
            return;
          }
          
          // Get image data for analysis
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Enhanced blur detection using image variance
          const variance = this.calculateImageVariance(imageData.data);
          if (variance < 150) {
            resolve({ isValid: false, error: 'Image appears to be too blurry or low quality. Please use a sharper image' });
            return;
          }
          
          // Text/watermark detection using edge density analysis
          const textDetection = this.detectTextWatermarks(imageData.data, canvas.width, canvas.height);
          if (textDetection.hasText) {
            resolve({ 
              isValid: false, 
              error: `Watermarks or text detected in image. Confidence: ${textDetection.confidence}%. Please use a clean product image without text overlays` 
            });
            return;
          }
          
          // Additional quality checks
          const qualityAssessment = this.assessImageQuality(imageData.data, canvas.width, canvas.height);
          if (qualityAssessment.score < 0.6) {
            resolve({ 
              isValid: false, 
              error: `Image quality too low (Score: ${Math.round(qualityAssessment.score * 100)}%). Please use a higher quality image` 
            });
            return;
          }
          
          resolve({ 
            isValid: true, 
            qualityScore: qualityAssessment.score,
            variance: variance,
            textConfidence: textDetection.confidence
          });
};
        
        img.onerror = () => {
          resolve({ isValid: false, error: 'Invalid or corrupted image file' });
        };
        img.src = URL.createObjectURL(file);
      });
      
    } catch (error) {
      return { isValid: false, error: 'Failed to validate image' };
    }
  }

  // Enhanced image variance calculation for blur detection
  calculateImageVariance(imageData) {
    let sum = 0;
    let sumSquared = 0;
    let edgeSum = 0;
    const length = imageData.length;
    const pixelCount = length / 4;
    
    // Convert to grayscale and calculate variance with edge detection
    for (let i = 0; i < length; i += 4) {
      const gray = 0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2];
      sum += gray;
      sumSquared += gray * gray;
      
      // Simple edge detection for sharpness assessment
      if (i >= 4 && i < length - 4) {
        const prevGray = 0.299 * imageData[i - 4] + 0.587 * imageData[i - 3] + 0.114 * imageData[i - 2];
        const nextGray = 0.299 * imageData[i + 4] + 0.587 * imageData[i + 5] + 0.114 * imageData[i + 6];
        edgeSum += Math.abs(gray - prevGray) + Math.abs(gray - nextGray);
      }
    }
    
    const mean = sum / pixelCount;
    const variance = (sumSquared / pixelCount) - (mean * mean);
const edgeIntensity = edgeSum / pixelCount;
    
    // Combine variance and edge intensity for better blur detection
    return variance + (edgeIntensity * 0.5);
  }

  detectTextWatermarks(imageData, width, height) {
    try {
      const pixelCount = width * height;
      let textFeatures = 0;
      let horizontalLines = 0;
      let verticalLines = 0;
      
      // Analyze image for text-like patterns
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const gray = 0.299 * imageData[idx] + 0.587 * imageData[idx + 1] + 0.114 * imageData[idx + 2];
          
          // Check for high contrast edges (typical of text)
          const neighbors = [
            0.299 * imageData[idx - 4] + 0.587 * imageData[idx - 3] + 0.114 * imageData[idx - 2], // left
            0.299 * imageData[idx + 4] + 0.587 * imageData[idx + 5] + 0.114 * imageData[idx + 6], // right
            0.299 * imageData[idx - width * 4] + 0.587 * imageData[idx - width * 4 + 1] + 0.114 * imageData[idx - width * 4 + 2], // top
            0.299 * imageData[idx + width * 4] + 0.587 * imageData[idx + width * 4 + 1] + 0.114 * imageData[idx + width * 4 + 2]  // bottom
          ];
          
          const maxDiff = Math.max(...neighbors.map(n => Math.abs(gray - n)));
          
          // High contrast edges suggest text
          if (maxDiff > 80) {
            textFeatures++;
            
            // Check for horizontal/vertical line patterns
            if (Math.abs(neighbors[0] - neighbors[1]) < 20) horizontalLines++;
            if (Math.abs(neighbors[2] - neighbors[3]) < 20) verticalLines++;
          }
        }
      }
      
      const textDensity = textFeatures / pixelCount;
      const lineDensity = (horizontalLines + verticalLines) / pixelCount;
      const confidence = Math.min((textDensity * 1000 + lineDensity * 500), 100);
      
      // Threshold for text detection (adjust based on testing)
      const hasText = confidence > 25 || textDensity > 0.15;
      
      return {
        hasText,
        confidence: Math.round(confidence),
        textDensity,
        lineDensity
      };
    } catch (error) {
      console.error('Error in text detection:', error);
      return { hasText: false, confidence: 0 };
    }
  }

  // Comprehensive image quality assessment
  assessImageQuality(imageData, width, height) {
    try {
      const pixelCount = width * height;
      let colorVariety = new Set();
      let contrastSum = 0;
      let brightnessSum = 0;
      
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        
        // Color variety assessment
        const colorKey = `${Math.floor(r/32)}-${Math.floor(g/32)}-${Math.floor(b/32)}`;
        colorVariety.add(colorKey);
        
        // Brightness and contrast
        const brightness = (r + g + b) / 3;
        brightnessSum += brightness;
        
        if (i >= 4) {
          const prevBrightness = (imageData[i-4] + imageData[i-3] + imageData[i-2]) / 3;
          contrastSum += Math.abs(brightness - prevBrightness);
        }
      }
      
      const colorScore = Math.min(colorVariety.size / 100, 1); // More colors = better
      const contrastScore = Math.min(contrastSum / pixelCount / 50, 1); // Good contrast
      const brightnessScore = 1 - Math.abs(brightnessSum / pixelCount - 128) / 128; // Not too dark/bright
      
      const overallScore = (colorScore * 0.3 + contrastScore * 0.4 + brightnessScore * 0.3);
      
      return {
        score: overallScore,
        colorVariety: colorVariety.size,
        contrast: contrastSum / pixelCount,
        averageBrightness: brightnessSum / pixelCount
      };
    } catch (error) {
      console.error('Error assessing image quality:', error);
      return { score: 0.5 };
    }
  }

  // Process and optimize image
  async processImage(file, options = {}) {
    try {
      const {
        targetSize = { width: 600, height: 600 },
        maxFileSize = 100 * 1024, // 100KB
        quality = 0.9
      } = options;
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        img.onload = () => {
          // Calculate dimensions maintaining aspect ratio
          let { width, height } = this.calculateOptimalDimensions(
            img.width, 
            img.height, 
            targetSize.width, 
            targetSize.height
          );
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress image
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with compression
          canvas.toBlob((blob) => {
            if (blob.size <= maxFileSize) {
              const url = URL.createObjectURL(blob);
              resolve({ url, blob, size: blob.size });
            } else {
              // Reduce quality if file is too large
              const reducedQuality = Math.max(0.1, quality - 0.2);
              canvas.toBlob((reducedBlob) => {
                const url = URL.createObjectURL(reducedBlob);
                resolve({ url, blob: reducedBlob, size: reducedBlob.size });
              }, 'image/webp', reducedQuality);
            }
          }, 'image/webp', quality);
        };
        
        img.onerror = () => reject(new Error('Failed to process image'));
        img.src = URL.createObjectURL(file);
      });
      
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

// Calculate optimal dimensions for image resizing with aspect ratio enforcement
  calculateOptimalDimensions(originalWidth, originalHeight, targetWidth, targetHeight, enforceSquare = false) {
    const aspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;
    
    let width, height;
    
    // Enforce 1:1 aspect ratio if requested
    if (enforceSquare) {
      const size = Math.min(targetWidth, targetHeight);
      // Ensure size is within constraints (400-1200px)
      const constrainedSize = Math.max(400, Math.min(size, 1200));
      return { 
        width: constrainedSize, 
        height: constrainedSize,
        aspectRatio: '1:1'
      };
    }
    
    if (aspectRatio > targetAspectRatio) {
      // Image is wider than target
      width = targetWidth;
      height = targetWidth / aspectRatio;
    } else {
height = targetHeight;
      width = targetHeight * aspectRatio;
    }
    return { width: Math.round(width), height: Math.round(height) };
  }
  
// Get dynamic image dimensions for frame compatibility
  getDynamicImageDimensions(viewportWidth = 1200, enforceSquare = true) {
    try {
      // Base size calculation with responsive scaling
      let baseSize = 600;
      
      // Responsive adjustments for different screen sizes
      if (viewportWidth < 640) {
        baseSize = Math.max(400, Math.min(viewportWidth - 32, 500)); // Mobile: 400-500px
      } else if (viewportWidth < 1024) {
        baseSize = Math.max(500, Math.min(viewportWidth * 0.4, 700)); // Tablet: 500-700px
      } else {
        baseSize = Math.max(600, Math.min(viewportWidth * 0.3, 1200)); // Desktop: 600-1200px
      }
      
      // Enforce size constraints (400x400px to 1200x1200px)
      const constrainedSize = Math.max(400, Math.min(baseSize, 1200));
      
      // Return square dimensions if enforcing 1:1 aspect ratio
      if (enforceSquare) {
        return {
          width: constrainedSize,
          height: constrainedSize,
          aspectRatio: '1:1'
        };
      }
      
      return {
        width: constrainedSize,
        height: constrainedSize
      };
    } catch (error) {
      console.error('Error calculating dynamic image dimensions:', error);
      return {
        width: 600,
        height: 600,
aspectRatio: '1:1'
      };
    }
  }

  // Enhanced image search from multiple sources with category filtering and attribution
  async searchImages(query, options = {}) {
    try {
      const { category = 'all', orientation = 'square', loadMore = false } = options;
      await this.delay(1000); // Simulate API call
      
      const results = [];
      
      // Search internal product database
      const internalResults = this.searchInternalImages(query, { category });
      results.push(...internalResults);
      
      // Search Unsplash API with enhanced filtering
      const unsplashResults = this.searchUnsplashImages(query, { category, orientation, loadMore });
      results.push(...unsplashResults);
      
      // Apply content moderation and copyright compliance
      const moderatedResults = this.moderateImageResults(results);
      
      return moderatedResults.slice(0, loadMore ? 24 : 12);
      
    } catch (error) {
      console.error('Error searching images:', error);
      throw new Error('Failed to search images');
    }
  }

  // Search internal product images with category filtering
  searchInternalImages(query, options = {}) {
    const { category } = options;
    const baseImages = [
      {
        url: "/api/placeholder/600/600",
        thumbnail: "/api/placeholder/200/200",
        description: `Fresh ${query}`,
        source: 'internal',
        category: category !== 'all' ? category : 'Fresh Vegetables'
      },
      {
        url: "/api/placeholder/600/600",
        thumbnail: "/api/placeholder/200/200", 
        description: `Organic ${query}`,
        source: 'internal',
        category: category !== 'all' ? category : 'Organic Produce'
      }
    ];
    
    // Filter by category if specified
    if (category && category !== 'all') {
      return baseImages.filter(img => img.category === category);
    }
    
    return baseImages;
return baseImages;
  }

  // Enhanced Unsplash search with comprehensive category mapping and attribution
  searchUnsplashImages(query, options = {}) {
    const { category, orientation, loadMore } = options;
    const categoryMappings = {
      'vegetables': ['fresh vegetables', 'organic vegetables', 'farm vegetables', 'leafy greens', 'root vegetables', 'colorful vegetables'],
      'fruits': ['fresh fruits', 'tropical fruits', 'seasonal fruits', 'organic fruits', 'citrus fruits', 'berry fruits'],
      'meat': ['premium meat', 'fresh meat cuts', 'grass fed beef', 'organic meat', 'butcher quality', 'gourmet meat'],
      'dairy': ['fresh dairy', 'organic dairy', 'farm dairy', 'artisan cheese', 'fresh milk', 'creamy dairy'],
      'bakery': ['artisan bread', 'fresh bakery', 'sourdough bread', 'pastries', 'handmade bread', 'golden bread'],
      'seafood': ['fresh seafood', 'ocean fish', 'sustainable seafood', 'wild caught fish', 'premium seafood', 'market fresh fish'],
      'beverages': ['fresh beverages', 'natural drinks', 'craft beverages', 'healthy drinks', 'artisan coffee', 'fresh juice'],
      'spices': ['aromatic spices', 'fresh herbs', 'organic spices', 'cooking spices', 'herb garden', 'spice collection'],
      'organic': ['organic produce', 'certified organic', 'sustainable farming', 'natural foods', 'eco friendly', 'farm to table'],
      'snacks': ['healthy snacks', 'natural snacks', 'gourmet snacks', 'artisan snacks', 'wholesome treats', 'premium snacks'],
      
      // Legacy support for existing categories
      'Fresh Vegetables': ['vegetables', 'fresh produce', 'organic vegetables', 'farm fresh'],
      'Tropical Fruits': ['tropical fruits', 'exotic fruits', 'fresh fruits', 'colorful fruits'],
      'Dairy Products': ['dairy', 'milk products', 'cheese', 'yogurt'],
      'Premium Meat': ['meat cuts', 'fresh meat', 'butcher shop', 'premium beef'],
      'Artisan Bakery': ['bread', 'bakery items', 'artisan bread', 'fresh baked'],
      'Seafood & Fish': ['fresh fish', 'seafood', 'ocean fish', 'salmon'],
      'Beverages': ['drinks', 'beverages', 'fresh juice', 'coffee'],
      'Spices & Herbs': ['spices', 'herbs', 'seasoning', 'aromatic spices']
    };
    
    const searchTerms = categoryMappings[category] || [query];
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    // Enhanced photographer database for more diverse attribution
    const photographers = [
      'Brooke Lark', 'Edgar Castrejon', 'Thought Catalog', 'Nadya Spetnitskaya',
      'Annie Spratt', 'Monika Grabkowska', 'Louis Hansel', 'Jakub Kapusnak',
      'Dan Gold', 'Eiliv-Sonas Aceron', 'Caroline Attwood', 'Farhad Ibrahimzade',
      'Priscilla Du Preez', 'Markus Spiske', 'Freddy G', 'Taylor Kiser'
    ];
    
    const mockUnsplashImages = Array.from({ length: loadMore ? 12 : 6 }, (_, index) => ({
      url: `/api/placeholder/600/600?category=${encodeURIComponent(category)}&query=${encodeURIComponent(randomTerm)}&id=${index}`,
      thumbnail: `/api/placeholder/200/200?category=${encodeURIComponent(category)}&query=${encodeURIComponent(randomTerm)}&id=${index}`,
      description: `${category !== 'all' ? category : 'Premium'} ${randomTerm}`,
      source: 'unsplash',
      category: category !== 'all' ? category : 'Food',
      orientation: orientation,
      attribution: {
        photographer: photographers[index % photographers.length],
        profileUrl: `https://unsplash.com/@${photographers[index % photographers.length].toLowerCase().replace(/\s+/g, '')}`,
        downloadUrl: 'https://unsplash.com',
        license: 'Unsplash License'
      },
      tags: this.generateImageTags(randomTerm, category),
      quality: 'high',
      isCommercialUse: true
    }));
    
    return mockUnsplashImages;
  }

// Generate relevant tags for image categorization
  // Enhanced tag generation for comprehensive image categorization
  generateImageTags(query, category) {
    const baseTags = query.toLowerCase().split(' ');
    
    // Comprehensive category tag mappings for better search accuracy
    const categoryTags = {
      'vegetables': ['organic', 'healthy', 'green', 'fresh', 'natural', 'farm', 'nutritious', 'colorful'],
      'fruits': ['sweet', 'vitamin', 'tropical', 'seasonal', 'juicy', 'colorful', 'antioxidant', 'ripe'],
      'meat': ['protein', 'quality', 'fresh', 'gourmet', 'butcher', 'premium', 'grass-fed', 'tender'],
      'dairy': ['creamy', 'calcium', 'protein', 'fresh', 'natural', 'pasteurized', 'rich', 'smooth'],
      'bakery': ['handmade', 'artisan', 'golden', 'crispy', 'traditional', 'warm', 'freshly-baked', 'crusty'],
      'seafood': ['omega-3', 'wild-caught', 'sustainable', 'marine', 'delicate', 'fresh-caught', 'oceanic'],
      'beverages': ['refreshing', 'cold', 'natural', 'healthy', 'thirst-quenching', 'energizing', 'pure'],
'spices': ['aromatic', 'flavorful', 'fragrant', 'exotic', 'pungent', 'culinary', 'seasoning'],
      'organic': ['certified', 'sustainable', 'eco-friendly', 'chemical-free', 'natural', 'wholesome'],
      'snacks': ['crunchy', 'satisfying', 'portable', 'tasty', 'convenient', 'wholesome', 'guilt-free'],
      
      // Legacy support
      'Fresh Vegetables': ['organic', 'healthy', 'green', 'fresh', 'natural'],
      'Tropical Fruits': ['colorful', 'exotic', 'sweet', 'vitamin', 'tropical'],
      'Dairy Products': ['creamy', 'calcium', 'protein', 'fresh', 'natural'],
      'Premium Meat': ['protein', 'quality', 'fresh', 'gourmet', 'butcher'],
      'Artisan Bakery': ['handmade', 'artisan', 'golden', 'crispy', 'traditional'],
'Beverages': ['refreshing', 'cold', 'thirst', 'natural', 'healthy']
    };
    const tags = [...baseTags, ...(categoryTags[category] || ['food', 'ingredient', 'culinary'])];
    return [...new Set(tags)]; // Remove duplicates
  }

  // Content moderation and copyright compliance
  moderateImageResults(results) {
    return results.map(image => ({
      ...image,
      isModerated: true,
      copyrightCompliant: true,
      contentRating: 'safe',
      commercialUse: image.source === 'unsplash' || image.source === 'internal'
    }));
  }

  // AI Image Generation with Stable Diffusion simulation
// AI Image Generation with Stable Diffusion simulation
  async generateAIImage(prompt, options = {}) {
    try {
      const {
        style = 'realistic',
        category = 'food',
        aspectRatio = '1:1',
        quality = 'high'
      } = options;
      
      await this.delay(2000); // Simulate AI generation time
      
      // Validate and enhance prompt
      const enhancedPrompt = this.enhanceAIPrompt(prompt, style, category);
      
      // Simulate content moderation
      const moderationResult = this.moderateAIPrompt(enhancedPrompt);
      if (!moderationResult.approved) {
        throw new Error(moderationResult.reason);
      }
      
      // Generate style-specific parameters
      const styleParams = this.getStyleParameters(style);
      
      // Simulate AI generation result
      const generatedImage = {
        url: `/api/placeholder/600/600?ai=true&style=${style}&prompt=${encodeURIComponent(prompt)}&seed=${Date.now()}`,
        thumbnail: `/api/placeholder/200/200?ai=true&style=${style}&prompt=${encodeURIComponent(prompt)}&seed=${Date.now()}`,
        prompt: enhancedPrompt,
        originalPrompt: prompt,
        style: style,
        category: category,
        aspectRatio: aspectRatio,
        quality: quality,
        generatedAt: new Date().toISOString(),
        model: 'Stable Diffusion XL',
        seed: Math.floor(Math.random() * 1000000),
        steps: styleParams.steps,
        cfgScale: styleParams.cfgScale,
        isAIGenerated: true,
        copyrightFree: true,
        commercialUse: true
      };
      
      return generatedImage;
      
    } catch (error) {
      console.error('Error generating AI image:', error);
      throw new Error('Failed to generate AI image: ' + error.message);
    }
  }

  // Enhance AI prompts for better results
  enhanceAIPrompt(prompt, style, category) {
    const styleEnhancements = {
      'realistic': ', photorealistic, high resolution, professional photography, studio lighting',
      'clean': ', clean white background, minimal, product photography, professional',
      'studio': ', studio lighting, professional photography, high quality, commercial',
      'lifestyle': ', natural lighting, lifestyle photography, everyday setting',
      'artistic': ', artistic composition, creative lighting, aesthetic, beautiful',
      'commercial': ', commercial photography, marketing ready, high quality, professional'
    };
    
    const categoryEnhancements = {
      'food': ', food photography, appetizing, fresh, high quality',
      'Groceries': ', grocery store quality, fresh produce, commercial grade',
      'Fruits': ', fresh fruits, vibrant colors, natural lighting',
      'Vegetables': ', fresh vegetables, organic, healthy, natural'
    };
    
    let enhancedPrompt = prompt;
    
    // Add style enhancements
    if (styleEnhancements[style]) {
      enhancedPrompt += styleEnhancements[style];
    }
    
    // Add category enhancements
    if (categoryEnhancements[category]) {
      enhancedPrompt += categoryEnhancements[category];
    }
    
    // Add quality and technical parameters
    enhancedPrompt += ', 4K resolution, sharp details, perfect composition';
    
    return enhancedPrompt;
  }

  // Content moderation for AI prompts
  moderateAIPrompt(prompt) {
    const prohibitedWords = ['inappropriate', 'offensive', 'harmful', 'illegal'];
    const lowerPrompt = prompt.toLowerCase();
    
    for (const word of prohibitedWords) {
      if (lowerPrompt.includes(word)) {
        return {
          approved: false,
          reason: 'Prompt contains inappropriate content'
        };
      }
    }
    
    return { approved: true };
  }

  // Get style-specific generation parameters
  getStyleParameters(style) {
    const styleParams = {
      'realistic': { steps: 50, cfgScale: 7.5, sampler: 'DPM++ 2M Karras' },
      'clean': { steps: 40, cfgScale: 8.0, sampler: 'Euler a' },
      'studio': { steps: 45, cfgScale: 7.0, sampler: 'DPM++ SDE Karras' },
      'lifestyle': { steps: 35, cfgScale: 6.5, sampler: 'Euler' },
      'artistic': { steps: 60, cfgScale: 9.0, sampler: 'DPM++ 2M' },
      'commercial': { steps: 50, cfgScale: 7.5, sampler: 'DPM++ 2M Karras' }
    };
    
    return styleParams[style] || styleParams['realistic'];
  }

// Enhanced pricing hierarchy validation with conflict detection
  async validatePricingHierarchy(productData, allProducts = [], excludeId = null) {
    try {
      await this.delay(200);
      
      const conflicts = [];
      const warnings = [];
      
      if (!productData) {
        return { isValid: false, error: 'Invalid product data', conflicts, warnings };
      }

      const basePrice = parseFloat(productData.basePrice || productData.price) || 0;
      const variationPrice = parseFloat(productData.variationPrice) || 0;
      const seasonalDiscount = parseFloat(productData.seasonalDiscount) || 0;
      const seasonalDiscountType = productData.seasonalDiscountType || 'Fixed Amount';
      const category = productData.category;

      // Validate base price
      if (basePrice <= 0) {
        conflicts.push({
          type: 'invalid_base_price',
          details: 'Base price must be greater than 0'
        });
      }

      // Validate variation price hierarchy
      if (variationPrice > 0 && variationPrice < basePrice * 0.8) {
        warnings.push('Variation price is significantly lower than base price (less than 80%)');
      }

      // Validate seasonal discount hierarchy
      if (seasonalDiscount > 0) {
        const applicablePrice = variationPrice > 0 ? variationPrice : basePrice;
        
        if (seasonalDiscountType === 'Percentage' && seasonalDiscount > 70) {
          conflicts.push({
            type: 'excessive_seasonal_discount',
            details: 'Seasonal discount percentage exceeds 70%'
          });
        }

        if (seasonalDiscountType === 'Fixed Amount' && seasonalDiscount >= applicablePrice) {
          conflicts.push({
            type: 'invalid_seasonal_discount',
            details: 'Seasonal discount amount equals or exceeds applicable price'
          });
        }

        // Calculate final price after all hierarchy rules
        let finalPrice = applicablePrice;
        if (seasonalDiscountType === 'Percentage') {
          finalPrice = applicablePrice * (1 - seasonalDiscount / 100);
        } else {
          finalPrice = Math.max(0, applicablePrice - seasonalDiscount);
        }

        // Check minimum viable price (at least 10% of base price)
        if (finalPrice < basePrice * 0.1) {
          conflicts.push({
            type: 'price_too_low',
            details: 'Final price after hierarchy is too low (less than 10% of base price)'
          });
        }

        // Check profit margin if purchase price is available
        const purchasePrice = parseFloat(productData.purchasePrice) || 0;
        if (purchasePrice > 0) {
          const profitMargin = ((finalPrice - purchasePrice) / purchasePrice) * 100;
          if (profitMargin < 5) {
            conflicts.push({
              type: 'low_profit_margin',
              details: `Final price results in ${profitMargin.toFixed(2)}% profit margin (minimum 5% recommended)`
            });
          }
        }
      }

      // Check for conflicting seasonal discounts in same category
      if (seasonalDiscount > 0 && productData.seasonalDiscountStartDate && productData.seasonalDiscountEndDate) {
        const conflictingProducts = allProducts.filter(p => 
          p && p.category === category && 
          p.id !== excludeId && 
          p.seasonalDiscount > 0 &&
          p.seasonalDiscountStartDate && p.seasonalDiscountEndDate
        );

        for (const product of conflictingProducts) {
          const existingStart = new Date(product.seasonalDiscountStartDate);
          const existingEnd = new Date(product.seasonalDiscountEndDate);
          const newStart = new Date(productData.seasonalDiscountStartDate);
          const newEnd = new Date(productData.seasonalDiscountEndDate);

          if (newStart <= existingEnd && newEnd >= existingStart) {
            warnings.push(`Overlapping seasonal discount with ${product.name} (${product.seasonalDiscountStartDate} to ${product.seasonalDiscountEndDate})`);
          }
        }
      }

      const isValid = conflicts.length === 0;

      return {
        isValid,
        conflicts,
        warnings,
        error: isValid ? null : 'Pricing hierarchy conflicts detected',
        hierarchyBreakdown: {
          basePrice,
          variationPrice: variationPrice || null,
          seasonalDiscount,
          seasonalDiscountType,
          finalPrice: this.calculateHierarchyPrice(productData)
        }
      };

    } catch (error) {
      console.error('Error validating pricing hierarchy:', error);
      return {
        isValid: false,
        error: 'Failed to validate pricing hierarchy',
        conflicts: [],
        warnings: []
      };
    }
  }

  // Calculate final price based on hierarchy: Base Price > Variation Override > Seasonal Discount
  calculateHierarchyPrice(productData) {
    if (!productData) return 0;

    // Step 1: Start with base price
    let effectivePrice = parseFloat(productData.basePrice || productData.price) || 0;

    // Step 2: Apply variation override if exists (higher precedence than base)
    if (productData.variationPrice && parseFloat(productData.variationPrice) > 0) {
      effectivePrice = parseFloat(productData.variationPrice);
    }

    // Step 3: Apply seasonal discount (highest precedence)
    if (productData.seasonalDiscount && parseFloat(productData.seasonalDiscount) > 0) {
      if (productData.seasonalDiscountType === 'Percentage') {
        effectivePrice = effectivePrice * (1 - parseFloat(productData.seasonalDiscount) / 100);
      } else {
        effectivePrice = Math.max(0, effectivePrice - parseFloat(productData.seasonalDiscount));
      }
    }

    return Math.round(effectivePrice * 100) / 100;
  }

  // Add variation pricing to product
  async addVariationPricing(productId, variations) {
    await this.delay(300);
    
    const productIndex = this.products.findIndex(p => p.id === parseInt(productId));
    if (productIndex === -1) {
      throw new Error('Product not found');
    }

    // Validate variations
    for (const variation of variations) {
      if (!variation.name || !variation.price || variation.price <= 0) {
        throw new Error('Each variation must have a valid name and price');
      }
    }

    this.products[productIndex] = {
      ...this.products[productIndex],
      variations: variations,
      hasVariations: true,
      variationPrice: variations.find(v => v.default)?.price || variations[0]?.price
    };

    return { ...this.products[productIndex] };
  }

  // Add seasonal discount to product
  async addSeasonalDiscount(productId, discountData) {
    await this.delay(300);
    
    const productIndex = this.products.findIndex(p => p.id === parseInt(productId));
    if (productIndex === -1) {
      throw new Error('Product not found');
    }

    // Validate seasonal discount
    const validation = await this.validatePricingHierarchy({
      ...this.products[productIndex],
      ...discountData
    }, this.products, productId);

    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid seasonal discount configuration');
    }

    this.products[productIndex] = {
      ...this.products[productIndex],
      seasonalDiscount: parseFloat(discountData.seasonalDiscount) || 0,
      seasonalDiscountType: discountData.seasonalDiscountType || 'Fixed Amount',
      seasonalDiscountActive: discountData.seasonalDiscountActive || false,
      seasonalDiscountStartDate: discountData.seasonalDiscountStartDate,
      seasonalDiscountEndDate: discountData.seasonalDiscountEndDate
    };

    return { ...this.products[productIndex] };
  }

// Enhanced bulk update with pricing hierarchy support
  async bulkUpdatePricingHierarchy(updateData) {
    await this.delay(500);
    
    const validation = this.validateBulkPriceUpdate(updateData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    let filteredProducts = [...this.products];
    
    // Filter by category
    if (updateData.category !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.category === updateData.category);
    }
    
    // Filter by stock if enabled
    if (updateData.applyToLowStock) {
      filteredProducts = filteredProducts.filter(p => p.stock <= updateData.stockThreshold);
    }

    let updatedCount = 0;
    const conflictProducts = [];
    const hierarchyUpdates = [];
    
    // Process each product with hierarchy awareness
    for (const product of filteredProducts) {
      let shouldUpdate = true;
      const updates = { ...product };
      
      // Handle base price updates
      if (updateData.updateType === 'base_price') {
        const originalPrice = product.basePrice || product.price;
        let newPrice = originalPrice;
        
        switch (updateData.strategy) {
          case 'percentage':
            const percentage = parseFloat(updateData.value) || 0;
            newPrice = originalPrice * (1 + percentage / 100);
            break;
          case 'fixed':
            const fixedAmount = parseFloat(updateData.value) || 0;
            newPrice = originalPrice + fixedAmount;
            break;
        }
        
        updates.basePrice = Math.round(newPrice * 100) / 100;
        updates.price = updates.basePrice; // Sync legacy price field
      }
      
      // Handle variation price updates
      if (updateData.updateType === 'variation_price' && updateData.variationPrice) {
        updates.variationPrice = parseFloat(updateData.variationPrice);
      }
      
      // Handle seasonal discount updates
      if (updateData.updateType === 'seasonal_discount') {
        if (product.seasonalDiscount > 0) {
          switch (updateData.conflictResolution) {
            case 'skip':
              shouldUpdate = false;
              conflictProducts.push(product);
              break;
            case 'override':
              updates.seasonalDiscount = parseFloat(updateData.seasonalDiscount) || 0;
              updates.seasonalDiscountType = updateData.seasonalDiscountType || 'Fixed Amount';
              updates.seasonalDiscountActive = updateData.seasonalDiscountActive || false;
              break;
            case 'merge':
              // Keep higher discount
              const existingDiscount = product.seasonalDiscount || 0;
              const newDiscount = parseFloat(updateData.seasonalDiscount) || 0;
              if (newDiscount > existingDiscount) {
                updates.seasonalDiscount = newDiscount;
                updates.seasonalDiscountType = updateData.seasonalDiscountType;
                updates.seasonalDiscountActive = updateData.seasonalDiscountActive;
              } else {
                shouldUpdate = false;
              }
              break;
          }
        } else {
          updates.seasonalDiscount = parseFloat(updateData.seasonalDiscount) || 0;
          updates.seasonalDiscountType = updateData.seasonalDiscountType || 'Fixed Amount';
          updates.seasonalDiscountActive = updateData.seasonalDiscountActive || false;
        }
      }

      // Validate hierarchy before applying
      if (shouldUpdate) {
        const hierarchyValidation = await this.validatePricingHierarchy(updates, this.products, product.id);
        if (!hierarchyValidation.isValid) {
          conflictProducts.push({
            ...product,
            hierarchyError: hierarchyValidation.error,
            conflicts: hierarchyValidation.conflicts
          });
          shouldUpdate = false;
        }
      }

      // Apply updates if valid
      if (shouldUpdate) {
        const productIndex = this.products.findIndex(p => p.id === product.id);
        if (productIndex !== -1) {
          // Calculate final effective price using hierarchy
          const effectivePrice = this.calculateHierarchyPrice(updates);
          
          this.products[productIndex] = {
            ...this.products[productIndex],
            ...updates,
            effectivePrice: effectivePrice,
            hierarchyLastUpdated: new Date().toISOString()
          };
          
          hierarchyUpdates.push({
            productId: product.id,
            productName: product.name,
            oldPrice: product.price,
            newEffectivePrice: effectivePrice,
            hierarchyBreakdown: {
              basePrice: updates.basePrice || updates.price,
              variationPrice: updates.variationPrice,
              seasonalDiscount: updates.seasonalDiscount,
              seasonalDiscountType: updates.seasonalDiscountType
            }
          });
          
          updatedCount++;
        }
      }
    }

    return {
      updatedCount,
      totalFiltered: filteredProducts.length,
      conflictCount: conflictProducts.length,
      updateType: updateData.updateType,
      hierarchyUpdates: hierarchyUpdates.slice(0, 10), // Return first 10 for reference
      conflictProducts: conflictProducts.slice(0, 5),
      summary: {
        basePriceUpdates: hierarchyUpdates.filter(u => u.hierarchyBreakdown.basePrice !== u.oldPrice).length,
        variationUpdates: hierarchyUpdates.filter(u => u.hierarchyBreakdown.variationPrice > 0).length,
        seasonalDiscountUpdates: hierarchyUpdates.filter(u => u.hierarchyBreakdown.seasonalDiscount > 0).length
      }
    };
  }

  // Smart cropping using TensorFlow.js simulation
  async smartCropImage(imageData, targetDimensions) {
    try {
      await this.delay(800); // Simulate TensorFlow.js processing
      
      // Simulate object detection and important region identification
      const importantRegions = this.detectImportantRegions(imageData);
      
      // Calculate optimal crop based on detected regions
      const cropRegion = this.calculateOptimalCrop(importantRegions, targetDimensions);
      
      return {
        cropRegion,
        confidence: 0.92,
        objectsDetected: importantRegions.length,
        processingTime: '800ms'
      };
      
    } catch (error) {
      console.error('Error in smart cropping:', error);
      throw new Error('Smart cropping failed');
    }
  }

  // Simulate object detection for smart cropping
  detectImportantRegions(imageData) {
    // Simulate detected objects/regions of interest
    return [
      { x: 120, y: 80, width: 360, height: 440, confidence: 0.95, type: 'product' },
      { x: 200, y: 150, width: 200, height: 300, confidence: 0.88, type: 'main_subject' }
    ];
  }

  // Calculate optimal crop region
  calculateOptimalCrop(regions, targetDimensions) {
    if (regions.length === 0) {
      // Fallback to center crop
      return {
        x: 0,
        y: 0,
        width: targetDimensions.width,
        height: targetDimensions.height
      };
    }
    
    // Find the most important region
    const mainRegion = regions.reduce((max, region) => 
      region.confidence > max.confidence ? region : max
    );
    
    return {
      x: Math.max(0, mainRegion.x - 50),
      y: Math.max(0, mainRegion.y - 50),
width: Math.min(targetDimensions.width, mainRegion.width + 100),
      height: Math.min(targetDimensions.height, mainRegion.height + 100)
    };
  }

  // Bulk Price Manager - Phase 1 Methods
  
  // Get paginated products for bulk price management
  async getBulkPriceData(page = 1, limit = 100, filters = {}) {
    await this.delay(300);
    
    try {
      let filteredProducts = [...this.products];
      
      // Apply filters
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredProducts = filteredProducts.filter(p => 
          p && (
            (p.name && p.name.toLowerCase().includes(searchTerm)) ||
            (p.barcode && p.barcode.includes(searchTerm))
          )
        );
      }
      
      if (filters.category && filters.category !== 'all') {
        filteredProducts = filteredProducts.filter(p => p && p.category === filters.category);
      }
      
      // Calculate pagination
      const totalItems = filteredProducts.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
      
      return {
        products: paginatedProducts,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
      
    } catch (error) {
      console.error('Error getting bulk price data:', error);
      throw new Error('Failed to load bulk price data');
    }
  }
  
  // Update product prices with validation
  async updateProductPrices(productId, priceData) {
    await this.delay(200);
    
    try {
      const productIndex = this.products.findIndex(p => p.id === parseInt(productId));
      if (productIndex === -1) {
        throw new Error('Product not found');
      }
      
      // Validate price data
      const validation = this.validatePriceUpdate(priceData);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      
      const product = this.products[productIndex];
      const updates = {};
      
      // Update base price
      if (priceData.price !== undefined) {
        updates.price = this.roundToDecimals(parseFloat(priceData.price), 2);
      }
      
      // Update cost price
      if (priceData.purchasePrice !== undefined) {
        updates.purchasePrice = this.roundToDecimals(parseFloat(priceData.purchasePrice), 2);
      }
      
      // Recalculate profit margin if both prices are available
      const newPrice = updates.price || product.price || 0;
      const newCostPrice = updates.purchasePrice || product.purchasePrice || 0;
      
      if (newCostPrice > 0) {
        updates.profitMargin = this.roundToDecimals(((newPrice - newCostPrice) / newCostPrice) * 100, 2);
        updates.minSellingPrice = this.roundToDecimals(newCostPrice * 1.1, 2);
      }
      
      // Apply updates
      this.products[productIndex] = {
        ...this.products[productIndex],
        ...updates,
        lastPriceUpdate: new Date().toISOString()
      };
      
      return {
        success: true,
        product: { ...this.products[productIndex] },
        updatedFields: Object.keys(updates)
      };
      
    } catch (error) {
      console.error('Error updating product prices:', error);
      throw new Error(error.message || 'Failed to update product prices');
    }
  }
  
  // Validate price update data
  validatePriceUpdate(priceData) {
    try {
      // Validation Rule 1: Base price must be greater than 0
      if (priceData.price !== undefined) {
        const price = parseFloat(priceData.price);
        if (isNaN(price) || price <= 0) {
          return { isValid: false, error: 'Base price must be greater than 0' };
        }
      }
      
      // Validation Rule 2: Cost price cannot be negative
      if (priceData.purchasePrice !== undefined) {
        const costPrice = parseFloat(priceData.purchasePrice);
        if (isNaN(costPrice) || costPrice < 0) {
          return { isValid: false, error: 'Cost price cannot be negative' };
        }
      }
      
      // Additional validation: Base price must be greater than cost price
      if (priceData.price !== undefined && priceData.purchasePrice !== undefined) {
        const price = parseFloat(priceData.price);
        const costPrice = parseFloat(priceData.purchasePrice);
        
        if (price <= costPrice) {
          return { isValid: false, error: 'Base price must be greater than cost price' };
        }
      }
      
      return { isValid: true };
      
    } catch (error) {
      return { isValid: false, error: 'Invalid price data format' };
    }
  }
  
  // Utility: Round to specified decimal places
  roundToDecimals(value, decimals = 2) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
  
  // Calculate margin percentage
  calculateMarginPercentage(basePrice, costPrice) {
    const base = parseFloat(basePrice) || 0;
    const cost = parseFloat(costPrice) || 0;
    
    if (cost <= 0) return 0;
    
    return this.roundToDecimals(((base - cost) / cost) * 100, 2);
  }
  
  // Bulk validate multiple price updates
  async bulkValidatePriceUpdates(updates) {
    await this.delay(100);
    
    const results = [];
    
    for (const update of updates) {
      const validation = this.validatePriceUpdate(update.priceData);
      results.push({
        productId: update.productId,
        isValid: validation.isValid,
        error: validation.error
      });
    }
    
    return {
      results,
validCount: results.filter(r => r.isValid).length,
      invalidCount: results.filter(r => !r.isValid).length
    };
  }
  // Enhanced offer conflict validation
  async validateOfferConflicts(productData, allProducts = [], excludeId = null) {
    try {
      await this.delay(200);
      
      const conflicts = [];
      const warnings = [];
      
      if (!productData) {
        return { isValid: false, error: 'Invalid product data', conflicts, warnings };
      }

      const basePrice = parseFloat(productData.basePrice || productData.price) || 0;
      const discountValue = parseFloat(productData.discountValue) || 0;
      const discountType = productData.discountType || 'Fixed Amount';
      const category = productData.category;

      // Check for existing offers in the same category
      if (discountValue > 0) {
        const conflictingProducts = allProducts.filter(p => 
          p && p.category === category && 
          p.id !== excludeId && 
          p.discountValue > 0
        );

        if (conflictingProducts.length > 0) {
          warnings.push(`${conflictingProducts.length} other products in ${category} category have active offers`);
        }
      }

      // Validate discount hierarchy
      if (discountValue > 0) {
        let finalPrice = basePrice;
        
        if (discountType === 'Percentage') {
          finalPrice = basePrice * (1 - discountValue / 100);
        } else {
          finalPrice = basePrice - discountValue;
        }

        if (finalPrice <= 0) {
          conflicts.push({
            type: 'invalid_final_price',
            details: 'Final price after discount cannot be zero or negative'
          });
        }

        // Check minimum profit margin
        const purchasePrice = parseFloat(productData.purchasePrice) || 0;
        if (purchasePrice > 0) {
          const margin = ((finalPrice - purchasePrice) / purchasePrice) * 100;
          if (margin < 5) {
            conflicts.push({
              type: 'low_profit_margin',
              details: `Margin after discount is ${margin.toFixed(2)}% (minimum 5% recommended)`
            });
          }
        }
      }

      return {
        isValid: conflicts.length === 0,
        conflicts,
        warnings,
        error: conflicts.length > 0 ? 'Offer conflicts detected' : null
      };

    } catch (error) {
      console.error('Error validating offer conflicts:', error);
      return {
        isValid: false,
        error: 'Failed to validate offer conflicts',
        conflicts: [],
        warnings: []
      };
    }
  }

}

// Export an instantiated service instance instead of the class
const productService = new ProductService();
export default productService;