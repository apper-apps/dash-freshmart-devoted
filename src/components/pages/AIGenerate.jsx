import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Camera, Copy, Download, Eye, Image, Palette, RefreshCw, Share2, Sparkles, Trash2, Upload, Wand2, Zap } from "lucide-react";
import { toast } from "react-toastify";
import { addNotification } from "@/store/notificationSlice.js";
import { generateHistory } from "@/services/mockData/aiGenerateHistory.jsx";
import ApperIcon from "@/components/ApperIcon";
import Button from "@/components/atoms/Button";
import Input from "@/components/atoms/Input";
import Error from "@/components/ui/Error";
import Loading from "@/components/ui/Loading";
import Category from "@/components/pages/Category";
import { aiGenerateService } from "@/services/api/aiGenerateService";
import { format } from "date-fns";

const AIGenerate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('text');
  const [generatedContent, setGeneratedContent] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [generationHistory, setGenerationHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [generationType, setGenerationType] = useState('product-description');
  const [imageStyle, setImageStyle] = useState('photorealistic');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [foodCategory, setFoodCategory] = useState('general');
  const [qualityValidation, setQualityValidation] = useState(true);

  const tabs = [
    { id: 'text', label: 'Text Generation', icon: 'FileText' },
    { id: 'images', label: 'Image Generation', icon: 'Image' },
    { id: 'products', label: 'Product Content', icon: 'Package' },
    { id: 'marketing', label: 'Marketing Copy', icon: 'Megaphone' }
  ];

  const generationTypes = {
    text: [
      { value: 'product-description', label: 'Product Description' },
      { value: 'blog-post', label: 'Blog Post' },
      { value: 'social-media', label: 'Social Media Post' },
      { value: 'email', label: 'Email Content' }
    ],
    images: [
      { value: 'food-photography', label: 'Food Photography' },
      { value: 'product-showcase', label: 'Product Showcase' },
      { value: 'lifestyle-food', label: 'Lifestyle Food Scene' },
      { value: 'ingredient-focus', label: 'Ingredient Focus' },
      { value: 'recipe-visual', label: 'Recipe Visual' },
      { value: 'menu-item', label: 'Menu Item Display' }
    ],
    products: [
      { value: 'title', label: 'Product Title' },
      { value: 'features', label: 'Feature List' },
      { value: 'specifications', label: 'Specifications' },
      { value: 'variants', label: 'Product Variants' }
    ],
    marketing: [
      { value: 'campaign', label: 'Campaign Copy' },
      { value: 'advertisement', label: 'Advertisement' },
      { value: 'promotion', label: 'Promotional Content' },
      { value: 'newsletter', label: 'Newsletter' }
    ]
  };

  const imageStyles = [
    { value: 'photorealistic', label: 'Photorealistic' },
    { value: 'food-styling', label: 'Food Styling' },
    { value: 'commercial', label: 'Commercial Photography' },
    { value: 'rustic', label: 'Rustic & Natural' },
    { value: 'modern-minimal', label: 'Modern Minimal' },
    { value: 'artistic', label: 'Artistic & Creative' }
  ];

  const foodCategories = [
    { value: 'general', label: 'General Food' },
    { value: 'fruits', label: 'Fruits & Vegetables' },
    { value: 'meat-seafood', label: 'Meat & Seafood' },
    { value: 'dairy', label: 'Dairy Products' },
    { value: 'bakery', label: 'Bakery & Desserts' },
    { value: 'beverages', label: 'Beverages' },
    { value: 'prepared-meals', label: 'Prepared Meals' },
    { value: 'snacks', label: 'Snacks & Treats' }
  ];

  const imageSizes = [
    { value: '1024x1024', label: 'Square (1024x1024)' },
    { value: '1792x1024', label: 'Landscape (1792x1024)' },
    { value: '1024x1792', label: 'Portrait (1024x1792)' }
  ];

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const history = await aiGenerateService.getHistory();
      setGenerationHistory(history);
    } catch (err) {
      console.error('Error loading history:', err);
      toast.error('Failed to load generation history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.warning('Please enter a prompt');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setGeneratedContent('');
      setGeneratedImage(null);
      
      if (activeTab === 'images') {
        const result = await aiGenerateService.generateImage({
          prompt: prompt.trim(),
          type: generationType,
          style: imageStyle,
          size: imageSize,
          foodCategory: foodCategory,
          qualityValidation: qualityValidation
        });

        setGeneratedImage(result);
        toast.success('Image generated successfully!');
      } else {
        const result = await aiGenerateService.generateContent({
          prompt: prompt.trim(),
          type: generationType,
          category: activeTab
        });

        setGeneratedContent(result.content);
        toast.success('Content generated successfully!');
      }
      
      // Reload history to show the new generation
      await loadHistory();
    } catch (err) {
      console.error('Error generating content:', err);
      setError(`Failed to generate ${activeTab === 'images' ? 'image' : 'content'}. Please try again.`);
      toast.error(`${activeTab === 'images' ? 'Image' : 'Content'} generation failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const hasContent = activeTab === 'images' ? generatedImage : generatedContent?.trim();
    
    if (!hasContent) {
      toast.warning(`No ${activeTab === 'images' ? 'image' : 'content'} to save`);
      return;
    }

    try {
      await aiGenerateService.saveGenerated({
        content: activeTab === 'images' ? generatedImage?.imageUrl : generatedContent,
        image: activeTab === 'images' ? generatedImage : null,
        prompt,
        type: generationType,
        category: activeTab,
        metadata: activeTab === 'images' ? {
          style: imageStyle,
          size: imageSize,
          foodCategory: foodCategory,
          qualityScore: generatedImage?.qualityScore,
          validated: generatedImage?.validated
        } : null
      });
      
      toast.success(`${activeTab === 'images' ? 'Image' : 'Content'} saved successfully!`);
      await loadHistory();
    } catch (err) {
      console.error('Error saving:', err);
      toast.error(`Failed to save ${activeTab === 'images' ? 'image' : 'content'}`);
    }
  };

  const handleDownloadImage = async () => {
    if (!generatedImage?.imageUrl) {
      toast.warning('No image to download');
      return;
    }

    try {
      const response = await fetch(generatedImage.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-generated-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Image downloaded successfully!');
    } catch (err) {
      console.error('Error downloading image:', err);
      toast.error('Failed to download image');
    }
  };

  const handleDeleteHistory = async (id) => {
    if (!confirm('Are you sure you want to delete this generation?')) {
      return;
    }

    try {
      await aiGenerateService.deleteGenerated(id);
      toast.success('Generation deleted successfully');
      await loadHistory();
    } catch (err) {
      console.error('Error deleting generation:', err);
      toast.error('Failed to delete generation');
    }
  };

  const handleCopyContent = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Content copied to clipboard');
  };

  const handleUseFromHistory = (historyItem) => {
    setPrompt(historyItem.prompt);
    setGenerationType(historyItem.type);
    setActiveTab(historyItem.category);
    setGeneratedContent(historyItem.content);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Content Generator</h1>
        <p className="text-gray-600">Generate high-quality content using AI technology</p>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ApperIcon name={tab.icon} size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Generation Interface */}
        <div className="lg:col-span-2">
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Generate {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            
            {/* Generation Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {activeTab === 'images' ? 'Image Type' : 'Content Type'}
              </label>
              <select
                value={generationType}
                onChange={(e) => setGenerationType(e.target.value)}
                className="input-field"
              >
                {generationTypes[activeTab]?.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Image-specific controls */}
            {activeTab === 'images' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Style
                    </label>
                    <select
                      value={imageStyle}
                      onChange={(e) => setImageStyle(e.target.value)}
                      className="input-field"
                    >
                      {imageStyles.map((style) => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Size
                    </label>
                    <select
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value)}
                      className="input-field"
                    >
                      {imageSizes.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Food Category
                  </label>
                  <select
                    value={foodCategory}
                    onChange={(e) => setFoodCategory(e.target.value)}
                    className="input-field"
                  >
                    {foodCategories.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={qualityValidation}
                      onChange={(e) => setQualityValidation(e.target.checked)}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Enable CLIP Quality Validation
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Uses AI to validate image quality and realism
                  </p>
                </div>
              </>
            )}

            {/* Prompt Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={activeTab === 'images' 
                  ? "Describe the food image you want to generate..."
                  : "Describe what you want to generate..."
                }
                className="input-field min-h-[100px]"
                rows={4}
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {loading ? (
                <>
                  <ApperIcon name="Loader" size={16} className="mr-2 animate-spin" />
                  {activeTab === 'images' ? 'Generating Image...' : 'Generating...'}
                </>
              ) : (
                <>
                  <ApperIcon name={activeTab === 'images' ? 'Camera' : 'Brain'} size={16} className="mr-2" />
                  {activeTab === 'images' ? 'Generate Image' : 'Generate Content'}
                </>
              )}
            </Button>
          </div>

          {/* Generated Content/Image */}
          {(generatedContent || generatedImage || error) && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Generated {activeTab === 'images' ? 'Image' : 'Content'}
                </h3>
                {(generatedContent || generatedImage) && (
                  <div className="flex space-x-2">
                    {activeTab === 'images' ? (
                      <>
                        <Button
                          onClick={handleDownloadImage}
                          variant="outline"
                          size="sm"
                        >
                          <ApperIcon name="Download" size={14} className="mr-1" />
                          Download
                        </Button>
                        <Button
                          onClick={() => handleCopyContent(generatedImage?.imageUrl || '')}
                          variant="outline"
                          size="sm"
                        >
                          <ApperIcon name="Copy" size={14} className="mr-1" />
                          Copy URL
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleCopyContent(generatedContent)}
                        variant="outline"
                        size="sm"
                      >
                        <ApperIcon name="Copy" size={14} className="mr-1" />
                        Copy
                      </Button>
                    )}
                    <Button
                      onClick={handleSave}
                      size="sm"
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <ApperIcon name="Save" size={14} className="mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
              
              {error ? (
                <Error message={error} onRetry={() => setError(null)} />
              ) : activeTab === 'images' && generatedImage ? (
                <div className="space-y-4">
                  <div className="relative">
                    <img
                      src={generatedImage.imageUrl}
                      alt="Generated image"
                      className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
                    />
                    {generatedImage.validated && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center space-x-1">
                        <ApperIcon name="CheckCircle" size={12} />
                        <span>Validated</span>
                      </div>
                    )}
                  </div>
                  
                  {generatedImage.qualityScore && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Quality Score</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${generatedImage.qualityScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {generatedImage.qualityScore}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Size:</span>
                      <span className="ml-2 text-gray-900">{generatedImage.size}</span>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <span className="font-medium text-gray-700">Style:</span>
                      <span className="ml-2 text-gray-900">{generatedImage.style}</span>
                    </div>
                  </div>
                </div>
              ) : generatedContent ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-gray-900 text-sm leading-relaxed">
                    {generatedContent}
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation History</h3>
            
            {historyLoading ? (
              <Loading type="list" />
            ) : generationHistory.length === 0 ? (
              <div className="text-center py-8">
                <ApperIcon name="History" size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No generation history</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {generationHistory.map((item) => (
                  <div key={item.Id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <ApperIcon 
                          name={tabs.find(t => t.id === item.category)?.icon || 'FileText'} 
                          size={16} 
                          className="text-gray-500" 
                        />
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {item.type.replace('-', ' ')}
                        </span>
                        {item.category === 'images' && item.image?.validated && (
                          <ApperIcon name="CheckCircle" size={12} className="text-green-500" />
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteHistory(item.Id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <ApperIcon name="Trash2" size={14} />
                      </button>
                    </div>
                    
                    {item.category === 'images' && item.image?.imageUrl ? (
                      <div className="mb-2">
                        <img
                          src={item.image.imageUrl}
                          alt="Generated"
                          className="w-full h-20 object-cover rounded-lg"
                        />
                        {item.image.qualityScore && (
                          <div className="mt-1 flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Quality:</span>
                            <span className="text-xs font-semibold text-gray-700">
                              {item.image.qualityScore}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {item.prompt}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
                      </span>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleUseFromHistory(item)}
                          className="text-xs text-primary hover:text-primary-dark transition-colors"
                        >
                          Use
                        </button>
                        <button
                          onClick={() => handleCopyContent(item.category === 'images' ? item.image?.imageUrl : item.content)}
                          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          {item.category === 'images' ? 'Copy URL' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIGenerate;