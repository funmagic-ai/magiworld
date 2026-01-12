/**
 * Dither Utilities for Laser Engraving
 *
 * When using Replicate API (which doesn't provide dither_mask),
 * these functions generate dither patterns client-side for point density control.
 */

/**
 * Generate a Bayer dithering matrix (ordered dithering)
 * Good for consistent, regular patterns
 * @param {number} size - Matrix size (2, 4, 8, or 16)
 * @returns {number[][]} - Bayer matrix
 */
export function generateBayerMatrix(size = 4) {
    if (size === 2) {
        return [
            [0, 2],
            [3, 1]
        ];
    }

    if (size === 4) {
        return [
            [0, 8, 2, 10],
            [12, 4, 14, 6],
            [3, 11, 1, 9],
            [15, 7, 13, 5]
        ];
    }

    if (size === 8) {
        const m4 = generateBayerMatrix(4);
        const m8 = [];
        for (let i = 0; i < 8; i++) {
            m8[i] = [];
            for (let j = 0; j < 8; j++) {
                const base = m4[i % 4][j % 4] * 4;
                const offset = (Math.floor(i / 4) * 2 + Math.floor(j / 4));
                m8[i][j] = base + offset;
            }
        }
        return m8;
    }

    // Default to 4x4
    return generateBayerMatrix(4);
}

/**
 * Generate dither mask using Bayer ordered dithering
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} density - Point density (0.0 to 1.0, default 0.5)
 * @param {number} matrixSize - Bayer matrix size (2, 4, or 8)
 * @returns {Uint8Array} - Dither mask (0 = skip, 1 = include)
 */
export function generateBayerDitherMask(width, height, density = 0.5, matrixSize = 4) {
    const matrix = generateBayerMatrix(matrixSize);
    const maxValue = matrixSize * matrixSize;
    const threshold = Math.floor(density * maxValue);

    const mask = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const matrixValue = matrix[y % matrixSize][x % matrixSize];
            mask[y * width + x] = matrixValue < threshold ? 1 : 0;
        }
    }

    return mask;
}

/**
 * Generate dither mask using Floyd-Steinberg error diffusion
 * Creates more natural-looking patterns based on confidence values
 * @param {number[]} confidences - Confidence values for each point
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} density - Target point density (0.0 to 1.0)
 * @returns {Uint8Array} - Dither mask (0 = skip, 1 = include)
 */
export function generateFloydSteinbergDitherMask(confidences, width, height, density = 0.5) {
    // Create error buffer
    const errors = new Float32Array(width * height);
    const mask = new Uint8Array(width * height);

    // Initialize with confidence-weighted values
    for (let i = 0; i < confidences.length; i++) {
        errors[i] = confidences[i] * density;
    }

    const threshold = 0.5;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const oldValue = errors[idx];
            const newValue = oldValue >= threshold ? 1 : 0;
            mask[idx] = newValue;

            const error = oldValue - newValue;

            // Distribute error to neighbors (Floyd-Steinberg coefficients)
            if (x + 1 < width) {
                errors[idx + 1] += error * 7 / 16;
            }
            if (y + 1 < height) {
                if (x > 0) {
                    errors[idx + width - 1] += error * 3 / 16;
                }
                errors[idx + width] += error * 5 / 16;
                if (x + 1 < width) {
                    errors[idx + width + 1] += error * 1 / 16;
                }
            }
        }
    }

    return mask;
}

/**
 * Apply dither mask to world_points from Replicate
 * Filters points based on dither pattern for laser engraving
 *
 * @param {number[][][]} worldPoints - world_points[row][col] = [x, y, z]
 * @param {number[][]} worldPointsConf - confidence values
 * @param {number} density - Point density (0.0 to 1.0)
 * @param {string} method - 'bayer' or 'floyd-steinberg'
 * @returns {{points: number[][], confidences: number[], ditherMask: Uint8Array}}
 */
export function applyDitherToWorldPoints(
    worldPoints,
    worldPointsConf,
    density = 0.5,
    method = 'bayer'
) {
    const height = worldPoints.length;
    const width = worldPoints[0]?.length || 0;

    if (height === 0 || width === 0) {
        return { points: [], confidences: [], ditherMask: new Uint8Array(0) };
    }

    // Flatten confidences for Floyd-Steinberg
    const flatConf = [];
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            flatConf.push(worldPointsConf?.[row]?.[col] ?? 1.0);
        }
    }

    // Generate dither mask
    let ditherMask;
    if (method === 'floyd-steinberg') {
        ditherMask = generateFloydSteinbergDitherMask(flatConf, width, height, density);
    } else {
        ditherMask = generateBayerDitherMask(width, height, density);
    }

    // Apply mask and collect valid points
    const points = [];
    const confidences = [];

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const idx = row * width + col;

            if (ditherMask[idx] !== 0) {
                const point = worldPoints[row][col];
                if (point && point.length === 3) {
                    points.push([point[0], point[1], point[2]]);

                    const conf = worldPointsConf?.[row]?.[col] ?? 1.0;
                    // Normalize confidence
                    const normalizedConf = conf > 1 || conf < 0
                        ? 1 / (1 + Math.exp(-conf))
                        : conf;
                    confidences.push(normalizedConf);
                }
            }
        }
    }

    return { points, confidences, ditherMask };
}

/**
 * Create dither mask data structure compatible with point_editor
 * @param {Uint8Array} mask - Raw dither mask
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {Object} - Data structure matching point_editor format
 */
export function createDitherMaskData(mask, width, height) {
    return {
        data: mask,
        shape: [height, width]
    };
}
