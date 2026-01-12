/**
 * Image processing module
 * Contains functions for loading and processing images similar to the Python version
 */

/**
 * Resize and crop an image to target dimensions
 * @param {HTMLImageElement} img - Image element to resize
 * @param {Object} targetSize - Target size with width and height properties
 * @returns {Promise<HTMLImageElement>} Resized and cropped image
 */
function resizeAndCropImage(img, targetSize) {
    return new Promise((resolve) => {
        console.log('开始执行resizeAndCropImage，参数:', { img, targetSize });
        const { width: targetWidth, height: targetHeight } = targetSize;
        console.log('目标尺寸:', { targetWidth, targetHeight });
        
        // Get original dimensions
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;
        console.log('原始尺寸:', { originalWidth, originalHeight });
        
        // Calculate scale to ensure image completely covers target area
        const scale = Math.max(targetWidth / originalWidth, targetHeight / originalHeight);
        console.log('计算缩放比例:', scale);
        
        // Calculate new dimensions
        const newWidth = Math.floor(originalWidth * scale);
        const newHeight = Math.floor(originalHeight * scale);
        console.log('新尺寸:', { newWidth, newHeight });
        
        // Resize image
        const resizeCanvas = document.createElement('canvas');
        resizeCanvas.width = newWidth;
        resizeCanvas.height = newHeight;
        const resizeCtx = resizeCanvas.getContext('2d');
        console.log('绘制缩放后的图像');
        resizeCtx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Center crop
        const left = Math.floor((newWidth - targetWidth) / 2);
        const top = Math.floor((newHeight - targetHeight) / 2);
        console.log('裁剪参数:', { left, top, targetWidth, targetHeight });
        
        // Create final canvas with target size
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        // Draw cropped image
        console.log('绘制裁剪后的图像');
        ctx.drawImage(resizeCanvas, left, top, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);
        
        // Convert to image element
        const processedImg = new Image();
        processedImg.onload = function() {
            console.log('resizeAndCropImage执行完成');
            resolve(processedImg);
        };
        processedImg.src = canvas.toDataURL();
    });
}

/**
 * Load and process an image, with optional resizing
 * @param {HTMLImageElement|String} imageSource - Image element or image URL
 * @param {Object} targetSize - Target size with width and height properties
 * @param {boolean} invert - Whether to invert the final dithered result
 * @returns {Promise<Object>} Promise that resolves with processed image data
 */
async function loadAndProcessImage(imageSource, targetSize = null, invert = false) {
    console.log('开始执行loadAndProcessImage，参数:', { imageSource, targetSize, invert });
    return new Promise((resolve, reject) => {
        let img = new Image();
        
        // Handle both image element and URL
        if (typeof imageSource === 'string') {
            console.log('处理字符串类型的图像源');
            img.crossOrigin = 'Anonymous';
            img.src = imageSource;
        } else if (imageSource instanceof HTMLImageElement) {
            console.log('处理HTMLImageElement类型的图像源');
            // For pre-loaded images, we need to check if they're already loaded
            if (imageSource.complete && imageSource.naturalWidth !== 0) {
                // Image is already loaded
                handleLoadedImage(imageSource, targetSize, invert, resolve, reject);
                return;
            } else {
                // Image not yet loaded, attach to img
                img = imageSource;
            }
        } else {
            console.error('无效的图像源类型');
            reject(new Error('Invalid image source. Must be URL string or HTMLImageElement.'));
            return;
        }
        
        img.onload = function() {
            handleLoadedImage(img, targetSize, invert, resolve, reject);
        };
        
        img.onerror = function(error) {
            console.error('图像加载失败:', error);
            reject(new Error('Failed to load image'));
        };
    });
}

/**
 * Handle a loaded image for processing
 * @param {HTMLImageElement} img - Loaded image element
 * @param {Object} targetSize - Target size with width and height properties
 * @param {boolean} invert - Whether to invert the final dithered result
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
function handleLoadedImage(img, targetSize, invert, resolve, reject) {
    try {
        console.log('图像加载完成，开始处理');
        console.log('图像尺寸:', { naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
        
        // Check if image dimensions are valid
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
            console.error('图像尺寸无效');
            reject(new Error('Invalid image dimensions'));
            return;
        }
        
        // Process image with optional resizing
        processImageAfterLoad(img, targetSize, invert, resolve, reject);
    } catch (error) {
        console.error('处理图像时发生错误:', error);
        reject(error);
    }
}

/**
 * Process image after it has been loaded
 * @param {HTMLImageElement} img - Loaded image element
 * @param {Object} targetSize - Target size with width and height properties
 * @param {boolean} invert - Whether to invert the final dithered result
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
async function processImageAfterLoad(img, targetSize, invert, resolve, reject) {
    try {
        let processedImg = img;
        
        // If target size is provided, resize and crop
        if (targetSize !== null) {
            console.log('调整图像大小:', targetSize);
            processedImg = await resizeAndCropImage(img, targetSize);
            console.log('图像调整大小完成');
        }
        
        // Create canvas for processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Draw the image on canvas
        canvas.width = processedImg.naturalWidth;
        canvas.height = processedImg.naturalHeight;
        
        // Check canvas dimensions are valid
        if (canvas.width === 0 || canvas.height === 0) {
            console.error('画布尺寸无效');
            reject(new Error('Invalid canvas dimensions'));
            return;
        }
        
        ctx.drawImage(processedImg, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const imgData = imageData.data;

        
        // Convert to grayscale and normalize

        const grayImg = new Array(canvas.height);
        for (let i = 0; i < canvas.height; i++) {
            grayImg[i] = new Array(canvas.width);
        }

        
        // Batch process to avoid blocking UI
        const batchSize = 100; // Process 100 rows per batch
        let currentRow = 0;
        
        const processBatch = () => {
            const endRow = Math.min(currentRow + batchSize, canvas.height);
            
            for (let y = currentRow; y < endRow; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    // Convert RGB to grayscale using luminance formula
                    const r = imgData[idx];
                    const g = imgData[idx + 1];
                    const b = imgData[idx + 2];
                    // Normalize to 0-1 range
                    grayImg[y][x] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
                }
            }
            
            currentRow = endRow;
            
            if (currentRow < canvas.height) {
                // More rows to process, handle next batch
                setTimeout(processBatch, 0);
            } else {
                // Processing complete
                console.log('灰度图像转换完成');
                
                // Apply Floyd-Steinberg dithering
                let ditheredBinary = floydSteinbergDitherVectorized(grayImg);

                // Invert the result if requested
                if (invert) {
                    ditheredBinary = invertDitheredBinary(ditheredBinary);
                }
                
                const result = {
                    imageData: imageData,
                    ditheredBinary: ditheredBinary,
                    width: canvas.width,
                    height: canvas.height
                };
                resolve(result);
            }
        };
        
        // Start processing first batch
        processBatch();
    } catch (error) {
        console.error('处理图像时发生错误:', error);
        reject(error);
    }
}

/**
 * Invert a dithered binary image (0s become 1s and 1s become 0s)
 * @param {Array<Array<number>>} ditheredBinary - Dithered binary image (0s and 1s)
 * @returns {Array<Array<number>>} Inverted dithered binary image
 */
function invertDitheredBinary(ditheredBinary) {
    return ditheredBinary.map(row => row.map(pixel => pixel === 1 ? 0 : 1));
}

/**
 * Apply Floyd-Steinberg dithering algorithm to a grayscale image
 * @param {Array<Array<number>>} grayImg - 2D array of grayscale values (0-1)
 * @returns {Array<Array<number>>} Dithered binary image (0s and 1s)
 */
function floydSteinbergDitherVectorized(grayImg) {
    // Create a copy of the image data to avoid modifying the original
    const img = grayImg.map(row => [...row]);
    const height = img.length;
    const width = img[0].length;
    
    // Create output array
    const result = Array(height).fill().map(() => Array(width).fill(0));
    
    // Apply dithering
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const oldPixel = img[y][x];
            const newPixel = oldPixel > 0.5 ? 1 : 0;
            result[y][x] = newPixel;
            const quantError = oldPixel - newPixel;
            
            // Distribute error to neighboring pixels
            if (x + 1 < width) {
                img[y][x + 1] += quantError * 7 / 16;
            }
            if (y + 1 < height) {
                if (x - 1 >= 0) {
                    img[y + 1][x - 1] += quantError * 3 / 16;
                }
                img[y + 1][x] += quantError * 5 / 16;
                if (x + 1 < width) {
                    img[y + 1][x + 1] += quantError * 1 / 16;
                }
            }
        }
    }
    
    return result;
}

// 导出函数以便其他模块可以使用
export { loadAndProcessImage, resizeAndCropImage, floydSteinbergDitherVectorized };