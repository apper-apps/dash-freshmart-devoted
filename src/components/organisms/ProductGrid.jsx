import React, { useEffect, useMemo, useState } from "react";
import { Grid } from "react-window";
import Empty from "@/components/ui/Empty";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import ProductCard from "@/components/molecules/ProductCard";

// Virtualized Product Grid for handling 10k+ products
const VirtualizedProductGrid = ({ 
  products, 
  columnCount, 
  containerWidth, 
  containerHeight 
}) => {
  const ITEM_WIDTH = 300;
  const ITEM_HEIGHT = 400;
  const GAP = 24;

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const itemIndex = rowIndex * columnCount + columnIndex;
    const product = products[itemIndex];
    
    if (!product) return null;

    return (
      <div 
        style={{
          ...style,
          left: style.left + GAP / 2,
          top: style.top + GAP / 2,
          width: style.width - GAP,
          height: style.height - GAP,
        }}
      >
        <ProductCard 
          product={product} 
          loading="lazy"
          virtualIndex={itemIndex}
        />
      </div>
    );
  };

  const rowCount = Math.ceil(products.length / columnCount);

  return (
    <div className="virtual-grid-container">
      <Grid
        className="virtual-grid"
        columnCount={columnCount}
        columnWidth={ITEM_WIDTH + GAP}
        height={containerHeight}
        rowCount={rowCount}
        rowHeight={ITEM_HEIGHT + GAP}
        width={containerWidth}
        itemData={products}
        overscanRowCount={2}
        overscanColumnCount={1}
      >
        {Cell}
      </Grid>
    </div>
  );
};

// Standard Product Grid for smaller datasets
const StandardProductGrid = ({ products }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <ProductCard 
          key={product.id} 
          product={product}
          loading={index < 8 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
};

const ProductGrid = ({ 
  products, 
  loading, 
  error, 
  onRetry, 
  emptyMessage = "No products found" 
}) => {
  const [containerDimensions, setContainerDimensions] = useState({
    width: 1200,
    height: 800
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    renderTime: 0,
    totalProducts: 0,
    virtualizationEnabled: false
  });

  // Threshold for enabling virtualization
  const VIRTUALIZATION_THRESHOLD = 1000;

  // Calculate optimal column count based on container width
  const columnCount = useMemo(() => {
    const ITEM_WIDTH = 300;
    const GAP = 24;
    const PADDING = 48;
    
    return Math.floor((containerDimensions.width - PADDING) / (ITEM_WIDTH + GAP)) || 1;
  }, [containerDimensions.width]);

  // Determine if virtualization should be enabled
  const shouldUseVirtualization = useMemo(() => {
    return products && products.length > VIRTUALIZATION_THRESHOLD;
  }, [products]);

  // Update container dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.querySelector('.product-grid-container');
      if (container) {
        setContainerDimensions({
          width: container.offsetWidth,
          height: Math.min(container.offsetHeight || 800, window.innerHeight - 200)
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Performance monitoring
  useEffect(() => {
    if (products) {
      const startTime = performance.now();
      
      // Simulate render completion
      const timer = setTimeout(() => {
        const endTime = performance.now();
        setPerformanceMetrics({
          renderTime: endTime - startTime,
          totalProducts: products.length,
          virtualizationEnabled: shouldUseVirtualization
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [products, shouldUseVirtualization]);

  if (loading) {
    return <Loading type="products" />;
  }

  if (error) {
    return <Error message={error} onRetry={onRetry} />;
  }

  if (!products || products.length === 0) {
    return (
      <Empty 
        type="products" 
        description={emptyMessage}
        onAction={onRetry}
        action="Refresh"
      />
    );
  }

  return (
    <div className="product-grid-container">
      {/* Performance indicator for large datasets */}
      {shouldUseVirtualization && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-blue-700 font-medium">
                Virtualized rendering enabled for {products.length.toLocaleString()} products
              </span>
            </div>
            <div className="text-blue-600">
              Render time: {performanceMetrics.renderTime.toFixed(1)}ms
            </div>
          </div>
        </div>
      )}

{shouldUseVirtualization ? (
        <VirtualizedProductGrid
          products={products}
          columnCount={columnCount}
          containerWidth={containerDimensions.width}
          containerHeight={containerDimensions.height}
        />
      ) : (
        <StandardProductGrid products={products} />
      )}

      {/* Performance metrics footer */}
      {typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && (
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600">
          Products: {products.length} | Columns: {columnCount} | 
          Virtualized: {shouldUseVirtualization ? 'Yes' : 'No'} | 
          Render: {performanceMetrics.renderTime.toFixed(1)}ms
        </div>
      )}
    </div>
  );

export default ProductGrid;